import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useCart } from './CartContext';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user, token } = useAuth();
  const { addToast } = useToast();
  const { refreshCart } = useCart();

  useEffect(() => {
    if (token) {
      fetchWishlist();
    } else {
      const local = localStorage.getItem('palluvo_guest_wishlist');
      if (local) {
        try {
          setWishlistItems(JSON.parse(local));
        } catch (e) {
          setWishlistItems([]);
        }
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      localStorage.setItem('palluvo_guest_wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, token]);

  const fetchWishlist = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/wishlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.items) {
        setWishlistItems(data.items);
      }
    } catch (err) {
      console.error('Fetch wishlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isWishlisted = (productId) => {
    return wishlistItems.some(item => item.product_id === productId || item.id === productId);
  };

  const toggleWishlist = async (product) => {
    const prodId = product.id || product.product_id;
    const currentlySaved = isWishlisted(prodId);

    if (token) {
      try {
        const res = await fetch('/api/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ product_id: prodId })
        });
        const data = await res.json();
        if (res.ok) {
          await fetchWishlist();
          addToast(data.message || (currentlySaved ? 'Removed from wishlist.' : '✨ Saree saved to your wishlist.'));
        }
      } catch (err) {
        addToast('Failed to update wishlist.', 'error');
      }
    } else {
      if (currentlySaved) {
        setWishlistItems(prev => prev.filter(item => (item.product_id || item.id) !== prodId));
        addToast('Removed from wishlist.', 'info');
      } else {
        setWishlistItems(prev => [...prev, {
          product_id: prodId,
          name: product.name,
          slug: product.slug,
          price: product.price,
          mrp: product.mrp,
          discount_percent: product.discount_percent,
          fabric: product.fabric,
          primary_image: product.primary_image || (product.images && product.images[0])
        }]);
        addToast(`✨ Saved "${product.name}" to wishlist.`);
      }
    }
  };

  const moveToCart = async (product) => {
    const prodId = product.product_id || product.id;
    if (token) {
      try {
        const res = await fetch('/api/wishlist/move-to-cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ product_id: prodId })
        });
        if (res.ok) {
          await fetchWishlist();
          await refreshCart();
          addToast('✨ Saree moved to your shopping bag!');
        }
      } catch (err) {
        addToast('Failed to move to cart.', 'error');
      }
    } else {
      setWishlistItems(prev => prev.filter(item => (item.product_id || item.id) !== prodId));
      addToast('✨ Moved to shopping bag!');
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      wishlistCount: wishlistItems.length,
      isWishlisted,
      toggleWishlist,
      moveToCart,
      refreshWishlist: fetchWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
