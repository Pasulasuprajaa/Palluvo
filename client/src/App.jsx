import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SearchModal from './components/SearchModal';
import CartDrawer from './components/CartDrawer';
import QuickViewModal from './components/QuickViewModal';
import AuthModal from './components/AuthModal';
import CompareDrawer from './components/CompareDrawer';

import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AccountPage from './pages/AccountPage';
import WishlistPage from './pages/WishlistPage';
import OffersPage from './pages/OffersPage';
import AdminPage from './pages/AdminPage';
import PolicyPage from './pages/PolicyPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

  // Sync with browser URL / history for deep linking
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentPage('home');
      } else if (path.startsWith('/sarees/') || path.startsWith('/product/')) {
        const slug = path.split('/')[2];
        setCurrentPage('product');
        setPageParams({ slug });
      } else if (path === '/sarees' || path === '/shop') {
        setCurrentPage('shop');
      } else if (path === '/cart') {
        setCurrentPage('cart');
      } else if (path === '/checkout') {
        setCurrentPage('checkout');
      } else if (path === '/account') {
        setCurrentPage('account');
      } else if (path === '/wishlist') {
        setCurrentPage('wishlist');
      } else if (path === '/offers') {
        setCurrentPage('offers');
      } else if (path === '/track-order') {
        setCurrentPage('track-order');
      } else if (path === '/admin') {
        setCurrentPage('admin');
      } else if (path === '/privacy' || path === '/terms' || path === '/shipping' || path === '/refund' || path === '/policies' || path === '/policy') {
        const tab = path === '/policies' || path === '/policy' ? 'privacy' : path.replace('/', '');
        setCurrentPage('policy');
        setPageParams({ tab });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let urlPath = '/';
    if (page === 'shop') urlPath = '/sarees';
    else if (page === 'product' && params.slug) urlPath = `/sarees/${params.slug}`;
    else if (page === 'cart') urlPath = '/cart';
    else if (page === 'checkout') urlPath = '/checkout';
    else if (page === 'account') urlPath = '/account';
    else if (page === 'wishlist') urlPath = '/wishlist';
    else if (page === 'offers') urlPath = '/offers';
    else if (page === 'track-order') urlPath = '/track-order';
    else if (page === 'admin') urlPath = '/admin';
    else if (page === 'policy') urlPath = `/${params.tab || 'privacy'}`;

    window.history.pushState({}, '', urlPath);
  };

  const handleOpenAuth = (callback = null) => {
    setAuthSuccessCallback(() => callback);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (authSuccessCallback) {
      authSuccessCallback();
      setAuthSuccessCallback(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1F1A1C] font-sans pb-20 lg:pb-0">
      {/* Sticky Top Luxury Header */}
      <Navbar
        currentPage={currentPage}
        pageParams={pageParams}
        onNavigate={navigate}
        onOpenAuth={() => handleOpenAuth()}
      />

      {/* Main Dynamic View */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage onNavigate={navigate} />
        )}

        {currentPage === 'shop' && (
          <ShopPage onNavigate={navigate} initialFilters={pageParams} key={JSON.stringify(pageParams)} />
        )}

        {currentPage === 'product' && (
          <ProductDetailPage
            slug={pageParams.slug}
            onNavigate={navigate}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentPage === 'cart' && (
          <CartPage onNavigate={navigate} onOpenAuth={handleOpenAuth} />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage onNavigate={navigate} />
        )}

        {currentPage === 'order-success' && (
          <OrderSuccessPage order={pageParams.order} onNavigate={navigate} />
        )}

        {currentPage === 'track-order' && (
          <OrderTrackingPage
            trackingId={pageParams.trackingId}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'account' && (
          <AccountPage onNavigate={navigate} />
        )}

        {currentPage === 'wishlist' && (
          <WishlistPage onNavigate={navigate} />
        )}

        {currentPage === 'offers' && (
          <OffersPage onNavigate={navigate} />
        )}

        {currentPage === 'admin' && (
          <AdminPage onNavigate={navigate} />
        )}

        {currentPage === 'policy' && (
          <PolicyPage initialTab={pageParams.tab || 'privacy'} onNavigate={navigate} />
        )}
      </main>

      {/* Luxury Footer */}
      <Footer onNavigate={navigate} />

      {/* Global Modals & Drawers */}
      <SearchModal onNavigate={navigate} />
      <CartDrawer onNavigate={navigate} onOpenAuth={handleOpenAuth} />
      <QuickViewModal onNavigate={navigate} />
      <CompareDrawer onNavigate={navigate} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              <AppContent />
            </CompareProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
