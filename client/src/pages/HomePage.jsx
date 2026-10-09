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
      <section className="relative flex flex-col justify-end md:justify-center overflow-hidden bg-[#1F1A1C] text-[#FAF7F2] min-h-[560px] sm:min-h-[620px] md:min-h-[85vh]">
        {/* Background Image — Clear Top Portrait Crop on Mobile and Right-Aligned Subject on Tablet/Desktop */}
        <div className="absolute inset-0 z-0">
          <picture>
            <source media="(max-width: 640px)" srcSet="/images/occasions/wedding_edit.jpg" />
            <img
              src="/images/occasions/wedding_edit.jpg"
              alt="Indian bride adorned in an ornate crimson and gold handcrafted silk saree"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-[center_top] sm:object-[center_8%] md:object-[right_center] lg:object-right opacity-100 scale-100 transition-transform duration-1000 ease-out"
            />
          </picture>
          {/* Gradient Overlay: Calibrated gradient maintains solid contrast behind copy while letting the model and silk weave retain full vibrant color and texture */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1F1A1C] from-15% via-[#1F1A1C]/70 via-40% to-transparent to-65% md:bg-gradient-to-r md:from-[#1F1A1C]/90 md:from-15% md:via-[#1F1A1C]/40 md:via-35% md:to-transparent md:to-55% pointer-events-none" />
        </div>
        {/* Hero Content — Constrained Width on Tablet & Mobile to Leave Model & Saree Visible */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-44 pb-8 sm:pt-52 sm:pb-12 md:py-24 lg:py-28 w-full">
          <div className="flex flex-col items-start max-w-lg md:max-w-[420px] lg:max-w-xl xl:max-w-2xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#1F1A1C]/90 backdrop-blur-md border border-[#C5A059]/50 text-[#E0C07F] text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2 md:mb-6 animate-fade-in shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>The Festive & Bridal Heirloom Edit</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl md:text-[2.6rem] lg:text-6xl xl:text-7xl font-bold leading-[1.18] sm:leading-[1.1] tracking-tight text-[#FAF7F2] drop-shadow-sm animate-slide-up">
              Timeless weaves, <br />
              <span className="italic font-normal gold-gradient-text">woven for generations.</span>
            </h1>

            <p className="mt-2 md:mt-5 text-sm md:text-base text-[#FAF7F2]/85 leading-relaxed font-sans max-w-md md:max-w-[380px] lg:max-w-lg drop-shadow-xs">
              Handcrafted Banarasi, pure Kanjivaram, and ethereal organza sarees designed to make your celebratory moments unforgettable.
            </p>

            {/* Action CTAs: Side-by-side on mobile with 44px min touch target height */}
            <div className="mt-4 md:mt-8 flex flex-row items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
              <a
                href="/sarees"
                onClick={(e) => {
                  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                  e.preventDefault();
                  onNavigate('shop');
                }}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] font-bold text-[11px] sm:text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-2xl flex items-center justify-center gap-1.5 sm:gap-2.5 border border-[#C5A059]/30 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none whitespace-nowrap"
              >
                <span>Explore Sarees</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C5A059]" />
              </a>

              <a
                href="/shop?occasion=Wedding"
                onClick={(e) => {
                  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                  e.preventDefault();
                  onNavigate('shop', { occasion: 'Wedding' });
                }}
                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-[#FAF7F2]/10 hover:bg-[#FAF7F2]/20 backdrop-blur-md text-[#FAF7F2] font-semibold text-[11px] sm:text-xs uppercase tracking-widest rounded-xl transition-all duration-300 border border-white/20 hover:border-[#C5A059] active:scale-95 flex items-center justify-center text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none whitespace-nowrap"
              >
                Bridal Edit
              </a>
            </div>

            {/* Micro Trust Stats */}
            <div className="mt-3.5 md:mt-10 pt-3 md:pt-6 border-t border-white/15 grid grid-cols-3 gap-2 sm:gap-6 text-left w-full max-w-md md:max-w-[380px] lg:max-w-lg">
              <div>
                <div className="font-serif text-base sm:text-2xl font-bold text-[#C5A059]">100%</div>
                <div className="text-[10.5px] sm:text-[11px] text-[#FAF7F2]/85 uppercase tracking-wider font-medium mt-0.5">
                  Pure Handloom
                </div>
              </div>
              <div>
                <div className="font-serif text-base sm:text-2xl font-bold text-[#C5A059]">Direct</div>
                <div className="text-[10.5px] sm:text-[11px] text-[#FAF7F2]/85 uppercase tracking-wider font-medium mt-0.5">
                  From Master Weavers
                </div>
              </div>
              <div>
                <div className="font-serif text-base sm:text-2xl font-bold text-[#C5A059]">Silk Mark</div>
                <div className="text-[10.5px] sm:text-[11px] text-[#FAF7F2]/85 uppercase tracking-wider font-medium mt-0.5">
                  Certified Pure
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SECTION (Horizontal Swipeable Carousel on Mobile) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 w-full">
        <div className="mb-6 sm:mb-8">
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C]">
            Shop by Weave & Fabric
          </h2>
        </div>

        {/* Mobile Horizontal Carousel / Desktop 5-Col Grid */}
        {categoriesLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex overflow-x-auto gap-3.5 sm:gap-4 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:gap-5 pb-2"
          >
            <span className="sr-only">Loading weave categories...</span>
            <div className="contents" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-36 sm:w-44 md:w-auto shrink-0 aspect-[3/4] rounded-2xl bg-[#EAE2D7]/60 animate-pulse flex flex-col justify-end p-4 space-y-2 border border-[#EAE2D7]"
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
            <div className="flex overflow-x-auto gap-3.5 sm:gap-4 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:gap-5 pb-2">
              {weaveCategories.map((cat, idx) => (
                <a
                  href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                  key={cat.id}
                  onClick={(e) => {
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                    e.preventDefault();
                    onNavigate('shop', { category: cat.slug });
                  }}
                  className="group relative w-36 sm:w-44 md:w-auto shrink-0 snap-item aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2 bg-[#3F0D19]/20 block"
                  aria-label={/sarees?$/i.test(cat.name.trim()) ? `Explore ${cat.name}` : `Explore ${cat.name} Sarees`}
                >
                  <img
                    src={cat.image_url}
                    alt=""
                    loading={idx < 5 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent group-hover:from-[#5B1425]/90 transition-colors duration-300" />
                  
                  <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-3 sm:bottom-4 text-center text-white">
                    <h3 className="font-serif text-sm sm:text-lg font-bold tracking-normal sm:tracking-wide leading-tight sm:leading-normal group-hover:text-[#E0C07F] transition line-clamp-2">
                      {cat.name}
                    </h3>
                    <div className="mt-1 text-[11px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-wider text-[#C5A059] inline-flex items-center gap-0.5">
                      <span>Explore</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Mobile Swipe Cue */}
            <div className="flex md:hidden items-center justify-center gap-1 mt-2.5 text-[11px] text-[#6E6467] font-medium">
              <span>Swipe to explore {weaveCategories.length} weave collections</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
          </div>
        )}
      </section>

      {/* 3. FEATURED COLLECTIONS: CURATED FOR EVERY OCCASION */}
      <section className="bg-[#F4EFEB] py-12 sm:py-16 border-y border-[#EAE2D7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold text-[#5B1425] uppercase tracking-widest">
                Signature Stories
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C] mt-1">
                Curated for Every Occasion
              </h2>
            </div>
            <a
              href="/sarees"
              onClick={(e) => {
                if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                e.preventDefault();
                onNavigate('shop');
              }}
              className="mt-2 md:mt-0 text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] inline-flex items-center gap-1 group focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-lg min-h-[44px] px-2 py-1 cursor-pointer"
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
                className="w-[72vw] min-w-[218px] max-w-[268px] sm:w-full sm:min-w-0 sm:max-w-none shrink-0 sm:shrink snap-item group relative bg-white rounded-2xl overflow-hidden border border-[#EAE2D7] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2"
                aria-label={`Explore ${col.title} Collection`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#FAF7F2]">
                  <img
                    src={col.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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

                  <div className="mt-4 pt-3 border-t border-[#F4EFEB] flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-[#5B1425] group-hover:underline">
                      Explore Edition
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#5B1425] group-hover:bg-[#5B1425] group-hover:text-[#FAF7F2] transition">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Mobile Swipe Cue */}
          <div className="flex sm:hidden items-center justify-center gap-1 mt-2.5 text-[11px] text-[#6E6467] font-medium">
            <span>Swipe to explore 6 occasion edits</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
          </div>
        </div>
      </section>

      {/* 4. BEST SELLERS / SPOTLIGHT SAREES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C]">
              Best Sellers of the Season
            </h2>
          </div>
          <a
            href="/shop?filter=best_seller"
            onClick={(e) => {
              if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
              e.preventDefault();
              onNavigate('shop', { filter: 'best_seller' });
            }}
            className="mt-2 md:mt-0 text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] inline-flex items-center gap-1 group focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-lg min-h-[44px] px-2 py-1 cursor-pointer"
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
                  className="w-56 sm:w-auto shrink-0 snap-item bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden p-3 sm:p-4 space-y-3 shadow-xs"
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
              {bestSellers.map((prod, idx) => (
                <div key={prod.id} className="w-56 sm:w-auto shrink-0 snap-item flex">
                  <ProductCard product={prod} onNavigate={onNavigate} priority={idx < 4} />
                </div>
              ))}
            </div>

            {/* Mobile Swipe Cue */}
            <div className="flex sm:hidden items-center justify-center gap-1 mt-2.5 text-[11px] text-[#6E6467] font-medium">
              <span>Swipe to explore {bestSellers.length} best seller sarees</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
          </div>
        )}
      </section>

      {/* 5. BRAND STORY BANNER */}
      <section className="relative bg-[#3F0D19] text-[#FAF7F2] py-14 sm:py-20 overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-[#5B1425]/50 blur-3xl" />
        <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-[#C5A059]/20 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="text-[#C5A059] text-2xl" aria-hidden="true">✦ ✦ ✦</div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
            “A saree is not merely six yards of silk; <br className="hidden sm:inline" />
            it is centuries of art, woven into memory.”
          </h2>
          <p className="text-sm sm:text-base text-[#FAF7F2]/80 leading-relaxed max-w-2xl mx-auto">
            At PALLUVO, every saree is born on the handloom through weeks of dedicated craftsmanship. We work closely with master weavers across Varanasi, Kanchipuram, and Chanderi to bring you authentic weaves that celebrate modern Indian grace.
          </p>
          <div className="pt-2">
            <a
              href="/shop?category=banarasi-sarees"
              onClick={(e) => {
                if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                e.preventDefault();
                onNavigate('shop', { category: 'banarasi-sarees' });
              }}
              className="inline-block px-8 py-3.5 bg-[#C5A059] text-[#1F1A1C] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#E0C07F] transition shadow-xl focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer text-center"
            >
              Explore Banarasi Sarees
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
