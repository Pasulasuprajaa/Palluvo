import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);

  const { user, token } = useAuth();
  const { addToast } = useToast();

  const freeDeliveryThreshold = 1999;

  // Load cart on token change or initial local storage
  useEffect(() => {
    if (token) {
      fetchServerCart();
    } else {
      const local = localStorage.getItem('palluvo_guest_cart');
      if (local) {
        try {
          setCartItems(JSON.parse(local));
        } catch (e) {
          setCartItems([]);
        }
      }
    }
  }, [token]);

  // Save guest cart
  useEffect(() => {
    if (!token) {
      localStorage.setItem('palluvo_guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, token]);

  const fetchServerCart = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.items) {
        setCartItems(data.items);
      }
    } catch (err) {
      console.error('Fetch server cart error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product, variant = null, quantity = 1) => {
    if (token) {
      try {
        const res = await fetch('/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            product_id: product.id,
            variant_id: variant ? variant.id : null,
            quantity
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add item.');
        await fetchServerCart();
        addToast(`✨ Added "${product.name}" to your shopping bag.`);
        setIsCartOpen(true);
      } catch (err) {
        addToast(err.message, 'error');
      }
    } else {
      // Guest cart
      setCartItems(prev => {
        const existingIdx = prev.findIndex(item => item.product_id === product.id && (!variant || item.variant_id === variant.id));
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].quantity += quantity;
          return updated;
        } else {
          return [...prev, {
            cart_item_id: 'guest_' + Date.now() + Math.random().toString(36).substring(2, 5),
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            mrp: product.mrp,
            discount_percent: product.discount_percent,
            fabric: product.fabric,
            variant_id: variant ? variant.id : null,
            variant_color: variant ? variant.color_name : product.color_name,
            variant_hex: variant ? variant.color_hex : product.color_hex,
            image_url: product.primary_image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
            quantity
          }];
        }
      });
      addToast(`✨ Added "${product.name}" to your shopping bag.`);
      setIsCartOpen(true);
    }
  };

  const updateQuantity = async (cartItemId, newQty) => {
    if (token) {
      try {
        const res = await fetch('/api/cart/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ cart_item_id: cartItemId, quantity: newQty })
        });
        if (res.ok) {
          await fetchServerCart();
        }
      } catch (err) {
        addToast('Failed to update quantity.', 'error');
      }
    } else {
      if (newQty <= 0) {
        setCartItems(prev => prev.filter(item => item.cart_item_id !== cartItemId));
      } else {
        setCartItems(prev => prev.map(item => item.cart_item_id === cartItemId ? { ...item, quantity: newQty } : item));
      }
    }
  };

  const removeFromCart = async (cartItemId) => {
    if (token) {
      try {
        const res = await fetch(`/api/cart/remove/${cartItemId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          await fetchServerCart();
          addToast('Item removed from bag.', 'info');
        }
      } catch (err) {
        addToast('Failed to remove item.', 'error');
      }
    } else {
      setCartItems(prev => prev.filter(item => item.cart_item_id !== cartItemId));
      addToast('Item removed from bag.', 'info');
    }
  };

  const clearCart = async () => {
    if (token) {
      try {
        await fetch('/api/cart/clear', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setCartItems([]);
      } catch (err) {
        console.error(err);
      }
    } else {
      setCartItems([]);
      localStorage.removeItem('palluvo_guest_cart');
    }
    setAppliedCoupon(null);
  };

  const applyCoupon = async (code) => {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code, subtotal })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid coupon.');
      }
      setAppliedCoupon(data.coupon);
      addToast(data.message || `Coupon "${data.coupon.code}" applied!`);
      return { success: true, coupon: data.coupon };
    } catch (err) {
      addToast(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    addToast('Coupon removed.');
  };

  // Calculations
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalMrp = cartItems.reduce((acc, item) => acc + ((item.mrp || item.price) * item.quantity), 0);
  const totalSavings = totalMrp - subtotal;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const amountNeededForFreeDelivery = isFreeDelivery ? 0 : freeDeliveryThreshold - subtotal;
  const deliveryFee = cartItems.length === 0 ? 0 : (isFreeDelivery ? 0 : 150);

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);

  return (
    <CartContext.Provider value={{
      cartItems,
      itemCount,
      subtotal,
      totalMrp,
      totalSavings,
      deliveryFee,
      freeDeliveryThreshold,
      isFreeDelivery,
      amountNeededForFreeDelivery,
      appliedCoupon,
      discountAmount,
      totalAmount,
      isCartOpen,
      setIsCartOpen,
      quickViewProduct,
      setQuickViewProduct,
      isSearchOpen,
      setIsSearchOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      applyCoupon,
      removeCoupon,
      refreshCart: fetchServerCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
