const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/addresses
router.get('/', authenticateToken, (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT * FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(req.user.id);

    res.json({ addresses });
  } catch (err) {
    console.error('Addresses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch addresses.' });
  }
});

// POST /api/addresses (Create new address)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, phone, pincode, house_flat, area, city, state, landmark, address_type = 'home', is_default = 0 } = req.body;

    if (!name || !phone || !pincode || !house_flat || !area || !city || !state) {
      return res.status(400).json({ error: 'Please fill all required address fields.' });
    }

    // If marked default or first address, unset existing default
    const count = db.prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?').get(req.user.id).count;
    const shouldBeDefault = is_default || count === 0 ? 1 : 0;

    if (shouldBeDefault) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    const insert = db.prepare(`
      INSERT INTO addresses (user_id, name, phone, pincode, house_flat, area, city, state, landmark, address_type, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.user.id,
      name.trim(),
      phone.trim(),
      pincode.trim(),
      house_flat.trim(),
      area.trim(),
      city.trim(),
      state.trim(),
      landmark ? landmark.trim() : null,
      address_type,
      shouldBeDefault
    );

    const createdAddress = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Address saved successfully.', address: createdAddress });
  } catch (err) {
    console.error('Create address error:', err);
    res.status(500).json({ error: 'Failed to save address.' });
  }
});

// PUT /api/addresses/:id (Update address)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, phone, pincode, house_flat, area, city, state, landmark, address_type, is_default } = req.body;

    const existing = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Address not found.' });
    }

    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    db.prepare(`
      UPDATE addresses SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        pincode = COALESCE(?, pincode),
        house_flat = COALESCE(?, house_flat),
        area = COALESCE(?, area),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        landmark = COALESCE(?, landmark),
        address_type = COALESCE(?, address_type),
        is_default = COALESCE(?, is_default)
      WHERE id = ? AND user_id = ?
    `).run(
      name, phone, pincode, house_flat, area, city, state, landmark, address_type, is_default !== undefined ? (is_default ? 1 : 0) : null,
      req.params.id, req.user.id
    );

    const updated = db.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id);
    res.json({ message: 'Address updated.', address: updated });
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({ error: 'Failed to update address.' });
  }
});

// DELETE /api/addresses/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Address not found.' });
    }
    res.json({ message: 'Address deleted.' });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({ error: 'Failed to delete address.' });
  }
});

// PUT /api/addresses/:id/set-default
router.put('/:id/set-default', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Default address updated.' });
  } catch (err) {
    console.error('Set default address error:', err);
    res.status(500).json({ error: 'Failed to set default address.' });
  }
});

module.exports = router;
