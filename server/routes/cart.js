const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { requireDurableStorage } = require('../middleware/storageGuard');
const { reconcileExpiredReservations } = require('./payments');

// GET /api/cart (Fetch user cart items with detailed product info)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (typeof reconcileExpiredReservations === 'function') {
      await reconcileExpiredReservations();
    }

    const items = db.prepare(`
      SELECT 
        ci.id as cart_item_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        ci.created_at,
        p.name,
        p.slug,
        p.price,
        p.mrp,
        p.discount_percent,
        p.fabric,
        p.stock_quantity as product_stock,
        pv.color_name as variant_color,
        pv.color_hex as variant_hex,
        pv.stock_quantity as variant_stock,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `).all(req.user.id);

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalMrp = items.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
    const totalSavings = totalMrp - subtotal;
    const freeDeliveryThreshold = 1999;
    const isFreeDelivery = subtotal >= freeDeliveryThreshold;
    const amountNeededForFreeDelivery = isFreeDelivery ? 0 : freeDeliveryThreshold - subtotal;

    res.json({
      items,
      summary: {
        itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
        uniqueCount: items.length,
        subtotal,
        totalMrp,
        totalSavings,
        freeDeliveryThreshold,
        isFreeDelivery,
        amountNeededForFreeDelivery,
        deliveryFee: isFreeDelivery ? 0 : (items.length > 0 ? 150 : 0)
      }
    });
  } catch (err) {
    console.error('Cart fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch cart.' });
  }
});

// POST /api/cart/add (Add product to cart or increment)
router.post('/add', authenticateToken, requireDurableStorage, async (req, res) => {
  try {
    if (typeof reconcileExpiredReservations === 'function') {
      await reconcileExpiredReservations();
    }

    const { product_id, variant_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer.' });
    }

    const product = db.prepare('SELECT id, name, stock_quantity FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    let variant = null;
    if (variant_id) {
      variant = db.prepare('SELECT id, product_id, color_name, stock_quantity FROM product_variants WHERE id = ?').get(variant_id);
      if (!variant || variant.product_id !== product.id) {
        return res.status(400).json({ error: 'Invalid product variant.' });
      }
    }

    const existing = db.prepare(`
      SELECT id, quantity FROM cart_items
      WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
    `).get(req.user.id, product_id, variant_id || null, variant_id || null);

    const totalRequestedQty = (existing ? existing.quantity : 0) + quantity;

    if (product.stock_quantity < totalRequestedQty) {
      return res.status(400).json({
        error: `Selected quantity exceeds available stock for "${product.name}". Only ${product.stock_quantity} available.`
      });
    }

    if (variant && variant.stock_quantity < totalRequestedQty) {
      return res.status(400).json({
        error: `Selected quantity exceeds available stock for "${product.name} (${variant.color_name})". Only ${variant.stock_quantity} available.`
      });
    }

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(totalRequestedQty, existing.id);
    } else {
      db.prepare(`
        INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
        VALUES (?, ?, ?, ?)
      `).run(req.user.id, product_id, variant_id || null, quantity);
    }

    res.json({ message: 'Saree added to your shopping bag.' });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Failed to add item to cart.' });
  }
});

// PUT /api/cart/update (Update quantity)
router.put('/update', authenticateToken, requireDurableStorage, async (req, res) => {
  try {
    if (typeof reconcileExpiredReservations === 'function') {
      await reconcileExpiredReservations();
    }

    const { cart_item_id, quantity } = req.body;

    if (!cart_item_id || quantity === undefined) {
      return res.status(400).json({ error: 'Cart item ID and quantity are required.' });
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a valid non-negative integer.' });
    }

    if (quantity === 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(cart_item_id, req.user.id);
      return res.json({ message: 'Item removed from bag.' });
    }

    const item = db.prepare(`
      SELECT ci.id, ci.product_id, ci.variant_id, p.name, p.stock_quantity as product_stock, pv.color_name as variant_name, pv.stock_quantity as variant_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.id = ? AND ci.user_id = ?
    `).get(cart_item_id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    if (item.product_stock < quantity) {
      return res.status(400).json({
        error: `Selected quantity exceeds available stock for "${item.name}". Only ${item.product_stock} available.`
      });
    }

    if (item.variant_id && item.variant_stock !== null && item.variant_stock !== undefined && item.variant_stock < quantity) {
      return res.status(400).json({
        error: `Selected quantity exceeds available stock for "${item.name} (${item.variant_name})". Only ${item.variant_stock} available.`
      });
    }

    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?')
      .run(quantity, cart_item_id, req.user.id);

    res.json({ message: 'Bag updated.' });
  } catch (err) {
    console.error('Cart update error:', err);
    res.status(500).json({ error: 'Failed to update cart.' });
  }
});

// DELETE /api/cart/remove/:id (Remove item)
router.delete('/remove/:id', authenticateToken, requireDurableStorage, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Item removed from bag.' });
  } catch (err) {
    console.error('Cart delete error:', err);
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

// DELETE /api/cart/clear (Clear all cart items)
router.delete('/clear', authenticateToken, requireDurableStorage, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Shopping bag cleared.' });
  } catch (err) {
    console.error('Cart clear error:', err);
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

// POST /api/cart/sync (Merge client guest cart into user database cart)
router.post('/sync', authenticateToken, requireDurableStorage, (req, res) => {
  try {
    const { items = [] } = req.body;

    for (const item of items) {
      if (!item || !item.product_id) continue;
      const qty = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      
      const prod = db.prepare('SELECT id, stock_quantity FROM products WHERE id = ?').get(item.product_id);
      if (!prod || prod.stock_quantity <= 0) continue;

      let variant = null;
      if (item.variant_id) {
        variant = db.prepare('SELECT id, product_id, stock_quantity FROM product_variants WHERE id = ?').get(item.variant_id);
        if (!variant || variant.product_id !== prod.id || variant.stock_quantity <= 0) continue;
      }

      const maxAvailable = Math.min(prod.stock_quantity, variant ? variant.stock_quantity : Infinity);

      const existing = db.prepare(`
        SELECT id, quantity FROM cart_items
        WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `).get(req.user.id, item.product_id, item.variant_id || null, item.variant_id || null);

      if (existing) {
        const newQty = Math.min(maxAvailable, existing.quantity + qty);
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
      } else {
        const newQty = Math.min(maxAvailable, qty);
        db.prepare(`
          INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
          VALUES (?, ?, ?, ?)
        `).run(req.user.id, item.product_id, item.variant_id || null, newQty);
      }
    }

    res.json({ message: 'Cart synchronized successfully.' });
  } catch (err) {
    console.error('Cart sync error:', err);
    res.status(500).json({ error: 'Failed to sync cart.' });
  }
});

module.exports = router;
