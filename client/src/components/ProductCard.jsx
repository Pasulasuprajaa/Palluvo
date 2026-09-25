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
  const secondaryImg = product.secondary_image || (product.images && product.images[1]) || primaryImg;

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
        <img
          src={isHovered ? secondaryImg : primaryImg}
          alt={product.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Single Prioritized Image Badge */}
        <div className="absolute top-3 left-3 z-10">
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
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleWishlistClick}
            aria-label="Wishlist saree"
            title={saved ? 'Remove from Wishlist' : 'Add to Wishlist'}
            className={`p-2 rounded-full backdrop-blur-md transition-transform duration-200 shadow-md ${
              saved
                ? 'bg-[#5B1425] text-white scale-110'
                : 'bg-white/85 text-[#1F1A1C] hover:bg-white hover:text-[#5B1425] hover:scale-110'
            }`}
          >
            <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleCompareClick}
            aria-label="Compare saree"
            title={compared ? 'Remove from Comparison' : 'Add to Compare'}
            className={`p-2 rounded-full backdrop-blur-md transition-transform duration-200 shadow-md ${
              compared
                ? 'bg-[#C5A059] text-[#1F1A1C] scale-110 font-bold'
                : 'bg-white/85 text-[#1F1A1C] hover:bg-white hover:text-[#C5A059] hover:scale-110'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>

        {/* Quick View Hover Button */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 z-10">
          <button
            onClick={handleQuickView}
            className="flex-1 py-2 bg-white/95 backdrop-blur-md text-[#1F1A1C] text-xs font-semibold rounded-xl hover:bg-[#5B1425] hover:text-[#FAF7F2] transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
            <span className="text-[#C5A059] font-semibold shrink-0 ml-2">{product.occasion}</span>
          </div>

          {/* Product Title */}
          <h3 className="font-serif text-sm sm:text-base font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] transition line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Rating & Silk Mark Certification */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-xs">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="font-bold text-[#1F1A1C]">{product.rating || 4.8}</span>
              <span className="text-[10px] text-gray-500">
                ({product.review_count || 45})
              </span>
            </div>

            <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-0.5">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Silk Mark</span>
            </span>
          </div>
        </div>

        {/* Price & Add to Cart Button */}
        <div className="pt-2 border-t border-[#F4EFEB] flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
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

          <button
            onClick={handleAddToCart}
            className="p-2.5 bg-[#F4EFEB] text-[#5B1425] hover:bg-[#5B1425] hover:text-[#FAF7F2] rounded-xl transition shadow-xs group-hover:bg-[#5B1425] group-hover:text-[#FAF7F2] cursor-pointer"
            title="Add to Bag"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
