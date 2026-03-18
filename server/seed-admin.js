'use strict';
/**
 * Run once to create the default admin account.
 * Usage:  node server/seed-admin.js
 */
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('foreign_keys = ON');

const USERNAME = 'admin';
const PASSWORD = '9797@97';
const NAME     = 'Admin';

// Check if admin already exists
const existing = db.prepare('SELECT id, is_admin FROM users WHERE lower(username) = lower(?)').get(USERNAME);

if (existing) {
  if (!existing.is_admin) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
    console.log(`✅ Existing user "${USERNAME}" promoted to admin.`);
  } else {
    console.log(`ℹ️  Admin user "${USERNAME}" already exists — updating password.`);
  }
  // Always refresh the password hash
  const hash = bcrypt.hashSync(PASSWORD, 10);
  db.prepare('UPDATE users SET passcode_hash = ? WHERE id = ?').run(hash, existing.id);
  console.log('✅ Password updated.');
} else {
  const hash = bcrypt.hashSync(PASSWORD, 10);

  // Ensure schema has passcode_hash column (safety)
  const cols = db.pragma('table_info(users)').map(c => c.name);
  const email = `admin_${Date.now()}@noemail.local`;

  db.prepare(`
    INSERT INTO users (username, name, email, passcode_hash, has_face, has_voice, is_admin, language_preference)
    VALUES (?, ?, ?, ?, 0, 0, 1, 'en-US')
  `).run(USERNAME, NAME, email, hash);

  console.log(`✅ Admin user created — username: "${USERNAME}", password: "${PASSWORD}"`);
}

db.close();
