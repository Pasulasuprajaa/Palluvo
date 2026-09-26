import React, { useState, useEffect } from 'react';
import { ShieldCheck, Truck, RotateCcw, FileText, ChevronRight, ArrowLeft, Mail, Phone, Clock } from 'lucide-react';

export default function PolicyPage({ initialTab = 'privacy', onNavigate }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'shipping', label: 'Shipping Policy', icon: Truck },
    { id: 'refund', label: 'Returns & Refunds', icon: RotateCcw }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 sm:py-12">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5B1425] hover:text-[#7E1E34] transition mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#EAE2D7] pb-6">
          <div>
            <span className="text-xs font-semibold text-[#5B1425] uppercase tracking-widest">
              Trust & Transparency
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1F1A1C] mt-1">
              Customer Policies & Legal
            </h1>
          </div>
          <p className="text-xs text-[#6E6467] mt-2 sm:mt-0 max-w-xs">
            Last updated: September 2026. Certified handloom authenticity and secure commerce standards.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 sm:gap-3 no-scrollbar mt-6 border-b border-[#EAE2D7] pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.history.pushState({}, '', `/${tab.id}`);
                }}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#5B1425] text-[#FAF7F2] shadow-md'
                    : 'bg-white text-[#6E6467] hover:bg-[#F4EFEB] hover:text-[#1F1A1C] border border-[#EAE2D7]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#6E6467]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Policy Text Card */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#EAE2D7] p-6 sm:p-10 shadow-sm leading-relaxed text-sm text-[#3D3336] space-y-8">
            {/* 1. PRIVACY POLICY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C]">
                    Privacy Policy
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    How PALLUVO protects, collects, and manages your personal information.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">1. Information We Collect</h3>
                  <p>
                    When you browse PALLUVO, create an account, place an order, or subscribe to our bridal concierge updates, we collect essential information including your name, contact details (email and mobile number), shipping and billing addresses, and payment references. We do not store full credit card numbers or banking PINs; all electronic transactions are processed through certified PCI-DSS compliant gateways (e.g., Razorpay).
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">2. Purpose of Data Processing</h3>
                  <p>
                    We use your data solely to fulfill orders, provide live shipment milestone tracking, coordinate custom fall & pico tailoring, authenticate warranty certificates for pure zari weaves, and deliver tailored styling recommendations.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">3. Data Protection & Confidentiality</h3>
                  <p>
                    PALLUVO employs 256-bit SSL encryption across all browsing sessions and API endpoints. We never sell, rent, or trade your personal information to third-party advertisers. Data is shared exclusively with verified logistics partners (such as BlueDart, Delhivery, and DHL Express) solely for dispatch fulfillment.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">4. Your Privacy Rights</h3>
                  <p>
                    You may access, update, or request the deletion of your account and personal data at any time by logging into your account dashboard or contacting our Data Privacy Officer at <span className="font-semibold text-[#5B1425]">privacy@palluvo.com</span>.
                  </p>
                </div>
              </div>
            )}

            {/* 2. TERMS & CONDITIONS */}
            {activeTab === 'terms' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C]">
                    Terms & Conditions
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Agreement governing the purchase of handcrafted heirloom textiles from PALLUVO.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">1. Handcrafted Product Authenticity</h3>
                  <p>
                    Every PALLUVO saree is individually handwoven on traditional wooden pit looms or frame looms by skilled master artisans. Subtle irregularities in weave texture, motifs, selvedge, and natural dye shades are authentic hallmarks of genuine handloom heritage and are not considered manufacturing defects.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">2. Pricing & Payments</h3>
                  <p>
                    All prices displayed on our website are inclusive of applicable GST. We reserve the right to modify prices, discontinue limited edition bridal runs, or correct typographical pricing errors before dispatch. Payment can be completed via UPI, Credit/Debit Cards, NetBanking, and Cash on Delivery (COD) for eligible pincodes.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">3. Order Acceptance & Customization</h3>
                  <p>
                    Orders are confirmed upon successful payment verification. Any requests for customized fall & pico finishing, unstitched blouse detachment, or bespoke bridal tassel finishing must be confirmed prior to shipment dispatch.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">4. Intellectual Property</h3>
                  <p>
                    All photography, visual motifs, editorial brand copy, and logo designs on this website are the proprietary intellectual property of PALLUVO LUXURY FASHION PVT. LTD. Unauthorized reproduction or commercial use is strictly prohibited.
                  </p>
                </div>
              </div>
            )}

            {/* 3. SHIPPING POLICY */}
            {activeTab === 'shipping' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C]">
                    Shipping & Delivery Policy
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Insured luxury delivery timelines, tracking, and complimentary packaging.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">1. Complimentary Insured Shipping</h3>
                  <p>
                    We offer complimentary insured express shipping across all major Indian pincodes on orders above ₹2,500. Every saree is packed in our signature rigid burgundy keepsake box with breathable muslin fabric wrapping to safeguard silk and zari luster.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">2. Delivery Timelines</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border border-[#EAE2D7] rounded-lg">
                      <thead className="bg-[#FAF7F2] font-serif font-bold text-[#1F1A1C]">
                        <tr>
                          <th className="p-3 border-b border-[#EAE2D7]">Region</th>
                          <th className="p-3 border-b border-[#EAE2D7]">Estimated Transit Time</th>
                          <th className="p-3 border-b border-[#EAE2D7]">Courier Partner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE2D7]">
                        <tr>
                          <td className="p-3 font-medium">Metro Cities (Bengaluru, Mumbai, Delhi, Kolkata, Chennai, Hyderabad)</td>
                          <td className="p-3">2 - 4 Business Days</td>
                          <td className="p-3">BlueDart Air / Delhivery Express</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Tier II & Tier III Cities</td>
                          <td className="p-3">4 - 6 Business Days</td>
                          <td className="p-3">Delhivery / Xpressbees</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">International Destinations (US, UK, UAE, Singapore, Australia)</td>
                          <td className="p-3">6 - 9 Business Days</td>
                          <td className="p-3">DHL Express / FedEx Priority</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">3. Live Milestone Order Tracking</h3>
                  <p>
                    As soon as your parcel is dispatched from our Bengaluru fulfillment center, you will receive an SMS and WhatsApp notification with your unique Airway Bill (AWB) number and direct link to track each milestone on our <button onClick={() => onNavigate('track-order')} className="font-semibold text-[#5B1425] underline">Track Order</button> portal.
                  </p>
                </div>
              </div>
            )}

            {/* 4. RETURNS & REFUNDS */}
            {activeTab === 'refund' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-[#F4EFEB] pb-4">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1A1C]">
                    7-Day Return & Refund Policy
                  </h2>
                  <p className="text-xs text-[#6E6467] mt-1">
                    Hassle-free reverse pickup, quality inspections, and instant refunds.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">1. 7-Day Easy Return Window</h3>
                  <p>
                    We want you to adore your PALLUVO drape. If you are not completely enchanted with your purchase, you may initiate a return or exchange within <strong>7 days of delivery</strong> directly from your account dashboard or by contacting our concierge.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">2. Return Eligibility & Conditions</h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#554B4E]">
                    <li>The saree must remain unworn, unwashed, and in its original pristine fold.</li>
                    <li>All original brand security tags, Silk Mark tags, and authenticity cards must remain intact and attached.</li>
                    <li>Sarees with customized fall & pico or stitched blouse pieces are non-returnable unless received in damaged condition.</li>
                    <li>The saree must be returned in the original burgundy presentation box and muslin bag.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">3. Complimentary Reverse Pickup</h3>
                  <p>
                    Once your return request is logged, our courier partner will schedule a complimentary doorstep reverse pickup within 24-48 business hours.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">4. Refund Process & Timelines</h3>
                  <p>
                    Upon receipt and inspection at our central warehouse, refunds are initiated within <strong>24 hours</strong>. Prepaid orders are credited back to the original payment source within 3-5 business days. Cash on Delivery (COD) refunds are transferred directly via secure UPI or NEFT bank transfer.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Concierge Card */}
          <div className="space-y-6">
            <div className="bg-[#3F0D19] text-[#FAF7F2] rounded-2xl p-6 shadow-md space-y-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C5A059]">
                PALLUVO Concierge
              </span>
              <h3 className="font-serif text-xl font-bold">
                Need Assistance With Policies?
              </h3>
              <p className="text-xs text-[#FAF7F2]/80 leading-relaxed">
                Our luxury saree advisors are available Monday through Saturday to answer any questions regarding fabrics, tailoring, or returns.
              </p>

              <div className="space-y-3 pt-2 text-xs border-t border-white/10">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#C5A059]" />
                  <span>+91 84988 54323 / +91 81067 89789</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#C5A059]" />
                  <span>care@palluvo.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#C5A059]" />
                  <span>10:00 AM – 8:00 PM IST (Mon–Sat)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('shop')}
                  className="w-full py-2.5 bg-[#C5A059] text-[#1F1A1C] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E0C07F] transition text-center cursor-pointer"
                >
                  Explore Saree Collection
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EAE2D7] p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#5B1425] font-serif font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                <span>Pure Silk Mark Certified</span>
              </div>
              <p className="text-xs text-[#6E6467] leading-relaxed">
                All pure silk sarees carry official Silk Mark Organization of India certification verifying 100% natural silk and tested zari.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
