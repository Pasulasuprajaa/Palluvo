import React, { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Sparkles, Tag, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CartPage({ onNavigate, onOpenAuth }) {
  const {
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
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  const handleApply = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    const res = await applyCoupon(couponCode.trim());
    if (res.success) {
      setCouponCode('');
    } else {
      setCouponError(res.error);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      onOpenAuth(() => onNavigate('checkout'));
    } else {
      onNavigate('checkout');
    }
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-[#F4EFEB] rounded-full flex items-center justify-center text-4xl shadow-inner">
          🥻
        </div>
        <h2 className="font-serif text-3xl font-bold text-[#1F1A1C]">
          Your drape story hasn't started yet.
        </h2>
        <p className="text-sm text-[#6E6467] max-w-md mx-auto">
          Explore our handcrafted Banarasi, pure Kanjivaram, and designer silk sarees handwoven for every unforgettable celebration.
        </p>
        <div>
          <button
            onClick={() => onNavigate('shop')}
            className="px-8 py-3.5 bg-[#5B1425] text-[#FAF7F2] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#7E1E34] transition shadow-xl"
          >
            Explore Sarees Collection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1A1C]">
          Shopping Bag
        </h1>
        <p className="text-xs text-[#6E6467] mt-1">
          {itemCount} {itemCount === 1 ? 'saree drape' : 'saree drapes'} in your bag
        </p>
      </div>

      {/* Free Shipping Progress Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#EAE2D7] shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          {isFreeDelivery ? (
            <span className="text-[#5B1425] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>🎉 Congratulations! You have unlocked Complimentary Express Delivery.</span>
            </span>
          ) : (
            <span className="text-[#1F1A1C]">
              Add <strong className="text-[#5B1425]">₹{amountNeededForFreeDelivery.toLocaleString('en-IN')}</strong> more to unlock <strong>FREE Express Shipping</strong>
            </span>
          )}
          <span className="text-[#6E6467]">{progressPercent}%</span>
        </div>
        <div className="w-full bg-[#EAE2D7] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#C5A059] to-[#5B1425] h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Cart Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Items List (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.map((item) => (
            <div
              key={item.cart_item_id}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white border border-[#EAE2D7] shadow-sm items-start sm:items-center justify-between"
            >
              <div className="flex gap-4 items-center">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                  alt={item.name}
                  className="w-20 h-28 object-cover rounded-xl shadow-sm"
                />
                <div>
                  <h3
                    onClick={() => onNavigate('product', { slug: item.slug })}
                    className="font-serif text-base font-bold text-[#1F1A1C] hover:text-[#5B1425] cursor-pointer transition line-clamp-1"
                  >
                    {item.name}
                  </h3>
                  {item.variant_color && (
                    <div className="text-xs text-[#6E6467] flex items-center gap-1.5 mt-1">
                      <span>Shade:</span>
                      <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/10" style={{ backgroundColor: item.variant_hex || '#5B1425' }} />
                      <span>{item.variant_color}</span>
                    </div>
                  )}
                  <div className="text-xs text-[#6E6467] mt-0.5">
                    Fabric: {item.fabric || 'Pure Silk'}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-base font-bold text-[#5B1425]">
                      ₹{item.price?.toLocaleString('en-IN')}
                    </span>
                    {item.mrp && item.mrp > item.price && (
                      <span className="text-xs text-[#6E6467] line-through">
                        ₹{item.mrp?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity & Delete Controls */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F4EFEB]">
                <div className="flex items-center border border-[#EAE2D7] rounded-xl bg-[#FAF7F2] p-0.5">
                  <button
                    onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                    className="p-1.5 text-[#6E6467] hover:text-[#5B1425]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-[#1F1A1C]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                    className="p-1.5 text-[#6E6467] hover:text-[#5B1425]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.cart_item_id)}
                  className="text-xs text-[#6E6467] hover:text-red-700 transition flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold text-[#5B1425] hover:underline inline-flex items-center gap-1 pt-2"
          >
            ← Continue Shopping More Sarees
          </button>
        </div>

        {/* Right: Order Summary Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1F1A1C] border-b border-[#EAE2D7] pb-3">
              Order Summary
            </h3>

            {/* Coupon Section */}
            {appliedCoupon ? (
              <div className="bg-green-50 border border-green-200 text-green-900 p-3 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-green-700" />
                    <span>Coupon "{appliedCoupon.code}" Applied</span>
                  </div>
                  <div className="text-[11px] text-green-700 mt-0.5">
                    Saved ₹{appliedCoupon.discountAmount?.toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F1A1C]">Have a Promotional Code?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                    className="flex-1 bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs uppercase focus:outline-none focus:border-[#5B1425]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#5B1425] text-white text-xs font-bold rounded-xl hover:bg-[#7E1E34]"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-red-600">{couponError}</p>}
              </form>
            )}

            {/* Price Calculations */}
            <div className="space-y-2 text-xs text-[#6E6467] pt-2 border-t border-[#F4EFEB]">
              <div className="flex justify-between">
                <span>Total MRP ({itemCount} items)</span>
                <span>₹{totalMrp.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-green-800">
                <span>Retail Discount</span>
                <span>-₹{totalSavings.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-800 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Express Insured Shipping</span>
                <span>{isFreeDelivery ? <span className="text-green-800 font-bold">FREE</span> : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1F1A1C] pt-3 border-t border-[#EAE2D7]">
                <span>Total Amount</span>
                <span className="font-serif text-xl text-[#5B1425]">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-xl flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 text-[#C5A059]" />
            </button>

            <div className="pt-2 text-center text-[11px] text-[#6E6467] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-700" />
              <span>Secured 256-Bit Razorpay Payment Gateway</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
