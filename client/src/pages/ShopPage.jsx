import React, { useState, useEffect } from 'react';
import { Filter, SlidersHorizontal, ChevronDown, X, Sparkles, RotateCcw, Check } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function ShopPage({ onNavigate, initialFilters = {} }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || '');
  const [selectedOccasion, setSelectedOccasion] = useState(initialFilters.occasion || '');
  const [selectedFabric, setSelectedFabric] = useState(initialFilters.fabric || '');
  const [selectedColor, setSelectedColor] = useState(initialFilters.color || '');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedRating, setSelectedRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState(initialFilters.sort || 'recommended');
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [filterTag, setFilterTag] = useState(initialFilters.filter || '');

  useEffect(() => {
    if (initialFilters.category !== undefined) setSelectedCategory(initialFilters.category);
    if (initialFilters.occasion !== undefined) setSelectedOccasion(initialFilters.occasion);
    if (initialFilters.search !== undefined) setSearchQuery(initialFilters.search);
    if (initialFilters.filter !== undefined) setFilterTag(initialFilters.filter);
  }, [initialFilters]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Breadcrumb & Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#EAE2D7] pb-6 gap-4">
        <div>
          <div className="text-xs text-[#6E6467] flex items-center gap-2 mb-1">
            <button onClick={() => onNavigate('home')} className="hover:text-[#5B1425]">Home</button>
            <span>/</span>
            <span className="text-[#1F1A1C] font-semibold">
              {selectedCategory ? selectedCategory.replace('-', ' ').toUpperCase() : (selectedOccasion ? `${selectedOccasion} Sarees` : 'Sarees Collection')}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C]">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : (selectedCategory
                  ? categoriesList.find(c => c.value === selectedCategory)?.label || 'Curated Sarees'
                  : (selectedOccasion ? `${selectedOccasion} Collection` : 'All Heirloom Sarees'))}
          </h1>
          <p className="text-xs text-[#6E6467] mt-1">
            Showing {products.length} luxury handcrafted drapes
          </p>
        </div>

        {/* Sorting & Mobile Filter Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden px-4 py-2.5 bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl text-xs font-semibold text-[#1F1A1C] flex items-center gap-2"
          >
            <Filter className="w-4 h-4 text-[#5B1425]" />
            <span>Filters {hasActiveFilters && '•'}</span>
          </button>

          <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2">
            <SlidersHorizontal className="w-4 h-4 text-[#6E6467]" />
            <span className="text-xs text-[#6E6467] hidden sm:inline font-medium">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1F1A1C] focus:outline-none cursor-pointer"
            >
              <option value="recommended">Featured & Recommended</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Customer Rating</option>
              <option value="best_seller">Best Selling</option>
              <option value="discount">Biggest Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-[#6E6467]">Active Filters:</span>
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#5B1425]/10 text-[#5B1425] text-xs rounded-full font-medium">
              Category: {selectedCategory}
              <button onClick={() => setSelectedCategory('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedOccasion && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#5B1425]/10 text-[#5B1425] text-xs rounded-full font-medium">
              Occasion: {selectedOccasion}
              <button onClick={() => setSelectedOccasion('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedFabric && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#5B1425]/10 text-[#5B1425] text-xs rounded-full font-medium">
              Fabric: {selectedFabric}
              <button onClick={() => setSelectedFabric('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedColor && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#5B1425]/10 text-[#5B1425] text-xs rounded-full font-medium">
              Color: {selectedColor}
              <button onClick={() => setSelectedColor('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {priceRange.max && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#5B1425]/10 text-[#5B1425] text-xs rounded-full font-medium">
              Max ₹{parseInt(priceRange.max).toLocaleString('en-IN')}
              <button onClick={() => setPriceRange({ min: '', max: '' })}><X className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={handleClearAllFilters}
            className="text-xs text-[#5B1425] font-bold hover:underline flex items-center gap-1 ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Main Layout: Sidebar Filters + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-2xl border border-[#EAE2D7] sticky top-28 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D7]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#5B1425]" />
              <h3 className="font-serif font-bold text-sm text-[#1F1A1C] uppercase tracking-wider">
                Refine Saree Selection
              </h3>
            </div>
            {hasActiveFilters && (
              <button onClick={handleClearAllFilters} className="text-[11px] text-[#5B1425] font-semibold hover:underline">
                Clear
              </button>
            )}
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Category</h4>
            <div className="space-y-1 text-xs">
              {categoriesList.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                    selectedCategory === cat.value ? 'bg-[#5B1425] text-[#FAF7F2] font-semibold' : 'text-[#1F1A1C] hover:bg-[#F4EFEB]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Ranges */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Price Range</h4>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'All Prices', min: '', max: '' },
                { label: 'Under ₹3,000', min: '0', max: '3000' },
                { label: '₹3,000 – ₹7,000', min: '3000', max: '7000' },
                { label: '₹7,000 – ₹15,000', min: '7000', max: '15000' },
                { label: 'Above ₹15,000 (Bridal)', min: '15000', max: '50000' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPriceRange({ min: p.min, max: p.max })}
                  className={`w-full text-left px-2.5 py-1 rounded transition ${
                    priceRange.min === p.min && priceRange.max === p.max ? 'text-[#5B1425] font-bold bg-[#5B1425]/10' : 'text-[#6E6467] hover:text-[#1F1A1C]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Occasion */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Occasion</h4>
            <div className="flex flex-wrap gap-1.5">
              {occasionsList.map((occ) => (
                <button
                  key={occ}
                  onClick={() => setSelectedOccasion(selectedOccasion === occ ? '' : occ)}
                  className={`px-3 py-1 text-xs rounded-full border transition ${
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

          {/* Fabric */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Fabric</h4>
            <div className="flex flex-wrap gap-1.5">
              {fabricsList.map((fab) => (
                <button
                  key={fab}
                  onClick={() => setSelectedFabric(selectedFabric === fab ? '' : fab)}
                  className={`px-3 py-1 text-xs rounded-full border transition ${
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

          {/* Color Swatches */}
          <div className="pt-3 border-t border-[#F4EFEB]">
            <h4 className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider mb-2">Color Palette</h4>
            <div className="grid grid-cols-4 gap-2">
              {colorsList.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedColor(selectedColor === c.name ? '' : c.name)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition ${
                    selectedColor === c.name ? 'border-[#5B1425] bg-[#5B1425]/5 shadow-sm' : 'border-transparent hover:bg-[#F4EFEB]'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[10px] text-[#6E6467] font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 py-12">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-[#EAE2D7]/50 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-[#EAE2D7] p-8">
              <div className="w-16 h-16 mx-auto bg-[#F4EFEB] rounded-full flex items-center justify-center text-3xl">
                🥻
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
                No sarees found matching your filters.
              </h3>
              <p className="text-xs text-[#6E6467] max-w-sm mx-auto">
                Try resetting your filters or adjusting your price/fabric selection to view more heirloom sarees.
              </p>
              <button
                onClick={handleClearAllFilters}
                className="px-6 py-2.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#7E1E34] transition shadow-md"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div onClick={() => setMobileFilterOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-[#FAF7F2] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D7]">
                  <h3 className="font-serif font-bold text-base text-[#1F1A1C]">Refine Sarees</h3>
                  <button onClick={() => setMobileFilterOpen(false)}><X className="w-5 h-5" /></button>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Categories</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {categoriesList.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setSelectedCategory(c.value)}
                        className={`p-2 rounded-lg text-left ${selectedCategory === c.value ? 'bg-[#5B1425] text-white font-bold' : 'bg-white border text-[#1F1A1C]'}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#1F1A1C] uppercase mb-2">Occasions</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {occasionsList.map(o => (
                      <button
                        key={o}
                        onClick={() => setSelectedOccasion(selectedOccasion === o ? '' : o)}
                        className={`px-3 py-1.5 text-xs rounded-full border ${selectedOccasion === o ? 'bg-[#5B1425] text-white' : 'bg-white'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#EAE2D7] grid grid-cols-2 gap-3">
                <button
                  onClick={handleClearAllFilters}
                  className="py-2.5 border border-[#5B1425] text-[#5B1425] rounded-xl text-xs font-bold uppercase"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
