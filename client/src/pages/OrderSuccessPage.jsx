import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, Sparkles, Truck, Package, ArrowRight, Printer, ShoppingBag } from 'lucide-react';

export default function OrderSuccessPage({ order, onNavigate }) {
  useEffect(() => {
    // Launch celebratory luxury gold & burgundy confetti
    try {
      const end = Date.now() + 2 * 1000;
      const colors = ['#C5A059', '#5B1425', '#FAF7F2', '#D4AF37', '#7E1E34'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    } catch (e) {
      console.warn('Confetti effect:', e);
    }
  }, []);

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">No Recent Order Found</h2>
        <button
          onClick={() => onNavigate('shop')}
          className="px-6 py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase"
        >
          Explore Sarees
        </button>
      </div>
    );
  }

  const address = order.address || {};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8 animate-fade-in">
      {/* Confirmation Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-[#5B1425] text-[#C5A059] rounded-full flex items-center justify-center mx-auto shadow-xl">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#5B1425]">
          ✦ Drape Journey Begun
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1F1A1C]">
          Order Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6467] italic font-serif max-w-md mx-auto">
          “Every drape, a little magic.” Your authentic heirloom saree is now being prepared in our artisan workshop.
        </p>
      </div>

      {/* Main Order Details Card */}
      <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Order Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#FAF7F2] rounded-xl border border-[#EAE2D7] text-xs">
          <div>
            <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Order ID</span>
            <span className="font-mono font-bold text-[#5B1425]">{order.order_number || 'PAL-2026-98124'}</span>
          </div>
          <div>
            <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Payment Status</span>
            <span className="font-bold text-green-800">✓ Paid via Razorpay</span>
          </div>
          <div>
            <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Amount Paid</span>
            <span className="font-bold text-[#1F1A1C]">₹{order.total_amount?.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[#6E6467] block text-[10px] uppercase font-bold">Estimated Delivery</span>
            <span className="font-bold text-[#1F1A1C]">{order.estimated_delivery || '3-4 Business Days'}</span>
          </div>
        </div>

        {/* Ordered Items */}
        <div className="space-y-3">
          <h3 className="font-serif text-base font-bold text-[#1F1A1C]">
            Heirloom Sarees in this Order
          </h3>
          <div className="divide-y divide-[#F4EFEB]">
            {order.items && order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 py-3">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                  alt={item.product_name}
                  className="w-14 h-18 object-cover rounded-lg shadow-sm"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-xs text-[#1F1A1C]">{item.product_name}</h4>
                  <div className="text-[11px] text-[#6E6467] mt-0.5">
                    Qty: {item.quantity} {item.variant_name ? `• Shade: ${item.variant_name}` : ''}
                  </div>
                </div>
                <div className="font-bold text-xs text-[#5B1425]">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="pt-4 border-t border-[#EAE2D7] text-xs space-y-1">
          <h4 className="font-bold text-[#1F1A1C] uppercase tracking-wider text-[11px]">
            Delivery Destination:
          </h4>
          <p className="text-[#6E6467] leading-relaxed">
            <strong>{address.name}</strong> • {address.phone} <br />
            {address.house_flat}, {address.area}, {address.city}, {address.state} - {address.pincode}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-[#EAE2D7] flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onNavigate('track-order', { trackingId: order.order_number || order.id })}
            className="flex-1 py-3.5 bg-[#5B1425] text-[#FAF7F2] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition shadow-lg flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4 text-[#C5A059]" />
            <span>Track Live Shipment Timeline</span>
          </button>

          <button
            onClick={() => onNavigate('shop')}
            className="py-3.5 px-6 border border-[#5B1425] text-[#5B1425] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#FAF7F2] transition text-center"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
