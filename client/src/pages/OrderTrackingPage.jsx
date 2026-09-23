import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Clock, Search, Package, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function OrderTrackingPage({ trackingId: initialId, onNavigate }) {
  const [searchInput, setSearchInput] = useState(initialId || 'PAL-2026-98124');
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { token } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (initialId) {
      handleTrack(initialId);
    } else {
      handleTrack('PAL-2026-98124'); // sample tracked order from seed
    }
  }, [initialId]);

  const handleTrack = async (idToSearch) => {
    const queryId = (idToSearch || searchInput).trim();
    if (!queryId) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/orders/track/${encodeURIComponent(queryId)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrderInfo(data.order);
      } else {
        setError(data.error || 'Order not found.');
      }
    } catch (err) {
      setError('Failed to fetch tracking details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#5B1425]">
          Live Shipment Status
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1A1C]">
          Track Your Saree Shipment
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6467]">
          Enter your PALLUVO Order ID or BlueDart Tracking AWB Number.
        </p>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleTrack();
        }}
        className="max-w-xl mx-auto flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6E6467] absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. PAL-2026-98124 or BLR-BD-889921"
            className="w-full bg-white border border-[#EAE2D7] rounded-xl pl-10 pr-4 py-3 text-xs text-[#1F1A1C] focus:outline-none focus:border-[#5B1425] shadow-sm font-mono"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition shadow-md"
        >
          Track
        </button>
      </form>

      {loading && (
        <div className="py-12 text-center text-xs text-[#6E6467]">
          <div className="w-8 h-8 border-2 border-[#5B1425] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Fetching live courier telemetry...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center max-w-lg mx-auto">
          {error}
        </div>
      )}

      {/* Tracking Details Showcase */}
      {orderInfo && !loading && (
        <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 sm:p-8 shadow-sm space-y-8">
          
          {/* Top Order Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#FAF7F2] rounded-xl border border-[#EAE2D7] text-xs">
            <div>
              <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Order Number</span>
              <span className="font-mono font-bold text-[#5B1425]">{orderInfo.order_number}</span>
            </div>
            <div>
              <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Courier Partner</span>
              <span className="font-bold text-[#1F1A1C]">{orderInfo.courier_partner || 'BlueDart Luxury Express'}</span>
            </div>
            <div>
              <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Tracking AWB</span>
              <span className="font-mono text-[#1F1A1C]">{orderInfo.tracking_number || 'BLR-BD-889921'}</span>
            </div>
            <div>
              <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Estimated Delivery</span>
              <span className="font-bold text-green-800">{orderInfo.estimated_delivery || 'Tomorrow, by 4 PM'}</span>
            </div>
          </div>

          {/* Visual Milestone Timeline */}
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F1A1C] mb-6">
              Shipment Progress Journey
            </h3>

            <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EAE2D7]">
              {orderInfo.timeline && orderInfo.timeline.map((item, idx) => {
                const isCompleted = item.status === 'completed';
                const isCurrent = item.status === 'current';

                return (
                  <div key={idx} className="relative flex items-start gap-4">
                    {/* Status Node Circle */}
                    <div
                      className={`absolute -left-6 mt-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-[#5B1425] text-[#C5A059] ring-4 ring-[#FAF7F2]'
                          : isCurrent
                          ? 'bg-[#C5A059] text-white ring-4 ring-[#FAF7F2] animate-pulse'
                          : 'bg-[#EAE2D7] text-transparent'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    </div>

                    {/* Step Description */}
                    <div className="flex-1 bg-[#FAF7F2] p-4 rounded-xl border border-[#EAE2D7]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isCompleted || isCurrent ? 'text-[#5B1425]' : 'text-[#6E6467]'}`}>
                          {item.stage}
                        </h4>
                        {item.timestamp && (
                          <span className="text-[11px] text-[#6E6467] font-medium">
                            {item.timestamp}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E6467] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saree Package Summary */}
          {orderInfo.items && orderInfo.items.length > 0 && (
            <div className="pt-6 border-t border-[#EAE2D7]">
              <h4 className="font-serif text-sm font-bold text-[#1F1A1C] mb-3">
                Items in this Consignment:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {orderInfo.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE2D7]">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                      alt={item.product_name}
                      className="w-12 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-semibold text-[#1F1A1C] line-clamp-1">{item.product_name}</div>
                      <div className="text-[#6E6467]">Qty: {item.quantity} • ₹{item.price?.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
