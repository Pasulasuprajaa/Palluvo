import React, { useState, useEffect } from 'react';
import { HelpCircle, Search, ThumbsUp, MessageSquare, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const rawPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedStr = typeof atob === 'function' ? atob(rawPayload) : Buffer.from(rawPayload, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedStr);
    // Discard legacy IP-derived IDs (must be per-browser 'voter_' format and not legacy 32-hex)
    if (!payload.voter_id || typeof payload.voter_id !== 'string' || !payload.voter_id.startsWith('voter_') || /^[0-9a-f]{32}$/i.test(payload.voter_id)) {
      return false;
    }
    if (payload.exp && (payload.exp * 1000 <= Date.now() + 60000)) {
      return false; // Expired or expiring within 60s
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function getOrFetchVoterToken(forceRefresh = false) {
  try {
    let token = localStorage.getItem('palluvo_qa_voter_token');
    if (!forceRefresh && isTokenValid(token)) {
      return token;
    }

    // Existing token is expired or missing; pass existing token to preserve voter_id during renewal
    const headers = {};
    if (token) headers['x-voter-token'] = token;

    const res = await fetch('/api/products/qa/voter-token', { headers, credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.voter_token) {
        token = data.voter_token;
        localStorage.setItem('palluvo_qa_voter_token', token);
        return token;
      }
    }
    return token;
  } catch (e) {
    return null;
  }
}

function getStoredVotedIds() {
  try {
    const raw = localStorage.getItem('palluvo_voted_qa_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {}
  return new Set();
}

export default function ProductQA({ productId, initialQA = [] }) {
  const [qaList, setQaList] = useState(initialQA);
  const [searchQuery, setSearchQuery] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [askerName, setAskerName] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [votedIds, setVotedIds] = useState(() => getStoredVotedIds());
  const { showToast } = useToast();

  useEffect(() => {
    if (initialQA && initialQA.length > 0) {
      setQaList(initialQA);
    } else if (productId) {
      fetch(`/api/products/${productId}/qa`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.qa) setQaList(data.qa);
          if (data.voter_token && !localStorage.getItem('palluvo_qa_voter_token')) {
            localStorage.setItem('palluvo_qa_voter_token', data.voter_token);
          }
        })
        .catch(() => {});
    }
  }, [productId, initialQA]);

  const filteredQA = qaList.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.answer && item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleHelpfulVote = async (qaId) => {
    if (votedIds.has(qaId)) {
      showToast('You already voted this answer as helpful.', 'info');
      return;
    }

    try {
      let voterToken = await getOrFetchVoterToken();
      const authToken = localStorage.getItem('palluvo_token');
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (voterToken) headers['x-voter-token'] = voterToken;

      let res = await fetch(`/api/products/qa/${qaId}/helpful`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ voter_token: voterToken })
      });
      let data = await res.json();

      // If token expired on server, requires migration, or had session mismatch, auto-refresh and retry once
      if (!res.ok && (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_LEGACY_MIGRATION' || data.code === 'TOKEN_SESSION_MISMATCH' || (data.error && data.error.toLowerCase().includes('token')))) {
        voterToken = await getOrFetchVoterToken(true);
        if (voterToken) {
          headers['x-voter-token'] = voterToken;
          res = await fetch(`/api/products/qa/${qaId}/helpful`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ voter_token: voterToken })
          });
          data = await res.json();
        }
      }

      if (res.ok) {
        setQaList(prev => prev.map(item =>
          item.id === qaId ? { ...item, helpful_votes: typeof data.helpful_votes === 'number' ? data.helpful_votes : (item.helpful_votes || 0) + 1 } : item
        ));
        setVotedIds(prev => {
          const updated = new Set([...prev, qaId]);
          try {
            localStorage.setItem('palluvo_voted_qa_ids', JSON.stringify(Array.from(updated)));
          } catch (e) {}
          return updated;
        });

        if (data.already_voted) {
          showToast('You already voted this answer as helpful.', 'info');
        } else {
          showToast('Thank you for your feedback!', 'success');
        }
      } else {
        showToast(data.error || 'Failed to record vote.', 'error');
      }
    } catch (e) {
      showToast('Failed to record vote.', 'error');
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setIsAsking(true);
    try {
      const res = await fetch(`/api/products/${productId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion.trim(),
          user_name: askerName.trim() || 'PALLUVO Patron'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post question');

      if (data.qa) {
        setQaList(prev => [data.qa, ...prev]);
      }
      setNewQuestion('');
      showToast(data.message || '✨ Your question has been submitted for concierge review.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to post question.', 'error');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E1D5] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E1D5] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#5B1425]/10 text-[#5B1425]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F1A1C]">
              Customer Questions & Answers (Q&A)
            </h3>
            <p className="text-xs text-gray-500">
              Community questions and answers regarding fabric, care, borders, and styling
            </p>
          </div>
        </div>

        {/* Search within Q&A */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Have a question? Search answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none"
          />
        </div>
      </div>

      {/* Ask a Question Input */}
      <form onSubmit={handleAskQuestion} className="bg-[#FAF7F2] p-4 rounded-xl border border-[#C5A059]/30 space-y-3">
        <div className="text-xs font-semibold text-[#5B1425] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Have a question about fabric, care, borders, or styling? Ask below</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Your name (e.g. Ananya)"
            value={askerName}
            onChange={(e) => setAskerName(e.target.value)}
            className="sm:w-48 p-2.5 bg-white rounded-lg border border-[#E8E1D5] text-xs outline-none"
          />
          <input
            type="text"
            placeholder="Type your question here (e.g. Does this saree come with an unstitched blouse piece?)..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            required
            className="flex-1 p-2.5 bg-white rounded-lg border border-[#E8E1D5] text-xs outline-none"
          />
          <button
            type="submit"
            disabled={isAsking}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-bold rounded-lg transition shadow disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAsking ? 'Submitting...' : 'Ask Question'}</span>
          </button>
        </div>
      </form>

      {/* Q&A List */}
      <div className="space-y-4 divide-y divide-[#E8E1D5]">
        {filteredQA.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            {searchQuery ? `No matching questions found for "${searchQuery}". Be the first to ask!` : 'No questions asked yet for this piece. Have a query? Ask our team above!'}
          </div>
        ) : (
          filteredQA.map((item) => (
            <div key={item.id} className="pt-4 first:pt-0 space-y-2">
              {/* Question */}
              <div className="flex items-start gap-3">
                <span className="font-bold text-[#5B1425] text-xs shrink-0 font-serif">Q:</span>
                <div className="text-xs font-semibold text-gray-900 leading-snug">
                  {item.question}
                </div>
              </div>

              {/* Answer */}
              {item.answer ? (
                <div className="flex items-start gap-3 pl-0 sm:pl-2">
                  <span className="font-bold text-[#C5A059] text-xs shrink-0 font-serif">A:</span>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {item.answer}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                      {item.answered_by ? (
                        <span className="flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{item.answered_by}</span>
                        </span>
                      ) : (
                        <span className="text-gray-600 font-medium bg-gray-100 px-2 py-0.5 rounded">
                          <span>Staff Response</span>
                        </span>
                      )}
                      <span>•</span>
                      <span>Asked by {item.user_name || 'Patron'}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleHelpfulVote(item.id)}
                        className={`inline-flex items-center gap-1 hover:text-[#5B1425] transition cursor-pointer ${
                          votedIds.has(item.id) ? 'text-emerald-700 font-bold' : ''
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful ({item.helpful_votes || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-0 sm:pl-2 text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/60 rounded-lg px-2.5 py-1.5">
                  <span className="italic">Awaiting artisan concierge review &amp; answer</span>
                  <span>•</span>
                  <span className="text-gray-500">Asked by {item.user_name || 'Patron'}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
