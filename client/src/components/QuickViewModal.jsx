import React, { useState } from 'react';
import { X, Star, ShoppingBag, Heart, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function QuickViewModal({ onNavigate }) {
  const { quickViewProduct, setQuickViewProduct, addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

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
    setQuickViewProduct(null);
    onNavigate('product', { slug });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF7F2] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#EAE2D7] overflow-hidden relative flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 text-[#1F1A1C] hover:bg-white hover:text-[#5B1425] transition shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Images */}
        <div className="md:w-1/2 p-6 flex flex-col items-center bg-[#F4EFEB]">
          <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-md relative bg-white">
            <img
              src={currentImg}
              alt={quickViewProduct.name}
              className="w-full h-full object-cover"
            />
            {quickViewProduct.discount_percent > 0 && (
              <span className="absolute top-3 left-3 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                {quickViewProduct.discount_percent}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition ${
                    selectedImageIndex === idx ? 'border-[#5B1425] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="text-xs font-semibold text-[#6E6467] tracking-wider uppercase">
              {quickViewProduct.fabric} • {quickViewProduct.occasion}
            </div>

            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F1A1C] leading-snug">
              {quickViewProduct.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center text-[#C5A059] text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current text-[#C5A059]" />
                ))}
              </div>
              <span className="text-xs font-bold text-[#1F1A1C]">
                {quickViewProduct.rating || 4.9}
              </span>
              <span className="text-xs text-[#6E6467]">
                ({quickViewProduct.review_count || 120} reviews)
              </span>
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="font-serif text-2xl font-bold text-[#5B1425]">
                ₹{quickViewProduct.price?.toLocaleString('en-IN')}
              </span>
              {quickViewProduct.mrp && quickViewProduct.mrp > quickViewProduct.price && (
                <span className="text-sm text-[#6E6467] line-through">
                  ₹{quickViewProduct.mrp?.toLocaleString('en-IN')}
                </span>
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
