const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { requireDurableStorage } = require('../middleware/storageGuard');
const { getMetaForRoute, injectMetaTags } = require('../services/seoRenderer');

function publishProductRoute(productData) {
  try {
    const slug = productData?.slug;
    if (!slug) return;

    // 1. Update server/data/catalog.json if available
    const catalogPath = productData?.catalogPath || process.env.CATALOG_PATH || path.join(__dirname, '..', 'data', 'catalog.json');
    const shouldUpdateCatalog = (process.env.NODE_ENV !== 'test' || Boolean(productData?.catalogPath || process.env.CATALOG_PATH)) && fs.existsSync(catalogPath);
    if (shouldUpdateCatalog) {
      try {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (!Array.isArray(catalog.products)) {
          catalog.products = [];
        }
        const existingIdx = catalog.products.findIndex(p => p.slug === slug);
        const existingItem = existingIdx >= 0 ? catalog.products[existingIdx] : null;

        // Resolve images: if productData.images provided with items, use it; otherwise preserve existing catalog images or primary_image
        let resolvedImages;
        if (Array.isArray(productData.images) && productData.images.length > 0) {
          resolvedImages = productData.images.map(img => typeof img === 'string' ? img : img.image_url).filter(Boolean);
        } else if (existingItem && Array.isArray(existingItem.images) && existingItem.images.length > 0) {
          resolvedImages = existingItem.images;
        } else if (productData.primary_image) {
          resolvedImages = [productData.primary_image];
        } else if (existingItem?.primary_image) {
          resolvedImages = [existingItem.primary_image];
        } else {
          resolvedImages = ['/images/categories/banarasi.jpg'];
        }

        const resolvedPrimary = productData.primary_image
          || (Array.isArray(productData.images) && productData.images.length > 0 ? resolvedImages[0] : null)
          || existingItem?.primary_image
          || resolvedImages[0]
          || '/images/categories/banarasi.jpg';

        const entry = {
          name: productData.name,
          slug: slug,
          tagline: productData.tagline || '',
          description: productData.description || productData.name,
          short_desc: productData.short_desc || productData.name,
          price: parseInt(productData.price, 10),
          mrp: parseInt(productData.mrp, 10),
          category_slug: productData.category_slug || 'banarasi',
          fabric: productData.fabric,
          occasion: productData.occasion,
          primary_image: resolvedPrimary,
          images: resolvedImages
        };
        if (existingIdx >= 0) {
          catalog.products[existingIdx] = { ...catalog.products[existingIdx], ...entry };
        } else {
          catalog.products.push(entry);
        }
        fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
      } catch (catErr) {
        console.warn('Could not update catalog.json for published product:', catErr.message);
      }
    }

    // 2. Publish prerendered static route file if client/dist exists
    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    const indexHtmlPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      const templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      const meta = getMetaForRoute(`/sarees/${slug}`);
      const renderedHtml = injectMetaTags(templateHtml, meta);

      const writeRoute = (routePath) => {
        const cleanRoute = routePath.replace(/^\//, '').replace(/\/$/, '');
        const targetDir = path.join(clientDist, cleanRoute);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'index.html'), renderedHtml, 'utf8');
      };

      writeRoute(`/sarees/${slug}`);
      writeRoute(`/product/${slug}`);
    }
  } catch (err) {
    console.warn('Publish product route warning:', err.message);
  }
}

