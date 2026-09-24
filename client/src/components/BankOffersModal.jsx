import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Tag, Percent, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

export default function BankOffersModal({ isOpen, onClose, price = 12999 }) {
  const [activeTab, setActiveTab] = useState('bank_offers'); // 'bank_offers' | 'emi_plans'

  if (!isOpen) return null;

  const bankOffers = [
    {
      bank: 'HDFC Bank',
      logo: '🏦',
      title: '10% Instant Discount on HDFC Credit / Debit Cards',
      desc: 'Get flat 10% off up to ₹1,500 on minimum order of ₹4,999.',
      code: 'AUTO APPLIED AT CHECKOUT',
      savings: Math.min(1500, Math.round(price * 0.1))
    },
    {
      bank: 'ICICI Bank',
      logo: '💳',
      title: 'Flat ₹1,000 Instant Cashback on ICICI Cards',
      desc: 'Applicable on ICICI Bank NetBanking and Credit Card full-swipe transactions.',
      code: 'ICICILUXURY',
      savings: 1000
    },
    {
      bank: 'Axis Bank & Flipkart Axis',
      logo: '🌟',
      title: '5% Unlimited Cashback on Axis Bank Credit Cards',
      desc: 'No minimum order value required. Direct statement credit on monthly billing.',
      code: 'DIRECT CASHBACK',
      savings: Math.round(price * 0.05)
    },
    {
      bank: 'SBI Card',
      logo: '🏛️',
      title: 'Flat ₹750 Off on SBI Credit Card EMI Transactions',
      desc: 'Valid on 6, 9, and 12-month EMI tenures above ₹7,999.',
      code: 'SBIROYAL',
      savings: 750
    }
  ];

  const emiPlans = [
    { months: 3, rate: '0% (No Cost EMI)', interest: 0, monthly: Math.round(price / 3), total: price },
    { months: 6, rate: '0% (No Cost EMI)', interest: 0, monthly: Math.round(price / 6), total: price },
    { months: 9, rate: '13.5% p.a.', interest: Math.round((price * 0.135 * 9) / 12), monthly: Math.round((price + (price * 0.135 * 9) / 12) / 9), total: price + Math.round((price * 0.135 * 9) / 12) },
    { months: 12, rate: '14.0% p.a.', interest: Math.round((price * 0.14 * 12) / 12), monthly: Math.round((price + (price * 0.14 * 12) / 12) / 12), total: price + Math.round((price * 0.14 * 12) / 12) }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#C5A059]/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5B1425] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-[#C5A059]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#E5D3B3]">
                Bank Offers & EMI Payment Options
              </h3>
              <p className="text-xs text-white/70">
                Applicable on saree value ₹{price.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#E8E1D5] bg-white px-6 pt-3">
          <button
            onClick={() => setActiveTab('bank_offers')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition relative ${
              activeTab === 'bank_offers'
                ? 'text-[#5B1425] border-b-2 border-[#5B1425]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Instant Bank Offers ({bankOffers.length})</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('emi_plans')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition relative ${
              activeTab === 'emi_plans'
                ? 'text-[#5B1425] border-b-2 border-[#5B1425]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              <span>No Cost & Low Cost EMI</span>
            </div>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'bank_offers' && (
            <div className="space-y-3.5">
              {bankOffers.map((offer, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-[#E8E1D5] hover:border-[#C5A059] transition shadow-xs flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{offer.logo}</span>
                      <span className="text-xs font-bold font-serif text-[#5B1425]">
                        {offer.bank}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {offer.title}
                    </div>
                    <p className="text-xs text-gray-600">
                      {offer.desc}
                    </p>
                    <div className="inline-block mt-1 px-2 py-0.5 bg-[#FAF0E6] text-[#5B1425] text-[10px] font-mono font-bold rounded">
                      {offer.code}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-semibold text-emerald-700">
                      You Save
                    </div>
                    <div className="text-base font-bold text-emerald-800">
                      ₹{offer.savings.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>All bank discounts are automatically computed and applied during Razorpay Checkout.</span>
              </div>
            </div>
          )}

          {activeTab === 'emi_plans' && (
            <div>
              <div className="mb-4 text-xs text-gray-600 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Zero processing fee on 3 & 6 Months No Cost EMI across all major credit cards.</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#E8E1D5] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] text-gray-700 border-b border-[#E8E1D5] uppercase font-semibold">
                    <tr>
                      <th className="p-3">Tenure</th>
                      <th className="p-3">Interest Rate</th>
                      <th className="p-3">Monthly Payment</th>
                      <th className="p-3 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E1D5]">
                    {emiPlans.map((plan, idx) => (
                      <tr key={idx} className={plan.interest === 0 ? 'bg-emerald-50/40' : ''}>
                        <td className="p-3 font-bold text-gray-900">
                          {plan.months} Months
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            plan.interest === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {plan.rate}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-[#5B1425]">
                          ₹{plan.monthly.toLocaleString('en-IN')}/mo
                        </td>
                        <td className="p-3 text-right font-medium text-gray-800">
                          ₹{plan.total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-[11px] text-gray-500 space-y-1">
                <p>• Bank EMI eligibility is confirmed on the Razorpay payment screen via card number OTP.</p>
                <p>• Supported banks: HDFC, ICICI, SBI, Axis, Kotak, Standard Chartered, IndusInd, HSBC, RBL.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#E8E1D5]/40 border-t border-[#E8E1D5] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#5B1425] text-white text-xs font-semibold rounded-xl hover:bg-[#430e1b] transition shadow"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
