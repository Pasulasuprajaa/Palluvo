import React, { useState, useEffect } from 'react';
import {
  Star, Heart, ShoppingBag, ShieldCheck, Truck, RotateCcw,
  Sparkles, Check, ChevronRight, Share2, ZoomIn, X, Plus, Minus, Tag, MapPin
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetailPage({ slug, onNavigate, onOpenAuth }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Pincode checker state
  const [pincode, setPincode] = useState('560001');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Review submission state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();
        if (res.ok && data.product) {
          setProduct(data.product);
          if (data.product.variants && data.product.variants.length > 0) {
            setSelectedVariant(data.product.variants[0]);
          }
        }
      } catch (err) {
        console.error('Fetch product detail error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      fetchProduct();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [slug]);

  const handleCheckPincode = async (e) => {
    e?.preventDefault();
    if (!pincode || pincode.length !== 6) {
      addToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }
    try {
      setCheckingPin(true);
      const res = await fetch(`/api/pincode/check/${pincode}`);
      const data = await res.json();
      if (res.ok) {
        setPincodeResult(data);
      } else {
        addToast(data.error, 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingPin(false);
    }
  };

  const handleBuyNow = () => {
    addToCart(product, selectedVariant, quantity);
    if (!user) {
      onOpenAuth(() => onNavigate('checkout'));
    } else {
      onNavigate('checkout');
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!reviewForm.comment.trim()) {
      addToast('Please share your thoughts on the saree drape.', 'error');
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('palluvo_token')}`
        },
        body: JSON.stringify({
          product_id: product.id,
          rating: reviewForm.rating,
          title: reviewForm.title,
          comment: reviewForm.comment
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('✨ Thank you! Your review has been submitted.');
        setReviewModalOpen(false);
        // Refresh product reviews
        const refreshRes = await fetch(`/api/products/${slug}`);
        const refreshData = await refreshRes.json();
        if (refreshData.product) setProduct(refreshData.product);
      } else {
        addToast(data.error || 'Failed to submit review.', 'error');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 border-4 border-[#5B1425] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-[#1F1A1C]">Unfolding the saree drape...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#1F1A1C]">Saree Not Found</h2>
        <p className="text-xs text-[#6E6467]">The requested saree drape might have been moved or archived.</p>
        <button
          onClick={() => onNavigate('shop')}
          className="px-6 py-2.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold uppercase rounded-xl"
        >
          Explore All Sarees
        </button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [product.primary_image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85'];

  const currentImage = images[selectedImageIndex] || images[0];
  const saved = isWishlisted(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Breadcrumb Navigation */}
      <div className="text-xs text-[#6E6467] flex items-center gap-2">
        <button onClick={() => onNavigate('home')} className="hover:text-[#5B1425]">Home</button>
        <span>/</span>
        <button onClick={() => onNavigate('shop', { category: product.category_slug })} className="hover:text-[#5B1425]">
          {product.category_name || 'Sarees'}
        </button>
        <span>/</span>
        <span className="text-[#1F1A1C] font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Saree Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left: Gallery & Zoom (7 Columns on large) */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          
          {/* Thumbnails Sidebar */}
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[650px] pb-2 sm:pb-0">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                    selectedImageIndex === idx
                      ? 'border-[#5B1425] ring-2 ring-[#C5A059]/40 scale-105 shadow-md'
                      : 'border-[#EAE2D7] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Large Main Saree Image */}
          <div className="flex-1 relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F4EFEB] border border-[#EAE2D7] shadow-xl group">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110 cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
            />

            {/* Discount Pill */}
            {product.discount_percent > 0 && (
              <span className="absolute top-4 left-4 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                {product.discount_percent}% OFF
              </span>
            )}

            {/* Lightbox / Zoom Trigger Button */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full text-[#1F1A1C] hover:bg-[#5B1425] hover:text-[#FAF7F2] transition shadow-lg"
              title="View Fullscreen"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Saree Purchasing Details (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs text-[#6E6467] uppercase tracking-wider mb-2">
              <span className="font-semibold text-[#5B1425]">{product.fabric}</span>
              <span className="bg-[#C5A059]/20 text-[#9A7730] px-2.5 py-0.5 rounded-full font-bold">
                {product.occasion} Edition
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] leading-snug">
              {product.name}
            </h1>

            {product.tagline && (
              <p className="text-xs font-serif italic text-[#6E6467] mt-1">
                "{product.tagline}"
              </p>
            )}

            {/* Star Rating Bar */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center text-[#C5A059] text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current text-[#C5A059]" />
                ))}
              </div>
              <span className="text-xs font-bold text-[#1F1A1C]">{product.rating || 4.9}</span>
              <span className="text-xs text-[#6E6467]">
                ({product.review_count || 128} verified reviews)
              </span>
              <button
                onClick={() => setActiveTab('reviews')}
                className="text-xs text-[#5B1425] font-semibold underline ml-1"
              >
                Read Reviews
              </button>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-xl bg-white border border-[#EAE2D7] shadow-sm space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl font-bold text-[#5B1425]">
                ₹{product.price?.toLocaleString('en-IN')}
              </span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-sm text-[#6E6467] line-through">
                  ₹{product.mrp?.toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xs bg-green-50 text-green-800 font-bold px-2 py-0.5 rounded border border-green-200">
                Save ₹{(product.mrp - product.price).toLocaleString('en-IN')} ({product.discount_percent}%)
              </span>
            </div>
            <div className="text-[11px] text-[#6E6467]">
              Inclusive of all taxes & complimentary luxury gift box packaging.
            </div>

            {/* Active Coupon Recommendation */}
            <div className="pt-2 border-t border-[#F4EFEB] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#5B1425] font-medium">
                <Tag className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Use code <strong>WELCOME10</strong> for extra 10% OFF</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('WELCOME10');
                  addToast('Coupon "WELCOME10" copied!');
                }}
                className="text-[11px] text-[#5B1425] font-bold hover:underline"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Shade / Color Variants */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#1F1A1C] mb-2 uppercase tracking-wider">
                Select Shade: <span className="font-normal text-[#5B1425]">{selectedVariant ? selectedVariant.color_name : product.color_name}</span>
              </div>
              <div className="flex gap-2.5">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition ${
                      selectedVariant?.id === v.id
                        ? 'border-[#5B1425] ring-2 ring-[#C5A059]/60 scale-110 shadow-md'
                        : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: v.color_hex }}
                    title={v.color_name}
                  >
                    {selectedVariant?.id === v.id && (
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saree Specs Quick Pills */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EAE2D7]">
              <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Saree Length</span>
              <span className="font-semibold text-[#1F1A1C]">{product.saree_length || '5.5 Meters'}</span>
            </div>
            <div className="p-2.5 bg-[#FAF7F2] rounded-lg border border-[#EAE2D7]">
              <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Blouse Piece</span>
              <span className="font-semibold text-[#1F1A1C]">{product.blouse_length || '0.8m Unstitched'}</span>
            </div>
          </div>

          {/* Pincode Delivery Estimator */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EAE2D7] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1F1A1C] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5B1425]" />
                <span>Delivery & COD Availability</span>
              </span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                maxLength="6"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit Pincode"
                className="flex-1 bg-white border border-[#EAE2D7] rounded-lg px-3 py-1.5 text-xs text-[#1F1A1C] focus:outline-none focus:border-[#5B1425]"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-3.5 py-1.5 bg-[#5B1425] text-[#FAF7F2] rounded-lg text-xs font-bold hover:bg-[#7E1E34] transition disabled:opacity-50"
              >
                {checkingPin ? 'Checking...' : 'Check'}
              </button>
            </form>

            {pincodeResult && (
              <div className="text-xs text-green-800 bg-green-50 p-2 rounded-lg border border-green-200 space-y-0.5">
                <div className="font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Express Delivery Available for {pincodeResult.location}</span>
                </div>
                <div className="text-[11px] text-[#1F1A1C]">
                  {pincodeResult.deliveryDate} • Cash on Delivery & Free Returns eligible
                </div>
              </div>
            )}
          </div>

          {/* Quantity & CTA Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Quantity */}
              <div className="flex items-center border border-[#EAE2D7] rounded-xl bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-[#6E6467] hover:text-[#5B1425]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-xs font-bold text-[#1F1A1C]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 text-[#6E6467] hover:text-[#5B1425]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Bag */}
              <button
                onClick={() => addToCart(product, selectedVariant, quantity)}
                className="flex-1 py-3.5 bg-[#FAF7F2] border-2 border-[#5B1425] text-[#5B1425] hover:bg-[#5B1425] hover:text-[#FAF7F2] rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </button>

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product)}
                className={`p-3.5 rounded-xl border transition shadow-sm ${
                  saved
                    ? 'bg-[#5B1425] text-white border-[#5B1425]'
                    : 'border-[#EAE2D7] bg-white text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
                title="Save to Wishlist"
              >
                <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Direct Buy Now */}
            <button
              onClick={handleBuyNow}
              className="w-full py-4 bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest transition shadow-xl flex items-center justify-center gap-2"
            >
              <span>Instant Buy Now</span>
              <ChevronRight className="w-4 h-4 text-[#C5A059]" />
            </button>
          </div>

          {/* Brand Assurances */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#EAE2D7] text-center text-[10px] text-[#6E6467]">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#5B1425]" />
              <span>100% Certified Handloom</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Truck className="w-4 h-4 text-[#5B1425]" />
              <span>Complimentary Express Shipping</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="w-4 h-4 text-[#5B1425]" />
              <span>7-Day Doorstep Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Information Tabs */}
      <div className="pt-10 border-t border-[#EAE2D7]">
        {/* Tab Headers */}
        <div className="flex flex-wrap border-b border-[#EAE2D7] gap-2 sm:gap-6">
          {[
            { id: 'description', label: 'Story & Description' },
            { id: 'specs', label: 'Specifications' },
            { id: 'care', label: 'Fabric & Care' },
            { id: 'shipping', label: 'Shipping & Returns' },
            { id: 'reviews', label: `Reviews (${product.reviews?.length || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-2 text-xs sm:text-sm font-bold tracking-wide uppercase transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#5B1425] text-[#5B1425]'
                  : 'border-transparent text-[#6E6467] hover:text-[#1F1A1C]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="py-8 text-sm leading-relaxed text-[#1F1A1C]">
          {activeTab === 'description' && (
            <div className="max-w-3xl space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#5B1425]">
                {product.name}
              </h3>
              <p className="text-[#6E6467] leading-relaxed">
                {product.description}
              </p>
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EAE2D7] space-y-2 mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#5B1425]">
                  ✦ The Handloom Weaving Story
                </div>
                <p className="text-xs text-[#6E6467] leading-relaxed">
                  Crafted by master weavers using age-old pit looms. The gold zari threads are carefully interwoven into pure mulberry silk warps, creating a drape that reflects light with unmatched royal grace.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl">
              <div className="divide-y divide-[#EAE2D7] bg-white rounded-xl border border-[#EAE2D7] overflow-hidden">
                {[
                  { key: 'Product SKU', val: product.sku || 'PAL-001' },
                  { key: 'Fabric Composition', val: product.fabric },
                  { key: 'Weaving Technique', val: product.pattern || 'Traditional Kadwa Weave' },
                  { key: 'Saree Length', val: product.saree_length || '5.5 Meters' },
                  { key: 'Blouse Piece', val: product.blouse_length || '0.8 Meter Unstitched Matching Piece' },
                  { key: 'Occasion', val: product.occasion },
                  { key: 'Border Type', val: 'Zari Woven Contrast Temple Border' },
                  { key: 'Origin', val: 'Handcrafted in Varanasi / Kanchipuram, India' }
                ].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 p-3 text-xs">
                    <span className="font-semibold text-[#6E6467]">{row.key}</span>
                    <span className="text-[#1F1A1C]">{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'care' && (
            <div className="max-w-3xl space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">
                Preserving Your Heirloom Saree
              </h3>
              <p className="text-xs text-[#6E6467]">
                Pure silk and metallic zari weaves respond best to gentle, traditional care to maintain their luster for generations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-white rounded-xl border border-[#EAE2D7]">
                  <h4 className="font-bold text-xs text-[#5B1425] mb-1">✓ Cleaning & Washing</h4>
                  <p className="text-xs text-[#6E6467]">{product.care_instructions || 'Professional Dry Clean Only. Never machine wash.'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#EAE2D7]">
                  <h4 className="font-bold text-xs text-[#5B1425] mb-1">✓ Storage & Muslin Wrap</h4>
                  <p className="text-xs text-[#6E6467]">Store wrapped in clean white cotton or muslin fabric. Avoid plastic bags and direct sunlight.</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#EAE2D7]">
                  <h4 className="font-bold text-xs text-[#5B1425] mb-1">✓ Ironing Guidelines</h4>
                  <p className="text-xs text-[#6E6467]">Iron on low silk setting from the reverse side only. Never place a hot iron directly onto gold zari.</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#EAE2D7]">
                  <h4 className="font-bold text-xs text-[#5B1425] mb-1">✓ Refolding Schedule</h4>
                  <p className="text-xs text-[#6E6467]">Unfold and change crease lines every 4-6 months to prevent permanent fold lines in pure zari.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="max-w-3xl space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">
                Complimentary Express Shipping Across India
              </h3>
              <p className="text-xs text-[#6E6467]">
                All PALLUVO sarees are packed in custom multi-layer luxury keepsake boxes with protective silk tissue to prevent friction during transit.
              </p>
              <ul className="space-y-2 text-xs text-[#6E6467]">
                <li>• <strong>Metros (Bengaluru, Mumbai, Delhi, Chennai, Kolkata):</strong> 1-3 Business Days.</li>
                <li>• <strong>Tier 2 & Tier 3 Cities:</strong> 3-4 Business Days.</li>
                <li>• <strong>Easy 7-Day Returns:</strong> If you are not completely enchanted by your saree, our concierge will arrange a doorstep pickup with full refund.</li>
              </ul>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8">
              {/* Rating Summary Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white rounded-2xl border border-[#EAE2D7] gap-6">
                <div className="text-center sm:text-left">
                  <div className="font-serif text-4xl font-bold text-[#5B1425]">
                    {product.rating || 4.9} <span className="text-lg text-[#6E6467]">/ 5</span>
                  </div>
                  <div className="flex items-center text-[#C5A059] text-sm justify-center sm:justify-start mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current text-[#C5A059]" />
                    ))}
                  </div>
                  <div className="text-xs text-[#6E6467] mt-1">
                    Based on {product.reviews?.length || 0} verified customer purchases
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!user) onOpenAuth();
                    else setReviewModalOpen(true);
                  }}
                  className="px-6 py-3 bg-[#5B1425] text-[#FAF7F2] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition shadow-md"
                >
                  Write a Verified Review
                </button>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {product.reviews && product.reviews.length > 0 ? (
                  product.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-xl bg-white border border-[#EAE2D7] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1F1A1C]">{rev.user_name}</span>
                          {rev.verified_purchase === 1 && (
                            <span className="text-[10px] bg-green-50 text-green-800 font-semibold px-2 py-0.2 rounded border border-green-200">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex text-[#C5A059]">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>

                      {rev.title && (
                        <h4 className="font-serif font-bold text-sm text-[#1F1A1C]">
                          {rev.title}
                        </h4>
                      )}

                      <p className="text-xs text-[#6E6467] leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[#6E6467]">
                    <p className="text-xs">No reviews submitted yet for this saree. Be the first to share your drape story!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Sarees */}
      {product.related && product.related.length > 0 && (
        <div className="pt-12 border-t border-[#EAE2D7]">
          <h3 className="font-serif text-2xl font-bold text-[#1F1A1C] mb-6">
            You May Also Adore
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {product.related.map((rel) => (
              <ProductCard key={rel.id} product={rel} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={currentImage}
            alt={product.name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF7F2] w-full max-w-lg rounded-2xl p-6 border border-[#EAE2D7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE2D7] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1F1A1C]">
                Review Your Saree Drape
              </h3>
              <button onClick={() => setReviewModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F1A1C] mb-1">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1 text-[#C5A059]"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewForm.rating ? 'fill-current' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1A1C] mb-1">Headline / Title</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="e.g. Royal luster, draped like a dream!"
                  className="w-full bg-white border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1A1C] mb-1">Review Experience</label>
                <textarea
                  rows="4"
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Describe the fabric feel, zari sheen, weight, and occasion you wore it for..."
                  className="w-full bg-white border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE2D7] text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2 bg-[#5B1425] text-white text-xs font-bold uppercase rounded-lg hover:bg-[#7E1E34] transition disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