function unpublishProductRoute(slug) {
  try {
    if (!slug) return;
    const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
    if (process.env.NODE_ENV !== 'test' && fs.existsSync(catalogPath)) {
      try {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (Array.isArray(catalog.products)) {
          catalog.products = catalog.products.filter(p => p.slug !== slug);
          fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
        }
      } catch (e) {}
    }

    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    const removeDir = (routePath) => {
      const cleanRoute = routePath.replace(/^\//, '').replace(/\/$/, '');
      const targetDir = path.join(clientDist, cleanRoute);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    };
    removeDir(`/sarees/${slug}`);
    removeDir(`/product/${slug}`);
  } catch (e) {}
}

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
router.post('/products', requireDurableStorage, (req, res) => {
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

    // Publish route statically to catalog.json and client/dist if present
    const catRow = db.prepare('SELECT slug FROM categories WHERE id = ?').get(category_id);
    publishProductRoute({
      name: name.trim(),
      slug,
      tagline,
      description,
      short_desc,
      category_slug: catRow?.slug || 'banarasi',
      fabric,
      occasion,
      price,
      mrp,
      primary_image: (images && images[0]) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85',
      images
    });

    res.status(201).json({ message: '✨ Saree created successfully in PALLUVO catalog.', productId: prodId, slug });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/admin/products/:id (Update saree)
router.put('/products/:id', requireDurableStorage, (req, res) => {
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

    const updatedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (updatedProd) {
      const catRow = db.prepare('SELECT slug FROM categories WHERE id = ?').get(updatedProd.category_id);
      const persistedImages = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC')
        .all(req.params.id)
        .map(r => r.image_url);

      const resolvedImages = (images && Array.isArray(images))
        ? images.map(img => typeof img === 'string' ? img : img.image_url).filter(Boolean)
        : persistedImages;

      publishProductRoute({
        ...updatedProd,
        category_slug: catRow?.slug || 'banarasi',
        primary_image: resolvedImages[0],
        images: resolvedImages
      });
    }

    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', requireDurableStorage, (req, res) => {
  try {
    const prod = db.prepare('SELECT slug FROM products WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (prod && prod.slug) {
      unpublishProductRoute(prod.slug);
    }
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
router.put('/orders/:id/status', requireDurableStorage, (req, res) => {
  try {
    const { status, tracking_number, courier_partner, estimated_delivery } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Order status is required.' });
    }

    const isExplicitCarrier = courier_partner !== undefined && courier_partner !== null && String(courier_partner).trim() !== '';

    db.prepare(`
      UPDATE orders SET
        status = ?,
        tracking_number = COALESCE(?, tracking_number),
        courier_partner = COALESCE(?, courier_partner),
        estimated_delivery = COALESCE(?, estimated_delivery),
        carrier_assigned_explicitly = CASE WHEN ? = 1 THEN 1 ELSE carrier_assigned_explicitly END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, tracking_number, courier_partner, estimated_delivery, isExplicitCarrier ? 1 : 0, req.params.id);

    if (isExplicitCarrier) {
      try {
        const ord = db.prepare('SELECT order_number FROM orders WHERE id = ?').get(req.params.id);
        if (ord && ord.order_number) {
          const operatorId = req.user && req.user.id != null ? String(req.user.id) : (req.user?.email || 'admin');
          db.prepare(`
            INSERT INTO carrier_assignment_audit (order_number, courier_partner, assigned_by, evidence_source)
            VALUES (?, ?, ?, 'admin-dashboard-status-update')
          `).run(ord.order_number, courier_partner, operatorId);
        }
      } catch (e) {}
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ message: `Order status updated to "${status}".`, order: updated });
  } catch (err) {
    console.error('Admin update order error:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// POST /api/admin/orders/recover-carriers (Operator recovery path for verified carrier assignments)
router.post('/orders/recover-carriers', requireDurableStorage, (req, res) => {
  try {
    const { recovery_batches } = req.body;
    if (!Array.isArray(recovery_batches) || recovery_batches.length === 0) {
      return res.status(400).json({ error: 'recovery_batches must be a non-empty array of verified order carrier records.' });
    }

    // Derive operator identity strictly from authenticated admin session (stable user ID), ignoring caller-supplied identities
    const operatorId = req.user && req.user.id != null
      ? String(req.user.id)
      : (req.user && req.user.email ? String(req.user.email) : null);
    if (!operatorId) {
      return res.status(401).json({ error: 'Authenticated admin session is required to perform recovery.' });
    }

    // Strictly validate that each record supplies a non-blank evidence_source and attribute strictly to authenticated admin
    for (const rec of recovery_batches) {
      if (!rec || !rec.order_number) {
        return res.status(400).json({ error: 'Each recovery record must specify an order_number.' });
      }
      const evidence = rec.evidence_source && typeof rec.evidence_source === 'string' ? rec.evidence_source.trim() : '';
      if (!evidence) {
        return res.status(400).json({ error: `Order ${rec.order_number}: Verified evidence_source is required and cannot be blank.` });
      }
      rec.evidence_source = evidence;
      rec.verified_by = operatorId; // Enforce authenticated admin ID, ignore caller-supplied identities
    }

    const results = db.recoverCarrierAssignmentsWithVerifiedEvidence(recovery_batches, db);
    // Reject request if any records failed validation to prevent committing partially failed batches
    if (results.errors.length > 0) {
      return res.status(400).json({
        error: 'Batch recovery aborted. All records in the batch must be valid and verified.',
        ...results
      });
    }

    res.json({
      message: `Recovered ${results.recovered.length} carrier assignments with verified operator evidence.`,
      ...results
    });
  } catch (err) {
    console.error('Operator carrier recovery error:', err);
    res.status(500).json({ error: 'Failed to recover carrier assignments.' });
  }
});

// POST /api/admin/orders/:id/verify-carrier (Operator single-order carrier verification with durable audit)
router.post('/orders/:id/verify-carrier', requireDurableStorage, (req, res) => {
  try {
    const { courier_partner, evidence_source, notes } = req.body;
    const ord = db.prepare('SELECT id, order_number, courier_partner FROM orders WHERE id = ?').get(req.params.id);
    if (!ord) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const evidence = (evidence_source || notes || '').trim();
    if (!evidence) {
      return res.status(400).json({ error: 'Verified evidence_source is required and cannot be blank.' });
    }

    // Derive operator identity strictly from authenticated admin session (stable user ID), ignoring caller-supplied identities
    const operatorId = req.user && req.user.id != null
      ? String(req.user.id)
      : (req.user && req.user.email ? String(req.user.email) : null);
    if (!operatorId) {
      return res.status(401).json({ error: 'Authenticated admin session is required to perform recovery.' });
    }

    const courier = (courier_partner || ord.courier_partner || '').trim();
    if (!courier) {
      return res.status(400).json({ error: 'courier_partner must be specified or present on the order.' });
    }

    const results = db.recoverCarrierAssignmentsWithVerifiedEvidence([{
      order_number: ord.order_number,
      courier_partner: courier,
      evidence_source: evidence,
      verified_by: operatorId // Enforce authenticated admin ID, ignore caller-supplied identities
    }], db);

    if (results.errors.length > 0) {
      return res.status(400).json({ error: results.errors[0], results });
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ message: 'Carrier assignment verified and recorded in audit log.', order: updated, results });
  } catch (err) {
    console.error('Admin verify carrier error:', err);
    res.status(500).json({ error: 'Failed to verify carrier assignment.' });
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
router.put('/inventory/:id', requireDurableStorage, (req, res) => {
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
router.post('/coupons', requireDurableStorage, (req, res) => {
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
router.put('/coupons/:id/toggle', requireDurableStorage, (req, res) => {
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
router.delete('/coupons/:id', requireDurableStorage, (req, res) => {
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

router.publishProductRoute = publishProductRoute;
router.unpublishProductRoute = unpublishProductRoute;

module.exports = router;
