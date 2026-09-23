import React, { useState } from 'react';
import { Search, Heart, ShoppingBag, User, Menu, X, Sparkles, ChevronDown, ShieldCheck, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function Navbar({ onNavigate, currentPage, onOpenAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsDropdown, setCollectionsDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const { user, isAdmin, logout } = useAuth();
  const { itemCount, setIsCartOpen, setIsSearchOpen } = useCart();
  const { wishlistCount } = useWishlist();

  const handleNav = (page, params = {}) => {
    setMobileMenuOpen(false);
    setCollectionsDropdown(false);
    setUserDropdown(false);
    onNavigate(page, params);
  };

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <div className="bg-[#3F0D19] text-[#FAF7F2] text-xs font-medium tracking-wide py-2 px-4 border-b border-[#C5A059]/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
            <span>Complimentary Express Delivery across India on orders above ₹1,999</span>
            <span className="hidden md:inline text-[#C5A059] font-semibold ml-2">| Use Code WELCOME10 for 10% OFF</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-[#FAF7F2]/80">
            <button onClick={() => handleNav('offers')} className="hover:text-[#C5A059] transition flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#C5A059]" /> Offers
            </button>
            <button onClick={() => handleNav('track-order')} className="hover:text-[#C5A059] transition">
              Track Order
            </button>
            {isAdmin && (
              <button
                onClick={() => handleNav('admin')}
                className="text-[#C5A059] font-bold uppercase tracking-wider bg-[#5B1425] px-2 py-0.5 rounded border border-[#C5A059]/40 hover:bg-[#C5A059] hover:text-[#3F0D19] transition"
              >
                Admin Panel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE2D7] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Left: Mobile Hamburger & Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[#1F1A1C] hover:text-[#5B1425]"
                aria-label="Open menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div
                onClick={() => handleNav('home')}
                className="cursor-pointer group flex flex-col items-start"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-cinzel text-2xl sm:text-3xl font-bold tracking-[0.2em] text-[#5B1425] group-hover:text-[#7E1E34] transition">
                    PALLUVO
                  </span>
                  <span className="text-[#C5A059] text-lg -mt-2 group-hover:rotate-12 transition transform">✦</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-serif tracking-[0.15em] text-[#6E6467] -mt-1 uppercase italic">
                  Every drape, a little magic
                </span>
              </div>
            </div>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium tracking-wide">
              <button
                onClick={() => handleNav('home')}
                className={`transition-colors py-2 border-b-2 ${
                  currentPage === 'home'
                    ? 'border-[#5B1425] text-[#5B1425] font-semibold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => handleNav('shop')}
                className={`transition-colors py-2 border-b-2 ${
                  currentPage === 'shop'
                    ? 'border-[#5B1425] text-[#5B1425] font-semibold'
                    : 'border-transparent text-[#1F1A1C] hover:text-[#5B1425]'
                }`}
              >
                All Sarees
              </button>

              <button
                onClick={() => handleNav('shop', { filter: 'new_arrival' })}
                className="transition-colors py-2 border-b-2 border-transparent text-[#1F1A1C] hover:text-[#5B1425] flex items-center gap-1"
              >
                <span>New Arrivals</span>
                <span className="bg-[#5B1425] text-[#FAF7F2] text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>
              </button>

              {/* Collections Dropdown */}
              <div
                className="relative py-2"
                onMouseEnter={() => setCollectionsDropdown(true)}
                onMouseLeave={() => setCollectionsDropdown(false)}
              >
                <button
                  onClick={() => handleNav('shop')}
                  className="transition-colors text-[#1F1A1C] hover:text-[#5B1425] flex items-center gap-1"
                >
                  <span>Collections</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6E6467]" />
                </button>

                {collectionsDropdown && (
                  <div className="absolute top-full left-0 w-64 bg-[#FAF7F2] border border-[#EAE2D7] rounded-lg shadow-2xl py-3 px-2 animate-fade-in z-50">
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
                        className="w-full text-left px-3 py-2 rounded hover:bg-[#F4EFEB] transition group"
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
                className="transition-colors py-2 border-b-2 border-transparent text-[#1F1A1C] hover:text-[#5B1425]"
              >
                Best Sellers
              </button>

              <button
                onClick={() => handleNav('offers')}
                className="transition-colors py-2 border-b-2 border-transparent text-[#9A7730] font-semibold hover:text-[#5B1425] flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Offers</span>
              </button>
            </nav>

            {/* Right: Actions (Search, Wishlist, Account, Cart) */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Search Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition flex items-center gap-1"
                aria-label="Search sarees"
              >
                <Search className="w-5 h-5" />
                <span className="hidden xl:inline text-xs text-[#6E6467] font-normal pl-1">Search...</span>
              </button>

              {/* Wishlist */}
              <button
                onClick={() => handleNav('wishlist')}
                className="relative p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#5B1425] text-[#FAF7F2] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* User Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (user) {
                      setUserDropdown(!userDropdown);
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className="p-2 text-[#1F1A1C] hover:text-[#5B1425] hover:bg-[#F4EFEB] rounded-full transition flex items-center gap-1"
                  aria-label="Account"
                >
                  <User className="w-5 h-5" />
                  {user && (
                    <span className="hidden md:inline text-xs font-medium max-w-[80px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                  )}
                </button>

                {userDropdown && user && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#FAF7F2] border border-[#EAE2D7] rounded-lg shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-[#EAE2D7]">
                      <div className="text-sm font-semibold text-[#1F1A1C]">{user.name}</div>
                      <div className="text-xs text-[#6E6467] truncate">{user.email}</div>
                    </div>

                    <button
                      onClick={() => handleNav('account')}
                      className="w-full text-left px-4 py-2 text-sm text-[#1F1A1C] hover:bg-[#F4EFEB] transition"
                    >
                      My Profile & Orders
                    </button>

                    <button
                      onClick={() => handleNav('track-order')}
                      className="w-full text-left px-4 py-2 text-sm text-[#1F1A1C] hover:bg-[#F4EFEB] transition"
                    >
                      Track Shipment
                    </button>

                    <button
                      onClick={() => handleNav('wishlist')}
                      className="w-full text-left px-4 py-2 text-sm text-[#1F1A1C] hover:bg-[#F4EFEB] transition"
                    >
                      My Wishlist ({wishlistCount})
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleNav('admin')}
                        className="w-full text-left px-4 py-2 text-sm text-[#5B1425] font-semibold bg-[#F4EFEB]/50 hover:bg-[#F4EFEB] transition"
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
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition"
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
                className="relative p-2 bg-[#5B1425] text-[#FAF7F2] hover:bg-[#7E1E34] rounded-full transition shadow-md flex items-center gap-2 px-3"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-bold hidden sm:inline">Bag</span>
                {itemCount > 0 && (
                  <span className="bg-[#C5A059] text-[#3F0D19] text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FAF7F2] border-t border-[#EAE2D7] px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-xl">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-[#EAE2D7]">
              <button
                onClick={() => handleNav('home')}
                className="text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-[#F4EFEB] text-[#1F1A1C]"
              >
                Home
              </button>
              <button
                onClick={() => handleNav('shop')}
                className="text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-[#F4EFEB] text-[#1F1A1C]"
              >
                All Sarees
              </button>
              <button
                onClick={() => handleNav('shop', { filter: 'new_arrival' })}
                className="text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-[#F4EFEB] text-[#1F1A1C]"
              >
                New Arrivals ✨
              </button>
              <button
                onClick={() => handleNav('shop', { filter: 'best_seller' })}
                className="text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-[#F4EFEB] text-[#1F1A1C]"
              >
                Best Sellers
              </button>
              <button
                onClick={() => handleNav('offers')}
                className="text-left px-3 py-2 text-sm font-semibold rounded-md hover:bg-[#F4EFEB] text-[#5B1425]"
              >
                Offers & Deals
              </button>
              <button
                onClick={() => handleNav('track-order')}
                className="text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-[#F4EFEB] text-[#1F1A1C]"
              >
                Track Orders
              </button>
            </div>

            <div className="text-xs font-semibold text-[#6E6467] uppercase tracking-wider px-1">
              Shop by Category
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { name: 'Banarasi Sarees', slug: 'banarasi-sarees' },
                { name: 'Kanjivaram Silk', slug: 'kanjivaram-sarees' },
                { name: 'Pure Silk', slug: 'silk-sarees' },
                { name: 'Organza Sarees', slug: 'organza-sarees' },
                { name: 'Cotton & Linen', slug: 'cotton-sarees' },
                { name: 'Party Wear', slug: 'party-wear' },
                { name: 'Bridal Edit', slug: 'bridal-collection' }
              ].map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => handleNav('shop', { category: cat.slug })}
                  className="text-left px-3 py-2 bg-[#F4EFEB] rounded text-[#1F1A1C] hover:text-[#5B1425]"
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-[#EAE2D7]">
                <button
                  onClick={() => handleNav('admin')}
                  className="w-full text-center py-2 bg-[#5B1425] text-[#FAF7F2] font-semibold rounded text-sm"
                >
                  Open Admin Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2] border-t border-[#EAE2D7] py-2 px-3 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => handleNav('home')}
          className={`flex flex-col items-center text-[10px] ${currentPage === 'home' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467]'}`}
        >
          <span className="text-base">✦</span>
          <span>Home</span>
        </button>

        <button
          onClick={() => handleNav('shop')}
          className={`flex flex-col items-center text-[10px] ${currentPage === 'shop' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467]'}`}
        >
          <span className="text-base">🥻</span>
          <span>Categories</span>
        </button>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center text-[10px] text-[#6E6467]"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>

        <button
          onClick={() => handleNav('wishlist')}
          className={`relative flex flex-col items-center text-[10px] ${currentPage === 'wishlist' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467]'}`}
        >
          <Heart className="w-4 h-4" />
          <span>Wishlist</span>
          {wishlistCount > 0 && (
            <span className="absolute -top-1 right-1 bg-[#5B1425] text-white text-[8px] w-3 h-3 rounded-full flex items-center justify-center font-bold">
              {wishlistCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (user) handleNav('account');
            else onOpenAuth();
          }}
          className={`flex flex-col items-center text-[10px] ${currentPage === 'account' ? 'text-[#5B1425] font-bold' : 'text-[#6E6467]'}`}
        >
          <User className="w-4 h-4" />
          <span>{user ? 'Account' : 'Sign In'}</span>
        </button>
      </div>
    </>
  );
}
