import React, { useState, useEffect } from 'react';
import { HelpCircle, Search, ThumbsUp, MessageSquare, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ProductQA({ productId, initialQA = [] }) {
  const [qaList, setQaList] = useState(initialQA);
  const [searchQuery, setSearchQuery] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [askerName, setAskerName] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    if (initialQA && initialQA.length > 0) {
      setQaList(initialQA);
    } else if (productId) {
      fetch(`/api/products/${productId}/qa`)
        .then(res => res.json())
        .then(data => {
          if (data.qa) setQaList(data.qa);
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
      const res = await fetch(`/api/products/qa/${qaId}/helpful`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setQaList(prev => prev.map(item =>
          item.id === qaId ? { ...item, helpful_votes: (item.helpful_votes || 0) + 1 } : item
        ));
        setVotedIds(prev => new Set([...prev, qaId]));
        showToast('Thank you for your feedback!', 'success');
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
      showToast('✨ Your question has been verified & answered by our Master Weaver Concierge!', 'success');
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
              Verified answers from PALLUVO Master Weavers and textile curators
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
          <span>Ask our Weaver Concierge about fabric, care, borders, or styling</span>
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
            placeholder="Type your question here (e.g. Does this saree come with Silk Mark tag?)..."
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
            {searchQuery ? `No matching questions found for "${searchQuery}". Be the first to ask!` : 'No questions asked yet. Ask our Weaver Concierge!'}
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
              {item.answer && (
                <div className="flex items-start gap-3 pl-0 sm:pl-2">
                  <span className="font-bold text-[#C5A059] text-xs shrink-0 font-serif">A:</span>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {item.answer}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {item.answered_by || 'PALLUVO Master Weaver Concierge'}
                      </span>
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
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
