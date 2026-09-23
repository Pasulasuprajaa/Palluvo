import React, { useState, useEffect } from 'react';
import { Sparkles, Tag, Copy, Check, ArrowRight, Award, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function OffersPage({ onNavigate }) {
  const [coupons, setCoupons] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchCoupons() {
      try {
        const res = await fetch('/api/coupons');
        const data = await res.json();
        if (res.ok && data.coupons) {
          setCoupons(data.coupons);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchCoupons();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast(`✨ Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-fade-in">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#5B1425]">
          Privilege Rewards
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1F1A1C]">
          PALLUVO Festive & Privilege Offers
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6467]">
          Unlock exclusive savings on pure Banarasi silk, Kanjivaram bridal masterworks, and festive weaves.
        </p>
      </div>

      {/* Featured Big Offer Card */}
      <div className="bg-[#3F0D19] text-[#FAF7F2] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-[#C5A059]/40 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 max-w-xl space-y-4 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/20 text-[#C5A059] rounded-full text-xs font-bold uppercase tracking-wider border border-[#C5A059]/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome Privilege Offer</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
            Flat 10% OFF on Your First Heirloom Saree
          </h2>
          <p className="text-xs sm:text-sm text-[#FAF7F2]/80 leading-relaxed">
            Begin your PALLUVO drape journey with our signature welcome discount on pure silk and handloom collections.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 justify-center md:justify-start">
            <div className="bg-[#FAF7F2] text-[#1F1A1C] px-5 py-3 rounded-xl font-mono font-bold text-sm tracking-widest flex items-center gap-3 border border-[#C5A059]">
              <span>WELCOME10</span>
              <button
                onClick={() => handleCopy('WELCOME10')}
                className="text-[#5B1425] hover:opacity-80 p-1"
                title="Copy Code"
              >
                {copiedCode === 'WELCOME10' ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => onNavigate('shop')}
              className="px-6 py-3 bg-[#C5A059] text-[#1F1A1C] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E0C07F] transition flex items-center gap-2 shadow-lg"
            >
              <span>Shop All Sarees</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-48 sm:w-64 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex-shrink-0">
          <img
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
            alt="Welcome Drape"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="space-y-6">
        <h3 className="font-serif text-2xl font-bold text-[#1F1A1C]">
          Active Promotional Coupons
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5B1425] uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{coupon.discount_percent}% Discount</span>
                  </span>
                  <span className="text-[10px] text-green-800 bg-green-50 px-2 py-0.5 rounded font-bold">
                    Active
                  </span>
                </div>

                <h4 className="font-serif text-lg font-bold text-[#1F1A1C]">
                  {coupon.title}
                </h4>

                <p className="text-xs text-[#6E6467] leading-relaxed">
                  {coupon.description}
                </p>

                <div className="text-[11px] text-[#6E6467] pt-1">
                  Min. Order: <strong>₹{coupon.min_order_amount?.toLocaleString('en-IN')}</strong> • Max Discount: <strong>₹{coupon.max_discount_amount?.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F4EFEB] flex items-center justify-between">
                <div className="font-mono text-xs font-bold bg-[#FAF7F2] text-[#5B1425] px-3 py-1.5 rounded-lg border border-[#EAE2D7]">
                  {coupon.code}
                </div>

                <button
                  onClick={() => handleCopy(coupon.code)}
                  className="px-4 py-1.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold rounded-lg hover:bg-[#7E1E34] transition flex items-center gap-1"
                >
                  {copiedCode === coupon.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
