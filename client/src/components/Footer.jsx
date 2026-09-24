import React, { useState } from 'react';
import { ShieldCheck, Truck, RotateCcw, Award, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Footer({ onNavigate }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { addToast } = useToast();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    addToast('✨ Welcome to the PALLUVO Circle! Your ₹500 welcome coupon has been sent.');
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-[#1F1A1C] text-[#FAF7F2] border-t border-[#C5A059]/30 pt-16 pb-12">
      {/* Brand Pillars & Trust Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 border-b border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#FAF7F2]">100% Authentic Handlooms</h4>
              <p className="text-xs text-[#FAF7F2]/70 mt-1 leading-relaxed">Directly sourced from master weavers across Varanasi & Kanchipuram.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#FAF7F2]">Secure Razorpay Payments</h4>
              <p className="text-xs text-[#FAF7F2]/70 mt-1 leading-relaxed">Bank-grade 256-bit encryption for UPI, Cards & NetBanking.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#FAF7F2]">Hassle-Free Returns</h4>
              <p className="text-xs text-[#FAF7F2]/70 mt-1 leading-relaxed">Easy 7-day doorstep return and replacement concierge.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#FAF7F2]">Complimentary Express</h4>
              <p className="text-xs text-[#FAF7F2]/70 mt-1 leading-relaxed">Free luxury insured delivery on orders above ₹1,999.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onNavigate('home')}>
              <span className="font-cinzel text-3xl font-bold tracking-[0.2em] text-[#C5A059]">
                PALLUVO
              </span>
              <span className="text-[#C5A059] text-xl -mt-2">✦</span>
            </div>
            <p className="text-xs font-serif italic text-[#FAF7F2]/80 tracking-wider uppercase">
              Every drape, a little magic.
            </p>
            <p className="text-xs text-[#FAF7F2]/70 max-w-sm leading-relaxed">
              PALLUVO honors India’s centuries of textile artistry. From regal Banarasi weaves to ethereal organza silhouettes, each saree is handcrafted to make your most cherished memories unforgettable.
            </p>

            {/* Newsletter */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-[#C5A059] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Join the PALLUVO Circle</span>
              </div>
              <form onSubmit={handleSubscribe} className="flex max-w-md">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email for ₹500 off..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-l-xl px-3.5 py-2 text-xs text-[#FAF7F2] placeholder-white/40 focus:outline-none focus:border-[#C5A059]"
                />
                <button
                  type="submit"
                  className="bg-[#C5A059] text-[#1F1A1C] font-bold text-xs px-4 py-2 rounded-r-xl hover:bg-[#E0C07F] transition flex items-center gap-1"
                >
                  <span>Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              Shop Collections
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li>
                <button onClick={() => onNavigate('shop', { category: 'banarasi-sarees' })} className="hover:text-[#C5A059] transition">
                  Banarasi Sarees
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'kanjivaram-sarees' })} className="hover:text-[#C5A059] transition">
                  Kanjivaram Silk
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'silk-sarees' })} className="hover:text-[#C5A059] transition">
                  Pure Silk Sarees
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'organza-sarees' })} className="hover:text-[#C5A059] transition">
                  Organza & Tissue
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'cotton-sarees' })} className="hover:text-[#C5A059] transition">
                  Cotton & Handloom
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'bridal-collection' })} className="hover:text-[#C5A059] transition">
                  Bridal Trousseau
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('offers')} className="text-[#C5A059] font-medium hover:underline transition">
                  Offers & Festive Deals
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              Customer Care
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li>
                <button onClick={() => onNavigate('track-order')} className="hover:text-[#C5A059] transition">
                  Track Order Shipment
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-[#C5A059] transition">
                  My Orders & Account
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('wishlist')} className="hover:text-[#C5A059] transition">
                  Saved Wishlist
                </button>
              </li>
              <li>
                <span className="text-[#FAF7F2]/80 font-medium">Concierge: +91 84988 54323</span>
              </li>
              <li>
                <span className="text-[#FAF7F2]/80 font-medium">Support: +91 81067 89789</span>
              </li>
              <li>
                <span className="text-[#FAF7F2]/80 font-medium">Email: contact@palluvo.com</span>
              </li>
              <li>
                <span className="text-[#FAF7F2]/60">Hours: Mon-Sat, 10 AM - 8 PM IST</span>
              </li>
            </ul>
          </div>

          {/* Boutique & Story */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              About PALLUVO
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">
                  Our Handloom Heritage
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">
                  Artisans & Weavers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">
                  Saree Care & Storage Guide
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">
                  Sustainable Silk Pledge
                </button>
              </li>
            </ul>

            <div className="pt-2">
              <div className="text-[11px] text-[#C5A059] font-medium mb-2">Follow Our Journey</div>
              <div className="flex gap-3 text-[#FAF7F2]/80">
                <a href="#instagram" className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition text-xs font-bold">
                  IG
                </a>
                <a href="#facebook" className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition text-xs font-bold">
                  FB
                </a>
                <a href="#pinterest" className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition text-xs font-bold">
                  PIN
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FAF7F2]/60 gap-4">
        <div>
          © {new Date().getFullYear()} <strong>PALLUVO LUXURY FASHION PVT. LTD.</strong> All Rights Reserved.
        </div>
        <div className="flex gap-6">
          <a href="#privacy" className="hover:text-[#C5A059] transition">Privacy Policy</a>
          <a href="#terms" className="hover:text-[#C5A059] transition">Terms & Conditions</a>
          <a href="#shipping" className="hover:text-[#C5A059] transition">Shipping Policy</a>
          <a href="#refund" className="hover:text-[#C5A059] transition">Refund Policy</a>
        </div>
      </div>
    </footer>
  );
}
