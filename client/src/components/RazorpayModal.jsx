import React, { useState } from 'react';
import { ShieldCheck, CreditCard, Smartphone, Building, Wallet, Lock, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

export default function RazorpayModal({
  isOpen,
  orderData,
  onPaymentSuccess,
  onPaymentFailure,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('upi');
  const [upiApp, setUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('priya@okhdfcbank');
  const [cardDetails, setCardDetails] = useState({
    number: '4532 •••• •••• 8821',
    expiry: '12/28',
    cvv: '•••',
    name: 'Priya Sharma'
  });
  const [processing, setProcessing] = useState(false);
  const [simulatedFailure, setSimulatedFailure] = useState(false);

  if (!isOpen || !orderData) return null;

  const handlePayNow = async (forceFail = false) => {
    setProcessing(true);

    // Simulate payment response & generate signature verification payload
    setTimeout(async () => {
      if (forceFail || simulatedFailure) {
        setProcessing(false);
        if (onPaymentFailure) {
          onPaymentFailure({ error: 'Payment declined by bank or user cancelled.' });
        }
        return;
      }

      const mockPaymentId = 'pay_' + Math.random().toString(36).substring(2, 12).toUpperCase();
      const mockSignature = 'mock_verified_signature_' + Math.random().toString(36).substring(2, 8);

      try {
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('palluvo_token')}`
          },
          body: JSON.stringify({
            orderId: orderData.orderId,
            razorpay_order_id: orderData.razorpayOrderId,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: mockSignature
          })
        });

        const data = await verifyRes.json();
        setProcessing(false);

        if (verifyRes.ok && data.success) {
          onPaymentSuccess(data.order);
        } else {
          if (onPaymentFailure) onPaymentFailure({ error: data.error || 'Signature verification failed.' });
        }
      } catch (err) {
        setProcessing(false);
        if (onPaymentFailure) onPaymentFailure({ error: err.message });
      }
    }, 1200);
  };

  const amountInRupees = orderData.summary?.totalAmount || (orderData.amount ? orderData.amount / 100 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#EAE2D7] overflow-hidden relative">
        {/* Top Razorpay Header Bar */}
        <div className="bg-[#0C2340] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#C5A059] font-bold text-lg border border-white/20">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-cinzel text-base tracking-widest text-[#E0C07F]">PALLUVO</span>
                <span className="text-[10px] bg-blue-600/60 px-1.5 py-0.2 rounded font-mono">Secured by Razorpay</span>
              </div>
              <div className="text-xs text-blue-200">
                Order #{orderData.orderNumber}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-blue-200">Amount Payable</div>
            <div className="text-lg font-bold text-white">₹{amountInRupees.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div className="grid grid-cols-4 border-b border-[#EAE2D7] bg-[#FAF7F2] text-xs font-semibold text-[#6E6467]">
          <button
            onClick={() => setActiveTab('upi')}
            className={`py-3 flex flex-col items-center gap-1 border-b-2 transition ${
              activeTab === 'upi' ? 'border-[#0C2340] text-[#0C2340] bg-white' : 'border-transparent hover:text-[#1F1A1C]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>UPI Apps</span>
          </button>

          <button
            onClick={() => setActiveTab('card')}
            className={`py-3 flex flex-col items-center gap-1 border-b-2 transition ${
              activeTab === 'card' ? 'border-[#0C2340] text-[#0C2340] bg-white' : 'border-transparent hover:text-[#1F1A1C]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cards</span>
          </button>

          <button
            onClick={() => setActiveTab('netbanking')}
            className={`py-3 flex flex-col items-center gap-1 border-b-2 transition ${
              activeTab === 'netbanking' ? 'border-[#0C2340] text-[#0C2340] bg-white' : 'border-transparent hover:text-[#1F1A1C]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Net Banking</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`py-3 flex flex-col items-center gap-1 border-b-2 transition ${
              activeTab === 'wallet' ? 'border-[#0C2340] text-[#0C2340] bg-white' : 'border-transparent hover:text-[#1F1A1C]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallets</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4">
          {activeTab === 'upi' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#1F1A1C]">Select Preferred UPI App</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gpay', name: 'Google Pay', icon: '⚡' },
                  { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
                  { id: 'paytm', name: 'Paytm UPI', icon: '🔵' },
                  { id: 'bhim', name: 'BHIM UPI', icon: '🇮🇳' }
                ].map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setUpiApp(app.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      upiApp === app.id ? 'border-[#0C2340] bg-blue-50/50 text-[#0C2340] font-bold shadow-sm' : 'border-[#EAE2D7] text-[#1F1A1C] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <span className="text-sm flex items-center gap-2">
                      <span>{app.icon}</span>
                      <span>{app.name}</span>
                    </span>
                    {upiApp === app.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-[#6E6467] mb-1">Or Enter Virtual Payment Address (VPA / UPI ID)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@bank"
                  className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#0C2340]"
                />
              </div>
            </div>
          )}

          {activeTab === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#6E6467] mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  placeholder="Card Number"
                  className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#0C2340]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#6E6467] mb-1">Valid Thru</label>
                  <input
                    type="text"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    placeholder="MM/YY"
                    className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#0C2340]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6E6467] mb-1">CVV</label>
                  <input
                    type="password"
                    maxLength="4"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                    placeholder="123"
                    className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#0C2340]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6E6467] mb-1">Name on Card</label>
                <input
                  type="text"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  placeholder="Cardholder Name"
                  className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#0C2340]"
                />
              </div>
            </div>
          )}

          {activeTab === 'netbanking' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#1F1A1C] mb-2">Popular Indian Banks</div>
              {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'].map((bank, i) => (
                <button
                  key={i}
                  onClick={() => setUpiApp(bank)}
                  className="w-full p-2.5 rounded-lg border border-[#EAE2D7] text-left text-xs font-medium hover:bg-blue-50/50 hover:border-[#0C2340] flex items-center justify-between"
                >
                  <span>{bank}</span>
                  <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded">Fastest</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#1F1A1C] mb-2">Select Digital Wallet</div>
              {['Paytm Wallet', 'Amazon Pay', 'MobiKwik', 'PhonePe Wallet'].map((w, i) => (
                <button
                  key={i}
                  onClick={() => setUpiApp(w)}
                  className="w-full p-2.5 rounded-lg border border-[#EAE2D7] text-left text-xs font-medium hover:bg-blue-50/50 hover:border-[#0C2340] flex items-center justify-between"
                >
                  <span>{w}</span>
                  <span className="text-[10px] text-[#6E6467]">Available</span>
                </button>
              ))}
            </div>
          )}

          {/* Pay Button */}
          <div className="pt-3 space-y-2">
            <button
              onClick={() => handlePayNow(false)}
              disabled={processing}
              className="w-full py-3.5 bg-[#0C2340] hover:bg-[#153a66] text-white font-bold text-sm rounded-xl transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Razorpay Signature...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#E0C07F]" />
                  <span>Pay ₹{amountInRupees.toLocaleString('en-IN')} Securely</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-[#6E6467] pt-1 px-1">
              <button
                onClick={() => handlePayNow(true)}
                className="text-red-600 hover:underline"
              >
                Test Payment Decline Simulation
              </button>
              <button
                onClick={onClose}
                className="text-[#6E6467] hover:text-[#1F1A1C]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="bg-[#FAF7F2] px-6 py-2.5 border-t border-[#EAE2D7] flex items-center justify-center gap-2 text-[11px] text-[#6E6467]">
          <ShieldCheck className="w-4 h-4 text-green-700" />
          <span>PCI-DSS Level 1 Certified • 256-bit Encryption • Razorpay India</span>
        </div>
      </div>
    </div>
  );
}
