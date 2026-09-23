const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(authenticateToken, requireAdmin);

// GET /api/admin/stats (Dashboard overview analytics)
router.get('/stats', (req, res) => {
  try {
    const totalSalesRow = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'Paid'").get();
    const totalSales = totalSalesRow.total || 0;

    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 10').get().count;

    // Recent 5 Orders
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.created_at, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all();

    // Orders by Category
    const categoryBreakdown = db.prepare(`
      SELECT c.name, COUNT(oi.id) as units_sold, SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY revenue DESC
    `).all();

    // Top Selling Sarees
    const topProducts = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.stock_quantity,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url,
        SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `).all();

    res.json({
      metrics: {
        totalSales,
        totalOrders,
        totalCustomers,
        totalProducts,
        lowStockCount,
        avgOrderValue: totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0
      },
      recentOrders,
      categoryBreakdown,
      topProducts
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

// GET /api/admin/products (List all products with full attributes)
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `).all();

    const formatted = products.map(p => {
      const images = db.prepare('SELECT id, image_url, is_primary, display_order FROM product_images WHERE product_id = ? ORDER BY display_order ASC').all(p.id);
      const variants = db.prepare('SELECT id, color_name, color_hex, stock_quantity, sku FROM product_variants WHERE product_id = ?').all(p.id);
      return { ...p, images, variants };
    });

    res.json({ products: formatted });
  } catch (err) {
    console.error('Admin products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// POST /api/admin/products (Create new saree product)
router.post('/products', (req, res) => {
  try {
    const {
      name,
      tagline,
      description,
      short_desc,
      category_id,
      fabric,
      occasion,
      pattern,
      saree_length = '5.5 Meters',
      blouse_length = '0.8 Meter Unstitched Piece Included',
      care_instructions = 'Dry Clean Only. Store wrapped in muslin cloth.',
      price,
      mrp,
      stock_quantity = 20,
      sku,
      is_featured = 0,
      is_new_arrival = 1,
      is_best_seller = 0,
      color_name = 'Burgundy Red',
      color_hex = '#5B1425',
      images = [],
      variants = []
    } = req.body;

    if (!name || !price || !mrp || !category_id || !fabric || !occasion) {
      return res.status(400).json({ error: 'Please fill all required product fields.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    const discount_percent = Math.round(((mrp - price) / mrp) * 100);

    const insert = db.prepare(`
      INSERT INTO products (
        name, slug, tagline, description, short_desc, category_id, fabric, occasion, pattern,
        saree_length, blouse_length, care_instructions, price, mrp, discount_percent, stock_quantity,
        sku, is_featured, is_new_arrival, is_best_seller, color_name, color_hex
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      slug,
      tagline || null,
      description || name,
      short_desc || tagline || name,
      category_id,
      fabric,
      occasion,
      pattern || 'Zari Handloom',
      saree_length,
      blouse_length,
      care_instructions,
      parseInt(price),
      parseInt(mrp),
      discount_percent,
      parseInt(stock_quantity),
      sku || 'PAL-' + Math.floor(1000 + Math.random() * 9000),
      is_featured ? 1 : 0,
      is_new_arrival ? 1 : 0,
      is_best_seller ? 1 : 0,
      color_name,
      color_hex
    );

    const prodId = result.lastInsertRowid;

    // Insert Images
    if (images && images.length > 0) {
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)');
      images.forEach((url, idx) => {
        if (url && url.trim()) {
          insertImg.run(prodId, url.trim(), idx === 0 ? 1 : 0, idx + 1);
        }
      });
    } else {
      // Default fallback luxury image
      db.prepare('INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, 1, 1)')
        .run(prodId, 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85');
    }

    // Insert Variants
    if (variants && variants.length > 0) {
      const insertVar = db.prepare('INSERT INTO product_variants (product_id, color_name, color_hex, stock_quantity, sku) VALUES (?, ?, ?, ?, ?)');
      variants.forEach(v => {
        if (v.color_name) {
          insertVar.run(prodId, v.color_name, v.color_hex || '#5B1425', v.stock_quantity || 10, v.sku || null);
        }
      });
    }

    res.status(201).json({ message: '✨ Saree created successfully in PALLUVO catalog.', productId: prodId, slug });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/admin/products/:id (Update saree)
router.put('/products/:id', (req, res) => {
  try {
    const {
      name, tagline, description, short_desc, category_id, fabric, occasion, pattern,
      saree_length, blouse_length, care_instructions, price, mrp, stock_quantity,
      is_featured, is_new_arrival, is_best_seller, color_name, color_hex, images, variants
    } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const updatedPrice = price !== undefined ? parseInt(price) : existing.price;
    const updatedMrp = mrp !== undefined ? parseInt(mrp) : existing.mrp;
    const discount_percent = Math.round(((updatedMrp - updatedPrice) / updatedMrp) * 100);

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        short_desc = COALESCE(?, short_desc),
        category_id = COALESCE(?, category_id),
        fabric = COALESCE(?, fabric),
        occasion = COALESCE(?, occasion),
        pattern = COALESCE(?, pattern),
        saree_length = COALESCE(?, saree_length),
        blouse_length = COALESCE(?, blouse_length),
        care_instructions = COALESCE(?, care_instructions),
        price = ?,
        mrp = ?,
        discount_percent = ?,
        stock_quantity = COALESCE(?, stock_quantity),
        is_featured = COALESCE(?, is_featured),
        is_new_arrival = COALESCE(?, is_new_arrival),
        is_best_seller = COALESCE(?, is_best_seller),
        color_name = COALESCE(?, color_name),
        color_hex = COALESCE(?, color_hex),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, tagline, description, short_desc, category_id, fabric, occasion, pattern,
      saree_length, blouse_length, care_instructions, updatedPrice, updatedMrp, discount_percent,
      stock_quantity !== undefined ? parseInt(stock_quantity) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_new_arrival !== undefined ? (is_new_arrival ? 1 : 0) : null,
      is_best_seller !== undefined ? (is_best_seller ? 1 : 0) : null,
      color_name, color_hex,
      req.params.id
    );

    // Update images if provided
    if (images && Array.isArray(images)) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(req.params.id);
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)');
      images.forEach((url, idx) => {
        if (url && typeof url === 'string') {
          insertImg.run(req.params.id, url, idx === 0 ? 1 : 0, idx + 1);
        } else if (url && url.image_url) {
          insertImg.run(req.params.id, url.image_url, idx === 0 ? 1 : 0, idx + 1);
        }
      });
    }

    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Admin delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// GET /api/admin/orders (List all orders with customer & items)
router.get('/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `).all();

    const formatted = orders.map(o => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
      let address = {};
      try {
        address = JSON.parse(o.address_data);
      } catch (e) {
        address = { raw: o.address_data };
      }
      return { ...o, items, address };
    });

    res.json({ orders: formatted });
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// PUT /api/admin/orders/:id/status (Update order lifecycle status)
router.put('/orders/:id/status', (req, res) => {
  try {
    const { status, tracking_number, courier_partner, estimated_delivery } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Order status is required.' });
    }

    db.prepare(`
      UPDATE orders SET
        status = ?,
        tracking_number = COALESCE(?, tracking_number),
        courier_partner = COALESCE(?, courier_partner),
        estimated_delivery = COALESCE(?, estimated_delivery),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, tracking_number, courier_partner, estimated_delivery, req.params.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ message: `Order status updated to "${status}".`, order: updated });
  } catch (err) {
    console.error('Admin update order error:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// GET /api/admin/inventory
router.get('/inventory', (req, res) => {
  try {
    const inventory = db.prepare(`
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.price, p.fabric, c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image,
        CASE
          WHEN p.stock_quantity = 0 THEN 'Out of Stock'
          WHEN p.stock_quantity <= 10 THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC
    `).all();

    res.json({ inventory });
  } catch (err) {
    console.error('Admin inventory error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory.' });
  }
});

// PUT /api/admin/inventory/:id
router.put('/inventory/:id', (req, res) => {
  try {
    const { stock_quantity } = req.body;
    if (stock_quantity === undefined || stock_quantity < 0) {
      return res.status(400).json({ error: 'Valid non-negative stock quantity required.' });
    }

    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(parseInt(stock_quantity), req.params.id);

    res.json({ message: 'Stock quantity updated successfully.' });
  } catch (err) {
    console.error('Admin inventory update error:', err);
    res.status(500).json({ error: 'Failed to update stock.' });
  }
});

// GET /api/admin/coupons
router.get('/coupons', (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
    res.json({ coupons });
  } catch (err) {
    console.error('Admin coupons error:', err);
    res.status(500).json({ error: 'Failed to fetch coupons.' });
  }
});

// POST /api/admin/coupons
router.post('/coupons', (req, res) => {
  try {
    const { code, title, description, discount_percent, max_discount_amount = 2000, min_order_amount = 1999, expiry_date, usage_limit = 1000 } = req.body;

    if (!code || !title || !discount_percent) {
      return res.status(400).json({ error: 'Coupon code, title, and discount percentage are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM coupons WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Coupon code "${cleanCode}" already exists.` });
    }

    db.prepare(`
      INSERT INTO coupons (code, title, description, discount_percent, max_discount_amount, min_order_amount, expiry_date, usage_limit, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      cleanCode,
      title.trim(),
      description || null,
      parseInt(discount_percent),
      parseInt(max_discount_amount),
      parseInt(min_order_amount),
      expiry_date || '2027-12-31',
      parseInt(usage_limit)
    );

    res.status(201).json({ message: `Coupon "${cleanCode}" created successfully.` });
  } catch (err) {
    console.error('Admin create coupon error:', err);
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
});

// PUT /api/admin/coupons/:id/toggle
router.put('/coupons/:id/toggle', (req, res) => {
  try {
    const coupon = db.prepare('SELECT is_active FROM coupons WHERE id = ?').get(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    const newStatus = coupon.is_active ? 0 : 1;
    db.prepare('UPDATE coupons SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ message: `Coupon ${newStatus ? 'activated' : 'deactivated'}.` });
  } catch (err) {
    console.error('Admin toggle coupon error:', err);
    res.status(500).json({ error: 'Failed to toggle coupon.' });
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    console.error('Admin delete coupon error:', err);
    res.status(500).json({ error: 'Failed to delete coupon.' });
  }
});

// GET /api/admin/customers
router.get('/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.payment_status = 'Paid' THEN o.total_amount ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY total_spent DESC, u.created_at DESC
    `).all();

    res.json({ customers });
  } catch (err) {
    console.error('Admin customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

module.exports = router;
