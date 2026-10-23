import React, { useState, useEffect, useRef } from 'react';
import { Filter, SlidersHorizontal, ChevronDown, X, Sparkles, RotateCcw, Check, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function ShopPage({ onNavigate, initialFilters = {} }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Modal Dialog & Focus Management Refs
  const mobileFilterTriggerRef = useRef(null);
  const dialogPanelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || '');
  const [selectedOccasion, setSelectedOccasion] = useState(initialFilters.occasion || '');
  const [selectedFabric, setSelectedFabric] = useState(initialFilters.fabric || '');
  const [selectedColor, setSelectedColor] = useState(initialFilters.color || '');
  const [priceRange, setPriceRange] = useState(
    initialFilters.priceRange || {
      min: initialFilters.min_price || '',
      max: initialFilters.max_price || ''
    }
  );
  const [selectedRating, setSelectedRating] = useState(initialFilters.min_rating || '');
  const [inStockOnly, setInStockOnly] = useState(Boolean(initialFilters.in_stock));
  const [sortOption, setSortOption] = useState(initialFilters.sort || 'recommended');
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [filterTag, setFilterTag] = useState(initialFilters.filter || '');

  useEffect(() => {
    setSelectedCategory(initialFilters.category || '');
    setSelectedOccasion(initialFilters.occasion || '');
    setSelectedFabric(initialFilters.fabric || '');
    setSelectedColor(initialFilters.color || '');
    setPriceRange(
      initialFilters.priceRange || {
        min: initialFilters.min_price || '',
        max: initialFilters.max_price || ''
      }
    );
    setSelectedRating(initialFilters.min_rating || '');
    setInStockOnly(Boolean(initialFilters.in_stock));
    setSearchQuery(initialFilters.search || '');
    setFilterTag(initialFilters.filter || '');
    if (initialFilters.sort) {
      setSortOption(initialFilters.sort);
    }
  }, [initialFilters]);

  // Manage Mobile Filter Modal Dialog: Focus Entry, Trapping, Escape-to-close, and Focus Restoration
  useEffect(() => {
    if (mobileFilterOpen) {
      previouslyFocusedElementRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const focusTimer = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (dialogPanelRef.current) {
          dialogPanelRef.current.focus();
        }
      }, 0);

      const handleKeyDown = (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
          event.preventDefault();
          event.stopPropagation();
          setMobileFilterOpen(false);
          return;
        }

        if (event.key === 'Tab') {
          const dialogNode = dialogPanelRef.current;
          if (!dialogNode) return;

          const focusableElements = Array.from(
            dialogNode.querySelectorAll(
              'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

          if (focusableElements.length === 0) {
            event.preventDefault();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey) {
            if (document.activeElement === firstElement || !dialogNode.contains(document.activeElement)) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !dialogNode.contains(document.activeElement)) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown, true);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleKeyDown, true);

        const restoreTarget = previouslyFocusedElementRef.current || mobileFilterTriggerRef.current;
        if (restoreTarget && typeof restoreTarget.focus === 'function') {
          try {
            restoreTarget.focus();
          } catch (_) {}
          setTimeout(() => {
            if (typeof restoreTarget.focus === 'function') {
              try {
                restoreTarget.focus();
              } catch (_) {}
            }
          }, 0);
        }
      };
    }
  }, [mobileFilterOpen]);

  useEffect(() => {
    fetchFilteredProducts();
  }, [
    selectedCategory,
    selectedOccasion,
    selectedFabric,
    selectedColor,
    priceRange,
    selectedRating,
    inStockOnly,
    sortOption,
    searchQuery,
    filterTag
  ]);

  const fetchFilteredProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedOccasion) params.append('occasion', selectedOccasion);
      if (selectedFabric) params.append('fabric', selectedFabric);
      if (selectedColor) params.append('color', selectedColor);
      if (priceRange.min) params.append('min_price', priceRange.min);
      if (priceRange.max) params.append('max_price', priceRange.max);
      if (selectedRating) params.append('min_rating', selectedRating);
      if (inStockOnly) params.append('in_stock', '1');
      if (sortOption) params.append('sort', sortOption);
      if (searchQuery) params.append('search', searchQuery);

      if (filterTag === 'new_arrival') params.append('new_arrival', '1');
      if (filterTag === 'best_seller') params.append('best_seller', '1');
      if (filterTag === 'featured') params.append('featured', '1');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllFilters = () => {
    setSelectedCategory('');
    setSelectedOccasion('');
    setSelectedFabric('');
    setSelectedColor('');
    setPriceRange({ min: '', max: '' });
    setSelectedRating('');
    setInStockOnly(false);
    setSearchQuery('');
    setFilterTag('');
    setSortOption('recommended');
  };

  const hasActiveFilters = Boolean(
    selectedCategory ||
    selectedOccasion ||
    selectedFabric ||
    selectedColor ||
    priceRange.min ||
    priceRange.max ||
    selectedRating ||
    inStockOnly ||
    searchQuery ||
    filterTag
  );

  const colorsList = [
    { name: 'Wine', hex: '#5B1425' },
    { name: 'Gold', hex: '#C5A059' },
    { name: 'Blush', hex: '#E0B5B2' },
    { name: 'Black', hex: '#161413' },
    { name: 'Beige', hex: '#D1B48C' },
    { name: 'Sage', hex: '#7A8B7B' },
    { name: 'Yellow', hex: '#F2A900' },
    { name: 'Indigo', hex: '#2B4263' }
  ];

  const categoriesList = [
    { label: 'All Sarees', value: '' },
    { label: 'Banarasi Sarees', value: 'banarasi-sarees' },
    { label: 'Kanjivaram Sarees', value: 'kanjivaram-sarees' },
    { label: 'Silk Sarees', value: 'silk-sarees' },
    { label: 'Organza Sarees', value: 'organza-sarees' },
    { label: 'Cotton & Handloom', value: 'cotton-sarees' },
    { label: 'Designer Sarees', value: 'designer-sarees' },
    { label: 'Party Wear', value: 'party-wear' },
    { label: 'Bridal Collection', value: 'bridal-collection' }
  ];

  const occasionsList = ['Wedding', 'Festive', 'Party', 'Workwear'];
  const fabricsList = ['Silk', 'Katan', 'Kanjivaram', 'Organza', 'Cotton', 'Linen', 'Georgette', 'Tussar'];
  const priceRangesList = [
    { label: 'All Prices', min: '', max: '' },
    { label: 'Under ₹3,000', min: '0', max: '3000' },
    { label: '₹3,000 – ₹7,000', min: '3000', max: '7000' },
    { label: '₹7,000 – ₹15,000', min: '7000', max: '15000' },
    { label: 'Above ₹15,000 (Bridal)', shortLabel: 'Above ₹15,000', min: '15000', max: '50000' }
  ];
  const ratingsList = ['4.5', '4.0', '3.5'];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Breadcrumb & Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#EAE2D7] pb-4 sm:pb-6 gap-3 sm:gap-4">
        <div>
          <div className="text-[11px] sm:text-xs text-[#6E6467] flex items-center gap-1.5 mb-1">
            <button onClick={() => onNavigate('home')} className="hover:text-[#5B1425] cursor-pointer">Home</button>
            <span>/</span>
            <span className="text-[#1F1A1C] font-semibold truncate">
              {filterTag === 'new_arrival'
                ? 'NEW ARRIVALS'
                : filterTag === 'best_seller'
                ? 'BEST SELLERS'
                : filterTag === 'featured'
                ? 'CURATED COLLECTIONS'
                : selectedCategory
                ? selectedCategory.replace('-', ' ').toUpperCase()
                : (selectedOccasion ? `${selectedOccasion} Sarees` : 'Sarees Collection')}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C]">
            {filterTag === 'new_arrival'
              ? 'New Arrivals — Fresh off the Loom'
              : filterTag === 'best_seller'
              ? 'Best Selling Sarees'
              : filterTag === 'featured'
              ? 'Curated Heirloom Collections'
              : selectedCategory
              ? categoriesList.find(c => c.value === selectedCategory)?.label || 'Curated Sarees'
              : selectedOccasion
              ? `${selectedOccasion} Saree Collection`
              : 'Handwoven Sarees Vault'}
          </h1>
          <p className="text-xs text-[#6E6467] mt-0.5 sm:mt-1">
            Showing {products.length} authentic handcrafted silk masterworks
          </p>
        </div>

        {/* Mobile Filter & Sort Button Bar */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            ref={mobileFilterTriggerRef}
            onClick={() => setMobileFilterOpen(true)}
            aria-expanded={mobileFilterOpen}
            aria-controls="mobile-filter-dialog"
            aria-haspopup="dialog"
            className="flex-1 sm:flex-none lg:hidden px-4 py-2.5 bg-white border border-[#EAE2D7] rounded-xl text-xs font-bold text-[#1F1A1C] flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <Filter className="w-4 h-4 text-[#5B1425]" aria-hidden="true" />
            <span>Filter & Sort {hasActiveFilters ? '•' : ''}</span>
          </button>

          <div className="flex-1 sm:flex-none flex items-center justify-between gap-1.5 bg-white border border-[#EAE2D7] rounded-xl px-3 py-2 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#6E6467] shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1F1A1C] focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="recommended">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="best_seller">Best Sellers</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Curated Collection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-touch py-1">
        <button
          onClick={() => { setFilterTag(''); setSelectedCategory(''); }}
          aria-pressed={!filterTag && !selectedCategory}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            !filterTag && !selectedCategory
              ? 'bg-[#5B1425] text-[#FAF7F2] shadow-xs'
              : 'bg-white border border-[#EAE2D7] text-[#1F1A1C] hover:border-[#5B1425]'
          }`}
        >
          All Sarees
        </button>
        <button
          onClick={() => setFilterTag(filterTag === 'best_seller' ? '' : 'best_seller')}
          aria-pressed={filterTag === 'best_seller'}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            filterTag === 'best_seller'
              ? 'bg-gradient-to-r from-[#C6A15B] to-[#D4AF37] text-[#1F1A1C] font-extrabold shadow-xs border border-[#B38F48]'
              : 'bg-white border border-[#EAE2D7] text-[#1F1A1C] hover:border-[#C6A15B]'
          }`}
        >
          <span className="text-amber-600 font-bold">★</span>
          <span>Best Sellers</span>
        </button>
        <button
          onClick={() => setFilterTag(filterTag === 'new_arrival' ? '' : 'new_arrival')}
          aria-pressed={filterTag === 'new_arrival'}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            filterTag === 'new_arrival'
              ? 'bg-[#1F1A1C] text-[#FAF7F2] font-bold shadow-xs'
              : 'bg-white border border-[#EAE2D7] text-[#1F1A1C] hover:border-[#1F1A1C]'
          }`}
        >
          New Arrivals
        </button>
        <button
          onClick={() => setSelectedCategory(selectedCategory === 'banarasi-sarees' ? '' : 'banarasi-sarees')}
          aria-pressed={selectedCategory === 'banarasi-sarees'}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'banarasi-sarees'
              ? 'bg-[#5B1425] text-[#FAF7F2] font-bold shadow-xs'
              : 'bg-white border border-[#EAE2D7] text-[#1F1A1C] hover:border-[#5B1425]'
          }`}
        >
          Banarasi Silks
        </button>
        <button
          onClick={() => setSelectedCategory(selectedCategory === 'kanjivaram-sarees' ? '' : 'kanjivaram-sarees')}
          aria-pressed={selectedCategory === 'kanjivaram-sarees'}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'kanjivaram-sarees'
              ? 'bg-[#5B1425] text-[#FAF7F2] font-bold shadow-xs'
              : 'bg-white border border-[#EAE2D7] text-[#1F1A1C] hover:border-[#5B1425]'
          }`}
        >
          Kanjivaram
        </button>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
          <span className="text-[11px] sm:text-xs font-medium text-[#6E6467]">Filters:</span>
          {filterTag && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Collection: {filterTag === 'new_arrival' ? 'New Arrivals' : filterTag === 'best_seller' ? 'Best Sellers' : filterTag === 'featured' ? 'Curated Collections' : filterTag}
              <button onClick={() => setFilterTag('')} aria-label="Remove collection filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Category: {selectedCategory}
              <button onClick={() => setSelectedCategory('')} aria-label="Remove category filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedOccasion && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Occasion: {selectedOccasion}
              <button onClick={() => setSelectedOccasion('')} aria-label="Remove occasion filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedFabric && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Fabric: {selectedFabric}
              <button onClick={() => setSelectedFabric('')} aria-label="Remove fabric filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedColor && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Color: {selectedColor}
              <button onClick={() => setSelectedColor('')} aria-label="Remove color filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {priceRange.max && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Max ₹{parseInt(priceRange.max).toLocaleString('en-IN')}
              <button onClick={() => setPriceRange({ min: '', max: '' })} aria-label="Remove price filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedRating && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#5B1425]/10 text-[#5B1425] text-[11px] rounded-full font-medium">
              Rating: {selectedRating}★ & up
              <button onClick={() => setSelectedRating('')} aria-label="Remove rating filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] rounded-full font-medium">
              In Stock Only
              <button onClick={() => setInStockOnly(false)} aria-label="Remove in stock filter"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={handleClearAllFilters}
            className="text-[11px] sm:text-xs text-[#5B1425] font-bold hover:underline flex items-center gap-1 ml-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Main Layout: Desktop Sidebar Filters + 2-Col Mobile Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
        
        {/* Desktop Sidebar Filters (Hidden on Mobile) */}
        <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-2xl border border-[#EAE2D7] sticky top-28 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D7]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#5B1425]" />
              <h3 className="font-serif font-bold text-sm text-[#1F1A1C] uppercase tracking-wider">
                Refine Saree Selection
              </h3>
            </div>
            {hasActiveFilters && (
              <button onClick={handleClearAllFilters} className="text-[11px] text-[#5B1425] font-semibold hover:underline cursor-pointer">
                Clear
              </button>
            )}
          </div>

          {/* 1. Category */}
          <div>
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Category</h4>
            <div className="space-y-1 text-xs">
              {categoriesList.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  aria-pressed={selectedCategory === cat.value}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    selectedCategory === cat.value ? 'bg-[#5B1425] text-[#FAF7F2] font-semibold' : 'text-[#1F1A1C] hover:bg-[#F4EFEB]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Price Range */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Price Range</h4>
            <div className="space-y-1.5 text-xs">
              {priceRangesList.map((p, idx) => {
                const isSelected = priceRange.min === p.min && priceRange.max === p.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPriceRange({ min: p.min, max: p.max })}
                    aria-pressed={isSelected}
                    className={`w-full text-left px-2.5 py-1 rounded transition cursor-pointer ${
                      isSelected ? 'text-[#5B1425] font-bold bg-[#5B1425]/10' : 'text-[#6E6467] hover:text-[#1F1A1C]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Occasion */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Occasion</h4>
            <div className="flex flex-wrap gap-1.5">
              {occasionsList.map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setSelectedOccasion(selectedOccasion === occ ? '' : occ)}
                  aria-pressed={selectedOccasion === occ}
                  className={`px-3 py-1 text-xs rounded-full border transition cursor-pointer ${
                    selectedOccasion === occ
                      ? 'bg-[#5B1425] text-[#FAF7F2] border-[#5B1425] font-medium'
                      : 'bg-[#FAF7F2] border-[#EAE2D7] text-[#1F1A1C] hover:border-[#5B1425]'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Fabric */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Fabric</h4>
            <div className="flex flex-wrap gap-1.5">
              {fabricsList.map((fab) => (
                <button
                  key={fab}
                  type="button"
                  onClick={() => setSelectedFabric(selectedFabric === fab ? '' : fab)}
                  aria-pressed={selectedFabric === fab}
                  className={`px-3 py-1 text-xs rounded-full border transition cursor-pointer ${
                    selectedFabric === fab
                      ? 'bg-[#5B1425] text-[#FAF7F2] border-[#5B1425] font-medium'
                      : 'bg-[#FAF7F2] border-[#EAE2D7] text-[#1F1A1C] hover:border-[#5B1425]'
                  }`}
                >
                  {fab}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Color Palette */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Color Palette</h4>
            <div className="grid grid-cols-4 gap-2">
              {colorsList.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(selectedColor === c.name ? '' : c.name)}
                  aria-pressed={selectedColor === c.name}
                  aria-label={c.name}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition cursor-pointer ${
                    selectedColor === c.name ? 'border-[#5B1425] bg-[#5B1425]/5 shadow-xs' : 'border-transparent hover:bg-[#F4EFEB]'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-[#6E6467] font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Customer Rating */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Customer Rating</h4>
            <div className="flex gap-2">
              {ratingsList.map((r) => {
                const isSelected = selectedRating === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRating(selectedRating === r ? '' : r)}
                    aria-pressed={isSelected}
                    className={`flex-1 p-2 rounded-xl border text-xs flex items-center justify-center gap-1 cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#5B1425] text-white border-[#5B1425] font-bold shadow-xs'
                        : 'bg-[#FAF7F2] border-[#EAE2D7] text-[#1F1A1C] hover:border-[#5B1425]'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    <span>{r}★+</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Availability */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <label className="flex items-center gap-2 text-xs font-medium text-[#1F1A1C] cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 text-[#5B1425] rounded accent-[#5B1425]"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* 2-Column Product Grid Area on Mobile */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 py-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-[#EAE2D7]/50 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white rounded-2xl border border-[#EAE2D7] p-6 sm:p-8">
              <div className="w-14 h-14 mx-auto bg-[#F4EFEB] rounded-full flex items-center justify-center text-2xl">
                🥻
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F1A1C]">
                No sarees found matching your filters.
              </h3>
              <p className="text-xs text-[#6E6467] max-w-sm mx-auto">
                Try resetting your filters or adjusting your price/fabric selection to view more heirloom sarees.
              </p>
              <button
                onClick={handleClearAllFilters}
                className="px-6 py-2.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#7E1E34] transition shadow-md cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom-Sheet / Full-Screen Filter Panel */}
      {mobileFilterOpen && (
        <div
          id="mobile-filter-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filter-title"
          className="fixed inset-0 z-50 overflow-hidden lg:hidden"
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />
          
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div
              ref={dialogPanelRef}
              tabIndex={-1}
              className="w-screen max-w-md bg-[#FAF7F2] shadow-2xl flex flex-col justify-between focus:outline-none"
            >
              
              {/* Header */}
              <div className="p-4 border-b border-[#EAE2D7] bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#5B1425]" aria-hidden="true" />
                  <h2 id="mobile-filter-title" className="font-serif font-bold text-sm text-[#1F1A1C] uppercase tracking-wider">
                    Filter & Sort Sarees
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  aria-label="Close filters"
                  className="p-1.5 rounded-full text-[#6E6467] hover:bg-[#F4EFEB] transition cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Filter Body with 7 Facets */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 1. Category */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Category</h3>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {categoriesList.map(c => {
                      const isSelected = selectedCategory === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setSelectedCategory(c.value)}
                          aria-pressed={isSelected}
                          className={`p-2.5 rounded-xl text-left transition font-medium cursor-pointer ${
                            isSelected ? 'bg-[#5B1425] text-white font-bold shadow-xs' : 'bg-white border border-[#EAE2D7] text-[#1F1A1C]'
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Price Range */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Price Range</h3>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {priceRangesList.map((p, idx) => {
                      const isSelected = priceRange.min === p.min && priceRange.max === p.max;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPriceRange({ min: p.min, max: p.max })}
                          aria-pressed={isSelected}
                          className={`p-2.5 rounded-xl text-left transition font-medium cursor-pointer ${
                            isSelected
                              ? 'bg-[#5B1425] text-white font-bold shadow-xs'
                              : 'bg-white border border-[#EAE2D7] text-[#1F1A1C]'
                          }`}
                        >
                          {p.shortLabel || p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Color */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Color Palette</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {colorsList.map(c => {
                      const isSelected = selectedColor === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedColor(selectedColor === c.name ? '' : c.name)}
                          aria-pressed={isSelected}
                          aria-label={c.name}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 bg-white cursor-pointer ${
                            isSelected ? 'border-[#5B1425] ring-2 ring-[#5B1425]' : 'border-[#EAE2D7]'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                          <span className="text-[10px] text-[#1F1A1C]">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Fabric */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Fabric</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {fabricsList.map(f => {
                      const isSelected = selectedFabric === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSelectedFabric(selectedFabric === f ? '' : f)}
                          aria-pressed={isSelected}
                          className={`px-3.5 py-2 rounded-xl text-xs border transition cursor-pointer ${
                            isSelected ? 'bg-[#5B1425] text-white border-[#5B1425] font-bold' : 'bg-white border-[#EAE2D7] text-[#1F1A1C]'
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Occasion */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Occasion</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {occasionsList.map(o => {
                      const isSelected = selectedOccasion === o;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setSelectedOccasion(selectedOccasion === o ? '' : o)}
                          aria-pressed={isSelected}
                          className={`px-3.5 py-2 rounded-xl text-xs border transition cursor-pointer ${
                            isSelected ? 'bg-[#5B1425] text-white border-[#5B1425] font-bold' : 'bg-white border-[#EAE2D7] text-[#1F1A1C]'
                          }`}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Rating */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Customer Rating</h3>
                  <div className="flex gap-2">
                    {ratingsList.map(r => {
                      const isSelected = selectedRating === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedRating(selectedRating === r ? '' : r)}
                          aria-pressed={isSelected}
                          className={`flex-1 p-2 rounded-xl border text-xs flex items-center justify-center gap-1 cursor-pointer transition ${
                            isSelected ? 'bg-[#5B1425] text-white border-[#5B1425] font-bold shadow-xs' : 'bg-white border-[#EAE2D7]'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          <span>{r} & up</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Availability */}
                <div className="p-3 bg-white rounded-xl border border-[#EAE2D7]">
                  <label className="flex items-center justify-between text-xs font-semibold text-[#1F1A1C] cursor-pointer">
                    <span>In Stock Only</span>
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-4 h-4 text-[#5B1425] accent-[#5B1425]"
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-[#EAE2D7] bg-white grid grid-cols-2 gap-3 safe-area-pb">
                <button
                  type="button"
                  onClick={() => {
                    handleClearAllFilters();
                    setMobileFilterOpen(false);
                  }}
                  className="py-3 border border-[#5B1425] text-[#5B1425] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#5B1425]/5 transition cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="py-3 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-[#7E1E34] transition cursor-pointer"
                >
                  Apply Filters ({products.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
