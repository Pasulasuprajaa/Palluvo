import React, { useState } from 'react';
import { ShieldCheck, Truck, RotateCcw, Award, ArrowRight, Sparkles, ChevronDown, ChevronUp, Mail, Phone, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Footer({ onNavigate }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { addToast } = useToast();
  const [openSection, setOpenSection] = useState(null); // 'shop', 'care', 'about', 'policies'

  const toggleSection = (sec) => {
    setOpenSection(prev => prev === sec ? null : sec);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    addToast('✨ Welcome to the PALLUVO Circle! Your ₹500 welcome coupon has been sent.');
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-[#1F1A1C] text-[#FAF7F2] border-t border-[#C5A059]/30 pt-12 sm:pt-16 pb-12">
      {/* Brand Pillars & Trust Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14 border-b border-white/10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-left">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#FAF7F2]">100% Authentic Handlooms</h4>
              <p className="text-[11px] sm:text-xs text-[#FAF7F2]/70 mt-0.5 leading-relaxed">Direct from Varanasi & Kanchipuram master weavers.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#FAF7F2]">Secure Razorpay Payments</h4>
              <p className="text-[11px] sm:text-xs text-[#FAF7F2]/70 mt-0.5 leading-relaxed">Bank-grade 256-bit encryption for UPI, Cards & NetBanking.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg shrink-0">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#FAF7F2]">Hassle-Free Returns</h4>
              <p className="text-[11px] sm:text-xs text-[#FAF7F2]/70 mt-0.5 leading-relaxed">Easy 7-day doorstep return and replacement concierge.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#5B1425] text-[#C5A059] rounded-2xl shadow-lg shrink-0">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#FAF7F2]">Complimentary Express</h4>
              <p className="text-[11px] sm:text-xs text-[#FAF7F2]/70 mt-0.5 leading-relaxed">Free luxury insured delivery on orders above ₹1,999.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links: Accordion on Mobile, Multi-col on Desktop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        
        {/* Top Brand Banner & Newsletter */}
        <div className="mb-10 lg:mb-12 max-w-2xl space-y-3">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onNavigate('home')}>
            <span className="font-cinzel text-2xl sm:text-3xl font-bold tracking-[0.2em] text-[#C5A059]">
              PALLUVO
            </span>
            <span className="text-[#C5A059] text-xl -mt-2">✦</span>
          </div>
          <p className="text-xs font-serif italic text-[#FAF7F2]/80 tracking-wider uppercase">
            Every drape, a little magic.
          </p>
          <p className="text-xs text-[#FAF7F2]/70 leading-relaxed">
            PALLUVO honors India’s centuries of textile artistry. From regal Banarasi weaves to ethereal organza silhouettes, each saree is handcrafted to make your most cherished memories unforgettable.
          </p>

          <form onSubmit={handleSubscribe} className="pt-2 flex max-w-md">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email for ₹500 off..."
              className="flex-1 bg-white/10 border border-white/20 rounded-l-xl px-3.5 py-2.5 text-xs text-[#FAF7F2] placeholder-white/40 focus:outline-none focus:border-[#C5A059]"
            />
            <button
              type="submit"
              className="bg-[#C5A059] text-[#1F1A1C] font-bold text-xs px-4 py-2.5 rounded-r-xl hover:bg-[#E0C07F] transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Mobile Accordion Sections (Specified in prompt) */}
        <div className="lg:hidden space-y-2 border-t border-white/10 pt-4">
          
          {/* 1. Shop Accordion */}
          <div className="border-b border-white/10 pb-2">
            <button
              onClick={() => toggleSection('shop')}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059]"
            >
              <span>▼ Shop Sarees & Collections</span>
              {openSection === 'shop' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSection === 'shop' && (
              <ul className="space-y-2.5 text-xs text-[#FAF7F2]/80 pb-3 pl-2 animate-fade-in">
                <li><button onClick={() => onNavigate('shop', { category: 'banarasi-sarees' })}>Banarasi Sarees</button></li>
                <li><button onClick={() => onNavigate('shop', { category: 'kanjivaram-sarees' })}>Kanjivaram Silk</button></li>
                <li><button onClick={() => onNavigate('shop', { category: 'silk-sarees' })}>Pure Silk Sarees</button></li>
                <li><button onClick={() => onNavigate('shop', { category: 'organza-sarees' })}>Organza Sarees</button></li>
                <li><button onClick={() => onNavigate('shop', { category: 'cotton-sarees' })}>Cotton & Handloom</button></li>
                <li><button onClick={() => onNavigate('shop', { category: 'bridal-collection' })}>Bridal Trousseau</button></li>
                <li><button onClick={() => onNavigate('offers')} className="text-[#C5A059] font-medium">Offers & Festive Deals</button></li>
              </ul>
            )}
          </div>

          {/* 2. Customer Care Accordion */}
          <div className="border-b border-white/10 pb-2">
            <button
              onClick={() => toggleSection('care')}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059]"
            >
              <span>▼ Customer Care</span>
              {openSection === 'care' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSection === 'care' && (
              <ul className="space-y-2.5 text-xs text-[#FAF7F2]/80 pb-3 pl-2 animate-fade-in">
                <li><button onClick={() => onNavigate('track-order')}>Track Order Shipment</button></li>
                <li><button onClick={() => onNavigate('account')}>My Orders & Account</button></li>
                <li><button onClick={() => onNavigate('wishlist')}>Saved Wishlist</button></li>
                <li><span>Concierge: +91 84988 54323</span></li>
                <li><span>Support: +91 81067 89789</span></li>
                <li><span>Email: contact@palluvo.com</span></li>
                <li><span className="text-[#FAF7F2]/60">Hours: Mon-Sat, 10 AM - 8 PM IST</span></li>
              </ul>
            )}
          </div>

          {/* 3. About PALLUVO Accordion */}
          <div className="border-b border-white/10 pb-2">
            <button
              onClick={() => toggleSection('about')}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059]"
            >
              <span>▼ About PALLUVO</span>
              {openSection === 'about' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSection === 'about' && (
              <ul className="space-y-2.5 text-xs text-[#FAF7F2]/80 pb-3 pl-2 animate-fade-in">
                <li><button onClick={() => onNavigate('home')}>Our Handloom Heritage</button></li>
                <li><button onClick={() => onNavigate('home')}>Artisans & Weavers</button></li>
                <li><button onClick={() => onNavigate('home')}>Saree Care & Storage Guide</button></li>
                <li><button onClick={() => onNavigate('home')}>Sustainable Silk Pledge</button></li>
              </ul>
            )}
          </div>

          {/* 4. Policies Accordion */}
          <div className="border-b border-white/10 pb-2">
            <button
              onClick={() => toggleSection('policies')}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059]"
            >
              <span>▼ Policies & Legal</span>
              {openSection === 'policies' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSection === 'policies' && (
              <ul className="space-y-2.5 text-xs text-[#FAF7F2]/80 pb-3 pl-2 animate-fade-in">
                <li><a href="#privacy" className="hover:text-[#C5A059]">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-[#C5A059]">Terms & Conditions</a></li>
                <li><a href="#shipping" className="hover:text-[#C5A059]">Shipping Policy</a></li>
                <li><a href="#refund" className="hover:text-[#C5A059]">7-Day Return Policy</a></li>
              </ul>
            )}
          </div>
        </div>

        {/* Desktop Multi-column Grid */}
        <div className="hidden lg:grid grid-cols-4 gap-10 border-t border-white/10 pt-10">
          {/* Shop */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              Shop Collections
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li><button onClick={() => onNavigate('shop', { category: 'banarasi-sarees' })} className="hover:text-[#C5A059] transition">Banarasi Sarees</button></li>
              <li><button onClick={() => onNavigate('shop', { category: 'kanjivaram-sarees' })} className="hover:text-[#C5A059] transition">Kanjivaram Silk</button></li>
              <li><button onClick={() => onNavigate('shop', { category: 'silk-sarees' })} className="hover:text-[#C5A059] transition">Pure Silk Sarees</button></li>
              <li><button onClick={() => onNavigate('shop', { category: 'organza-sarees' })} className="hover:text-[#C5A059] transition">Organza & Tissue</button></li>
              <li><button onClick={() => onNavigate('shop', { category: 'cotton-sarees' })} className="hover:text-[#C5A059] transition">Cotton & Handloom</button></li>
              <li><button onClick={() => onNavigate('shop', { category: 'bridal-collection' })} className="hover:text-[#C5A059] transition">Bridal Trousseau</button></li>
              <li><button onClick={() => onNavigate('offers')} className="text-[#C5A059] font-medium hover:underline transition">Offers & Festive Deals</button></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              Customer Care
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li><button onClick={() => onNavigate('track-order')} className="hover:text-[#C5A059] transition">Track Order Shipment</button></li>
              <li><button onClick={() => onNavigate('account')} className="hover:text-[#C5A059] transition">My Orders & Account</button></li>
              <li><button onClick={() => onNavigate('wishlist')} className="hover:text-[#C5A059] transition">Saved Wishlist</button></li>
              <li><span className="text-[#FAF7F2]/80 font-medium">Concierge: +91 84988 54323</span></li>
              <li><span className="text-[#FAF7F2]/80 font-medium">Support: +91 81067 89789</span></li>
              <li><span className="text-[#FAF7F2]/80 font-medium">Email: contact@palluvo.com</span></li>
              <li><span className="text-[#FAF7F2]/60">Hours: Mon-Sat, 10 AM - 8 PM IST</span></li>
            </ul>
          </div>

          {/* About PALLUVO */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              About PALLUVO
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li><button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">Our Handloom Heritage</button></li>
              <li><button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">Artisans & Weavers</button></li>
              <li><button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">Saree Care & Storage Guide</button></li>
              <li><button onClick={() => onNavigate('home')} className="hover:text-[#C5A059] transition">Sustainable Silk Pledge</button></li>
            </ul>
          </div>

          {/* Policies & Socials */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#C5A059] tracking-wider uppercase">
              Policies
            </h4>
            <ul className="space-y-2 text-xs text-[#FAF7F2]/80">
              <li><a href="#privacy" className="hover:text-[#C5A059] transition">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-[#C5A059] transition">Terms & Conditions</a></li>
              <li><a href="#shipping" className="hover:text-[#C5A059] transition">Shipping Policy</a></li>
              <li><a href="#refund" className="hover:text-[#C5A059] transition">7-Day Refund Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Social Icons & Contact Information */}
        <div className="pt-8 sm:pt-10 mt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-[#FAF7F2]/80">
            <span className="text-[#C5A059] font-medium">Follow PALLUVO:</span>
            <div className="flex gap-2.5">
              <a href="#instagram" className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition text-xs font-bold" aria-label="Instagram">
                IG
              </a>
              <a href="#facebook" className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition text-xs font-bold" aria-label="Facebook">
                FB
              </a>
              <a href="#pinterest" className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition text-xs font-bold" aria-label="Pinterest">
                PIN
              </a>
            </div>
          </div>

          <div className="text-xs text-[#FAF7F2]/70 text-center sm:text-right">
            <span>📍 Indiranagar, Bengaluru, Karnataka 560038</span>
          </div>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-white/10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-xs text-[#FAF7F2]/60 gap-3">
        <div>
          © {new Date().getFullYear()} <strong>PALLUVO LUXURY FASHION PVT. LTD.</strong> All Rights Reserved.
        </div>
        <div className="flex gap-4 text-[11px]">
          <a href="#privacy" className="hover:text-[#C5A059] transition">Privacy</a>
          <a href="#terms" className="hover:text-[#C5A059] transition">Terms</a>
          <a href="#shipping" className="hover:text-[#C5A059] transition">Shipping</a>
          <a href="#refund" className="hover:text-[#C5A059] transition">Returns</a>
        </div>
      </div>
    </footer>
  );
}
