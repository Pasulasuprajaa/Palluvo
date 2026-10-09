const bcrypt = require('bcryptjs');
const db = require('../db/database');

// CLI script for out-of-band production admin provisioning
const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;
const name = process.argv[4] || process.env.ADMIN_NAME || 'PALLUVO Administrator';

if (!email || !password) {
  console.error('Usage: node server/scripts/createAdmin.js <email> <password> [name]');
  console.error('Or set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME environment variables.');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Error: Administrator password must be at least 8 characters long.');
  process.exit(1);
}

const cleanEmail = email.trim().toLowerCase();
const passwordHash = bcrypt.hashSync(password, 12);

try {
  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    db.prepare('UPDATE users SET role = ?, password_hash = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('admin', passwordHash, name, existing.id);
    console.log(`✅ User ${cleanEmail} updated to Administrator.`);
  } else {
    db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run(name, cleanEmail, passwordHash, null);
    console.log(`✅ Administrator account ${cleanEmail} created successfully.`);
  }
} catch (err) {
  console.error('Failed to provision administrator:', err.message);
  process.exit(1);
}
