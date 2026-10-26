import React, { useState, useEffect, useRef } from 'react';
import { X, Star, ShoppingBag, Heart, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getThumbnailUrl } from '../utils/imageUtils';

export default function QuickViewModal({ onNavigate }) {
  const { quickViewProduct, setQuickViewProduct, addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  useEffect(() => {
    if (quickViewProduct) {
      // Store the active element before opening
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const isUsableTarget =
        activeEl &&
        activeEl !== document.body &&
        activeEl !== document.documentElement &&
        typeof activeEl.focus === 'function' &&
        document.contains(activeEl);

      previouslyFocusedElementRef.current = isUsableTarget ? activeEl : null;

      const originalOverflow = typeof document !== 'undefined' ? document.body.style.overflow : '';
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }

      // Move focus into modal (close button or first focusable element)
      const focusTimer = setTimeout(() => {
        if (closeButtonRef.current && typeof closeButtonRef.current.focus === 'function') {
          closeButtonRef.current.focus();
        } else if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll(
            'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0 && typeof focusable[0].focus === 'function') {
            focusable[0].focus();
          }
        }
      }, 0);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          e.stopPropagation();
          setQuickViewProduct(null);
          return;
        }

        if (e.key === 'Tab') {
          const dialogNode = modalRef.current;
          if (!dialogNode) return;

          const focusableElements = Array.from(
            dialogNode.querySelectorAll(
              'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement || !dialogNode.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !dialogNode.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(focusTimer);
        if (typeof document !== 'undefined') {
          document.body.style.overflow = originalOverflow;
        }
        window.removeEventListener('keydown', handleKeyDown);

        const prevTarget = previouslyFocusedElementRef.current;
        if (
          prevTarget &&
          prevTarget !== document.body &&
          prevTarget !== document.documentElement &&
          typeof prevTarget.focus === 'function' &&
          document.contains(prevTarget)
        ) {
          try {
            prevTarget.focus();
          } catch (e) {}
        }
      };
    }
  }, [quickViewProduct, setQuickViewProduct]);

  if (!quickViewProduct) return null;

  const images = quickViewProduct.images && quickViewProduct.images.length > 0
    ? quickViewProduct.images
    : [quickViewProduct.primary_image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85'];

  const variants = quickViewProduct.variants || [];
  const currentImg = images[selectedImageIndex] || images[0];
  const saved = isWishlisted(quickViewProduct.id);

  const handleAdd = () => {
    addToCart(quickViewProduct, selectedVariant, quantity);
    setQuickViewProduct(null);
  };

  const handleFullDetails = () => {
    const slug = quickViewProduct.slug;
    const image = quickViewProduct.primary_image || (quickViewProduct.images && quickViewProduct.images[0]);
    const name = quickViewProduct.name;
    setQuickViewProduct(null);
    onNavigate('product', { slug, image, name });
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setQuickViewProduct(null);
      }}
    >
      <div className="bg-[#FAF7F2] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#EAE2D7] overflow-hidden relative flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={() => setQuickViewProduct(null)}
          aria-label="Close quick view"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 text-[#1F1A1C] hover:bg-white hover:text-[#5B1425] transition shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Left: Images */}
        <div className="md:w-1/2 p-6 flex flex-col items-center bg-[#F4EFEB]">
          <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-md relative bg-white">
            <img
              src={currentImg}
              alt={quickViewProduct.name}
              className="w-full h-full object-cover"
            />
            {quickViewProduct.is_best_seller === 1 && (
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <span className="bg-[#C5A059] text-[#1F1A1C] text-[9.5px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider shadow flex items-center gap-1 border border-[#B38F48]/40">
                  <span className="text-[9.5px] leading-none text-[#1F1A1C]">★</span>
                  <span>BESTSELLER</span>
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div
              role="tablist"
              aria-label="Product thumbnail gallery"
              className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-1"
            >
              {images.map((img, idx) => {
                const thumbSrc = (quickViewProduct.thumbnails && quickViewProduct.thumbnails[idx]) || getThumbnailUrl(img);
                return (
                  <button
                    key={idx}
                    role="tab"
                    aria-selected={selectedImageIndex === idx}
                    aria-label={`View image ${idx + 1}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none ${
                      selectedImageIndex === idx ? 'border-[#5B1425] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={thumbSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (e.currentTarget.src !== img) {
                          e.currentTarget.src = img;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="text-xs font-semibold text-[#6E6467] tracking-wider uppercase">
              {quickViewProduct.fabric} • {quickViewProduct.occasion}
            </div>

            <h2 id="quickview-title" className="font-serif text-xl sm:text-2xl font-bold text-[#1F1A1C] leading-snug">
              {quickViewProduct.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center text-[#C5A059] text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${Number(quickViewProduct.review_count) > 0 && i < Math.round(Number(quickViewProduct.rating) || 0) ? 'fill-current text-[#C5A059]' : 'text-gray-300'}`} />
                ))}
              </div>
              {Number(quickViewProduct.review_count) > 0 ? (
                <>
                  <span className="text-xs font-bold text-[#1F1A1C]">
                    {(Number(quickViewProduct.rating) || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-[#6E6467]">
                    ({quickViewProduct.review_count} reviews)
                  </span>
                </>
              ) : (
                <span className="text-xs text-[#6E6467]">No reviews yet</span>
              )}
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-2.5 pt-1 flex-wrap">
              <span className="font-sans text-2xl font-extrabold text-[#5B1425] tracking-tight">
                ₹{quickViewProduct.price?.toLocaleString('en-IN')}
              </span>
              {quickViewProduct.mrp && quickViewProduct.mrp > quickViewProduct.price && (
                <>
                  <span className="font-sans text-sm text-[#615559] line-through font-normal">
                    ₹{quickViewProduct.mrp?.toLocaleString('en-IN')}
                  </span>
                  {quickViewProduct.discount_percent > 0 && (
                    <span className="font-sans text-xs font-bold text-[#A22B43]">
                      ({quickViewProduct.discount_percent}% OFF)
                    </span>
                  )}
                </>
              )}
              <span className="text-xs text-green-800 font-semibold bg-green-50 px-2 py-0.5 rounded">
                Inclusive of all taxes
              </span>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#6E6467] leading-relaxed line-clamp-3">
              {quickViewProduct.short_desc || quickViewProduct.description}
            </p>

            {/* Variants */}
            {variants.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#1F1A1C] mb-2">
                  Available Shades: {selectedVariant ? selectedVariant.color_name : quickViewProduct.color_name}
                </div>
                <div className="flex gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition ${
                        selectedVariant?.id === v.id ? 'border-[#5B1425] scale-110 shadow-md' : 'border-black/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: v.color_hex }}
                      title={v.color_name}
                    >
                      {selectedVariant?.id === v.id && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="pt-6 border-t border-[#EAE2D7] space-y-3 mt-6">
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 py-3 px-4 bg-[#5B1425] text-[#FAF7F2] rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition shadow-lg flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
                <span>Add to Shopping Bag</span>
              </button>

              <button
                onClick={() => toggleWishlist(quickViewProduct)}
                className={`p-3 rounded-xl border transition shadow-sm ${
                  saved
                    ? 'bg-[#5B1425] text-white border-[#5B1425]'
                    : 'border-[#EAE2D7] text-[#1F1A1C] hover:bg-white hover:text-[#5B1425]'
                }`}
                title="Save to Wishlist"
              >
                <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleFullDetails}
              className="w-full py-2 text-xs text-[#5B1425] font-semibold hover:underline flex items-center justify-center gap-1"
            >
              <span>View Full Saree Specifications & Reviews</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
