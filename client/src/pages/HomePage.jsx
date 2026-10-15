import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Award, Heart, ShoppingBag, Star, ChevronRight, RotateCcw } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function HomePage({ onNavigate }) {
  const [bestSellers, setBestSellers] = useState([]);
  const [bestSellersLoading, setBestSellersLoading] = useState(true);
  const [bestSellersError, setBestSellersError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const catRes = await fetch('/api/categories');
      if (!catRes.ok) throw new Error('Failed to load categories');
      const catData = await catRes.json();
      if (catData.categories) {
        setCategories(catData.categories);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Category fetch error:', err);
      setCategoriesError('Unable to load weave categories at this time.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchBestSellers = async () => {
    try {
      setBestSellersLoading(true);
      setBestSellersError(null);
      const bestRes = await fetch('/api/products?best_seller=true&limit=4');
      if (!bestRes.ok) throw new Error('Failed to load best sellers');
      const bestData = await bestRes.json();
      if (bestData.products) {
        setBestSellers(bestData.products);
      } else {
        setBestSellers([]);
      }
    } catch (err) {
      console.error('Best sellers fetch error:', err);
      setBestSellersError('Unable to load best-selling sarees at this time.');
    } finally {
      setBestSellersLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchBestSellers();
  }, []);

  const occasionCollections = [
    {
      title: 'Wedding Edit',
      subtitle: 'Heirloom bridal and trousseau masterworks woven with pure zari.',
      image: '/images/occasions/wedding_collection.jpg',
      filter: { occasion: 'Wedding' }
    },
    {
      title: 'Festive Glow',
      subtitle: 'Rich jewel tones and radiant weaves for Diwali, Durga Puja & festivities.',
      image: '/images/occasions/festive_glow.jpg',
      filter: { occasion: 'Festive' }
    },
    {
      title: 'Evening Glam',
      subtitle: 'Glamorous shimmer georgettes and sequins for cocktail celebrations.',
      image: '/images/occasions/evening_glam.jpg',
      filter: { occasion: 'Party' }
    },
    {
      title: 'Office Elegance',
      subtitle: 'Crisp organic French linen and breathable 100s mulmul cotton.',
      image: '/images/occasions/office_elegance.jpg',
      filter: { occasion: 'Workwear' }
    },
    {
      title: 'Everyday Grace',
      subtitle: 'Effortless lightweight drapes designed for gentle comfort.',
      image: '/images/occasions/everyday_grace.jpg',
      filter: { category: 'cotton-sarees' }
    },
    {
      title: 'Temple & Heritage',
      subtitle: 'Sacred auspicious motifs and sanctified pure silk zari borders.',
      image: '/images/occasions/temple_heritage.jpg',
      filter: { occasion: 'Festive', category: 'kanjivaram-sarees' }
    }
  ];

  const weaveCategories = categories.filter((cat) =>
    !['designer-sarees', 'party-wear', 'bridal-collection'].includes(cat.slug)
  );

  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative flex flex-col justify-end md:justify-center overflow-hidden bg-[#1F1A1C] text-[#FAF7F2] min-h-[500px] sm:min-h-[580px] md:min-h-[82vh] lg:min-h-[86vh]">
        {/* Background Image with Crisp Portrait Framing (Clickable to Explore Sarees) */}
        <a
          href="/sarees"
          onClick={(e) => {
            if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
            e.preventDefault();
            onNavigate('shop');
          }}
          className="absolute inset-0 z-0 block cursor-pointer group"
          aria-label="Explore Royal Heirloom Sarees Collection"
        >
          <picture>
            <source media="(max-width: 640px)" srcSet="/images/occasions/wedding_collection.jpg" />
            <img
              src="/images/occasions/wedding_collection.jpg"
              alt="Royal Indian bride in magnificent gold and crimson handloom silk saree"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-[center_top] sm:object-[center_12%] md:object-[right_center] lg:object-[82%_center] opacity-100 transition-transform duration-1000 ease-out group-hover:scale-105"
            />
          </picture>
          {/* Subtle Vignette Gradient: Confines lower scrim to the bottom text area so the bride's portrait and saree remain luminous and clear */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1F1A1C]/95 via-[#1F1A1C]/40 via-30% to-transparent md:bg-gradient-to-r md:from-[#1F1A1C]/95 md:from-28% md:via-[#1F1A1C]/50 md:via-52% md:to-transparent pointer-events-none" />
        </a>

        {/* Hero Content with Seamless Luxury Editorial Styling */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-20 lg:py-24 w-full flex flex-col justify-end md:justify-center pointer-events-none">
          <div className="max-w-xl md:max-w-lg lg:max-w-xl xl:max-w-2xl pointer-events-auto">
            {/* Editorial Tag */}
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#E0C07F] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Royal Heirloom Edit</span>
            </p>

            {/* Headline */}
            <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.14] tracking-wide text-[#FAF7F2] drop-shadow-sm">
              Every Drape, <br />
              <span className="italic text-[#E0C07F]">A Little Magic.</span>
            </h1>

            {/* Description */}
            <p className="mt-2 sm:mt-2.5 text-xs sm:text-sm md:text-base text-[#FAF7F2]/90 leading-relaxed font-sans max-w-lg drop-shadow-xs">
              Authentic handloom sarees crafted in pure zari and raw silk by master artisans.
            </p>

            {/* Action Button */}
            <div className="mt-3.5 sm:mt-6 flex items-center w-full sm:w-auto">
              <a
                href="/sarees"
                onClick={(e) => {
                  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                  e.preventDefault();
                  onNavigate('shop');
                }}
                className="px-6 sm:px-8 py-3 min-h-[44px] bg-gradient-to-r from-[#5B1425] to-[#7E1E34] hover:from-[#7E1E34] hover:to-[#5B1425] text-[#FAF7F2] font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:shadow-xl flex items-center justify-center gap-2 border border-[#C5A059]/40 active:scale-98 cursor-pointer text-center"
              >
                <span>Explore Sarees</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059] shrink-0" />
              </a>
            </div>

            {/* Sleek Compact Trust Badges */}
            <div className="mt-3 sm:mt-5 pt-2.5 sm:pt-3 border-t border-white/15 flex flex-wrap items-center justify-between sm:justify-start sm:gap-5 text-[10px] sm:text-xs text-[#E0C07F] font-medium">
              <span className="flex items-center gap-1">✦ Handcrafted Luxury</span>
              <span className="text-white/30">•</span>
              <span>Master Artisans</span>
              <span className="text-white/30">•</span>
              <span>Certified Silk Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SECTION (Horizontal Swipeable Carousel with Clear Peek on Mobile) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-10 sm:pb-14 w-full">
        <div className="mb-5 sm:mb-8">
          <span className="text-[11px] sm:text-xs font-semibold text-[#5B1425] uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-[#C5A059]" />
            <span>Master Weaves</span>
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C]">
            Shop by Weave & Fabric
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6467] mt-1 max-w-xl">
            From regal Banarasi silks to lightweight Chanderis, explore authentic weaving traditions perfected across generations.
          </p>
        </div>

        {/* Mobile Horizontal Carousel (with next-card peek) / Desktop 5-Col Grid */}
        {categoriesLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex overflow-x-auto gap-3 sm:gap-4 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:gap-5 pb-2"
          >
            <span className="sr-only">Loading weave categories...</span>
            <div className="contents" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-[150px] xs:w-[165px] sm:w-[180px] md:w-auto shrink-0 aspect-[3/4] rounded-2xl bg-[#EAE2D7]/60 animate-pulse flex flex-col justify-end p-4 space-y-2 border border-[#EAE2D7]"
                >
                  <div className="h-4 bg-[#D5C7B8]/60 rounded-md w-3/4 mx-auto" />
                  <div className="h-3 bg-[#D5C7B8]/40 rounded-md w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : categoriesError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="p-8 text-center bg-white rounded-2xl border border-[#EAE2D7] shadow-xs space-y-3"
          >
            <p className="text-xs sm:text-sm text-[#6E6467]">{categoriesError}</p>
            <button
              onClick={fetchCategories}
              className="inline-flex items-center justify-center min-h-[44px] gap-1.5 px-4 py-2 bg-[#5B1425] text-[#FAF7F2] text-xs font-semibold rounded-xl hover:bg-[#7E1E34] transition shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : weaveCategories.length === 0 ? (
          <div role="status" aria-live="polite" className="p-8 text-center bg-white rounded-2xl border border-[#EAE2D7] shadow-xs">
            <p className="text-xs sm:text-sm text-[#6E6467]">No weave categories available at the moment.</p>
          </div>
        ) : (
          <div>
            <div className="flex overflow-x-auto gap-3 sm:gap-4.5 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:gap-5 pb-2">
              {weaveCategories.map((cat) => (
                <a
                  href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                  key={cat.id}
                  onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                    e.preventDefault();
                    onNavigate('shop', { category: cat.slug });
                  }}
                  className="group relative w-[150px] xs:w-[165px] sm:w-[180px] md:w-auto shrink-0 snap-item aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2 bg-[#3F0D19]/20 block"
                  aria-label={/sarees?$/i.test(cat.name.trim()) ? `Explore ${cat.name}` : `Explore ${cat.name} Sarees`}
                >
                  <img
                    src={cat.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-45% to-transparent group-hover:from-[#5B1425]/90 transition-colors duration-300" />
                  
                  <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-3 sm:bottom-4 text-center text-white flex flex-col items-center justify-end">
                    <h3 className="font-serif text-sm sm:text-base font-bold tracking-normal sm:tracking-wide leading-tight sm:leading-snug group-hover:text-[#E0C07F] transition line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                      {cat.name}
                    </h3>
                    <div className="mt-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#C5A059] inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Explore</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Mobile Swipe Cue */}
            <div className="flex md:hidden items-center justify-center mt-3 text-[11px] text-[#6E6467] font-medium">
              <span className="px-3 py-1 bg-[#F4EFEB] rounded-full border border-[#EAE2D7]/80 inline-flex items-center gap-1.5 shadow-xs">
                <span>Swipe to explore {weaveCategories.length} weave collections</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 3. FEATURED COLLECTIONS: CURATED FOR EVERY OCCASION */}
      <section className="bg-[#F4EFEB] py-8 sm:py-12 md:py-14 border-y border-[#EAE2D7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-7 gap-2">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#5B1425] uppercase tracking-widest flex items-center gap-1">
                ✦ Signature Stories
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F1A1C] mt-1">
                Curated for Every Occasion
              </h2>
              <p className="text-xs sm:text-sm text-[#6E6467] mt-1 max-w-xl">
                Heirloom weaves and modern drape stories handcrafted for weddings, festivals, and refined everyday luxury.
              </p>
            </div>
            <a
              href="/sarees"
              onClick={(e) => {
                if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                e.preventDefault();
                onNavigate('shop');
              }}
              className="text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] inline-flex items-center gap-1 group rounded-lg min-h-[44px] px-2 py-1 cursor-pointer self-start md:self-auto"
            >
              <span>Explore All Sarees</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A059]" />
            </a>
          </div>

          <div className="flex overflow-x-auto gap-3.5 sm:gap-6 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 pb-2">
            {occasionCollections.map((col, idx) => (
              <a
                href={`/shop?${new URLSearchParams(col.filter).toString()}`}
                key={idx}
                onClick={(e) => {
                  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                  e.preventDefault();
                  onNavigate('shop', col.filter);
                }}
                className="w-[240px] xs:w-[260px] sm:w-full shrink-0 sm:shrink snap-item group relative bg-white rounded-2xl overflow-hidden border border-[#EAE2D7] shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2"
                aria-label={`Explore ${col.title} Collection`}
              >
                <div className="aspect-[4/5] sm:aspect-[3/4] w-full overflow-hidden bg-[#FAF7F2]">
                  <img
                    src={col.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between w-full">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F1A1C] group-hover:text-[#5B1425] transition">
                      {col.title}
                    </h3>
                    <p className="text-xs text-[#6E6467] mt-1.5 leading-relaxed line-clamp-2">
                      {col.subtitle}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[#F4EFEB] flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-[#5B1425] group-hover:underline">
                      Explore Edition
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#5B1425] group-hover:bg-[#5B1425] group-hover:text-[#FAF7F2] transition shadow-xs">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Mobile Swipe Cue */}
          <div className="flex sm:hidden items-center justify-center mt-3 text-[11px] text-[#6E6467] font-medium">
            <span className="px-3 py-1 bg-white rounded-full border border-[#EAE2D7]/80 inline-flex items-center gap-1.5 shadow-xs">
              <span>Swipe to explore 6 occasion edits</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </span>
          </div>
        </div>
      </section>

      {/* 4. BEST SELLERS / SPOTLIGHT SAREES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-14 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-7 gap-2">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold text-[#5B1425] uppercase tracking-widest flex items-center gap-1">
              ✦ Customer Favorites
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C] mt-1">
              Best Sellers of the Season
            </h2>
            <p className="text-xs sm:text-sm text-[#6E6467] mt-1 max-w-xl">
              The most coveted sarees chosen by connoisseurs across India and worldwide.
            </p>
          </div>
          <a
            href="/shop?filter=best_seller"
            onClick={(e) => {
              if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
              e.preventDefault();
              onNavigate('shop', { filter: 'best_seller' });
            }}
            className="text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] inline-flex items-center gap-1 group rounded-lg min-h-[44px] px-2 py-1 cursor-pointer self-start md:self-auto"
          >
            <span>View All Best Sellers</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A059]" />
          </a>
        </div>

        {bestSellersLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex overflow-x-auto gap-3.5 sm:gap-6 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 pb-2"
          >
            <span className="sr-only">Loading best seller sarees...</span>
            <div className="contents" aria-hidden="true">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-[240px] xs:w-[260px] sm:w-auto shrink-0 snap-item bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden p-3 sm:p-4 space-y-3 shadow-xs"
                >
                  <div className="aspect-[3/4] w-full rounded-xl bg-[#EAE2D7]/60 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[#EAE2D7]/80 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-[#EAE2D7] rounded w-4/5 animate-pulse" />
                    <div className="h-4 bg-[#EAE2D7]/70 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : bestSellersError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="p-8 text-center bg-white rounded-2xl border border-[#EAE2D7] shadow-xs space-y-3"
          >
            <p className="text-xs sm:text-sm text-[#6E6467]">{bestSellersError}</p>
            <button
              onClick={fetchBestSellers}
              className="inline-flex items-center justify-center min-h-[44px] gap-1.5 px-4 py-2 bg-[#5B1425] text-[#FAF7F2] text-xs font-semibold rounded-xl hover:bg-[#7E1E34] transition shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : bestSellers.length === 0 ? (
          <div role="status" aria-live="polite" className="p-8 text-center bg-white rounded-2xl border border-[#EAE2D7] shadow-xs">
            <p className="text-xs sm:text-sm text-[#6E6467]">No best seller sarees available at the moment.</p>
          </div>
        ) : (
          <div>
            <div className="flex overflow-x-auto gap-3.5 sm:gap-6 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 pb-2">
              {bestSellers.map((prod) => (
                <div key={prod.id} className="w-[240px] xs:w-[260px] sm:w-auto shrink-0 snap-item flex">
                  <ProductCard product={prod} onNavigate={onNavigate} />
                </div>
              ))}
            </div>

            {/* Mobile Swipe Cue */}
            <div className="flex sm:hidden items-center justify-center mt-3 text-[11px] text-[#6E6467] font-medium">
              <span className="px-3 py-1 bg-[#F4EFEB] rounded-full border border-[#EAE2D7]/80 inline-flex items-center gap-1.5 shadow-xs">
                <span>Swipe to explore {bestSellers.length} best seller sarees</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. EDITORIAL HERITAGE SHOWCASE BANNER (Entire Banner Clickable) */}
      <section className="relative w-full overflow-hidden bg-[#FAF7F2] py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <a
            href="/shop?category=banarasi-sarees"
            onClick={(e) => {
              if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
              e.preventDefault();
              onNavigate('shop', { category: 'banarasi-sarees' });
            }}
            className="group relative block aspect-[4/5] sm:aspect-[16/8] md:aspect-[21/9] w-full max-h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2"
            aria-label="Explore The Heritage Edit - Pure Weaves, Timeless Grace"
          >
            <img
              src="/images/occasions/temple_heritage.jpg"
              alt="Authentic handloom heritage sarees"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-[center_30%] sm:object-[center_35%] md:object-[right_35%] lg:object-[80%_35%] transition-transform duration-700 group-hover:scale-105"
            />
            {/* Carefully Balanced Gradient: Guarantees text readability without hiding the saree model */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1F1A1C]/92 via-[#1F1A1C]/50 via-50% to-black/15 sm:bg-gradient-to-r sm:from-[#1F1A1C]/95 sm:from-32% sm:via-[#1F1A1C]/40 sm:to-transparent pointer-events-none" />

            {/* Clean, Professional Editorial Content */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10 pointer-events-none">
              <div className="max-w-lg">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#E0C07F] font-semibold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#C5A059]" />
                  <span>The Heritage Edit</span>
                </p>
                <h2 className="font-serif text-xl sm:text-3xl lg:text-4xl text-[#FAF7F2] font-normal tracking-wide drop-shadow-sm">
                  Pure Weaves. Timeless Grace.
                </h2>
                <p className="text-xs sm:text-sm text-[#FAF7F2]/85 mt-1 hidden sm:block font-sans leading-relaxed">
                  Immerse yourself in centuries of weaving heritage, where raw mulberry silk meets consecrated zari artistry.
                </p>
              </div>

              <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 min-h-[44px] bg-white group-hover:bg-[#FAF7F2] text-[#1F1A1C] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md group-hover:shadow-xl w-fit border border-white/50 group-active:scale-95 shrink-0 pointer-events-auto">
                <span>Explore Collection</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5B1425] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
