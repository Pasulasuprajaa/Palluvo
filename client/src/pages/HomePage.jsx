import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Award, Heart, ShoppingBag, Star, ChevronRight, Check } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function HomePage({ onNavigate }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [prodRes, bestRes, catRes] = await Promise.all([
          fetch('/api/products?featured=true&limit=4'),
          fetch('/api/products?best_seller=true&limit=4'),
          fetch('/api/categories')
        ]);

        const prodData = await prodRes.json();
        const bestData = await bestRes.json();
        const catData = await catRes.json();

        if (prodData.products) setFeaturedProducts(prodData.products);
        if (bestData.products) setBestSellers(bestData.products);
        if (catData.categories) setCategories(catData.categories);
      } catch (err) {
        console.error('Home data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const occasionCollections = [
    {
      title: 'Wedding Edit',
      subtitle: 'Heirloom bridal and trousseau masterworks woven with pure zari.',
      image: '/images/occasions/wedding_edit.jpg',
      filter: { occasion: 'Wedding' },
      tag: 'Bridal Heritage'
    },
    {
      title: 'Festive Glow',
      subtitle: 'Rich jewel tones and radiant weaves for Diwali, Durga Puja & festivities.',
      image: '/images/occasions/festive_glow.jpg',
      filter: { occasion: 'Festive' },
      tag: 'Festive Weaves'
    },
    {
      title: 'Evening Glam',
      subtitle: 'Glamorous shimmer georgettes and sequins for cocktail celebrations.',
      image: '/images/occasions/evening_glam.jpg',
      filter: { occasion: 'Party' },
      tag: 'Cocktail & Party'
    },
    {
      title: 'Office Elegance',
      subtitle: 'Crisp organic French linen and breathable 100s mulmul cotton.',
      image: '/images/occasions/office_elegance.jpg',
      filter: { occasion: 'Workwear' },
      tag: 'Sophisticated Daily'
    },
    {
      title: 'Everyday Grace',
      subtitle: 'Effortless lightweight drapes designed for gentle comfort.',
      image: '/images/occasions/everyday_grace.jpg',
      filter: { category: 'cotton-sarees' },
      tag: 'Pure Comfort'
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Radhika Sen',
      role: 'Kolkata, WB',
      rating: 5,
      comment: 'The Royal Crimson Banarasi exceeded every expectation. The kadwa gold zari work is dense yet remarkably lightweight. Draped it for my daughter’s sangeet and received endless compliments.',
      saree: 'Royal Crimson Banarasi Katan'
    },
    {
      name: 'Meera Nambiar',
      role: 'Bengaluru, KA',
      rating: 5,
      comment: 'PALLUVO’s Kanjivaram silk has that true authentic heavy korvai luster that is so rare online. The packaging in the burgundy luxury box made unboxing feel like a celebration.',
      saree: 'Vaidarbhi Pure Kanjivaram Gold'
    },
    {
      name: 'Shweta Singhania',
      role: 'Mumbai, MH',
      rating: 5,
      comment: 'The Noor rose gold organza saree is pure poetry. Featherlight, soft on the skin, and the scalloped border is cut with unmatched precision.',
      saree: 'Noor Rose Gold Organza'
    }
  ];

  const instagramPosts = [
    {
      image: '/images/categories/banarasi.jpg',
      handle: '@ananya_drapes',
      text: 'Wrapped in timeless Banarasi magic.'
    },
    {
      image: '/images/categories/kanjivaram.jpg',
      handle: '@priyasharma_weddings',
      text: 'The bridal glow in pure Kanjivaram gold.'
    },
    {
      image: '/images/occasions/festive_glow.jpg',
      handle: '@tarini_lifestyle',
      text: 'Festive radiance in emerald silk.'
    },
    {
      image: '/images/categories/organza.jpg',
      handle: '@palluvo_official',
      text: 'Featherlight organza blossoms.'
    }
  ];

  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[75vh] sm:min-h-[85vh] lg:min-h-[88vh] flex items-center overflow-hidden bg-[#FAF7F2] text-[#1F1A1C]">
        {/* Background Saree Showcase Image — 100% Brightness & High-Clarity */}
        <div className="absolute inset-0 z-0">
          <picture>
            <source media="(max-width: 640px)" srcSet="/images/occasions/wedding_edit.jpg" />
            <img
              src="/images/occasions/wedding_edit.jpg"
              alt="PALLUVO Luxury Saree Hero"
              className="w-full h-full object-cover object-center sm:object-right md:object-[80%_center] opacity-100 scale-100 transition-transform duration-1000 ease-out"
            />
          </picture>
          {/* Subtle soft gradient fade on mobile only for bottom text legibility */}
          <div className="sm:hidden absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 via-40% to-transparent pointer-events-none" />
        </div>

        {/* Hero Content — Floating Luxury Glassmorphic Editorial Card */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 w-full flex items-center">
          <div className="max-w-xl w-full bg-[#FAF7F2]/95 sm:bg-[#FAF7F2]/95 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-[#C5A059]/50 shadow-2xl space-y-4 sm:space-y-6 animate-fade-in text-[#1F1A1C]">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#5B1425]/10 border border-[#5B1425]/30 text-[#5B1425] text-[10px] sm:text-xs font-semibold uppercase tracking-widest shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>The Festive & Bridal Heirloom Edit</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.12] tracking-tight text-[#1F1A1C]">
              Every drape, <br />
              <span className="italic font-normal text-[#5B1425]">a little magic.</span>
            </h1>

            <p className="text-xs sm:text-base text-[#6E6467] leading-relaxed font-sans">
              Handcrafted Banarasi, pure Kanjivaram, and ethereal organza sarees designed to make your celebratory moments unforgettable.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-1">
              <button
                onClick={() => onNavigate('shop')}
                className="px-6 sm:px-8 py-3.5 bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl flex items-center justify-center gap-2 border border-[#C5A059]/40 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B1425] focus-visible:outline-none"
              >
                <span>Explore Sarees</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </button>

              <button
                onClick={() => onNavigate('shop', { occasion: 'Wedding' })}
                className="px-6 sm:px-8 py-3.5 bg-white hover:bg-[#F4EFEB] text-[#1F1A1C] font-semibold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 border border-[#EAE2D7] hover:border-[#C5A059] active:scale-95 text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B1425] focus-visible:outline-none shadow-sm"
              >
                Bridal Edit
              </button>
            </div>

            {/* Micro Trust Stats */}
            <div className="pt-4 sm:pt-5 border-t border-[#EAE2D7] grid grid-cols-3 gap-2 sm:gap-4 text-left w-full">
              <div>
                <div className="font-serif text-base sm:text-xl font-bold text-[#5B1425]">100%</div>
                <div className="text-[9px] sm:text-[10px] text-[#6E6467] uppercase tracking-wider mt-0.5">Pure Handloom</div>
              </div>
              <div>
                <div className="font-serif text-base sm:text-xl font-bold text-[#5B1425]">15k+</div>
                <div className="text-[9px] sm:text-[10px] text-[#6E6467] uppercase tracking-wider mt-0.5">Drapes Loved</div>
              </div>
              <div>
                <div className="font-serif text-base sm:text-xl font-bold text-[#5B1425]">4.9 ★</div>
                <div className="text-[9px] sm:text-[10px] text-[#6E6467] uppercase tracking-wider mt-0.5">Verified Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SECTION (Horizontal Swipeable Carousel on Mobile) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold text-[#5B1425] uppercase tracking-widest">
              Artisanal Heritage
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C] mt-1">
              Shop by Weave & Fabric
            </h2>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] hidden sm:inline-flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-lg p-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
          </button>
        </div>

        {/* Mobile Horizontal Carousel / Desktop 4-Col Grid */}
        <div className="flex overflow-x-auto gap-3.5 sm:gap-4 no-scrollbar scroll-touch -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:gap-6 pb-2">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => onNavigate('shop', { category: cat.slug })}
              className="group relative w-36 sm:w-44 md:w-auto shrink-0 snap-item aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2"
              aria-label={`Explore ${cat.name} Sarees`}
            >
              <img
                src={cat.image_url}
                alt={cat.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent group-hover:from-[#5B1425]/90 transition-colors duration-300" />
              
              <div className="absolute inset-x-3 bottom-3 sm:bottom-4 text-center text-white">
                <h3 className="font-serif text-sm sm:text-lg font-bold tracking-wide group-hover:text-[#E0C07F] transition line-clamp-1">
                  {cat.name}
                </h3>
                <div className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#C5A059] inline-flex items-center gap-0.5">
                  <span>Explore</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
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
            <button
              onClick={() => onNavigate('shop')}
              className="mt-4 md:mt-0 text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] inline-flex items-center gap-1 group focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-lg p-1"
            >
              <span>View All Collections</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A059]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {occasionCollections.map((col, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onNavigate('shop', col.filter)}
                className="group relative bg-white rounded-2xl overflow-hidden border border-[#EAE2D7] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2"
                aria-label={`Explore ${col.title} Collection`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF7F2]">
                  <img
                    src={col.image}
                    alt={col.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-3 left-3 bg-[#5B1425] text-[#FAF7F2] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                    {col.tag}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between w-full">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#1F1A1C] group-hover:text-[#5B1425] transition">
                      {col.title}
                    </h3>
                    <p className="text-xs text-[#6E6467] mt-1.5 leading-relaxed">
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
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BEST SELLERS / SPOTLIGHT SAREES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold text-[#5B1425] uppercase tracking-widest">
              Most Adored Drapes
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C] mt-1">
              Best Sellers of the Season
            </h2>
          </div>
          <button
            onClick={() => onNavigate('shop', { filter: 'best_seller' })}
            className="mt-4 md:mt-0 text-xs font-bold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] inline-flex items-center gap-1 group focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-lg p-1"
          >
            <span>View All Best Sellers</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A059]" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {bestSellers.map((prod) => (
            <ProductCard key={prod.id} product={prod} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {/* 5. BRAND STORY BANNER */}
      <section className="relative bg-[#3F0D19] text-[#FAF7F2] py-14 sm:py-20 overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-[#5B1425]/50 blur-3xl" />
        <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-[#C5A059]/20 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="text-[#C5A059] text-2xl">✦ ✦ ✦</div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
            "A saree is not merely six yards of silk; <br className="hidden sm:inline" />
            it is centuries of art, woven into memory."
          </h2>
          <p className="text-xs sm:text-sm text-[#FAF7F2]/80 leading-relaxed max-w-2xl mx-auto">
            At PALLUVO, every saree is born on the handloom through weeks of dedicated craftsmanship. We work closely with master weavers across Varanasi, Kanchipuram, and Chanderi to bring you authentic weaves that celebrate modern Indian grace.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('shop', { category: 'banarasi-sarees' })}
              className="px-8 py-3.5 bg-[#C5A059] text-[#1F1A1C] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#E0C07F] transition shadow-xl focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Discover the Weaves
            </button>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold text-[#5B1425] uppercase tracking-widest">
            Loved Across India
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1F1A1C] mt-1">
            Voices of the PALLUVO Circle
          </h2>
          <div className="w-16 h-0.5 bg-[#C5A059] mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-[#EAE2D7] shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center text-[#C5A059] text-sm mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-[#C5A059]" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-[#1F1A1C] italic leading-relaxed">
                  "{t.comment}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F4EFEB] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1F1A1C]">{t.name}</div>
                  <div className="text-[11px] text-[#6E6467]">{t.role}</div>
                </div>
                <span className="text-[10px] bg-green-50 text-green-800 font-semibold px-2 py-0.5 rounded border border-green-200">
                  ✓ Verified Buyer
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. INSTAGRAM / JOURNEY GALLERY */}
      <section className="bg-[#FAF7F2] py-8 sm:py-12 border-t border-[#EAE2D7] w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-[#5B1425] uppercase tracking-widest">
              @PALLUVO_OFFICIAL
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] mt-1">
              Follow the PALLUVO Journey
            </h2>
            <p className="text-xs text-[#6E6467] mt-1">
              Tag #EveryDrapeMagic to be featured on our luxury editorial wall
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {instagramPosts.map((post, idx) => (
              <button
                type="button"
                key={idx}
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none focus-visible:ring-offset-2"
                aria-label={`View Instagram post by ${post.handle}`}
              >
                <img
                  src={post.image}
                  alt={post.handle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center text-white">
                  <span className="text-xs font-bold text-[#C5A059]">{post.handle}</span>
                  <p className="text-[11px] text-white/90 mt-1">{post.text}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
