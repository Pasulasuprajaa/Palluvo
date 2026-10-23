const db = require('../db/database');

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION ||
  process.env.NETLIFY
);

// Default 24-hour retention window for anonymous rotation tracking
const DEFAULT_TTL_MS = parseInt(process.env.QA_VOTE_ROTATION_TTL_MS, 10) || 24 * 60 * 60 * 1000;

/**
 * Shared expiring rotation ledger for anonymous voting.
 * Persists caller IP -> Q&A vote associations and original voter session keys in:
 * 1. Shared Vercel KV / Upstash Redis REST API using atomic HSET/HGET/HGETALL operations (for serverless).
 * 2. Shared durable SQLite table (for multi-instance persistent environments and test suites).
 * 3. Process-local TTL-pruned Map fallback.
 * Automatically prunes expired records on read/write to prevent accumulation over the lifetime of warm instances.
 */
class AnonymousVoteRotationLedger {
  constructor(options = {}) {
    this.prefix = options.prefix || 'qa_rot:v2';
    this.defaultTtlMs = options.ttlMs || DEFAULT_TTL_MS;
    this.localStore = new Map(); // clientIp -> Map(qaId -> { originalBrowserKey, expiresAt })
    this.db = options.db !== undefined ? options.db : db;

    const restUrl = options.restUrl || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL;
    const restToken = options.restToken || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN;

    if (restUrl && restToken) {
      this.restUrl = restUrl.replace(/\/$/, '');
      this.restToken = restToken;
      this.isShared = true;
    } else {
      this.restUrl = null;
      this.restToken = null;
      this.isShared = false;
    }
  }

  getKey(clientIp) {
    return `palluvo:${this.prefix}:ip:${clientIp}`;
  }

  async executePipeline(commands) {
    const res = await fetch(`${this.restUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.restToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });
    if (!res.ok) {
      throw new Error(`Redis pipeline HTTP status ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid Redis pipeline response format');
    }
    for (const cmdRes of data) {
      if (cmdRes?.error) {
        throw new Error(`Redis pipeline command error: ${cmdRes.error}`);
      }
    }
    return data;
  }

  async readLegacyStringSnapshot(sourceKey) {
    if (!this.isShared || !this.restUrl || !this.restToken) {
      return { rawString: null, entries: new Map() };
    }
    const entries = new Map();
    const getRes = await fetch(`${this.restUrl}/GET/${encodeURIComponent(sourceKey)}`, {
      headers: { Authorization: `Bearer ${this.restToken}` }
    });
    if (!getRes.ok) {
      throw new Error(`Redis GET HTTP status ${getRes.status}`);
    }
    const getData = await getRes.json();
    if (getData?.error) {
      throw new Error(`Redis GET command error: ${getData.error}`);
    }
    const rawString = typeof getData?.result === 'string' ? getData.result : null;
    if (rawString) {
      try {
        const parsed = JSON.parse(rawString);
        if (parsed && typeof parsed === 'object') {
          const now = Date.now();
          for (const [k, v] of Object.entries(parsed)) {
            if (v && v.expiresAt > now) {
              entries.set(Number(k), {
                originalBrowserKey: v.originalBrowserKey || '',
                expiresAt: v.expiresAt
              });
            }
          }
        }
      } catch (e) {}
    }
    return { rawString, entries };
  }

  async readLegacyStringEntries(sourceKey) {
    const snapshot = await this.readLegacyStringSnapshot(sourceKey);
    return snapshot.entries;
  }

