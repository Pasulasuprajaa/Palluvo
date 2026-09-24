import React, { useState } from 'react';
import { X, RotateCcw, Calendar, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ReturnModal({ isOpen, onClose, order, onReturnSuccess }) {
  const { showToast } = useToast();
  const [returnType, setReturnType] = useState('Exchange'); // 'Exchange' | 'Return & Refund'
  const [reason, setReason] = useState('Color / Shade variation under indoor light');
  const [comments, setComments] = useState('');
  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const reasons = [
    'Color / Shade variation under indoor light',
    'Fabric texture differs from expectation',
    'Blouse piece length / cutting requirement change',
    'Occasion postponed or changed',
    'Received damaged or defect in zari weave',
    'Want to exchange for different saree design'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('palluvo_token');
      const res = await fetch(`/api/orders/return/${order.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          return_type: returnType,
          reason: comments.trim() ? `${reason} — ${comments.trim()}` : reason,
          pickup_date: pickupDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule return');

      showToast(data.message || `✨ Your ${returnType} request has been scheduled with BlueDart courier!`, 'success');
      if (onReturnSuccess) onReturnSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to submit return request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#C5A059]/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5B1425] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-[#C5A059]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#E5D3B3]">
                7-Day Hassle-Free Return & Exchange
              </h3>
              <p className="text-xs text-white/70">
                Order #{order.order_number || order.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Action Type Toggle */}
          <div>
            <label className="block font-semibold uppercase text-gray-700 tracking-wider mb-2">
              Select Action *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReturnType('Exchange')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  returnType === 'Exchange'
                    ? 'border-[#5B1425] bg-[#5B1425]/5 text-[#5B1425] font-bold shadow-xs'
                    : 'border-[#E8E1D5] bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-sm">🔄 Saree Exchange</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Switch for another piece/shade</div>
              </button>

              <button
                type="button"
                onClick={() => setReturnType('Return & Refund')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  returnType === 'Return & Refund'
                    ? 'border-[#5B1425] bg-[#5B1425]/5 text-[#5B1425] font-bold shadow-xs'
                    : 'border-[#E8E1D5] bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-sm">💸 Return & 100% Refund</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Direct refund to original payment method</div>
              </button>
            </div>
          </div>

          {/* Reason Selector */}
          <div>
            <label className="block font-semibold uppercase text-gray-700 tracking-wider mb-1.5">
              Reason for {returnType} *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none"
            >
              {reasons.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Additional details */}
          <div>
            <label className="block font-semibold uppercase text-gray-700 tracking-wider mb-1">
              Comments / Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Tell our concierge team any additional instructions..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none"
            />
          </div>

          {/* Pickup Date Selection */}
          <div>
            <label className="block font-semibold uppercase text-gray-700 tracking-wider mb-1">
              Preferred Doorstep Pickup Date *
            </label>
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#E8E1D5]">
              <Calendar className="w-4 h-4 text-[#5B1425]" />
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              • Our courier associate will verify the Silk Mark tag and original luxury gift box during pickup.
            </p>
          </div>

          {/* Guarantee Note */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>PALLUVO Guarantee: 100% free doorstep pickup with zero return courier fee.</span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-semibold rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : `Confirm ${returnType}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
