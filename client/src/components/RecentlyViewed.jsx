import React, { useState, useEffect } from 'react';
import { History, Sparkles, ChevronRight, Eye } from 'lucide-react';
import ProductCard from './ProductCard';

export default function RecentlyViewed({ currentSlug, onNavigate }) {
  const [recentItems, setRecentItems] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('palluvo_recently_viewed');
      if (stored) {
        let parsed = JSON.parse(stored);
        if (currentSlug) {
          parsed = parsed.filter(item => item.slug !== currentSlug);
        }
        setRecentItems(parsed.slice(0, 4));
      }
    } catch (e) {
      setRecentItems([]);
    }
  }, [currentSlug]);

  if (recentItems.length === 0) return null;

  return (
    <section className="py-12 border-t border-[#E8E1D5] bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#5B1425]/10 text-[#5B1425]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#1F1A1C]">
                Recently Viewed Sarees
              </h3>
              <p className="text-xs text-gray-500">
                Continue exploring pieces you were admiring
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('shop')}
            className="flex items-center gap-1 text-xs font-semibold text-[#5B1425] hover:text-[#C5A059] transition cursor-pointer"
          >
            <span>Explore All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {recentItems.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