  async migrateLegacyKey(clientIp, fullKey, options = {}) {
    const migratedVotes = new Map();
    if (!this.isShared || !this.restUrl || !this.restToken || !this.prefix.endsWith(':v2')) {
      return { migratedVotes };
    }
    const legacyPrefix = this.prefix.replace(/:v2$/, '');
    const legacyKey = `palluvo:${legacyPrefix}:ip:${clientIp}`;
    let snapshot = await this.readLegacyStringSnapshot(legacyKey);

    if (!snapshot.rawString || snapshot.entries.size === 0) {
      if (snapshot.rawString) {
        // Legacy source key exists but has no active unexpired entries.
        // Confirm source is unchanged before deleting.
        const verify = await this.readLegacyStringSnapshot(legacyKey);
        if (verify.rawString === snapshot.rawString) {
          await fetch(`${this.restUrl}/DEL/${encodeURIComponent(legacyKey)}`, {
            headers: { Authorization: `Bearer ${this.restToken}` }
          }).catch(() => {});
        }
      }
      return { migratedVotes };
    }

    let retries = 0;
    const maxRetries = 5;

    while (snapshot.entries.size > 0 && retries < maxRetries) {
      const now = Date.now();
      const legacyKeyEntries = Array.from(snapshot.entries.entries());
      const migrationCommands = [];

      for (const [qid, item] of legacyKeyEntries) {
        if (options.skipQaId && qid === options.skipQaId) continue;
        migrationCommands.push([
          'HSETNX',
          fullKey,
          String(qid),
          JSON.stringify({
            originalBrowserKey: item.originalBrowserKey,
            expiresAt: item.expiresAt
          })
        ]);
      }

      const allExpires = Array.from(snapshot.entries.values()).map(e => e.expiresAt);
      const maxRemainingTtlSec = Math.max(
        1,
        Math.ceil(Math.max(...allExpires.map(e => e - now)) / 1000)
      );
      if (migrationCommands.length > 0) {
        migrationCommands.push(['EXPIRE', fullKey, maxRemainingTtlSec, 'NX']);
        migrationCommands.push(['EXPIRE', fullKey, maxRemainingTtlSec, 'GT']);
      }

      let pipelineResults = [];
      if (migrationCommands.length > 0) {
        pipelineResults = await this.executePipeline(migrationCommands);
      }

      // Check results for each legacy entry:
      // If HSETNX returned 0, compare expirations: if destination v2 is expired or older while legacy record is still live,
      // replace the expired destination field with the live legacy record before deleting source.
      const replacementCommands = [];
      let maxReplacementTtlSec = 1;

      let cmdIdx = 0;
      for (const [qid, item] of legacyKeyEntries) {
        if (options.skipQaId && qid === options.skipQaId) continue;
        const hsetnxRes = pipelineResults[cmdIdx]?.result;
        cmdIdx++;

        if (hsetnxRes === 0) {
          let v2Parsed = null;
          try {
            const freshRes = await fetch(`${this.restUrl}/HGET/${encodeURIComponent(fullKey)}/${encodeURIComponent(String(qid))}`, {
              headers: { Authorization: `Bearer ${this.restToken}` }
            });
            if (freshRes.ok) {
              const freshData = await freshRes.json();
              if (freshData?.result) {
                v2Parsed = typeof freshData.result === 'string' ? JSON.parse(freshData.result) : freshData.result;
              }
            }
          } catch (e) {}

          if (v2Parsed && v2Parsed.expiresAt > now && v2Parsed.expiresAt >= item.expiresAt) {
            // Live v2 record is fresher or equal
            migratedVotes.set(qid, {
              qa_id: qid,
              original_browser_key: v2Parsed.originalBrowserKey
            });
          } else if (item.expiresAt > now) {
            // Destination v2 field is expired or older, but legacy record is still live!
            // Atomically replace expired destination field with live legacy record before deleting source.
            replacementCommands.push([
              'HSET',
              fullKey,
              String(qid),
              JSON.stringify({
                originalBrowserKey: item.originalBrowserKey,
                expiresAt: item.expiresAt
              })
            ]);
            const remSec = Math.max(1, Math.ceil((item.expiresAt - now) / 1000));
            if (remSec > maxReplacementTtlSec) maxReplacementTtlSec = remSec;
            migratedVotes.set(qid, {
              qa_id: qid,
              original_browser_key: item.originalBrowserKey
            });
          }
        } else if (item.expiresAt > now) {
          migratedVotes.set(qid, {
            qa_id: qid,
            original_browser_key: item.originalBrowserKey
          });
        }
      }

      if (replacementCommands.length > 0) {
        replacementCommands.push(['EXPIRE', fullKey, maxReplacementTtlSec, 'NX']);
        replacementCommands.push(['EXPIRE', fullKey, maxReplacementTtlSec, 'GT']);
        await this.executePipeline(replacementCommands);
      }

      // Verify that the legacy source key did not change after the migration snapshot before deleting
      const verifySnapshot = await this.readLegacyStringSnapshot(legacyKey);
      if (verifySnapshot.rawString !== null) {
        if (verifySnapshot.rawString !== snapshot.rawString) {
          // Legacy key was modified concurrently! Do NOT delete; loop to migrate newly arrived writes.
          snapshot = verifySnapshot;
          retries++;
          continue;
        }
        // Legacy source key is confirmed unchanged: safe to delete
        await fetch(`${this.restUrl}/DEL/${encodeURIComponent(legacyKey)}`, {
          headers: { Authorization: `Bearer ${this.restToken}` }
        }).catch(() => {});
      }
      break;
    }

    return { migratedVotes };
  }

