import React, { useState } from 'react';
import { Heart, Eye, ShoppingBag, Star, Sparkles, Scale, Check } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';

export default function ProductCard({ product, onNavigate }) {
  const [isHovered, setIsHovered] = useState(false);
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

  const handleCardClick = () => {
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
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F4EFEB]">
        <a
          href={`/sarees/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            handleCardClick();
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="block w-full h-full cursor-pointer"
        >
          <img
            src={isHovered ? secondaryImg : primaryImg}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </a>

        {/* Single Prioritized Image Badge */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          {product.discount_percent > 0 ? (
            <span className="bg-[#5B1425] text-[#FAF7F2] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
              {product.discount_percent}% OFF
            </span>
          ) : product.is_new_arrival === 1 ? (
            <span className="bg-[#1F1A1C] text-[#FAF7F2] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
              New
            </span>
          ) : null}
        </div>

        {/* Wishlist & Compare Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={handleWishlistClick}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            title={saved ? 'Remove from Wishlist' : 'Add to Wishlist'}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full backdrop-blur-md transition-transform duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none cursor-pointer ${
              saved
                ? 'bg-[#5B1425] text-white scale-105'
                : 'bg-white/90 text-[#1F1A1C] hover:bg-white hover:text-[#5B1425] hover:scale-105'
            }`}
          >
            <Heart className={`w-4.5 h-4.5 ${saved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleCompareClick}
            aria-label={compared ? `Remove ${product.name} from comparison` : `Add ${product.name} to comparison`}
            title={compared ? 'Remove from Comparison' : 'Add to Compare'}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full backdrop-blur-md transition-transform duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none cursor-pointer ${
              compared
                ? 'bg-[#C5A059] text-[#1F1A1C] scale-105 font-bold'
                : 'bg-white/90 text-[#1F1A1C] hover:bg-white hover:text-[#C5A059] hover:scale-105'
            }`}
          >
            <Scale className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Desktop Quick View Button (Revealed on hover/focus on desktop screens only, keeping mobile photography completely unobstructed) */}
        <div className="hidden sm:flex absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-300 gap-2 z-10">
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

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          {/* Fabric & Occasion Tag */}
          <div className="flex items-center justify-between text-[11px] text-[#6E6467] mb-1">
            <span className="font-medium tracking-wide text-[#6E6467]">{product.fabric}</span>
            <span className="text-[#855A16] font-semibold shrink-0 ml-2">{product.occasion}</span>
          </div>

          {/* Product Title (Keyboard accessible semantic link) */}
          <a
            href={`/sarees/${product.slug}`}
            onClick={(e) => {
              e.preventDefault();
              handleCardClick();
            }}
            aria-label={`View details for ${product.name}`}
            className="font-serif text-sm sm:text-base font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] focus-visible:text-[#5B1425] focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none rounded transition line-clamp-2 leading-snug cursor-pointer block"
          >
            <h3>{product.name}</h3>
          </a>

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
                aria-label="No reviews yet"
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
              <span className="font-serif text-base sm:text-lg font-bold text-[#5B1425]">
                ₹{product.price?.toLocaleString('en-IN')}
              </span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-xs text-[#6E6467] line-through">
                  ₹{product.mrp?.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              Free Express Delivery
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
