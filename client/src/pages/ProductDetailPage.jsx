import React, { useState, useEffect } from 'react';
import {
  Star, Heart, ShoppingBag, ShieldCheck, Truck, RotateCcw,
  Sparkles, Check, ChevronRight, Share2, ZoomIn, X, Plus, Minus, Tag, MapPin,
  Scale, Clock, Flame, Eye, CreditCard, Ruler, Scissors, MessageCircle, ThumbsUp
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import BankOffersModal from '../components/BankOffersModal';
import SizeGuideModal from '../components/SizeGuideModal';
import ReviewModal from '../components/ReviewModal';
import FrequentlyBoughtTogether from '../components/FrequentlyBoughtTogether';
import ProductQA from '../components/ProductQA';
import RecentlyViewed from '../components/RecentlyViewed';

export default function ProductDetailPage({ slug, onNavigate, onOpenAuth }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Flipkart & Amazon feature modals
  const [bankOffersOpen, setBankOffersOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Blouse Customization State (Flipkart Fashion / Amazon Apparel feature)
  const [blouseOption, setBlouseOption] = useState('unstitched'); // 'unstitched' | 'standard' | 'custom'
  const [blouseSize, setBlouseSize] = useState('M (36)');
  const [blouseNeckline, setBlouseNeckline] = useState('Sweetheart Neck');

  // Pincode checker state
  const [pincode, setPincode] = useState('560001');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Live Urgency Countdown Timer (Flipkart / Amazon Lightning Deal & Express Delivery)
  const [timeLeft, setTimeLeft] = useState({ hours: 3, minutes: 42, seconds: 19 });

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

          // Save to Recently Viewed in localStorage (Amazon/Flipkart History)
          try {
            const history = localStorage.getItem('palluvo_recently_viewed');
            let parsed = history ? JSON.parse(history) : [];
            parsed = [data.product, ...parsed.filter(p => p.id !== data.product.id)].slice(0, 8);
            localStorage.setItem('palluvo_recently_viewed', JSON.stringify(parsed));
          } catch (e) {}
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
      showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }
    try {
      setCheckingPin(true);
      const res = await fetch(`/api/pincode/check/${pincode}`);
      const data = await res.json();
      if (res.ok) {
        setPincodeResult(data);
      } else {
        showToast(data.error || 'Pincode not serviceable', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingPin(false);
    }
  };

  const handleAddToCartWithCustomization = () => {
    const customizedItem = {
      ...product,
      blouse_stitching: blouseOption === 'unstitched'
        ? 'Unstitched Fabric Included'
        : blouseOption === 'standard'
        ? `Stitched: ${blouseSize} (${blouseNeckline})`
        : 'Custom Artisan Bespoke Tailored',
      blouse_extra_price: blouseOption === 'custom' ? 799 : (blouseOption === 'standard' ? 499 : 0)
    };
    addToCart(customizedItem, quantity);
  };

  const handleBuyNow = () => {
    handleAddToCartWithCustomization();
    if (!user) {
      onOpenAuth(() => onNavigate('checkout'));
    } else {
      onNavigate('checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#5B1425] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-serif text-[#5B1425] tracking-widest uppercase font-semibold">
            Unveiling Handcrafted Drape...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#FAF7F2] p-6 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#5B1425] mb-2">Saree Drape Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">The requested saree might have been archived or belongs to an exclusive private vault edit.</p>
        <button
          onClick={() => onNavigate('shop')}
          className="px-6 py-2.5 bg-[#5B1425] text-white text-xs font-semibold rounded-xl hover:bg-[#430e1b] transition"
        >
          Explore Boutique
        </button>
      </div>
    );
  }

  const currentImage = product.images?.[selectedImageIndex] || product.primary_image || '/images/categories/banarasi.jpg';
  const isCompared = isInCompare(product.id);
  const isSaved = isWishlisted(product.id);

  // Rating breakdown stats calculation
  const reviews = product.reviews || [];
  const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (ratingDist[r.rating] !== undefined) ratingDist[r.rating]++;
  });
  const totalReviewsCount = reviews.length || product.review_count || 48;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 overflow-x-auto pb-1">
        <button onClick={() => onNavigate('home')} className="hover:text-[#5B1425] cursor-pointer">Home</button>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <button onClick={() => onNavigate('shop')} className="hover:text-[#5B1425] cursor-pointer">Sarees</button>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <button onClick={() => onNavigate('shop', { category: product.category_slug })} className="hover:text-[#5B1425] cursor-pointer">
          {product.category_name || 'Handloom'}
        </button>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[#5B1425] font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Gallery (Thumbnails + Main Hero Image) */}
        <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
          {/* Vertical Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[520px] pb-2 sm:pb-0 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                    selectedImageIndex === idx ? 'border-[#5B1425] shadow-md scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} - ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main Visual Frame with Zoom & Lightbox */}
          <div className="relative flex-1 aspect-[3/4] max-h-[580px] rounded-2xl overflow-hidden bg-white border border-[#E8E1D5] shadow-sm group">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover cursor-zoom-in transition duration-500 group-hover:scale-105"
              onClick={() => setLightboxOpen(true)}
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {product.discount_percent > 0 && (
                <span className="bg-[#5B1425] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  {product.discount_percent}% OFF
                </span>
              )}
              <span className="bg-emerald-800 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3" /> Silk Mark Certified
              </span>
            </div>

            {/* Zoom Trigger Button */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-md text-gray-800 hover:bg-[#5B1425] hover:text-white transition shadow-lg"
              title="Click to Zoom Fullscreen"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Info & Purchasing Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header Title & Tagline */}
          <div className="space-y-2 border-b border-[#E8E1D5] pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#C5A059]">
                {product.category_name || 'Heritage Collection'}
              </span>

              {/* Action Buttons: Wishlist & Compare */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addToCompare(product)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    isCompared
                      ? 'bg-[#C5A059] text-[#1F1A1C] border-[#C5A059]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#C5A059]'
                  }`}
                  title="Compare with other sarees"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                </button>

                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-2 rounded-full border transition cursor-pointer ${
                    isSaved ? 'bg-[#5B1425] text-white border-[#5B1425]' : 'bg-white text-gray-700 border-gray-300 hover:text-[#5B1425]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C] leading-tight">
              {product.name}
            </h1>

            {product.tagline && (
              <p className="text-xs sm:text-sm text-gray-600 italic font-serif">
                "{product.tagline}"
              </p>
            )}

            {/* Rating Summary + Customer Reviews Count */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold text-amber-900">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{product.rating || '4.9'}</span>
                <span className="text-gray-400 font-normal">|</span>
                <span className="text-gray-600 font-normal underline cursor-pointer" onClick={() => setActiveTab('reviews')}>
                  {totalReviewsCount} Customer Ratings
                </span>
              </div>

              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-emerald-800 font-semibold">
                SKU: {product.sku || 'PAL-LUX-001'}
              </span>
            </div>
          </div>

          {/* Pricing Block + Amazon/Flipkart Lightning Urgency Widget */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E1D5] shadow-xs space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#5B1425]">
                ₹{product.price?.toLocaleString('en-IN')}
              </span>
              {product.mrp > product.price && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    ₹{product.mrp?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Save ₹{(product.mrp - product.price).toLocaleString('en-IN')} ({product.discount_percent}% OFF)
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-gray-500">
              Inclusive of all taxes & Luxury Gift Packaging. Free doorstep insured delivery across India.
            </div>

            {/* Bank Offers & EMI Calculator Trigger Widget (Flipkart / Amazon style) */}
            <div className="pt-2 border-t border-[#E8E1D5] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <CreditCard className="w-4 h-4 text-[#C5A059]" />
                <span>
                  EMI starting at <strong>₹{Math.round(product.price / 12).toLocaleString('en-IN')}/mo</strong>.
                </span>
              </div>
              <button
                onClick={() => setBankOffersOpen(true)}
                className="text-xs font-bold text-[#5B1425] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Bank Offers</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Delivery & Urgency Countdown (Amazon Style) */}
            <div className="p-3 bg-[#FAF0E6]/70 rounded-xl border border-[#C5A059]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#5B1425] font-semibold">
                <Clock className="w-4 h-4 text-[#C5A059]" />
                <span>
                  Order within <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#C5A059]/40">{String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s</strong>
                </span>
              </div>
              <span className="text-emerald-800 font-medium">
                Get delivery by <strong>Tomorrow, 4:00 PM</strong>
              </span>
            </div>

            {/* Live Viewers & Sales Pulse (Flipkart Style) */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
              <span className="flex items-center gap-1 text-red-700 font-medium">
                <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                <span>14 orders placed in last 24 hours</span>
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span>8 people viewing right now</span>
              </span>
            </div>
          </div>

          {/* Color & Variant Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-700 uppercase tracking-wider">
                  Color Shade: <strong className="text-[#5B1425]">{selectedVariant?.color_name || product.color_name}</strong>
                </span>
                <span className="text-gray-500 font-normal">{product.variants.length} Artisanal Shades</span>
              </div>
              <div className="flex items-center gap-3">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`group relative p-1 rounded-full border-2 transition cursor-pointer ${
                      selectedVariant?.id === v.id ? 'border-[#5B1425] scale-110' : 'border-transparent hover:border-gray-300'
                    }`}
                    title={v.color_name}
                  >
                    <span
                      className="block w-6 h-6 rounded-full shadow-inner border border-black/10"
                      style={{ backgroundColor: v.color_hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blouse Stitching & Sizing Customization (Amazon Fashion & Flipkart Apparel Feature) */}
          <div className="p-4 bg-white rounded-2xl border border-[#E8E1D5] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#5B1425]" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Blouse Stitching & Sizing Options
                </span>
              </div>
              <button
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs font-bold text-[#5B1425] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size & Stitch Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBlouseOption('unstitched')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  blouseOption === 'unstitched'
                    ? 'border-[#5B1425] bg-[#5B1425]/5 text-[#5B1425] font-bold'
                    : 'border-[#E8E1D5] bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div>Unstitched Piece</div>
                <div className="text-[10px] text-gray-500 font-normal">Included Free (0.8M)</div>
              </button>

              <button
                type="button"
                onClick={() => setBlouseOption('standard')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  blouseOption === 'standard'
                    ? 'border-[#5B1425] bg-[#5B1425]/5 text-[#5B1425] font-bold'
                    : 'border-[#E8E1D5] bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div>Ready Stitched</div>
                <div className="text-[10px] text-gray-500 font-normal">Sizes XS - 2XL (+₹499)</div>
              </button>

              <button
                type="button"
                onClick={() => setBlouseOption('custom')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  blouseOption === 'custom'
                    ? 'border-[#5B1425] bg-[#5B1425]/5 text-[#5B1425] font-bold'
                    : 'border-[#E8E1D5] bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div>Custom Bespoke</div>
                <div className="text-[10px] text-gray-500 font-normal">Artisan Tailored (+₹799)</div>
              </button>
            </div>

            {blouseOption === 'standard' && (
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Standard Size</label>
                  <select
                    value={blouseSize}
                    onChange={(e) => setBlouseSize(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] text-xs outline-none"
                  >
                    <option>XS (32)</option>
                    <option>S (34)</option>
                    <option>M (36)</option>
                    <option>L (38)</option>
                    <option>XL (40)</option>
                    <option>2XL (42)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Neckline Cut</label>
                  <select
                    value={blouseNeckline}
                    onChange={(e) => setBlouseNeckline(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5] text-xs outline-none"
                  >
                    <option>Sweetheart Neck</option>
                    <option>Boat Neck</option>
                    <option>Royal Deep Back</option>
                    <option>Round Classic</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* PIN Code Delivery Estimator */}
          <div className="p-4 bg-white rounded-2xl border border-[#E8E1D5] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-[#5B1425]" />
              <span>Check Doorstep Delivery & COD Availability</span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit PIN code"
                value={pincode}
                maxLength={6}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2 bg-[#FAF7F2] rounded-xl border border-[#E8E1D5] text-xs outline-none focus:border-[#5B1425]"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-4 py-2 bg-[#5B1425] text-white text-xs font-semibold rounded-xl hover:bg-[#430e1b] transition disabled:opacity-50 cursor-pointer"
              >
                {checkingPin ? 'Checking...' : 'Check'}
              </button>
            </form>

            {pincodeResult && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Delivery available in {pincodeResult.city}, {pincodeResult.state}</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  Estimated Delivery: <strong>{pincodeResult.estimated_delivery}</strong> | Cash on Delivery: <strong>Available</strong>
                </div>
              </div>
            )}
          </div>

          {/* Quantity & CTA Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[#E8E1D5] rounded-xl bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-gray-500 hover:text-black transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-xs font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity || 10, quantity + 1))}
                  className="p-2 text-gray-500 hover:text-black transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCartWithCustomization}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-[#5B1425] text-[#5B1425] hover:bg-[#5B1425] hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>Instant Buy Now & Drape</span>
            </button>
          </div>

          {/* Flipkart / Amazon Trust Guarantee Icons */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#E8E1D5] text-center text-[11px] text-gray-600">
            <div className="p-3 bg-white rounded-xl border border-[#E8E1D5] space-y-1">
              <ShieldCheck className="w-5 h-5 text-emerald-700 mx-auto" />
              <div className="font-bold text-gray-900">Silk Mark Certified</div>
              <div className="text-[10px] text-gray-500">100% Pure Heritage Silk</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E8E1D5] space-y-1">
              <Truck className="w-5 h-5 text-[#5B1425] mx-auto" />
              <div className="font-bold text-gray-900">Insured Delivery</div>
              <div className="text-[10px] text-gray-500">Free BlueDart Express</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E8E1D5] space-y-1">
              <RotateCcw className="w-5 h-5 text-[#C5A059] mx-auto" />
              <div className="font-bold text-gray-900">7-Day Free Return</div>
              <div className="text-[10px] text-gray-500">Hassle-Free Doorstep Pickup</div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together Bundle Widget (Amazon Style) */}
      <FrequentlyBoughtTogether product={product} onNavigate={onNavigate} />

      {/* Product Information Tabs (Description, Fabric Specs, Artisan Story, Reviews) */}
      <div className="bg-white rounded-2xl border border-[#E8E1D5] shadow-xs overflow-hidden">
        <div className="flex border-b border-[#E8E1D5] bg-[#FAF7F2] overflow-x-auto scrollbar-none">
          {[
            { id: 'description', label: 'Product Details & Weave' },
            { id: 'specifications', label: 'Fabric Specifications' },
            { id: 'reviews', label: `Customer Reviews (${totalReviewsCount})` },
            { id: 'qa', label: `Questions & Answers (${product.qa?.length || 5})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-6 text-xs font-serif font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#5B1425] text-[#5B1425] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {/* Tab 1: Description */}
          {activeTab === 'description' && (
            <div className="space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed max-w-4xl">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5B1425] mb-2">
                  Artisanal Craft & Design Narrative
                </h3>
                <p className="leading-relaxed">{product.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E1D5] space-y-1.5">
                  <h4 className="font-bold text-[#5B1425] text-xs">✨ Handloom Weave Technique</h4>
                  <p className="text-xs text-gray-600">
                    Woven on traditional pit-looms by national award-winning master artisans in Varanasi / Kanchipuram using electroplated real zari and mulberry silk warp.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E1D5] space-y-1.5">
                  <h4 className="font-bold text-[#5B1425] text-xs">📦 Unboxing & Gifting Experience</h4>
                  <p className="text-xs text-gray-600">
                    Arrives nestled in signature velvet-lined PALLUVO gold foil keepsake box, enclosed with an authentic Silk Mark Certificate of India and pure cotton storage pouch.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Specifications Table */}
          {activeTab === 'specifications' && (
            <div className="max-w-3xl overflow-hidden rounded-xl border border-[#E8E1D5]">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E8E1D5]">
                  <tr className="bg-[#FAF7F2]">
                    <td className="p-3 font-semibold text-gray-600 w-1/3">Fabric / Weave</td>
                    <td className="p-3 font-bold text-gray-900">{product.fabric}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-600">Occasion</td>
                    <td className="p-3 text-gray-900">{product.occasion}</td>
                  </tr>
                  <tr className="bg-[#FAF7F2]">
                    <td className="p-3 font-semibold text-gray-600">Zari / Pattern</td>
                    <td className="p-3 text-gray-900">{product.pattern || 'Authentic Antique Gold Zari Weave'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-600">Saree Length</td>
                    <td className="p-3 text-gray-900">{product.saree_length || '5.50 Meters (6 Yards)'}</td>
                  </tr>
                  <tr className="bg-[#FAF7F2]">
                    <td className="p-3 font-semibold text-gray-600">Blouse Fabric Included</td>
                    <td className="p-3 text-gray-900">{product.blouse_length || '0.80 Meter Unstitched Piece with Sleeve Border'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-600">Care & Preservation</td>
                    <td className="p-3 text-gray-900">{product.care_instructions || 'Strictly Dry Clean Only. Wrap in pure muslin cloth.'}</td>
                  </tr>
                  <tr className="bg-[#FAF7F2]">
                    <td className="p-3 font-semibold text-gray-600">Silk Authenticity Mark</td>
                    <td className="p-3 text-emerald-800 font-bold">Silk Mark Organization of India Registered</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Customer Reviews Hub (Flipkart / Amazon style with Breakdown & Photos) */}
          {activeTab === 'reviews' && (
            <div className="space-y-8">
              {/* Rating Breakdown Overview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 bg-[#FAF7F2] rounded-2xl border border-[#E8E1D5]">
                {/* Left Average */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#E8E1D5] pb-6 md:pb-0 md:pr-6">
                  <div className="font-serif text-5xl font-bold text-[#5B1425]">
                    {product.rating || '4.9'}
                  </div>
                  <div className="flex text-amber-500 my-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">Based on {totalReviewsCount} verified customer ratings</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">98% of patrons recommend this saree</p>

                  <button
                    onClick={() => {
                      if (!user) {
                        onOpenAuth(() => setReviewModalOpen(true));
                      } else {
                        setReviewModalOpen(true);
                      }
                    }}
                    className="mt-4 px-5 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
                  >
                    Write a Verified Review
                  </button>
                </div>

                {/* Right Progress Bars (Flipkart / Amazon style) */}
                <div className="md:col-span-8 flex flex-col justify-center space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingDist[stars] || (stars === 5 ? 38 : (stars === 4 ? 8 : 2));
                    const percentage = Math.round((count / (totalReviewsCount || 1)) * 100);
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-semibold text-gray-700 flex items-center gap-1">
                          {stars} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        </span>
                        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stars >= 4 ? 'bg-emerald-600' : (stars === 3 ? 'bg-amber-500' : 'bg-red-500')
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-gray-500 font-mono text-[11px]">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Photos Gallery */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#1F1A1C] mb-3">
                  Customer Drape Showcase (Photo Reviews)
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {[
                    currentImage,
                    product.images?.[1] || '/images/categories/silk.jpg',
                    product.images?.[2] || '/images/occasions/wedding_edit.jpg',
                    '/images/categories/banarasi.jpg'
                  ].map((photo, idx) => (
                    <div key={idx} className="relative w-24 h-32 rounded-xl overflow-hidden border border-[#E8E1D5] shrink-0 shadow-xs cursor-pointer hover:scale-105 transition">
                      <img src={photo} alt={`Customer Drape ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Reviews List */}
              <div className="space-y-4">
                {reviews && reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-5 rounded-2xl bg-white border border-[#E8E1D5] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">{rev.user_name}</span>
                          {rev.verified_purchase === 1 && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> Verified Drape Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex text-amber-500">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>

                      {rev.title && (
                        <h5 className="font-serif font-bold text-sm text-gray-900">
                          {rev.title}
                        </h5>
                      )}

                      <p className="text-xs text-gray-700 leading-relaxed">
                        {rev.comment}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100">
                        <span>Reviewed on {new Date(rev.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <div className="flex items-center gap-1 text-gray-500">
                          <ThumbsUp className="w-3 h-3" />
                          <span>Helpful (12)</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">
                    Be the first patron to share your luxury drape experience!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Questions & Answers (Amazon Q&A System) */}
          {activeTab === 'qa' && (
            <ProductQA productId={product.id} initialQA={product.qa || []} />
          )}
        </div>
      </div>

      {/* Related / You May Also Adore */}
      {product.related && product.related.length > 0 && (
        <div className="pt-8 border-t border-[#E8E1D5]">
          <h3 className="font-serif text-2xl font-bold text-[#1F1A1C] mb-6">
            You May Also Adore (Similar Weaves)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {product.related.map((rel) => (
              <ProductCard key={rel.id} product={rel} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed Items Carousel */}
      <RecentlyViewed currentSlug={slug} onNavigate={onNavigate} />

      {/* Modals */}
      <BankOffersModal
        isOpen={bankOffersOpen}
        onClose={() => setBankOffersOpen(false)}
        price={product.price}
      />

      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />

      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        product={product}
        onReviewSubmitted={() => {
          // Re-fetch product
          fetch(`/api/products/${slug}`)
            .then(res => res.json())
            .then(data => {
              if (data.product) setProduct(data.product);
            });
        }}
      />

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
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
    </div>
  );
}
