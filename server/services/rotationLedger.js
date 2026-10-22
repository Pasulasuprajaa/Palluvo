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

  async migrateLegacyStringKey(fullKey) {
    if (!this.isShared || !this.restUrl || !this.restToken) return new Map();
    const migrated = new Map();
    try {
      const getRes = await fetch(`${this.restUrl}/GET/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        if (getData && typeof getData.result === 'string') {
          try {
            const parsed = JSON.parse(getData.result);
            if (parsed && typeof parsed === 'object') {
              const now = Date.now();
              for (const [k, v] of Object.entries(parsed)) {
                if (v && v.expiresAt > now) {
                  migrated.set(Number(k), {
                    originalBrowserKey: v.originalBrowserKey || '',
                    expiresAt: v.expiresAt
                  });
                }
              }
            }
          } catch (e) {}
        }
      }
      // Delete the legacy string key so it can be cleanly replaced as a Redis Hash
      await fetch(`${this.restUrl}/DEL/${encodeURIComponent(fullKey)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` }
      });
    } catch (e) {}
    return migrated;
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

  async recordVote(clientIp, qaId, originalBrowserKey, ttlMs = this.defaultTtlMs) {
    if (!clientIp || !qaId) return;
    const numericQaId = Number(qaId);
    const expiresAt = Date.now() + ttlMs;
    const windowSec = Math.max(1, Math.ceil(ttlMs / 1000));

    // 1. In-memory local fallback (with automatic prune)
    this.pruneLocal();
    if (!this.localStore.has(clientIp)) {
      this.localStore.set(clientIp, new Map());
    }
    this.localStore.get(clientIp).set(numericQaId, {
      originalBrowserKey: originalBrowserKey || '',
      expiresAt
    });

    // 2. Persistent SQLite DB storage
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

    // 3. Shared KV/Redis storage: atomic HSET per (IP, question) association with TTL
    if (this.isShared && this.restUrl && this.restToken) {
      const fullKey = this.getKey(clientIp);
      const payload = JSON.stringify({
        originalBrowserKey: originalBrowserKey || '',
        expiresAt
      });

      const executePipeline = async (commands) => {
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
        return data;
      };

      const initialCommands = [
        ['HSET', fullKey, String(numericQaId), payload],
        ['EXPIRE', fullKey, windowSec]
      ];

      const results = await executePipeline(initialCommands);

      // Validate each pipeline command response
      const hsetError = results[0]?.error;
      const expireError = results[1]?.error;

      if (hsetError) {
        if (typeof hsetError === 'string' && hsetError.includes('WRONGTYPE')) {
          // Key currently holds a legacy string from prior releases.
          // Migrate legacy string entries and write as Redis hash.
          const legacyEntries = await this.migrateLegacyStringKey(fullKey);
          const migrationCommands = [];
          for (const [qid, item] of legacyEntries.entries()) {
            if (qid !== numericQaId) {
              migrationCommands.push([
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
          migrationCommands.push(['HSET', fullKey, String(numericQaId), payload]);
          migrationCommands.push(['EXPIRE', fullKey, windowSec]);

          const retryResults = await executePipeline(migrationCommands);
          for (const cmdRes of retryResults) {
            if (cmdRes?.error) {
              throw new Error(`Redis pipeline command error after migration: ${cmdRes.error}`);
            }
          }
        } else {
          throw new Error(`Redis HSET command error: ${hsetError}`);
        }
      } else if (expireError) {
        throw new Error(`Redis EXPIRE command error: ${expireError}`);
      }
    }
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
          const legacyEntries = await this.migrateLegacyStringKey(fullKey);
          if (legacyEntries.size > 0) {
            const commands = [];
            for (const [qid, item] of legacyEntries.entries()) {
              commands.push([
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
              Math.ceil(Math.max(...Array.from(legacyEntries.values()).map(e => e.expiresAt - now)) / 1000)
            );
            commands.push(['EXPIRE', fullKey, maxRemainingTtlSec]);
            await fetch(`${this.restUrl}/pipeline`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${this.restToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(commands)
            }).catch(() => {});
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

        for (const [k, v] of entries) {
          try {
            const parsed = typeof v === 'string' ? JSON.parse(v) : v;
            if (parsed && parsed.expiresAt > now) {
              const qid = Number(k);
              votesByQa.set(qid, {
                qa_id: qid,
                original_browser_key: parsed.originalBrowserKey
              });
            }
          } catch (e) {}
        }
      }

      // Check unmigrated legacy v1 string key if using v2 namespace and not already migrated
      if (this.prefix.endsWith(':v2')) {
        const legacyPrefix = this.prefix.replace(/:v2$/, '');
        const legacyKey = `palluvo:${legacyPrefix}:ip:${clientIp}`;
        try {
          const legacyCheckRes = await fetch(`${this.restUrl}/GET/${encodeURIComponent(legacyKey)}`, {
            headers: { Authorization: `Bearer ${this.restToken}` }
          });
          if (legacyCheckRes.ok) {
            const legacyData = await legacyCheckRes.json();
            if (legacyData && typeof legacyData.result === 'string') {
              const legacyEntries = await this.migrateLegacyStringKey(legacyKey);
              for (const [qid, item] of legacyEntries.entries()) {
                if (!votesByQa.has(qid)) {
                  votesByQa.set(qid, {
                    qa_id: qid,
                    original_browser_key: item.originalBrowserKey
                  });
                }
              }
            }
          }
        } catch (e) {}
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
          const legacyEntries = await this.migrateLegacyStringKey(fullKey);
          const match = legacyEntries.get(numericQaId);
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
