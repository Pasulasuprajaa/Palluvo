import React, { useState } from 'react';
import { Heart, Eye, ShoppingBag, Star, Check } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';

export default function ProductCard({ product, onNavigate, imageLoading = 'lazy', priority = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCart, setQuickViewProduct } = useCart();
  const { isInCompare, addToCompare } = useCompare();

  const saved = isWishlisted(product.id);
  const compared = isInCompare(product.id);
  const primaryImg = product.primary_image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80';
  const rawSecondary = product.secondary_image || (product.images && product.images[1]);
  const hasItemSpecificAlternate = Boolean(
    rawSecondary &&
    rawSecondary !== primaryImg &&
    !rawSecondary.includes('/images/categories/') &&
    !rawSecondary.includes('/images/occasions/')
  );
  const secondaryImg = hasItemSpecificAlternate ? rawSecondary : primaryImg;

  const handleCardClick = (e) => {
    if (e && (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0))) {
      return;
    }
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    onNavigate('product', { slug: product.slug });
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleCompareClick = (e) => {
    e.stopPropagation();
    addToCompare(product);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            handleCardClick(e);
          }
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`${product.name} - ₹${product.price?.toLocaleString('en-IN')}`}
      className="group relative bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none w-full select-none"
    >
      {/* 1. Image Container (Entire surface clickable) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F4EFEB] cursor-pointer">
        {/* Shimmer Placeholder while Image Loads */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-b from-[#EAE2D7]/80 via-[#FAF7F2]/60 to-[#EAE2D7]/80 animate-pulse transition-opacity duration-500 z-0 ${
            imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        <img
          src={isHovered ? secondaryImg : primaryImg}
          alt={product.name}
          loading={priority ? 'eager' : imageLoading}
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover object-top transition-all duration-700 ease-out group-hover:scale-105 pointer-events-none ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
          }`}
        />

        {/* Single Prioritized Discount Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
          {product.discount_percent > 0 ? (
            <span className="bg-[#5B1425] text-[#FAF7F2] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              {product.discount_percent}% OFF
            </span>
          ) : product.is_new_arrival === 1 ? (
            <span className="bg-[#1F1A1C] text-[#FAF7F2] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              New
            </span>
          ) : null}
        </div>

        {/* Wishlist Button (44x44px accessible touch target) */}
        <div className="absolute top-1 right-1 z-20">
          <button
            onClick={handleWishlistClick}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            title={saved ? 'Remove from Wishlist' : 'Add to Wishlist'}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-none group/wishlist"
          >
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-xs focus-visible:ring-2 focus-visible:ring-[#C5A059] ${
                saved
                  ? 'bg-[#5B1425] text-white scale-105'
                  : 'bg-white/85 text-[#1F1A1C] hover:bg-white hover:text-[#5B1425] group-hover/wishlist:scale-105'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
            </span>
          </button>
        </div>

        {/* Desktop Quick View Button (Revealed on hover/focus) */}
        <div className="hidden sm:flex absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-300 gap-2 z-20">
          <button
            onClick={handleQuickView}
            aria-label={`Quick view ${product.name}`}
            className="flex-1 min-h-[44px] py-2 px-3 bg-white/95 backdrop-blur-md text-[#1F1A1C] text-xs font-semibold rounded-xl hover:bg-[#5B1425] hover:text-[#FAF7F2] focus-visible:bg-[#5B1425] focus-visible:text-[#FAF7F2] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* 2. Product Details (Entire surface clickable) */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5 cursor-pointer">
        <div>
          {/* Fabric & Occasion Tag */}
          <div className="flex items-center justify-between text-[11px] text-[#6E6467] mb-1">
            <span className="font-medium tracking-wide text-[#6E6467]">{product.fabric}</span>
            <span className="text-[#855A16] font-semibold shrink-0 ml-2">{product.occasion}</span>
          </div>

          {/* Product Title */}
          <h3 className="min-h-[44px] flex items-center font-serif text-sm sm:text-base font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] transition leading-snug cursor-pointer line-clamp-2">
            {product.name}
          </h3>

          {/* Rating & Silk Mark Certification */}
          <div className="flex items-center justify-between mt-1.5">
            {Number(product.review_count) > 0 ? (
              <div
                aria-label={`Rated ${(Number(product.rating) || 0).toFixed(1)} out of 5 based on ${product.review_count} review${Number(product.review_count) === 1 ? '' : 's'}`}
                className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-xs"
              >
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                <span aria-hidden="true" className="font-bold text-[#1F1A1C]">
                  {(Number(product.rating) || 0).toFixed(1)}
                </span>
                <span aria-hidden="true" className="text-[10px] text-gray-500">
                  ({product.review_count})
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE2D7] text-[10px] text-[#6E6467]"
              >
                <Star className="w-3 h-3 text-[#A09699]" aria-hidden="true" />
                <span className="font-medium">No reviews yet</span>
              </div>
            )}

            <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-0.5">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Silk Mark</span>
            </span>
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="pt-2 border-t border-[#F4EFEB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-sans text-base sm:text-lg font-bold text-[#5B1425] tracking-tight">
                ₹{product.price?.toLocaleString('en-IN')}
              </span>
              {product.mrp && product.mrp > product.price && (
                <span className="font-sans text-xs text-[#615559] line-through font-normal">
                  ₹{product.mrp?.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Free Express Delivery
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto relative z-20">
            {/* Mobile Touch Quick View (44x44px accessible touch target) */}
            <button
              onClick={handleQuickView}
              aria-label={`Quick view ${product.name}`}
              title="Quick View"
              className="sm:hidden w-11 h-11 min-h-[44px] min-w-[44px] shrink-0 bg-[#FAF7F2] text-[#1F1A1C] hover:bg-[#5B1425] hover:text-[#FAF7F2] focus-visible:bg-[#5B1425] focus-visible:text-[#FAF7F2] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-xl border border-[#EAE2D7] transition cursor-pointer flex items-center justify-center shadow-xs"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Add to Bag (44px min touch target across all breakpoints) */}
            <button
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to bag`}
              title="Add to Bag"
              className="flex-1 sm:flex-none min-h-[44px] sm:min-w-[44px] px-3 sm:px-2.5 bg-[#F4EFEB] text-[#5B1425] hover:bg-[#5B1425] hover:text-[#FAF7F2] focus-visible:bg-[#5B1425] focus-visible:text-[#FAF7F2] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded-xl transition shadow-xs group-hover:bg-[#5B1425] group-hover:text-[#FAF7F2] cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Add to Bag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
