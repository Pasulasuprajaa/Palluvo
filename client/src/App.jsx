import React, { useState, useEffect, Suspense, lazy } from 'react';
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
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { updatePageMeta } from './utils/seo';

import HomePage from './pages/HomePage';
const ShopPage = lazy(() => import('./pages/ShopPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const OffersPage = lazy(() => import('./pages/OffersPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#FAF7F2] py-20 animate-fade-in" role="status" aria-label="Loading page">
      <div className="w-10 h-10 border-2 border-[#C5A059]/30 border-t-[#5B1425] rounded-full animate-spin mb-4" />
      <div className="text-xs uppercase tracking-widest text-[#5B1425] font-semibold flex items-center gap-1.5 font-serif">
        <span className="text-[#C5A059]" aria-hidden="true">✦</span>
        <span>Loading PALLUVO</span>
        <span className="text-[#C5A059]" aria-hidden="true">✦</span>
      </div>
    </div>
  );
}

function getRouteFromPath(pathname = window.location.pathname, search = window.location.search) {
  const path = pathname.toLowerCase();
  const searchParams = new URLSearchParams(search);

  if (path === '/' || path === '') {
    return { page: 'home', params: {} };
  } else if (path.startsWith('/sarees/') || path.startsWith('/product/')) {
    const slug = pathname.split('/')[2];
    return { page: 'product', params: { slug } };
  } else if (path === '/sarees' || path === '/shop') {
    const filters = {};
    for (const [key, value] of searchParams.entries()) {
      if (value) filters[key] = value;
    }
    return { page: 'shop', params: filters };
  } else if (path === '/cart') {
    return { page: 'cart', params: {} };
  } else if (path === '/checkout') {
    return { page: 'checkout', params: {} };
  } else if (path === '/account') {
    return { page: 'account', params: {} };
  } else if (path === '/wishlist') {
    return { page: 'wishlist', params: {} };
  } else if (path === '/offers') {
    return { page: 'offers', params: {} };
  } else if (path === '/track-order') {
    const trackingId = searchParams.get('trackingId') || searchParams.get('id') || '';
    return { page: 'track-order', params: { trackingId } };
  } else if (path === '/admin') {
    return { page: 'admin', params: {} };
  } else if (path === '/about' || path === '/heritage' || path === '/artisans' || path === '/care-guide' || path === '/sustainability') {
    let tab = 'heritage';
    if (path === '/artisans') tab = 'artisans';
    else if (path === '/care-guide') tab = 'care';
    else if (path === '/sustainability') tab = 'sustainability';
    else if (searchParams.get('tab')) tab = searchParams.get('tab');
    return { page: 'about', params: { tab } };
  } else if (path === '/privacy' || path === '/terms' || path === '/shipping' || path === '/refund' || path === '/policies' || path === '/policy') {
    const tab = path === '/policies' || path === '/policy' ? (searchParams.get('tab') || 'privacy') : path.replace('/', '');
    return { page: 'policy', params: { tab } };
  }
  return { page: 'not-found', params: { path: pathname } };
}

function AppContent() {
  const initialRoute = typeof window !== 'undefined'
    ? getRouteFromPath(window.location.pathname, window.location.search)
    : { page: 'home', params: {} };

  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [pageParams, setPageParams] = useState(initialRoute.params);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

  // Sync with browser URL / history for deep linking on mount and popstate
  useEffect(() => {
    const handlePopState = () => {
      const { page, params } = getRouteFromPath(window.location.pathname, window.location.search);
      setCurrentPage(page);
      setPageParams(params);
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let urlPath = '/';
    if (page === 'shop') {
      const searchParams = new URLSearchParams();
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, value);
          }
        });
      }
      const qs = searchParams.toString();
      urlPath = qs ? `/sarees?${qs}` : '/sarees';
    }
    else if (page === 'product' && params.slug) urlPath = `/sarees/${params.slug}`;
    else if (page === 'cart') urlPath = '/cart';
    else if (page === 'checkout') urlPath = '/checkout';
    else if (page === 'account') urlPath = '/account';
    else if (page === 'wishlist') urlPath = '/wishlist';
    else if (page === 'offers') urlPath = '/offers';
    else if (page === 'track-order') urlPath = params.trackingId ? `/track-order?trackingId=${encodeURIComponent(params.trackingId)}` : '/track-order';
    else if (page === 'admin') urlPath = '/admin';
    else if (page === 'about') urlPath = params.tab ? `/about?tab=${params.tab}` : '/about';
    else if (page === 'policy') urlPath = `/${params.tab || 'privacy'}`;
    else if (page === 'not-found' || page === '404') urlPath = params.path || '/404';

    window.history.pushState({}, '', urlPath);
  };

  // Sync SEO title, description, OG, Twitter, and canonical metadata with current route
  useEffect(() => {
    updatePageMeta(currentPage, pageParams);
  }, [currentPage, pageParams]);

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
      {/* Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#5B1425] focus:text-[#FAF7F2] focus:rounded-xl focus:shadow-2xl focus:ring-2 focus:ring-[#C5A059] focus:outline-none text-xs font-bold uppercase tracking-wider"
      >
        Skip to main content
      </a>

      {/* Sticky Top Luxury Header */}
      <Navbar
        currentPage={currentPage}
        pageParams={pageParams}
        onNavigate={navigate}
        onOpenAuth={() => handleOpenAuth()}
      />

      {/* Main Dynamic View */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <RouteErrorBoundary
          resetKey={`${currentPage}-${JSON.stringify(pageParams)}`}
          onNavigate={navigate}
        >
          <Suspense fallback={<PageLoader />}>
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

            {currentPage === 'about' && (
              <AboutPage initialTab={pageParams.tab || 'heritage'} onNavigate={navigate} />
            )}

            {currentPage === 'policy' && (
              <PolicyPage initialTab={pageParams.tab || 'privacy'} onNavigate={navigate} />
            )}

            {(currentPage === 'not-found' || currentPage === '404') && (
              <NotFoundPage onNavigate={navigate} invalidPath={pageParams?.path} />
            )}
          </Suspense>
        </RouteErrorBoundary>
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
