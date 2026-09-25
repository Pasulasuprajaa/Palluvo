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

          <form onSubmit={handleSubscribe} className="pt-2 max-w-md space-y-1.5">
            <label htmlFor="footer-newsletter-email" className="block text-xs font-semibold text-[#C5A059] tracking-wide">
              Subscribe to the PALLUVO Circle (Get ₹500 OFF)
            </label>
            <div className="flex">
              <input
                id="footer-newsletter-email"
                name="email"
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address..."
                aria-label="Email address for newsletter and ₹500 welcome coupon"
                className="flex-1 bg-white/10 border border-white/20 rounded-l-xl px-3.5 py-2.5 text-xs text-[#FAF7F2] placeholder-white/40 focus:outline-none focus:border-[#C5A059]"
              />
              <button
                type="submit"
                aria-label="Subscribe to newsletter"
                className="bg-[#C5A059] text-[#1F1A1C] font-bold text-xs px-4 py-2.5 rounded-r-xl hover:bg-[#E0C07F] transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Mobile Accordion Sections (Specified in prompt) */}
        <div className="lg:hidden space-y-2 border-t border-white/10 pt-4">
          
          {/* 1. Shop Accordion */}
          <div className="border-b border-white/10 pb-2">
            <button
              onClick={() => toggleSection('shop')}
              aria-expanded={openSection === 'shop'}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059] cursor-pointer"
            >
              <span>Shop Sarees & Collections</span>
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
              aria-expanded={openSection === 'care'}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059] cursor-pointer"
            >
              <span>Customer Care</span>
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
              aria-expanded={openSection === 'about'}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059] cursor-pointer"
            >
              <span>About PALLUVO</span>
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
              aria-expanded={openSection === 'policies'}
              className="w-full flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-[#C5A059] cursor-pointer"
            >
              <span>Policies & Legal</span>
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
              <a
                href="https://www.instagram.com/palluvo_official"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition flex items-center justify-center cursor-pointer"
                aria-label="Follow PALLUVO on Instagram"
                title="Instagram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/palluvo.official"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition flex items-center justify-center cursor-pointer"
                aria-label="Follow PALLUVO on Facebook"
                title="Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a
                href="https://www.pinterest.com/palluvo"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 rounded-full hover:text-[#C5A059] hover:bg-white/20 transition flex items-center justify-center cursor-pointer"
                aria-label="Follow PALLUVO on Pinterest"
                title="Pinterest"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                </svg>
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
