import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Sparkles, ArrowRight, Tag, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CartDrawer({ onNavigate, onOpenAuth }) {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    itemCount,
    subtotal,
    totalMrp,
    totalSavings,
    deliveryFee,
    freeDeliveryThreshold,
    isFreeDelivery,
    amountNeededForFreeDelivery,
    appliedCoupon,
    discountAmount,
    totalAmount,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon
  } = useCart();

  const { user } = useAuth();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError('');
    const res = await applyCoupon(couponInput.trim());
    if (res.success) {
      setCouponInput('');
    } else {
      setCouponError(res.error);
    }
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    if (!user) {
      onOpenAuth(() => onNavigate('checkout'));
    } else {
      onNavigate('checkout');
    }
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF7F2] shadow-2xl flex flex-col border-l border-[#EAE2D7] animate-slide-up sm:animate-none">
          
          {/* Header */}
          <div className="p-5 border-b border-[#EAE2D7] flex items-center justify-between bg-[#F4EFEB]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#5B1425]" />
              <h2 className="font-serif text-lg font-bold text-[#1F1A1C]">
                Your Shopping Bag
              </h2>
              <span className="bg-[#5B1425] text-[#FAF7F2] text-xs font-bold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-full text-[#6E6467] hover:text-[#1F1A1C] hover:bg-[#FAF7F2] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-[#5B1425]/5 p-3.5 border-b border-[#EAE2D7]">
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              {isFreeDelivery ? (
                <span className="text-[#5B1425] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  🎉 You unlocked FREE Express Luxury Delivery!
                </span>
              ) : (
                <span className="text-[#1F1A1C]">
                  Add <strong className="text-[#5B1425]">₹{amountNeededForFreeDelivery.toLocaleString('en-IN')}</strong> more for <strong>FREE Delivery</strong>
                </span>
              )}
              <span className="text-[#6E6467]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#EAE2D7] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#C5A059] to-[#5B1425] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cartItems.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-[#F4EFEB] rounded-full flex items-center justify-center text-[#5B1425] text-2xl">
                  🥻
                </div>
                <div className="font-serif text-lg font-medium text-[#1F1A1C]">
                  Your drape story hasn't started yet.
                </div>
                <p className="text-xs text-[#6E6467] max-w-xs mx-auto">
                  Explore our handcrafted Banarasi, Kanjivaram, and designer silk sarees.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onNavigate('shop');
                  }}
                  className="mt-4 px-6 py-2.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#7E1E34] transition shadow-md"
                >
                  Explore Sarees
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="flex gap-3.5 p-3 rounded-xl bg-white border border-[#EAE2D7] shadow-sm hover:border-[#C5A059]/50 transition"
                >
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                    alt={item.name}
                    className="w-20 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[#1F1A1C] line-clamp-1">
                        {item.name}
                      </h4>
                      {item.variant_color && (
                        <div className="text-[11px] text-[#6E6467] flex items-center gap-1.5 mt-0.5">
                          <span>Color:</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block border border-black/10"
                            style={{ backgroundColor: item.variant_hex || '#5B1425' }}
                          />
                          <span>{item.variant_color}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-[#5B1425]">
                          ₹{item.price?.toLocaleString('en-IN')}
                        </span>
                        {item.mrp && item.mrp > item.price && (
                          <span className="text-xs text-[#6E6467] line-through">
                            ₹{item.mrp?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F4EFEB]">
                      {/* Quantity Controller */}
                      <div className="flex items-center border border-[#EAE2D7] rounded-md bg-[#FAF7F2]">
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                          className="p-1 text-[#6E6467] hover:text-[#5B1425] transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-[#1F1A1C]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                          className="p-1 text-[#6E6467] hover:text-[#5B1425] transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.cart_item_id)}
                        className="text-xs text-[#6E6467] hover:text-red-700 transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Section */}
          {cartItems.length > 0 && (
            <div className="p-4 border-t border-[#EAE2D7] bg-[#F4EFEB] space-y-3">
              {/* Coupon Form */}
              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 text-green-900 px-3 py-2 rounded-lg text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Tag className="w-3.5 h-3.5 text-green-700" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discountAmount.toLocaleString('en-IN')})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon (e.g. WELCOME10)"
                    className="flex-1 bg-white border border-[#EAE2D7] rounded-lg px-3 py-1.5 text-xs text-[#1F1A1C] uppercase focus:outline-none focus:border-[#5B1425]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold rounded-lg hover:bg-[#7E1E34] transition"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-red-600">{couponError}</p>}

              {/* Price Details */}
              <div className="space-y-1 text-xs text-[#6E6467]">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span className="font-semibold text-[#1F1A1C]">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-800">
                    <span>Coupon Discount</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Express Delivery</span>
                  <span>{isFreeDelivery ? <span className="text-green-800 font-semibold">FREE</span> : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#1F1A1C] pt-2 border-t border-[#EAE2D7]">
                  <span>Total Amount</span>
                  <span className="text-[#5B1425] font-serif text-base">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onNavigate('cart');
                  }}
                  className="py-2.5 px-3 border border-[#5B1425] text-[#5B1425] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#FAF7F2] transition text-center"
                >
                  View Bag
                </button>
                <button
                  onClick={handleProceedCheckout}
                  className="py-2.5 px-3 bg-[#5B1425] text-[#FAF7F2] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-[#6E6467]">
                <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                <span>100% Authentic Sarees & Secured Razorpay Checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
