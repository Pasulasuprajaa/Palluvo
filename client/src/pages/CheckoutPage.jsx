import React, { useState, useEffect } from 'react';
import {
  MapPin, CheckCircle2, ShieldCheck, Truck, CreditCard,
  Lock, Plus, Edit2, Trash2, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RazorpayModal from '../components/RazorpayModal';

export default function CheckoutPage({ onNavigate }) {
  const { cartItems, subtotal, discountAmount, deliveryFee, totalAmount, appliedCoupon } = useCart();
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1); // 1: Address, 2: Delivery, 3: Payment
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [packagingOption, setPackagingOption] = useState('standard'); // 'standard' or 'heirloom_gift'

  const [addressForm, setAddressForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    pincode: '560001',
    house_flat: '',
    area: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    landmark: '',
    address_type: 'home'
  });

  // Payment states
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      fetchAddresses();
    }
  }, [token]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.addresses) {
        setAddresses(data.addresses);
        const def = data.addresses.find(a => a.is_default === 1) || data.addresses[0];
        if (def) setSelectedAddressId(def.id);
        if (data.addresses.length === 0) setShowAddAddress(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.phone || !addressForm.pincode || !addressForm.house_flat || !addressForm.area) {
      addToast('Please fill all required address fields.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });
      const data = await res.json();
      if (res.ok) {
        addToast('✨ Address saved successfully.');
        await fetchAddresses();
        setSelectedAddressId(data.address.id);
        setShowAddAddress(false);
      } else {
        addToast(data.error, 'error');
      }
    } catch (err) {
      addToast('Failed to save address.', 'error');
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedAddressId && !showAddAddress) {
      addToast('Please select a shipping address.', 'error');
      return;
    }

    try {
      setInitiatingPayment(true);
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          address_id: selectedAddressId,
          coupon_code: appliedCoupon ? appliedCoupon.code : null
        })
      });

      const data = await res.json();
      setInitiatingPayment(false);

      if (res.ok && data.orderId) {
        setRazorpayOrderData(data);
        setIsRazorpayModalOpen(true);
      } else {
        addToast(data.error || 'Failed to initiate payment.', 'error');
      }
    } catch (err) {
      setInitiatingPayment(false);
      addToast('Payment initialization failed.', 'error');
    }
  };

  const handlePaymentSuccess = (verifiedOrder) => {
    setIsRazorpayModalOpen(false);
    onNavigate('order-success', { order: verifiedOrder });
  };

  const handlePaymentFailure = (errorObj) => {
    addToast(errorObj.error || 'Payment failed. Please retry.', 'error');
  };

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const packagingFee = packagingOption === 'heirloom_gift' ? 250 : 0;
  const finalTotalAmount = totalAmount + packagingFee;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Checkout Steps Bar */}
      <div className="flex items-center justify-between max-w-2xl mx-auto border-b border-[#EAE2D7] pb-4">
        {[
          { step: 1, title: '1. Shipping Address' },
          { step: 2, title: '2. Packaging & Delivery' },
          { step: 3, title: '3. Razorpay Payment' }
        ].map((s) => (
          <button
            key={s.step}
            onClick={() => {
              if (s.step < currentStep) setCurrentStep(s.step);
            }}
            className={`text-xs sm:text-sm font-bold tracking-wide uppercase transition flex items-center gap-2 ${
              currentStep === s.step
                ? 'text-[#5B1425] border-b-2 border-[#5B1425] pb-1'
                : (currentStep > s.step ? 'text-green-800' : 'text-[#6E6467]/60')
            }`}
          >
            {currentStep > s.step && <CheckCircle2 className="w-4 h-4 text-green-700" />}
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Step Form Content (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* STEP 1: ADDRESS */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#EAE2D7] pb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#5B1425]" />
                  <h2 className="font-serif text-xl font-bold text-[#1F1A1C]">
                    Select Shipping Address
                  </h2>
                </div>
                {!showAddAddress && addresses.length > 0 && (
                  <button
                    onClick={() => setShowAddAddress(true)}
                    className="text-xs font-bold text-[#5B1425] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {/* Saved Addresses List */}
              {!showAddAddress && addresses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        selectedAddressId === addr.id
                          ? 'border-[#5B1425] bg-[#FAF7F2] shadow-md'
                          : 'border-[#EAE2D7] hover:border-gray-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1F1A1C]">{addr.name}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-[#6E6467] px-2 py-0.5 rounded">
                            {addr.address_type}
                          </span>
                        </div>
                        <p className="text-xs text-[#6E6467] leading-relaxed">
                          {addr.house_flat}, {addr.area} <br />
                          {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                        </p>
                        <p className="text-xs text-[#1F1A1C] font-medium pt-1">
                          Phone: {addr.phone}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#EAE2D7] flex items-center justify-between text-xs">
                        <span className={`font-bold ${selectedAddressId === addr.id ? 'text-[#5B1425]' : 'text-transparent'}`}>
                          ✓ Selected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit Address Form */}
              {(showAddAddress || addresses.length === 0) && (
                <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Full Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={addressForm.name}
                        onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                        placeholder="e.g. Priya Sharma"
                        className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        maxLength="6"
                        value={addressForm.pincode}
                        onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                        placeholder="560001"
                        className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        placeholder="Bengaluru"
                        className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        placeholder="Karnataka"
                        className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">House / Flat / Building *</label>
                    <input
                      type="text"
                      required
                      value={addressForm.house_flat}
                      onChange={(e) => setAddressForm({ ...addressForm, house_flat: e.target.value })}
                      placeholder="Flat 402, Royal Palms Residency"
                      className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Area / Street / Sector *</label>
                    <input
                      type="text"
                      required
                      value={addressForm.area}
                      onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                      placeholder="Lavelle Road, Shanthala Nagar"
                      className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="px-4 py-2.5 border border-[#EAE2D7] text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#5B1425] text-[#FAF7F2] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#7E1E34]"
                    >
                      Save & Deliver Here
                    </button>
                  </div>
                </form>
              )}

              {/* Next Step Button */}
              {!showAddAddress && selectedAddressId && (
                <div className="pt-4 border-t border-[#EAE2D7] flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-8 py-3.5 bg-[#5B1425] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#7E1E34] transition flex items-center gap-2 shadow-lg"
                  >
                    <span>Proceed to Packaging & Delivery</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PACKAGING & DELIVERY */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-[#EAE2D7] pb-4">
                <Truck className="w-5 h-5 text-[#5B1425]" />
                <h2 className="font-serif text-xl font-bold text-[#1F1A1C]">
                  Delivery & Packaging Experience
                </h2>
              </div>

              {/* Selected Address Summary */}
              {selectedAddress && (
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#EAE2D7] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1F1A1C]">Delivering to: </span>
                    <span>{selectedAddress.name}, {selectedAddress.city} ({selectedAddress.pincode})</span>
                  </div>
                  <button onClick={() => setCurrentStep(1)} className="text-[#5B1425] font-bold underline">
                    Change
                  </button>
                </div>
              )}

              {/* Packaging Options */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#1F1A1C] uppercase tracking-wider">
                  Select Unboxing Style:
                </div>

                <div
                  onClick={() => setPackagingOption('standard')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    packagingOption === 'standard' ? 'border-[#5B1425] bg-[#FAF7F2]' : 'border-[#EAE2D7]'
                  }`}
                >
                  <input
                    type="radio"
                    name="packaging"
                    checked={packagingOption === 'standard'}
                    onChange={() => setPackagingOption('standard')}
                    className="mt-1 accent-[#5B1425]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#1F1A1C]">Signature PALLUVO Luxury Box</span>
                      <span className="text-green-800 font-bold text-xs">COMPLIMENTARY</span>
                    </div>
                    <p className="text-xs text-[#6E6467] mt-1">
                      Multi-layer rigid burgundy keepsake box lined with protective silk butter paper and golden ribbon.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setPackagingOption('heirloom_gift')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                    packagingOption === 'heirloom_gift' ? 'border-[#5B1425] bg-[#FAF7F2]' : 'border-[#EAE2D7]'
                  }`}
                >
                  <input
                    type="radio"
                    name="packaging"
                    checked={packagingOption === 'heirloom_gift'}
                    onChange={() => setPackagingOption('heirloom_gift')}
                    className="mt-1 accent-[#5B1425]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#1F1A1C]">Heirloom Wooden Trousseau Chest (+₹250)</span>
                      <span className="text-[#5B1425] font-bold text-xs">+₹250</span>
                    </div>
                    <p className="text-xs text-[#6E6467] mt-1">
                      Handcrafted royal wooden gift box with brass latch, personalized calligraphy note, and herbal saree freshener.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-[#EAE2D7] flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-3 border border-[#EAE2D7] text-xs font-bold rounded-xl"
                >
                  Back to Address
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-8 py-3.5 bg-[#5B1425] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#7E1E34] transition flex items-center gap-2 shadow-lg"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT SELECTION */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-[#EAE2D7] pb-4">
                <CreditCard className="w-5 h-5 text-[#5B1425]" />
                <h2 className="font-serif text-xl font-bold text-[#1F1A1C]">
                  Razorpay Secure Payment Gateway
                </h2>
              </div>

              <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#EAE2D7] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5B1425]">
                  <ShieldCheck className="w-4 h-4 text-green-700" />
                  <span>100% Encrypted & Authenticated Transaction</span>
                </div>
                <p className="text-xs text-[#6E6467]">
                  Supports all Indian UPI applications (Google Pay, PhonePe, Paytm), Credit & Debit Cards, NetBanking, and Digital Wallets.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleProceedToPayment}
                  disabled={initiatingPayment}
                  className="w-full py-4 bg-[#5B1425] hover:bg-[#7E1E34] text-[#FAF7F2] font-bold text-sm uppercase tracking-widest rounded-xl transition shadow-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {initiatingPayment ? (
                    <span>Opening Razorpay Secure Window...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-[#C5A059]" />
                      <span>Pay ₹{finalTotalAmount.toLocaleString('en-IN')} via Razorpay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Checkout Summary (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1F1A1C] border-b border-[#EAE2D7] pb-3">
              Order Summary ({cartItems.length} {cartItems.length === 1 ? 'saree' : 'sarees'})
            </h3>

            {/* Thumbnail items */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.cart_item_id} className="flex gap-3 text-xs">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#1F1A1C] line-clamp-1">{item.name}</h4>
                    <div className="text-[11px] text-[#6E6467]">Qty: {item.quantity} • {item.variant_color || 'Standard'}</div>
                    <div className="font-bold text-[#5B1425] mt-1">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-xs text-[#6E6467] pt-3 border-t border-[#EAE2D7]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-800 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Express Insured Delivery</span>
                <span>{deliveryFee === 0 ? <span className="text-green-800 font-bold">FREE</span> : `₹${deliveryFee}`}</span>
              </div>
              {packagingFee > 0 && (
                <div className="flex justify-between">
                  <span>Heirloom Wooden Box</span>
                  <span>+₹{packagingFee}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#1F1A1C] pt-3 border-t border-[#EAE2D7]">
                <span>Grand Total</span>
                <span className="font-serif text-xl text-[#5B1425]">₹{finalTotalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Modal */}
      <RazorpayModal
        isOpen={isRazorpayModalOpen}
        orderData={razorpayOrderData}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        onClose={() => setIsRazorpayModalOpen(false)}
      />
    </div>
  );
}
