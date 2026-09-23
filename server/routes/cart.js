const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/cart (Fetch user cart items with detailed product info)
router.get('/', authenticateToken, (req, res) => {
  try {
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
router.post('/add', authenticateToken, (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const product = db.prepare('SELECT id, name, stock_quantity FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Selected quantity exceeds available stock.' });
    }

    const existing = db.prepare(`
      SELECT id, quantity FROM cart_items
      WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
    `).get(req.user.id, product_id, variant_id || null, variant_id || null);

    if (existing) {
      const newQty = existing.quantity + quantity;
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
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
router.put('/update', authenticateToken, (req, res) => {
  try {
    const { cart_item_id, quantity } = req.body;

    if (!cart_item_id || quantity === undefined) {
      return res.status(400).json({ error: 'Cart item ID and quantity are required.' });
    }

    if (quantity <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(cart_item_id, req.user.id);
      return res.json({ message: 'Item removed from bag.' });
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
router.delete('/remove/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Item removed from bag.' });
  } catch (err) {
    console.error('Cart delete error:', err);
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

// DELETE /api/cart/clear (Clear all cart items)
router.delete('/clear', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Shopping bag cleared.' });
  } catch (err) {
    console.error('Cart clear error:', err);
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

// POST /api/cart/sync (Merge client guest cart into user database cart)
router.post('/sync', authenticateToken, (req, res) => {
  try {
    const { items = [] } = req.body;

    for (const item of items) {
      if (item.product_id) {
        const existing = db.prepare(`
          SELECT id, quantity FROM cart_items
          WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
        `).get(req.user.id, item.product_id, item.variant_id || null, item.variant_id || null);

        if (existing) {
          db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?')
            .run(item.quantity || 1, existing.id);
        } else {
          db.prepare(`
            INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
            VALUES (?, ?, ?, ?)
          `).run(req.user.id, item.product_id, item.variant_id || null, item.quantity || 1);
        }
      }
    }

    res.json({ message: 'Cart synchronized successfully.' });
  } catch (err) {
    console.error('Cart sync error:', err);
    res.status(500).json({ error: 'Failed to sync cart.' });
  }
});

module.exports = router;
