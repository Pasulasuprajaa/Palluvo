import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function SearchModal({ onNavigate }) {
  const { isSearchOpen, setIsSearchOpen } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], categories: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/search/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isSearchOpen) return null;

  const handleSelectProduct = (product) => {
    setIsSearchOpen(false);
    onNavigate('product', { slug: product.slug });
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsSearchOpen(false);
    onNavigate('shop', { search: query.trim() });
  };

  const popularSearches = [
    'Banarasi Silk Saree',
    'Kanjivaram Bridal Gold',
    'Organza Rose Gold',
    'Midnight Cocktail Sequins',
    'Chanderi Tissue',
    'Mulmul Cotton Handloom',
    'Gota Patti Festive'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF7F2] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#EAE2D7] overflow-hidden">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center px-6 py-4 border-b border-[#EAE2D7]">
          <Search className="w-5 h-5 text-[#5B1425] mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sarees by fabric, weave, occasion, or color..."
            className="w-full bg-transparent text-lg text-[#1F1A1C] placeholder-[#6E6467]/60 focus:outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#6E6467] hover:text-[#1F1A1C] mr-3 text-sm"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded-full text-[#6E6467] hover:text-[#1F1A1C] hover:bg-[#F4EFEB] transition"
          >
            <X className="w-6 h-6" />
          </button>
        </form>

        {/* Live Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {query.trim() ? (
            <div>
              {loading ? (
                <div className="py-8 text-center text-sm text-[#6E6467] animate-pulse">
                  Searching the PALLUVO vault...
                </div>
              ) : (
                <>
                  {results.categories && results.categories.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-[#6E6467] uppercase tracking-wider mb-2">
                        Suggested Categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {results.categories.map((cat, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setIsSearchOpen(false);
                              onNavigate('shop', { category: cat.slug });
                            }}
                            className="text-xs bg-[#5B1425]/10 text-[#5B1425] px-3 py-1.5 rounded-full hover:bg-[#5B1425] hover:text-[#FAF7F2] transition flex items-center gap-1 font-medium"
                          >
                            <span>{cat.name}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.products && results.products.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold text-[#6E6467] uppercase tracking-wider mb-3">
                        Matching Sarees
                      </div>
                      <div className="space-y-2">
                        {results.products.map(prod => (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="flex items-center gap-4 p-2 rounded-xl hover:bg-[#F4EFEB] cursor-pointer transition group"
                          >
                            <img
                              src={prod.primary_image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                              alt={prod.name}
                              className="w-14 h-16 object-cover rounded-lg shadow-sm group-hover:scale-105 transition"
                            />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] transition line-clamp-1">
                                {prod.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-bold text-[#5B1425]">
                                  ₹{prod.price?.toLocaleString('en-IN')}
                                </span>
                                {prod.mrp && prod.mrp > prod.price && (
                                  <span className="text-xs text-[#6E6467] line-through">
                                    ₹{prod.mrp?.toLocaleString('en-IN')}
                                  </span>
                                )}
                                <span className="text-[11px] text-green-800 bg-green-50 px-1.5 py-0.2 rounded font-medium">
                                  ★ {prod.rating || 4.8}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#6E6467] group-hover:text-[#5B1425] group-hover:translate-x-1 transition" />
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSearchSubmit}
                        className="w-full mt-4 py-2.5 bg-[#5B1425] text-[#FAF7F2] rounded-xl text-sm font-semibold hover:bg-[#7E1E34] transition flex items-center justify-center gap-2"
                      >
                        <span>View all results for "{query}"</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[#6E6467]">
                      <p className="text-sm">No sarees matched your search.</p>
                      <p className="text-xs mt-1">Try searching for "Banarasi", "Kanjivaram", or "Organza".</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6467] uppercase tracking-wider mb-3">
                <TrendingUp className="w-4 h-4 text-[#C5A059]" />
                <span>Trending Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(term);
                    }}
                    className="text-xs bg-[#F4EFEB] hover:bg-[#5B1425] hover:text-[#FAF7F2] text-[#1F1A1C] px-3.5 py-2 rounded-full transition font-medium flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-[#C5A059]" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
