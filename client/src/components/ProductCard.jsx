import React, { useState } from 'react';
import { Heart, Eye, ShoppingBag, Star, Sparkles } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, onNavigate }) {
  const [isHovered, setIsHovered] = useState(false);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCart, setQuickViewProduct } = useCart();

  const saved = isWishlisted(product.id);
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

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F4EFEB]">
        <img
          src={isHovered ? secondaryImg : primaryImg}
          alt={product.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.discount_percent > 0 && (
            <span className="bg-[#5B1425] text-[#FAF7F2] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
              {product.discount_percent}% OFF
            </span>
          )}
          {product.is_best_seller === 1 && (
            <span className="bg-[#C5A059] text-[#3F0D19] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Best Seller
            </span>
          )}
          {product.is_new_arrival === 1 && (
            <span className="bg-[#1F1A1C] text-[#FAF7F2] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              New
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          aria-label="Wishlist saree"
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-transform duration-200 z-10 shadow-md ${
            saved
              ? 'bg-[#5B1425] text-white scale-110'
              : 'bg-white/80 text-[#1F1A1C] hover:bg-white hover:text-[#5B1425] hover:scale-110'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Hover Button */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 z-10">
          <button
            onClick={handleQuickView}
            className="flex-1 py-2 bg-white/95 backdrop-blur-md text-[#1F1A1C] text-xs font-semibold rounded-xl hover:bg-[#5B1425] hover:text-[#FAF7F2] transition shadow-lg flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Fabric & Occasion Tag */}
          <div className="flex items-center justify-between text-[11px] text-[#6E6467] mb-1">
            <span className="font-medium tracking-wide">{product.fabric}</span>
            <span className="text-[#C5A059] font-medium">{product.occasion}</span>
          </div>

          {/* Product Title */}
          <h3 className="font-serif text-sm sm:text-base font-semibold text-[#1F1A1C] group-hover:text-[#5B1425] transition line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center text-[#C5A059] text-xs">
              <Star className="w-3.5 h-3.5 fill-current text-[#C5A059]" />
              <span className="font-bold text-[#1F1A1C] ml-1">{product.rating || 4.8}</span>
            </div>
            <span className="text-[11px] text-[#6E6467]">
              ({product.review_count || 45})
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
          </div>

          <button
            onClick={handleAddToCart}
            className="p-2.5 bg-[#F4EFEB] text-[#5B1425] hover:bg-[#5B1425] hover:text-[#FAF7F2] rounded-xl transition shadow-sm group-hover:bg-[#5B1425] group-hover:text-[#FAF7F2]"
            title="Add to Bag"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