  pruneLocal() {
    const now = Date.now();
    for (const [ip, qaMap] of this.localStore.entries()) {
      for (const [qaId, item] of qaMap.entries()) {
        if (!item || item.expiresAt <= now) {
          qaMap.delete(qaId);
        }
      }
      if (qaMap.size === 0) {
        this.localStore.delete(ip);
      }
    }
  }

  pruneDb() {
    try {
      const activeDb = this.db;
      if (activeDb && typeof activeDb.prepare === 'function') {
        activeDb.prepare('DELETE FROM anonymous_vote_rotation_ledger WHERE expires_at <= ?').run(Date.now());
      }
    } catch (e) {}
  }

  pruneExpired() {
    this.pruneLocal();
    this.pruneDb();
  }

  async rollbackVote(clientIp, qaId) {
    if (!clientIp || !qaId) return;
    const numericQaId = Number(qaId);
    this.pruneLocal();
    const localMap = this.localStore.get(clientIp);
    if (localMap) {
      localMap.delete(numericQaId);
      if (localMap.size === 0) {
        this.localStore.delete(clientIp);
      }
    }
    try {
      const activeDb = this.db;
      if (activeDb && typeof activeDb.prepare === 'function') {
        activeDb.prepare('DELETE FROM anonymous_vote_rotation_ledger WHERE client_ip = ? AND qa_id = ?').run(clientIp, numericQaId);
      }
    } catch (e) {}
    if (this.isShared && this.restUrl && this.restToken) {
      try {
        const fullKey = this.getKey(clientIp);
        await fetch(`${this.restUrl}/HDEL/${encodeURIComponent(fullKey)}/${encodeURIComponent(String(numericQaId))}`, {
          headers: { Authorization: `Bearer ${this.restToken}` }
        }).catch(() => {});
      } catch (e) {}
    }
  }

