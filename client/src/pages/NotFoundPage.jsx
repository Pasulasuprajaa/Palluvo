import React from 'react';
import { Home, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';

export default function NotFoundPage({ onNavigate, invalidPath }) {
  const quickLinks = [
    { label: 'Banarasi Sarees', category: 'banarasi-sarees' },
    { label: 'Kanjivaram Silk', category: 'kanjivaram-sarees' },
    { label: 'Cotton & Handloom', category: 'cotton-sarees' },
    { label: 'Organza Drapes', category: 'organza-sarees' }
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#FAF7F2] px-4 py-16 text-center animate-fade-in">
      <div className="max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5B1425]/10 text-[#5B1425] mb-6">
          <Sparkles className="w-8 h-8 text-[#C5A059]" />
        </div>

        <span className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold block mb-2 font-serif">
          404 — Page Not Found
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1A1C] mb-4">
          The Drape You Seek Is Not Here
        </h1>

        <p className="text-sm text-[#6E6467] leading-relaxed mb-8 max-w-md mx-auto">
          The page or product URL {invalidPath ? <code className="text-[#5B1425] bg-[#5B1425]/5 px-1.5 py-0.5 rounded text-xs">{invalidPath}</code> : 'you requested'} could not be located in our atelier. It may have been relocated or archived.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] font-semibold text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none min-h-[44px]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Boutique</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-[#EAE2D7] hover:bg-[#FAF7F2] text-[#1F1A1C] font-semibold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none min-h-[44px]"
          >
            <Home className="w-4 h-4 text-[#5B1425]" />
            <span>Return to Home</span>
          </button>
        </div>

        <div className="pt-8 border-t border-[#EAE2D7]">
          <p className="text-xs font-semibold text-[#8C6D23] uppercase tracking-wider mb-4">
            Popular Luxury Edits
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickLinks.map((link) => (
              <button
                key={link.category}
                type="button"
                onClick={() => onNavigate('shop', { category: link.category })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAE2D7] hover:border-[#C5A059] rounded-lg text-xs text-[#1F1A1C] transition cursor-pointer"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-3 h-3 text-[#C5A059]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
