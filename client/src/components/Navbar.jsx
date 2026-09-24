import React, { useState } from 'react';
import {
  Search, Heart, ShoppingBag, User, Menu, X, Sparkles,
  ChevronDown, Tag, Scale, Home, Grid, ChevronRight, Phone, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';

export default function Navbar({ onNavigate, currentPage, onOpenAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsDropdown, setCollectionsDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const { user, isAdmin, logout } = useAuth();
  const { itemCount, setIsCartOpen, setIsSearchOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { compareItems, setIsCompareOpen } = useCompare();

  const handleNav = (page, params = {}) => {
    setMobileMenuOpen(false);
    setCollectionsDropdown(false);
    setUserDropdown(false);
    onNavigate(page, params);
  };

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <div className="bg-[#3F0D19] text-[#FAF7F2] text-[11px] sm:text-xs font-medium tracking-wide py-1.5 sm:py-2 px-3 sm:px-4 border-b border-[#C5A059]/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 mx-auto sm:mx-0 text-center sm:text-left truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059] shrink-0 animate-pulse" />
            <span className="truncate">Complimentary Express Delivery on orders &gt; ₹1,999</span>
            <span className="hidden md:inline text-[#C5A059] font-semibold ml-2">| Use Code WELCOME10 for 10% OFF</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-[#FAF7F2]/80 shrink-0">
            <button onClick={() => handleNav('offers')} className="hover:text-[#C5A059] transition flex items-center gap-1 cursor-pointer">
              <Tag className="w-3 h-3 text-[#C5A059]" /> Offers
            </button>
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
      </div>

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE2D7] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Top Row */}
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            
            {/* Left: Mobile Hamburger & Logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-2 sm:mr-4 lg:mr-4 xl:mr-8">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 -ml-1 text-[#1F1A1C] hover:text-[#5B1425] rounded-xl hover:bg-[#F4EFEB] transition cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-[#5B1425]" /> : <Menu className="w-6 h-6" />}
              </button>

              <div
                onClick={() => handleNav('home')}
                className="cursor-pointer group flex flex-col items-start select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-cinzel text-2xl sm:text-3xl font-bold tracking-[0.18em] sm:tracking-[0.2em] text-[#5B1425] group-hover:text-[#7E1E34] transition whitespace-nowrap">
                    PALLUVO
                  </span>
                  <span className="text-[#C5A059] text-base sm:text-lg -mt-1 group-hover:rotate-12 transition transform">✦</span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-serif tracking-[0.15em] text-[#6E6467] -mt-1 uppercase italic block whitespace-nowrap">
                  Every drape, a little magic
                </span>
              </div>
            </div>

            {/* Center: Desktop Navigation — Single-Line Non-Wrapping Layout */}
            <nav className="hidden lg:flex items-center justify-center gap-3.5 xl:gap-6 2xl:gap-8 text-xs xl:text-sm font-medium tracking-wide flex-1 h-full shrink-0">
              <button
                onClick={() => handleNav('home')}
                className={`h-full inline-flex items-center transition-colors px-1.5 xl:px-2 border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  currentPage === 'home'
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => handleNav('shop')}
                className={`h-full inline-flex items-center transition-colors px-1.5 xl:px-2 border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  currentPage === 'shop'
                    ? 'border-[#5B1425] text-[#5B1425] font-bold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                All Sarees
              </button>

              <button
                onClick={() => handleNav('shop', { filter: 'new_arrival' })}
                className="h-full inline-flex items-center transition-colors px-1.5 xl:px-2 border-b-2 border-transparent text-[#1F1A1C] hover:text-[#5B1425] gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>New Arrivals</span>
                <span className="bg-[#5B1425] text-[#FAF7F2] text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">New</span>
              </button>

              {/* Collections Dropdown */}
              <div
                className="relative h-full flex items-center shrink-0"
                onMouseEnter={() => setCollectionsDropdown(true)}
                onMouseLeave={() => setCollectionsDropdown(false)}
              >
                <button
                  onClick={() => handleNav('shop')}
                  className="h-full inline-flex items-center transition-colors px-1.5 xl:px-2 border-b-2 border-transparent text-[#1F1A1C] hover:text-[#5B1425] gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Collections</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6E6467] shrink-0" />
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
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNav('shop', { filter: 'best_seller' })}
                className="h-full inline-flex items-center transition-colors px-1.5 xl:px-2 border-b-2 border-transparent text-[#1F1A1C] hover:text-[#5B1425] cursor-pointer whitespace-nowrap shrink-0"
              >
                Best Sellers
              </button>

              <button
                onClick={() => handleNav('offers')}
                className="h-full inline-flex items-center transition-colors px-1.5 xl:px-2 border-b-2 border-transparent text-[#9A7730] font-semibold hover:text-[#5B1425] gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span>Offers</span>
              </button>
            </nav>

            {/* Right: Actions (Search, Wishlist, Compare, Account, Cart) */}
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              {/* Search Trigger (Desktop only - mobile uses dedicated search bar below) */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden lg:flex p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition items-center gap-1 cursor-pointer shrink-0"
                aria-label="Search sarees"
              >
                <Search className="w-5 h-5" />
                <span className="hidden xl:inline text-xs text-[#6E6467] font-normal pl-1">Search...</span>
              </button>

              {/* Wishlist (Desktop only - mobile uses bottom navigation) */}
              <button
                onClick={() => handleNav('wishlist')}
                className="hidden lg:inline-flex relative p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition cursor-pointer shrink-0"
                aria-label="Wishlist"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#5B1425] text-[#FAF7F2] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Compare Sarees (Desktop & Tablet) */}
              <button
                onClick={() => setIsCompareOpen(true)}
                className="hidden sm:inline-flex relative p-2 text-[#1F1A1C] hover:text-[#C5A059] hover:bg-[#F4EFEB] rounded-full transition cursor-pointer shrink-0"
                aria-label="Compare Sarees"
                title="Compare Sarees"
              >
                <Scale className="w-5 h-5" />
                {compareItems.length > 0 && (
                  <span className="absolute top-1 right-1 bg-[#C5A059] text-[#1F1A1C] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
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
                  className="p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition flex items-center gap-1 cursor-pointer"
                  aria-label="Account"
                >
                  <User className="w-5 h-5" />
                  {user && (
                    <span className="text-xs font-medium max-w-[80px] truncate">
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
                        Admin Dashboard ⚙️
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

              {/* Shopping Bag Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 bg-[#5B1425] text-[#FAF7F2] hover:bg-[#7E1E34] rounded-full transition shadow-md flex items-center gap-1.5 px-3 cursor-pointer shrink-0"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
                <span className="text-xs font-bold hidden sm:inline">Bag</span>
                {itemCount > 0 && (
                  <span className="bg-[#C5A059] text-[#3F0D19] text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
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
              className="w-full flex items-center gap-2.5 bg-white border border-[#E0D8CD] rounded-xl px-3.5 py-2.5 shadow-xs cursor-pointer active:scale-[0.99] transition-transform text-left focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:outline-none"
            >
              <Search className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span className="text-xs text-[#8C8285] font-normal truncate">
                Search sarees, collections & more...
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Hamburger Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FAF7F2] border-t border-[#EAE2D7] px-4 pt-3 pb-8 space-y-4 animate-fade-in shadow-2xl max-h-[85vh] overflow-y-auto">
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
                    className="px-3 py-1.5 bg-[#5B1425] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {/* Mandatory Menu Items specified in prompt */}
            <div className="space-y-1">
              {[
                { label: 'Home', icon: '✦', action: () => handleNav('home'), highlight: currentPage === 'home' },
                { label: 'Sarees', icon: '🥻', action: () => handleNav('shop'), highlight: currentPage === 'shop' },
                { label: 'New Arrivals', icon: '✨', action: () => handleNav('shop', { filter: 'new_arrival' }) },
                { label: 'Collections', icon: '👑', action: () => handleNav('shop') },
                { label: 'Best Sellers', icon: '🔥', action: () => handleNav('shop', { filter: 'best_seller' }) },
                { label: 'Offers', icon: '🏷️', action: () => handleNav('offers'), highlight: currentPage === 'offers' },
                { label: 'Track Order', icon: '🚚', action: () => handleNav('track-order'), highlight: currentPage === 'track-order' },
                { label: 'Contact Us', icon: '💬', action: () => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }},
                { label: 'About PALLUVO', icon: '🪷', action: () => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }},
                { label: 'Account', icon: '👤', action: () => user ? handleNav('account') : onOpenAuth() }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                    item.highlight ? 'bg-[#5B1425] text-white font-bold shadow-xs' : 'text-[#1F1A1C] hover:bg-[#F4EFEB]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${item.highlight ? 'text-white' : 'text-[#A09699]'}`} />
                </button>
              ))}
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
                  { name: 'Bridal Edit', slug: 'bridal-collection' }
                ].map(cat => (
                  <button
                    key={cat.slug}
                    onClick={() => handleNav('shop', { category: cat.slug })}
                    className="text-left px-3 py-2 bg-white rounded-lg border border-[#EAE2D7] text-[#1F1A1C] hover:text-[#5B1425] hover:border-[#5B1425] transition cursor-pointer"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-[#EAE2D7]">
                <button
                  onClick={() => handleNav('admin')}
                  className="w-full text-center py-2.5 bg-[#5B1425] text-[#FAF7F2] font-semibold rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Open Admin Dashboard ⚙️
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
                  className="w-full text-center py-2 border border-red-200 text-red-700 bg-red-50/50 rounded-xl text-xs font-semibold hover:bg-red-100 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
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
            className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'shop' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <Grid className="w-5 h-5 mb-0.5" />
            <span>Categories</span>
          </button>

          {/* 3. Offers */}
          <button
            onClick={() => handleNav('offers')}
            className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'offers' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <Tag className="w-5 h-5 mb-0.5 text-[#C5A059]" />
            <span>Offers</span>
          </button>

          {/* 4. Wishlist */}
          <button
            onClick={() => handleNav('wishlist')}
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
            <span>Wishlist</span>
          </button>

          {/* 5. Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className={`flex-1 relative flex flex-col items-center justify-center py-1 text-[10px] transition-colors cursor-pointer ${
              currentPage === 'cart' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467] hover:text-[#1F1A1C]'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 mb-0.5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#C5A059] text-[#3F0D19] text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>
        </div>
      </nav>
    </>
  );
}

