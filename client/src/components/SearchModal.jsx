import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Sparkles, ArrowRight, History, Trash2, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function SearchModal({ onNavigate }) {
  const { isSearchOpen, setIsSearchOpen } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  const getVisibleFocusableElements = (container) => {
    if (!container) return [];
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
    return Array.from(container.querySelectorAll(selector)).filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });
  };

  useEffect(() => {
    if (isSearchOpen) {
      previousActiveElementRef.current = document.activeElement;
      try {
        const stored = localStorage.getItem('palluvo_recent_searches');
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch (e) {}
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 50);
      }
    } else if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
      previousActiveElementRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSearchOpen(false);
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = getVisibleFocusableElements(modalRef.current);
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    setError(null);
    if (!trimmedQuery) {
      setResults({ products: [], categories: [] });
      setLoading(false);
      return;
    }

    setResults({ products: [], categories: [] });
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/products/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          if (!controller.signal.aborted) {
            setResults({ products: [], categories: [] });
            setError('Unable to load search suggestions');
          }
          return;
        }
        const data = await res.json();
        if (!controller.signal.aborted) {
          setResults(data || { products: [], categories: [] });
          setError(null);
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error(e);
          if (!controller.signal.aborted) {
            setResults({ products: [], categories: [] });
            setError('Unable to load search suggestions');
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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

  // Required Popular Searches from Mobile Spec
  const popularSearches = [
    'Banarasi Saree',
    'Silk Saree',
    'Wedding Saree',
    'Kanjivaram',
    'Party Wear',
    'Organza Floral',
    'Mulmul Cotton'
  ];

  const quickCategories = [
    { name: 'Banarasi Sarees', slug: 'banarasi-sarees', icon: '🪷' },
    { name: 'Kanjivaram Silk', slug: 'kanjivaram-sarees', icon: '👑' },
    { name: 'Pure Silk', slug: 'silk-sarees', icon: '✨' },
    { name: 'Organza Sarees', slug: 'organza-sarees', icon: '🌸' },
    { name: 'Bridal Edit', slug: 'bridal-collection', icon: '💍' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center sm:pt-16 sm:px-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchOpen(false);
      }}
    >
      <div
        ref={modalRef}
        className="bg-[#FAF7F2] w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl shadow-2xl border border-[#C5A059]/30 flex flex-col overflow-hidden"
      >
        {/* Search Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#E8E1D5] bg-white">
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <h2
              id="search-modal-title"
              className="font-serif font-bold text-sm text-[#5B1425] tracking-wider uppercase sm:sr-only"
            >
              Search PALLUVO
            </h2>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
              className="p-1.5 rounded-full text-[#6E6467] hover:text-[#5B1425] hover:bg-[#F4EFEB] transition cursor-pointer sm:hidden"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex items-center bg-[#FAF7F2] border border-[#E0D8CD] rounded-xl px-3.5 py-2.5">
            <Search className="w-5 h-5 text-[#5B1425] mr-2.5 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sarees, collections & more..."
              aria-label="Search sarees and collections"
              className="w-full bg-transparent text-sm sm:text-base text-[#1F1A1C] placeholder-gray-400 focus:outline-hidden font-sans"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search input"
                className="text-gray-400 hover:text-black mr-2 text-xs uppercase font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
              className="hidden sm:inline-flex p-1 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* Screen Reader Live Status Region */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {query.trim() ? (
            loading ? (
              'Searching PALLUVO handcrafted vault...'
            ) : error ? (
              `Unable to load search suggestions for "${query.trim()}".`
            ) : results.products && results.products.length > 0 ? (
              `${results.products.length} saree result${results.products.length === 1 ? '' : 's'}${results.categories && results.categories.length > 0 ? ` and ${results.categories.length} suggested categor${results.categories.length === 1 ? 'y' : 'ies'}` : ''} found for "${query.trim()}".`
            ) : (
              `No matching sarees found for "${query.trim()}".`
            )
          ) : ''}
        </div>

        {/* Live Search Results / Trending / Recent */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {query.trim() ? (
            <div>
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-500 animate-pulse">
                  <Sparkles className="w-5 h-5 text-[#C5A059] mx-auto mb-2 animate-spin" />
                  Searching PALLUVO handcrafted vault...
                </div>
              ) : error ? (
                <div className="py-12 text-center space-y-3 bg-white rounded-xl p-6 border border-[#E8E1D5]">
                  <div className="text-3xl">⚠️</div>
                  <div className="font-serif font-bold text-sm text-[#5B1425]">
                    Unable to load suggestions
                  </div>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    We encountered an issue fetching suggestions for "{query.trim()}". You can still view full search results below.
                  </p>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-md"
                  >
                    <span>Search for "{query.trim()}"</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {results.categories && results.categories.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
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
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Matching Sarees ({results.products.length})
                      </div>
                      <div className="space-y-2">
                        {results.products.map(prod => (
                          <button
                            type="button"
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="w-full text-left flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white bg-white sm:bg-[#FAF7F2] border border-[#E8E1D5] focus:border-[#5B1425] focus:ring-2 focus:ring-[#5B1425]/30 focus:outline-hidden cursor-pointer transition group shadow-xs active:scale-[0.99]"
                          >
                            <img
                              src={prod.primary_image || '/images/categories/banarasi.jpg'}
                              alt={prod.name}
                              className="w-12 h-16 object-cover rounded-lg shadow-xs group-hover:scale-105 transition shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] transition truncate">
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
                                {Number(prod.review_count) > 0 && prod.rating ? (
                                  <span className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>{Number(prod.rating).toFixed(1)}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#6E6467] bg-[#FAF7F2] px-1.5 py-0.5 rounded font-medium border border-[#EAE2D7] flex items-center gap-0.5">
                                    <Star className="w-3 h-3 text-[#A09699]" />
                                    <span>Unrated</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#5B1425] group-hover:translate-x-1 transition shrink-0" />
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleSearchSubmit}
                        className="w-full mt-4 py-3 bg-[#5B1425] hover:bg-[#430e1b] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <span>View all results for "{query}"</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-3 bg-white rounded-xl p-6 border border-[#E8E1D5]">
                      <div className="text-3xl">🔍</div>
                      <div className="font-serif font-bold text-sm text-[#1F1A1C]">
                        No matching sarees found for "{query}"
                      </div>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto">
                        Try searching by fabric like "Banarasi", "Kanjivaram", "Silk", or browse our popular edits below.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-[#5B1425]" />
                      <span>Recent Searches</span>
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-gray-400 hover:text-red-700 flex items-center gap-1 cursor-pointer font-normal text-[11px]"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(term);
                          saveRecentSearch(term);
                        }}
                        className="text-xs bg-white border border-[#E8E1D5] text-[#1F1A1C] px-3 py-1.5 rounded-full hover:border-[#5B1425] transition cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Popular Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(term);
                        saveRecentSearch(term);
                      }}
                      className="text-xs bg-white border border-[#E8E1D5] hover:border-[#5B1425] hover:text-[#5B1425] px-3.5 py-2 rounded-xl transition shadow-2xs font-medium cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Categories */}
              <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Shop Curated Collections
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {quickCategories.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsSearchOpen(false);
                        onNavigate('shop', { category: c.slug });
                      }}
                      className="p-3 bg-white rounded-xl border border-[#E8E1D5] hover:border-[#5B1425] text-left transition flex items-center gap-2.5 group cursor-pointer shadow-2xs"
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span className="font-semibold text-gray-900 group-hover:text-[#5B1425]">
                        {c.name}
                      </span>
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
