import React, { useState } from 'react';
import {
  Search, Heart, ShoppingBag, User, Menu, X, Sparkles,
  ChevronDown, Tag, Scale, Home, Grid, ChevronRight, Phone, Info,
  Layers, Crown, Flame, Truck, MessageSquare, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';

export default function Navbar({ onNavigate, currentPage, onOpenAuth, pageParams = {} }) {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsDropdown, setCollectionsDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const { user, isAdmin, logout } = useAuth();
  const { itemCount, setIsCartOpen, setIsSearchOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { compareItems, setIsCompareOpen } = useCompare();

  const isAllSareesActive = currentPage === 'shop' && !pageParams.filter && !pageParams.occasion && !pageParams.category;
  const isNewArrivalActive = currentPage === 'shop' && pageParams.filter === 'new_arrival';
  const isCollectionsActive = currentPage === 'shop' && (pageParams.filter === 'featured' || Boolean(pageParams.occasion) || (Boolean(pageParams.category) && pageParams.category !== ''));
  const isBestSellerActive = currentPage === 'shop' && pageParams.filter === 'best_seller';
  const isOffersActive = currentPage === 'offers';

  const handleNav = (page, params = {}) => {
    setMobileMenuOpen(false);
    setCollectionsDropdown(false);
    setUserDropdown(false);
    onNavigate(page, params);
  };

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      {bannerVisible && (
        <div className="relative bg-[#3F0D19] text-[#FAF7F2] text-[10.5px] sm:text-xs font-medium tracking-wide py-1.5 sm:py-2 px-2.5 sm:px-4 border-b border-[#C5A059]/30 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between pr-7 sm:pr-8">
            <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0 text-center sm:text-left flex-wrap justify-center sm:justify-start">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C5A059] shrink-0 animate-pulse" />
              <span>Free Express Delivery &gt; ₹1,999</span>
              <span className="text-[#C5A059] font-semibold">| Code <strong className="text-white bg-[#5B1425] px-1 py-0.5 rounded border border-[#C5A059]/40 tracking-wider">WELCOME10</strong> (10% OFF up to ₹1,500 on orders &gt; ₹1,999)</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[11px] text-[#FAF7F2]/80 shrink-0">
              <a href="tel:18001234567" className="hover:text-[#C5A059] transition flex items-center gap-1 cursor-pointer" aria-label="Customer Helpline 1800-123-4567">
                <Phone className="w-3 h-3 text-[#C5A059]" />
                <span>Care: 1800-123-4567</span>
              </a>
              <button onClick={() => handleNav('track-order')} className="hover:text-[#C5A059] transition cursor-pointer">
                Track Order
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleNav('admin')}
                  className="text-[#C5A059] font-bold uppercase tracking-wider bg-[#5B1425] px-2 py-0.5 rounded border border-[#C5A059]/40 hover:bg-[#C5A059] hover:text-[#3F0D19] transition cursor-pointer"
                >
                  Admin Panel
                </button>
              )}
            </div>
          </div>
          {/* Dismiss Announcement Bar (X Button) */}
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            aria-label="Close announcement bar"
            title="Close"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-[#FAF7F2]/75 hover:text-[#FAF7F2] hover:bg-white/10 rounded-full transition cursor-pointer focus-visible:ring-1 focus-visible:ring-[#C5A059] focus-visible:outline-none"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE2D7] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 xl:px-8">
          
          {/* Top Row */}
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 lg:gap-3 xl:gap-4">
            
            {/* Left: Mobile Hamburger & Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 mr-1 sm:mr-2 lg:mr-3 xl:mr-6">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 text-[#1F1A1C] hover:text-[#5B1425] rounded-xl hover:bg-[#F4EFEB] transition cursor-pointer"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-[#5B1425]" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>

              <a
                href="/"
                onClick={(e) => {
                  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0)) return;
                  e.preventDefault();
                  handleNav('home');
                }}
                aria-label="PALLUVO Home"
                className="cursor-pointer group inline-flex flex-col items-start justify-center min-h-[44px] py-1 select-none rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1425] focus-visible:ring-offset-2 transition"
              >
                <div className="flex items-center gap-1">
                  <span className="font-cinzel text-xl sm:text-2xl lg:text-[26px] xl:text-3xl font-bold tracking-[0.16em] sm:tracking-[0.18em] xl:tracking-[0.2em] text-[#5B1425] group-hover:text-[#7E1E34] transition whitespace-nowrap">
                    PALLUVO
                  </span>
                  <span className="text-[#C5A059] text-sm sm:text-base xl:text-lg -mt-1 group-hover:rotate-12 transition transform">✦</span>
                </div>
                <span className="text-[8.5px] sm:text-[9px] xl:text-[10px] font-serif tracking-[0.12em] sm:tracking-[0.15em] text-[#6E6467] -mt-1 uppercase italic block whitespace-nowrap">
                  Every drape, a little magic
                </span>
              </a>
            </div>

            {/* Center: Desktop Navigation — Compact Single-Line Layout */}
            <nav aria-label="Main Navigation" className="hidden lg:flex items-center justify-center gap-2 lg:gap-2.5 xl:gap-5 2xl:gap-7 text-xs xl:text-sm font-medium tracking-wide flex-1 h-full shrink-0">
              <button
                onClick={() => handleNav('home')}
                aria-current={currentPage === 'home' ? 'page' : undefined}
                className={`h-full inline-flex items-center transition-colors px-1 lg:px-1.5 xl:px-2 border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  currentPage === 'home'
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => handleNav('shop')}
                aria-current={isAllSareesActive ? 'page' : undefined}
                className={`h-full inline-flex items-center transition-colors px-1 lg:px-1.5 xl:px-2 border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  isAllSareesActive
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                All Sarees
              </button>

              <button
                onClick={() => handleNav('shop', { filter: 'new_arrival' })}
                aria-current={isNewArrivalActive ? 'page' : undefined}
                className={`h-full inline-flex items-center transition-colors px-1 lg:px-1.5 xl:px-2 border-b-2 gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                  isNewArrivalActive
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                <span>New Arrivals</span>
                <span className="bg-[#5B1425] text-[#FAF7F2] text-[8.5px] xl:text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">New</span>
              </button>

              {/* Collections Dropdown */}
              <div
                className="relative h-full flex items-center shrink-0"
                onMouseEnter={() => setCollectionsDropdown(true)}
                onMouseLeave={() => setCollectionsDropdown(false)}
              >
                <button
                  type="button"
                  onClick={() => setCollectionsDropdown((prev) => !prev)}
                  aria-current={isCollectionsActive ? 'page' : undefined}
                  className={`h-full inline-flex items-center transition-colors px-1 lg:px-1.5 xl:px-2 border-b-2 gap-0.5 xl:gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                    isCollectionsActive
                      ? 'border-[#5B1425] text-[#5B1425] font-bold'
                      : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                  }`}
                  aria-expanded={collectionsDropdown}
                  aria-haspopup="true"
                >
                  <span>Collections</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#6E6467] shrink-0 transition-transform ${collectionsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {collectionsDropdown && (
                  <div className="absolute top-[85%] left-0 w-64 bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl shadow-2xl py-3 px-2 animate-fade-in z-50">
                    <div className="text-[11px] font-semibold text-[#6E6467] uppercase tracking-wider px-3 py-1 border-b border-[#EAE2D7]/60 mb-1">
                      Curated For Every Occasion
                    </div>
                    {[
                      { name: 'Wedding Edit', desc: 'Bridal & Trousseau masterworks', filter: { occasion: 'Wedding' } },
                      { name: 'Festive Glow', desc: 'Regal colors & antique zari', filter: { occasion: 'Festive' } },
                      { name: 'Evening Glam', desc: 'Cocktail georgettes & sequins', filter: { occasion: 'Party' } },
                      { name: 'Office Elegance', desc: 'Linen & handloom mulmul', filter: { occasion: 'Workwear' } },
                      { name: 'Banarasi Heritage', desc: 'Pure Katan silk jaal', filter: { category: 'banarasi-sarees' } },
                      { name: 'Kanjivaram Silk', desc: 'Traditional temple korvai', filter: { category: 'kanjivaram-sarees' } }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNav('shop', item.filter)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F4EFEB] transition group cursor-pointer"
                      >
                        <div className="text-sm font-medium text-[#1F1A1C] group-hover:text-[#5B1425]">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[#6E6467]">{item.desc}</div>
                      </button>
                    ))}
                    <div className="pt-2 mt-1 border-t border-[#EAE2D7]/60 px-2">
                      <button
                        onClick={() => handleNav('shop')}
                        className="w-full text-center py-1.5 text-xs font-bold text-[#5B1425] hover:bg-[#F4EFEB] rounded-lg transition cursor-pointer"
                      >
                        Explore All Sarees →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNav('shop', { filter: 'best_seller' })}
                aria-current={isBestSellerActive ? 'page' : undefined}
                className={`h-full inline-flex items-center transition-colors px-1 lg:px-1.5 xl:px-2 border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  isBestSellerActive
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                Best Sellers
              </button>

              <button
                onClick={() => handleNav('offers')}
                aria-current={isOffersActive ? 'page' : undefined}
                className={`h-full inline-flex items-center transition-colors px-1 lg:px-1.5 xl:px-2 border-b-2 gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                  isOffersActive
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#6E6467] font-semibold hover:text-[#5B1425]'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isOffersActive ? 'text-[#5B1425]' : 'text-[#C5A059]'}`} />
                <span>Offers</span>
              </button>
            </nav>

            {/* Right: Actions (Search, Wishlist, Compare, Account, Cart) — Contained Inside Header */}
            <div className="flex items-center space-x-1 lg:space-x-1.5 xl:space-x-2.5 shrink-0">
              {/* Search Trigger (Desktop only - mobile uses dedicated search bar below) */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden lg:flex min-w-[44px] min-h-[44px] p-1.5 xl:p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition items-center justify-center gap-1 cursor-pointer shrink-0"
                aria-label="Search sarees"
              >
                <Search className="w-4 h-4 xl:w-5 xl:h-5" />
                <span className="hidden 2xl:inline text-xs text-[#6E6467] font-normal pl-1">Search...</span>
              </button>

              {/* Wishlist (Desktop only - mobile uses bottom navigation) */}
              <button
                onClick={() => handleNav('wishlist')}
                className="hidden lg:inline-flex relative min-w-[44px] min-h-[44px] items-center justify-center p-1.5 xl:p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition cursor-pointer shrink-0"
                aria-label="Wishlist"
                title="Wishlist"
              >
                <Heart className="w-4 h-4 xl:w-5 xl:h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 xl:top-0.5 xl:right-0.5 bg-[#5B1425] text-[#FAF7F2] text-[9px] xl:text-[10px] w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Compare Sarees (Desktop & Tablet) */}
              <button
                onClick={() => setIsCompareOpen(true)}
                className="hidden sm:inline-flex relative min-w-[44px] min-h-[44px] items-center justify-center p-1.5 xl:p-2 text-[#1F1A1C] hover:text-[#C5A059] hover:bg-[#F4EFEB] rounded-full transition cursor-pointer shrink-0"
                aria-label="Compare Sarees"
                title="Compare Sarees"
              >
                <Scale className="w-4 h-4 xl:w-5 xl:h-5" />
                {compareItems.length > 0 && (
                  <span className="absolute top-1 right-1 xl:top-0.5 xl:right-0.5 bg-[#C5A059] text-[#1F1A1C] text-[9px] xl:text-[10px] w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                    {compareItems.length}
                  </span>
                )}
              </button>

              {/* User Account Dropdown (Desktop) */}
              <div className="hidden lg:block relative shrink-0">
                <button
                  onClick={() => {
                    if (user) {
                      setUserDropdown(!userDropdown);
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className="min-w-[44px] min-h-[44px] p-1.5 xl:p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition inline-flex items-center justify-center gap-1 cursor-pointer"
                  aria-label="Account"
                >
                  <User className="w-4 h-4 xl:w-5 xl:h-5" />
                  {user && (
                    <span className="text-xs font-medium max-w-[70px] xl:max-w-[80px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  )}
                </button>

                {userDropdown && user && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-[#EAE2D7]">
                      <div className="text-sm font-semibold text-[#1F1A1C]">{user.name}</div>
                      <div className="text-xs text-[#6E6467] truncate">{user.email}</div>
                    </div>

                    <button
                      onClick={() => handleNav('account')}
                      className="w-full text-left px-4 py-2 text-sm text-[#1F1A1C] hover:bg-[#F4EFEB] transition cursor-pointer"
                    >
                      My Profile & Orders
                    </button>

                    <button
                      onClick={() => handleNav('track-order')}
                      className="w-full text-left px-4 py-2 text-sm text-[#1F1A1C] hover:bg-[#F4EFEB] transition cursor-pointer"
                    >
                      Track Shipment
                    </button>

                    <button
                      onClick={() => handleNav('wishlist')}
                      className="w-full text-left px-4 py-2 text-sm text-[#1F1A1C] hover:bg-[#F4EFEB] transition cursor-pointer"
                    >
                      My Wishlist ({wishlistCount})
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full text-left px-4 py-2 text-sm text-[#5B1425] font-semibold bg-[#F4EFEB]/50 hover:bg-[#F4EFEB] transition cursor-pointer"
                      >
                        Admin Dashboard
                      </button>
                    )}

                    <div className="border-t border-[#EAE2D7] mt-1 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdown(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shopping Bag Button — Desktop & Tablet */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="hidden sm:flex relative min-w-[44px] min-h-[44px] p-2.5 sm:px-3 sm:py-2 bg-[#5B1425] text-[#FAF7F2] hover:bg-[#7E1E34] rounded-full transition shadow-md items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 xl:w-5 xl:h-5 text-[#C5A059]" />
                <span className="text-xs font-bold hidden sm:inline">Bag</span>
                {itemCount > 0 && (
                  <span className="bg-[#C5A059] text-[#3F0D19] text-[9.5px] sm:text-[10px] xl:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Second Row: Mobile Search Bar — Keyboard Focusable & Accessible */}
          <div className="lg:hidden pb-3 pt-0.5">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search sarees, collections and more"
              className="w-full min-h-[44px] flex items-center gap-2.5 bg-white border border-[#E0D8CD] rounded-xl px-3.5 py-2.5 shadow-xs cursor-pointer active:scale-[0.99] transition-transform text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none"
            >
              <Search className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span className="text-xs text-[#52484B] font-medium truncate">
                Search sarees, collections & more...
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Hamburger Drawer */}
        {mobileMenuOpen && (
          <nav
            id="mobile-navigation-menu"
            aria-label="Mobile menu navigation"
            className="lg:hidden bg-[#FAF7F2] border-t border-[#EAE2D7] px-4 pt-3 pb-8 space-y-4 animate-fade-in shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* User Quick Info */}
            <div className="p-3 bg-white rounded-xl border border-[#EAE2D7] flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#5B1425] text-[#FAF7F2] flex items-center justify-center font-bold text-sm">
                    {user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1F1A1C]">{user.name}</div>
                    <div className="text-[11px] text-[#6E6467]">{user.email}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-[#6E6467]">Sign in for a personalized experience</span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="min-h-[44px] px-3.5 py-2 inline-flex items-center justify-center bg-[#5B1425] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer hover:bg-[#7E1E34] transition shrink-0 ml-2"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {/* Mandatory Menu Items with Consistent Luxury Line Icons */}
            <div className="space-y-1">
              {[
                { label: 'Home', icon: Home, action: () => handleNav('home'), highlight: currentPage === 'home' },
                { label: 'Sarees', icon: Layers, action: () => handleNav('shop'), highlight: isAllSareesActive },
                { label: 'New Arrivals', icon: Sparkles, action: () => handleNav('shop', { filter: 'new_arrival' }), highlight: isNewArrivalActive },
                { label: 'Collections', icon: Crown, action: () => handleNav('shop', { filter: 'featured' }), highlight: currentPage === 'shop' && pageParams.filter === 'featured' },
                { label: 'Best Sellers', icon: Flame, action: () => handleNav('shop', { filter: 'best_seller' }), highlight: isBestSellerActive },
                { label: 'Offers', icon: Tag, action: () => handleNav('offers'), highlight: currentPage === 'offers' },
                { label: 'Track Order', icon: Truck, action: () => handleNav('track-order'), highlight: currentPage === 'track-order' },
                { label: 'Contact Us', icon: MessageSquare, action: () => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }},
                { label: 'About PALLUVO', icon: Info, action: () => handleNav('about'), highlight: currentPage === 'about' },
                { label: 'Account', icon: User, action: () => {
                  setMobileMenuOpen(false);
                  if (user) {
                    handleNav('account');
                  } else {
                    onOpenAuth();
                  }
                }}
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B1425] focus-visible:outline-none ${
                      item.highlight ? 'bg-[#5B1425] text-white font-bold shadow-xs' : 'text-[#1F1A1C] hover:bg-[#F4EFEB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ItemIcon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-[#FAF7F2]' : 'text-[#6E6467]'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${item.highlight ? 'text-white' : 'text-[#A09699]'}`} />
                  </button>
                );
              })}
            </div>

            {/* Curated Collections & Occasions */}
            <div className="pt-2 border-t border-[#EAE2D7]">
              <div className="text-[11px] font-bold text-[#6E6467] uppercase tracking-wider px-1 mb-2">
                Curated Collections & Occasions
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { name: 'Bridal Edit', filter: { category: 'bridal-collection' } },
                  { name: 'Wedding Vault', filter: { occasion: 'Wedding' } },
                  { name: 'Festive Glow', filter: { occasion: 'Festive' } },
                  { name: 'Evening Glam', filter: { occasion: 'Party' } },
                  { name: 'Office Elegance', filter: { occasion: 'Workwear' } },
                  { name: 'Party & Cocktail', filter: { category: 'party-wear' } }
                ].map(col => {
                  const isActive = currentPage === 'shop' && (
                    (col.filter.category && pageParams.category === col.filter.category) ||
                    (col.filter.occasion && pageParams.occasion === col.filter.occasion) ||
                    (col.filter.filter && pageParams.filter === col.filter.filter)
                  );
                  return (
                    <button
                      key={col.name}
                      onClick={() => handleNav('shop', col.filter)}
                      className={`text-left min-h-[44px] flex items-center px-3 py-2 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B1425] focus-visible:outline-none ${
                        isActive
                          ? 'bg-[#5B1425] text-white border-[#5B1425] font-semibold shadow-2xs'
                          : 'bg-white border-[#EAE2D7] text-[#1F1A1C] hover:text-[#5B1425] hover:border-[#5B1425]'
                      }`}
                    >
                      {col.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shop by Category Accordion Grid */}
            <div className="pt-2 border-t border-[#EAE2D7]">
              <div className="text-[11px] font-bold text-[#6E6467] uppercase tracking-wider px-1 mb-2">
                Popular Handwoven Categories
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { name: 'Banarasi Sarees', slug: 'banarasi-sarees' },
                  { name: 'Kanjivaram Silk', slug: 'kanjivaram-sarees' },
                  { name: 'Pure Silk', slug: 'silk-sarees' },
                  { name: 'Organza Sarees', slug: 'organza-sarees' },
                  { name: 'Cotton & Linen', slug: 'cotton-sarees' },
                  { name: 'Designer Sarees', slug: 'designer-sarees' }
                ].map(cat => {
                  const isActive = currentPage === 'shop' && pageParams.category === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => handleNav('shop', { category: cat.slug })}
                      className={`text-left min-h-[44px] flex items-center px-3 py-2 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B1425] focus-visible:outline-none ${
                        isActive
                          ? 'bg-[#5B1425] text-white border-[#5B1425] font-semibold shadow-2xs'
                          : 'bg-white border-[#EAE2D7] text-[#1F1A1C] hover:text-[#5B1425] hover:border-[#5B1425]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-[#EAE2D7]">
                <button
                  onClick={() => handleNav('admin')}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 bg-[#5B1425] text-[#FAF7F2] font-semibold rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer hover:bg-[#7E1E34] transition"
                >
                  <Settings className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Open Admin Dashboard</span>
                </button>
              </div>
            )}

            {user && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full min-h-[44px] flex items-center justify-center text-center py-2 border border-red-200 text-red-700 bg-red-50/50 rounded-xl text-xs font-semibold hover:bg-red-100 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </nav>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Hidden on Desktop) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#EAE2D7] py-2 px-3 shadow-2xl safe-area-pb"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* 1. Home */}
          <button
            onClick={() => handleNav('home')}
            aria-current={currentPage === 'home' ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'home' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </button>

          {/* 2. Categories */}
          <button
            onClick={() => handleNav('shop')}
            aria-current={currentPage === 'shop' ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'shop' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <Grid className="w-5 h-5 mb-0.5" />
            <span>Categories</span>
          </button>

          {/* 3. Favorites / Wishlist */}
          <button
            onClick={() => handleNav('wishlist')}
            aria-current={currentPage === 'wishlist' ? 'page' : undefined}
            className={`flex-1 relative flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'wishlist' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <div className="relative">
              <Heart className="w-5 h-5 mb-0.5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#5B1425] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span>Favorites</span>
          </button>

          {/* 4. Shopping Bag / Cart (Provided Bag Icon) */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex-1 relative flex flex-col items-center justify-center py-1 text-[10px] text-[#6E6467] hover:text-[#5B1425] transition-colors cursor-pointer"
            aria-label="Shopping Bag"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 mb-0.5 text-[#C5A059]" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#5B1425] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </div>
            <span>Bag</span>
          </button>

          {/* 5. Account / Profile */}
          <button
            onClick={() => {
              if (user) {
                handleNav('account');
              } else {
                onOpenAuth();
              }
            }}
            aria-current={currentPage === 'account' ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'account' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>{user ? 'Account' : 'Sign In'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}

