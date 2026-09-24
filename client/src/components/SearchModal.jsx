import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Sparkles, ArrowRight, History, Trash2, Tag, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function SearchModal({ onNavigate }) {
  const { isSearchOpen, setIsSearchOpen } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen) {
      try {
        const stored = localStorage.getItem('palluvo_recent_searches');
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch (e) {}
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 100);
      }
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

  const saveRecentSearch = (term) => {
    try {
      const updated = [term, ...recentSearches.filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('palluvo_recent_searches', JSON.stringify(updated));
    } catch (e) {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('palluvo_recent_searches');
  };

  const handleSelectProduct = (product) => {
    saveRecentSearch(product.name);
    setIsSearchOpen(false);
    onNavigate('product', { slug: product.slug });
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    setIsSearchOpen(false);
    onNavigate('shop', { search: query.trim() });
  };

  const popularSearches = [
    'Banarasi Silk Saree',
    'Kanjivaram Bridal Gold',
    'Organza Rose Gold',
    'Midnight Cocktail Sequins',
    'Chanderi Tissue Silk',
    'Mulmul Cotton Handloom',
    'Gota Patti Festive'
  ];

  const quickCategories = [
    { name: 'Banarasi Sarees', slug: 'banarasi-sarees', icon: '🪷' },
    { name: 'Kanjivaram Sarees', slug: 'kanjivaram-sarees', icon: '👑' },
    { name: 'Organza Sarees', slug: 'organza-sarees', icon: '✨' },
    { name: 'Mulmul Cotton', slug: 'cotton-sarees', icon: '🌿' },
    { name: 'Bridal Edit', slug: 'bridal-collection', icon: '💍' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF7F2] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#C5A059]/30 overflow-hidden">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center px-6 py-4 border-b border-[#E8E1D5] bg-white">
          <Search className="w-5 h-5 text-[#5B1425] mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sarees by fabric, occasion, color, or zari weave..."
            className="w-full bg-transparent text-base sm:text-lg text-[#1F1A1C] placeholder-gray-400 focus:outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-black mr-3 text-xs uppercase font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        {/* Live Search Results / Trending / Recent */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {query.trim() ? (
            <div>
              {loading ? (
                <div className="py-8 text-center text-xs text-gray-500 animate-pulse">
                  Searching the PALLUVO vault...
                </div>
              ) : (
                <>
                  {results.categories && results.categories.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Suggested Categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {results.categories.map((cat, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              saveRecentSearch(cat.name);
                              setIsSearchOpen(false);
                              onNavigate('shop', { category: cat.slug });
                            }}
                            className="text-xs bg-[#5B1425]/10 text-[#5B1425] px-3 py-1.5 rounded-full hover:bg-[#5B1425] hover:text-white transition flex items-center gap-1 font-medium cursor-pointer"
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
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Matching Sarees
                      </div>
                      <div className="space-y-2">
                        {results.products.map(prod => (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-white bg-[#FAF7F2] border border-transparent hover:border-[#E8E1D5] cursor-pointer transition group shadow-xs"
                          >
                            <img
                              src={prod.primary_image || '/images/categories/banarasi.jpg'}
                              alt={prod.name}
                              className="w-12 h-16 object-cover rounded-lg shadow-xs group-hover:scale-105 transition"
                            />
                            <div className="flex-1">
                              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] transition line-clamp-1">
                                {prod.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-bold text-[#5B1425] font-mono">
                                  ₹{prod.price?.toLocaleString('en-IN')}
                                </span>
                                {prod.mrp && prod.mrp > prod.price && (
                                  <span className="text-xs text-gray-400 line-through">
                                    ₹{prod.mrp?.toLocaleString('en-IN')}
                                  </span>
                                )}
                                <span className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  <span>{prod.rating || 4.8}</span>
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#5B1425] group-hover:translate-x-1 transition" />
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSearchSubmit}
                        className="w-full mt-4 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow"
                      >
                        <span>View all results for "{query}"</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <p className="text-sm">No sarees matched your search.</p>
                      <p className="text-xs mt-1">Try searching for "Banarasi", "Kanjivaram", or "Silk".</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recent Searches (Flipkart / Amazon style) */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#5B1425]" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      onClick={clearRecentSearches}
                      className="text-gray-400 hover:text-red-500 transition text-[11px] font-normal cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(term)}
                        className="text-xs bg-white border border-[#E8E1D5] hover:border-[#5B1425] hover:text-[#5B1425] text-gray-700 px-3 py-1.5 rounded-full transition font-medium cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4 text-[#C5A059]" />
                  <span>Trending Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(term)}
                      className="text-xs bg-white border border-[#E8E1D5] hover:bg-[#5B1425] hover:text-white hover:border-[#5B1425] text-gray-800 px-3.5 py-2 rounded-full transition font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-[#C5A059]" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Categories */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  <Tag className="w-4 h-4 text-[#5B1425]" />
                  <span>Explore Vault Collections</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {quickCategories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsSearchOpen(false);
                        onNavigate('shop', { category: cat.slug });
                      }}
                      className="p-3 bg-white rounded-xl border border-[#E8E1D5] hover:border-[#C5A059] transition flex items-center gap-2.5 text-left cursor-pointer shadow-xs"
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="font-semibold text-gray-900">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