  async recordVote(clientIp, qaId, originalBrowserKey, ttlMs = this.defaultTtlMs) {
    if (!clientIp || !qaId) return;
    const numericQaId = Number(qaId);
    const expiresAt = Date.now() + ttlMs;
    const windowSec = Math.max(1, Math.ceil(ttlMs / 1000));

    // 1. Shared KV/Redis storage: atomic HSET per (IP, question) association with TTL
    // Must succeed BEFORE committing to process-local Map or SQLite ledger to prevent dirty read states on failure
    if (this.isShared && this.restUrl && this.restToken) {
      const fullKey = this.getKey(clientIp);
      const payload = JSON.stringify({
        originalBrowserKey: originalBrowserKey || '',
        expiresAt
      });

      // Check if an unmigrated legacy v1 string key exists
      if (this.prefix.endsWith(':v2')) {
        await this.migrateLegacyKey(clientIp, fullKey, { skipQaId: numericQaId });
      }

      const initialCommands = [
        ['HSET', fullKey, String(numericQaId), payload],
        ['EXPIRE', fullKey, windowSec]
      ];

      // Execute pipeline
      const res = await fetch(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialCommands)
      });
      if (!res.ok) {
        throw new Error(`Redis pipeline HTTP status ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid Redis pipeline response format');
      }

      // Check for command-level errors
      const firstError = data.find(r => r?.error)?.error;
      if (firstError) {
        if (typeof firstError === 'string' && firstError.includes('WRONGTYPE')) {
          // Key currently holds a legacy string in-place (e.g. prefix was configured without :v2)
          const inPlaceEntries = await this.readLegacyStringEntries(fullKey);
          const inPlaceCommands = [['DEL', fullKey]];
          for (const [qid, item] of inPlaceEntries.entries()) {
            if (qid !== numericQaId) {
              inPlaceCommands.push([
                'HSET',
                fullKey,
                String(qid),
                JSON.stringify({
                  originalBrowserKey: item.originalBrowserKey,
                  expiresAt: item.expiresAt
                })
              ]);
            }
          }
          inPlaceCommands.push(['HSET', fullKey, String(numericQaId), payload]);
          inPlaceCommands.push(['EXPIRE', fullKey, windowSec]);

          // Execute replacement pipeline and verify
          await this.executePipeline(inPlaceCommands);
        } else {
          throw new Error(`Redis HSET command error: ${firstError}`);
        }
      }

      // Destination v2 write is confirmed successful!
    }

    // 2. In-memory local fallback (commit ONLY after shared storage succeeds)
    this.pruneLocal();
    if (!this.localStore.has(clientIp)) {
      this.localStore.set(clientIp, new Map());
    }
    this.localStore.get(clientIp).set(numericQaId, {
      originalBrowserKey: originalBrowserKey || '',
      expiresAt
    });

    // 3. Persistent SQLite DB storage (commit ONLY after shared storage succeeds)
    try {
      const activeDb = this.db;
      if (activeDb && typeof activeDb.prepare === 'function') {
        this.pruneDb();
        activeDb.prepare(`
          INSERT INTO anonymous_vote_rotation_ledger (client_ip, qa_id, original_browser_key, expires_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(client_ip, qa_id) DO UPDATE SET
            original_browser_key = excluded.original_browser_key,
            expires_at = excluded.expires_at
        `).run(clientIp, numericQaId, originalBrowserKey || '', expiresAt);
      }
    } catch (e) {}
  }

  async getVotedQuestionsForIp(clientIp) {
    if (!clientIp) return [];
    const now = Date.now();
    const votesByQa = new Map();

    // 1. Shared KV/Redis (atomic HGETALL)
    if (this.isShared && this.restUrl && this.restToken) {
      const fullKey = this.getKey(clientIp);
      const getRes = await fetch(`${this.restUrl}/HGETALL/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
      if (!getRes.ok) {
        throw new Error(`Redis HGETALL HTTP status ${getRes.status}`);
      }
      const getData = await getRes.json();
      if (getData?.error) {
        if (typeof getData.error === 'string' && getData.error.includes('WRONGTYPE')) {
          // in-place legacy string key at fullKey
          const inPlaceEntries = await this.readLegacyStringEntries(fullKey);
          if (inPlaceEntries.size > 0) {
            const inPlaceCommands = [['DEL', fullKey]];
            for (const [qid, item] of inPlaceEntries.entries()) {
              inPlaceCommands.push([
                'HSET',
                fullKey,
                String(qid),
                JSON.stringify({
                  originalBrowserKey: item.originalBrowserKey,
                  expiresAt: item.expiresAt
                })
              ]);
              votesByQa.set(qid, {
                qa_id: qid,
                original_browser_key: item.originalBrowserKey
              });
            }
            const maxRemainingTtlSec = Math.max(
              1,
              Math.ceil(Math.max(...Array.from(inPlaceEntries.values()).map(e => e.expiresAt - now)) / 1000)
            );
            inPlaceCommands.push(['EXPIRE', fullKey, maxRemainingTtlSec, 'NX']);
            inPlaceCommands.push(['EXPIRE', fullKey, maxRemainingTtlSec, 'GT']);
            await this.executePipeline(inPlaceCommands);
          }
        } else {
          throw new Error(`Redis HGETALL command error: ${getData.error}`);
        }
      } else {
        let entries = [];
        if (Array.isArray(getData.result)) {
          for (let i = 0; i < getData.result.length; i += 2) {
            entries.push([getData.result[i], getData.result[i + 1]]);
          }
        } else if (getData.result && typeof getData.result === 'object') {
          entries = Object.entries(getData.result);
        }

        const existingExpires = [];
        for (const [k, v] of entries) {
          try {
            const parsed = typeof v === 'string' ? JSON.parse(v) : v;
            if (parsed && parsed.expiresAt > now) {
              const qid = Number(k);
              votesByQa.set(qid, {
                qa_id: qid,
                original_browser_key: parsed.originalBrowserKey
              });
              existingExpires.push(parsed.expiresAt);
            }
          } catch (e) {}
        }
      }

      // Check unmigrated legacy v1 string key if using v2 namespace
      if (this.prefix.endsWith(':v2')) {
        const { migratedVotes } = await this.migrateLegacyKey(clientIp, fullKey);
        for (const [qid, vote] of migratedVotes.entries()) {
          if (!votesByQa.has(qid)) {
            votesByQa.set(qid, vote);
          }
        }
      }
    }

    // 2. Persistent SQLite DB storage (merged with KV rows so no association is lost)
    try {
      const activeDb = this.db;
      if (activeDb && typeof activeDb.prepare === 'function') {
        this.pruneDb();
        const rows = activeDb.prepare(`
          SELECT qa_id, original_browser_key
          FROM anonymous_vote_rotation_ledger
          WHERE client_ip = ? AND expires_at > ?
        `).all(clientIp, now);
        for (const r of rows) {
          const qid = Number(r.qa_id);
          if (!votesByQa.has(qid)) {
            votesByQa.set(qid, {
              qa_id: qid,
              original_browser_key: r.original_browser_key
            });
          }
        }
      }
    } catch (e) {}

    // 3. In-memory local fallback (merged with KV and DB rows)
    this.pruneLocal();
    const localMap = this.localStore.get(clientIp);
    if (localMap && localMap.size > 0) {
      for (const [qaId, item] of localMap.entries()) {
        if (item && item.expiresAt > now) {
          const qid = Number(qaId);
          if (!votesByQa.has(qid)) {
            votesByQa.set(qid, {
              qa_id: qid,
              original_browser_key: item.originalBrowserKey
            });
          }
        }
      }
    }

    return Array.from(votesByQa.values());
  }

  async getVoteRecord(clientIp, qaId) {
    if (!clientIp || !qaId) return null;
    const numericQaId = Number(qaId);
    const now = Date.now();

    // 1. Shared KV/Redis (atomic HGET)
    if (this.isShared && this.restUrl && this.restToken) {
      const fullKey = this.getKey(clientIp);
      const getRes = await fetch(`${this.restUrl}/HGET/${encodeURIComponent(fullKey)}/${encodeURIComponent(String(numericQaId))}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
      if (!getRes.ok) {
        throw new Error(`Redis HGET HTTP status ${getRes.status}`);
      }
      const getData = await getRes.json();
      if (getData?.error) {
        if (typeof getData.error === 'string' && getData.error.includes('WRONGTYPE')) {
          const inPlaceEntries = await this.readLegacyStringEntries(fullKey);
          if (inPlaceEntries.size > 0) {
            const inPlaceCommands = [['DEL', fullKey]];
            for (const [qid, item] of inPlaceEntries.entries()) {
              inPlaceCommands.push([
                'HSET',
                fullKey,
                String(qid),
                JSON.stringify({
                  originalBrowserKey: item.originalBrowserKey,
                  expiresAt: item.expiresAt
                })
              ]);
            }
            const maxRemainingTtlSec = Math.max(
              1,
              Math.ceil(Math.max(...Array.from(inPlaceEntries.values()).map(e => e.expiresAt - now)) / 1000)
            );
            inPlaceCommands.push(['EXPIRE', fullKey, maxRemainingTtlSec, 'NX']);
            inPlaceCommands.push(['EXPIRE', fullKey, maxRemainingTtlSec, 'GT']);
            await this.executePipeline(inPlaceCommands);
          }
          const match = inPlaceEntries.get(numericQaId);
          if (match && match.expiresAt > now) {
            return {
              qa_id: numericQaId,
              original_browser_key: match.originalBrowserKey
            };
          }
        } else {
          throw new Error(`Redis HGET command error: ${getData.error}`);
        }
      } else if (getData && getData.result) {
        try {
          const parsed = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
          if (parsed && parsed.expiresAt > now) {
            return {
              qa_id: numericQaId,
              original_browser_key: parsed.originalBrowserKey
            };
          }
        } catch (e) {}
      }

      // Check legacy v1 key if prefix ends with :v2 and no match in v2
      if (this.prefix.endsWith(':v2')) {
        const { migratedVotes } = await this.migrateLegacyKey(clientIp, fullKey);
        const match = migratedVotes.get(numericQaId);
        if (match) {
          return match;
        }
        // If numericQaId was not in legacy snapshot, check if committed to v2 hash directly
        try {
          const freshRes = await fetch(`${this.restUrl}/HGET/${encodeURIComponent(fullKey)}/${encodeURIComponent(String(numericQaId))}`, {
            headers: { Authorization: `Bearer ${this.restToken}` }
          });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            if (freshData?.result) {
              const parsed = typeof freshData.result === 'string' ? JSON.parse(freshData.result) : freshData.result;
              if (parsed && parsed.expiresAt > now) {
                return {
                  qa_id: numericQaId,
                  original_browser_key: parsed.originalBrowserKey
                };
              }
            }
          }
        } catch (e) {}
      }
    }

    // 2. Persistent SQLite DB storage
    try {
      const activeDb = this.db;
      if (activeDb && typeof activeDb.prepare === 'function') {
        this.pruneDb();
        const row = activeDb.prepare(`
          SELECT qa_id, original_browser_key
          FROM anonymous_vote_rotation_ledger
          WHERE client_ip = ? AND qa_id = ? AND expires_at > ?
        `).get(clientIp, numericQaId, now);
        if (row) {
          return {
            qa_id: Number(row.qa_id),
            original_browser_key: row.original_browser_key
          };
        }
      }
    } catch (e) {}

    // 3. In-memory local fallback
    this.pruneLocal();
    const entry = this.localStore.get(clientIp)?.get(numericQaId);
    if (entry && entry.expiresAt > now) {
      return {
        qa_id: numericQaId,
        original_browser_key: entry.originalBrowserKey
      };
    }

    return null;
  }

  async isOriginalVoter(clientIp, qaId, browserKey) {
    if (!browserKey) return false;
    const record = await this.getVoteRecord(clientIp, qaId);
    if (!record) return false;
    return record.original_browser_key === browserKey;
  }

  async clear() {
    this.localStore.clear();
    try {
      const activeDb = this.db;
      if (activeDb && typeof activeDb.prepare === 'function') {
        activeDb.prepare('DELETE FROM anonymous_vote_rotation_ledger').run();
      }
    } catch (e) {}
    if (this.isShared && this.restUrl && this.restToken) {
      try {
        // Clear shared keys if needed
      } catch (e) {}
    }
  }
}

const rotationLedger = new AnonymousVoteRotationLedger();

module.exports = {
  AnonymousVoteRotationLedger,
  rotationLedger
};
