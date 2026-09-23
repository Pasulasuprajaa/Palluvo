import React from 'react';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

export default function WishlistPage({ onNavigate }) {
  const { wishlistItems, toggleWishlist, moveToCart } = useWishlist();
  const { addToCart } = useCart();

  if (wishlistItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 mx-auto bg-[#F4EFEB] rounded-full flex items-center justify-center text-[#5B1425] shadow-inner">
          <Heart className="w-10 h-10" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-[#1F1A1C]">
          Save the styles you love.
        </h2>
        <p className="text-xs sm:text-sm text-[#6E6467] max-w-md mx-auto">
          Keep track of your dream Banarasi, Kanjivaram, and festive sarees for weddings, celebrations, and upcoming occasions.
        </p>
        <div>
          <button
            onClick={() => onNavigate('shop')}
            className="px-8 py-3.5 bg-[#5B1425] text-[#FAF7F2] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#7E1E34] transition shadow-xl"
          >
            Explore Saree Collections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1A1C]">
          Your Saved Wishlist
        </h1>
        <p className="text-xs text-[#6E6467] mt-1">
          {wishlistItems.length} {wishlistItems.length === 1 ? 'saree saved' : 'sarees saved'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {wishlistItems.map((item) => (
          <div
            key={item.product_id || item.id}
            className="bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col justify-between"
          >
            <div
              className="relative aspect-[3/4] cursor-pointer bg-[#F4EFEB]"
              onClick={() => onNavigate('product', { slug: item.slug })}
            >
              <img
                src={item.primary_image || item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(item);
                }}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/80 text-red-700 hover:bg-white transition shadow-md"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3
                  onClick={() => onNavigate('product', { slug: item.slug })}
                  className="font-serif text-sm font-bold text-[#1F1A1C] hover:text-[#5B1425] cursor-pointer line-clamp-1"
                >
                  {item.name}
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-bold text-sm text-[#5B1425]">
                    ₹{item.price?.toLocaleString('en-IN')}
                  </span>
                  {item.mrp && item.mrp > item.price && (
                    <span className="text-xs text-[#6E6467] line-through">
                      ₹{item.mrp?.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => moveToCart(item)}
                className="w-full py-2.5 bg-[#5B1425] text-[#FAF7F2] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Move to Bag</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
