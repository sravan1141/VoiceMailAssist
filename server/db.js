'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Store database in server/data/ directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    username             TEXT,
    name                 TEXT    NOT NULL,
    email                TEXT,
    passcode_hash        TEXT,
    google_access_token  TEXT,
    google_refresh_token TEXT,
    google_token_expiry  INTEGER,
    has_face             INTEGER NOT NULL DEFAULT 0,
    has_voice            INTEGER NOT NULL DEFAULT 0,
    language_preference  TEXT    DEFAULT 'en-US',
    created_at           INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS user_gmails (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_address        TEXT    NOT NULL,
    google_access_token  TEXT,
    google_refresh_token TEXT,
    google_token_expiry  INTEGER,
    label                TEXT    DEFAULT 'Personal',
    created_at           INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(user_id, gmail_address)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 TEXT    NOT NULL,
    phone_number         TEXT,
    email                TEXT,
    created_at           INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id           INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    phone_number         TEXT    NOT NULL,
    message_text         TEXT,
    direction            TEXT    NOT NULL,
    timestamp            INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    media_url            TEXT,
    whatsapp_message_id  TEXT
  );

  CREATE TABLE IF NOT EXISTS telegram_messages (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id           INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    telegram_chat_id     TEXT    NOT NULL,
    message_text         TEXT,
    direction            TEXT    NOT NULL,
    timestamp            INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    telegram_message_id  TEXT
  );
`);

// ─── Migrations: add new columns if they don't exist ─────────────────────────
const userCols = db.pragma('table_info(users)').map((c) => c.name);

if (!userCols.includes('face_descriptor'))
  db.exec('ALTER TABLE users ADD COLUMN face_descriptor TEXT;');
if (!userCols.includes('voice_fingerprint'))
  db.exec('ALTER TABLE users ADD COLUMN voice_fingerprint TEXT;');
if (!userCols.includes('language_preference'))
  db.exec('ALTER TABLE users ADD COLUMN language_preference TEXT DEFAULT \'en-US\';');
// 'username' added WITHOUT UNIQUE in ALTER TABLE — UNIQUE enforced via index below
if (!userCols.includes('username'))
  db.exec('ALTER TABLE users ADD COLUMN username TEXT;');
// If email was previously the primary key concept, 'email' already exists — skip
if (!userCols.includes('email'))
  db.exec('ALTER TABLE users ADD COLUMN email TEXT;');

const contactCols = db.pragma('table_info(contacts)').map((c) => c.name);
if (!contactCols.includes('is_starred'))
  db.exec('ALTER TABLE contacts ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0;');
if (!contactCols.includes('telegram_chat_id'))
  db.exec('ALTER TABLE contacts ADD COLUMN telegram_chat_id TEXT;');

if (!userCols.includes('is_admin'))
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;');

// Create unique index on username (safe to run multiple times)
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(lower(username)) WHERE username IS NOT NULL;`);

// Backfill username from name for existing rows that lack one
// Only run this for users that don't have a username at all
const backfillResult = db.prepare(`
  UPDATE users SET username = lower(replace(replace(name,' ','_'), '.', '_'))
  WHERE username IS NULL
`).run();

console.log(`Backfilled ${backfillResult.changes} users with usernames`);

// ─── Prepared statements ──────────────────────────────────────────────────────
const stmts = {
  findByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findByUsername: db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)'),
  findById: db.prepare('SELECT * FROM users WHERE id = ?'),

  insert: db.prepare(`
    INSERT INTO users (username, name, email, passcode_hash, google_access_token, google_refresh_token, google_token_expiry, has_face, has_voice, face_descriptor, voice_fingerprint, language_preference)
    VALUES (@username, @name, @email, @passcode_hash, @google_access_token, @google_refresh_token, @google_token_expiry, @has_face, @has_voice, @face_descriptor, @voice_fingerprint, @language_preference)
  `),

  updateTokens: db.prepare(`
    UPDATE users
    SET google_access_token = @google_access_token,
        google_refresh_token = @google_refresh_token,
        google_token_expiry  = @google_token_expiry
    WHERE id = @id
  `),

  saveBiometricData: db.prepare(`
    UPDATE users
    SET has_face         = @has_face,
        has_voice        = @has_voice,
        face_descriptor  = @face_descriptor,
        voice_fingerprint = @voice_fingerprint
    WHERE id = @id
  `),

  updateLanguage: db.prepare('UPDATE users SET language_preference = ? WHERE id = ?'),

  // ── user_gmails ──────────────────────────────────────────────────────────
  findGmailsByUser: db.prepare('SELECT * FROM user_gmails WHERE user_id = ? ORDER BY created_at ASC'),
  findGmailById: db.prepare('SELECT * FROM user_gmails WHERE id = ?'),
  findGmailByAddress: db.prepare('SELECT * FROM user_gmails WHERE user_id = ? AND lower(gmail_address) = lower(?)'),

  insertGmail: db.prepare(`
    INSERT INTO user_gmails (user_id, gmail_address, google_access_token, google_refresh_token, google_token_expiry, label)
    VALUES (@user_id, @gmail_address, @google_access_token, @google_refresh_token, @google_token_expiry, @label)
  `),

  upsertGmail: db.prepare(`
    INSERT INTO user_gmails (user_id, gmail_address, google_access_token, google_refresh_token, google_token_expiry, label)
    VALUES (@user_id, @gmail_address, @google_access_token, @google_refresh_token, @google_token_expiry, @label)
    ON CONFLICT(user_id, gmail_address) DO UPDATE SET
      google_access_token  = excluded.google_access_token,
      google_refresh_token = COALESCE(excluded.google_refresh_token, user_gmails.google_refresh_token),
      google_token_expiry  = excluded.google_token_expiry
  `),

  updateGmailTokens: db.prepare(`
    UPDATE user_gmails
    SET google_access_token  = @google_access_token,
        google_refresh_token = COALESCE(@google_refresh_token, google_refresh_token),
        google_token_expiry  = @google_token_expiry
    WHERE id = @id
  `),

  deleteGmail: db.prepare('DELETE FROM user_gmails WHERE id = ? AND user_id = ?'),
};

// ─── Exported API ─────────────────────────────────────────────────────────────
module.exports = {
  // ── users ──────────────────────────────────────────────────────────────────
  findByEmail: (email) => stmts.findByEmail.get(email),
  findByUsername: (username) => stmts.findByUsername.get(username),
  findById: (id) => stmts.findById.get(id),

  createUser: (data) => {
    const info = stmts.insert.run({
      username: data.username || null,
      name: data.name,
      email: data.email || `pending_${Date.now()}@noemail.local`,
      passcode_hash: data.passcode_hash || null,
      google_access_token: data.google_access_token || null,
      google_refresh_token: data.google_refresh_token || null,
      google_token_expiry: data.google_token_expiry || null,
      has_face: data.has_face ? 1 : 0,
      has_voice: data.has_voice ? 1 : 0,
      has_voice: data.has_voice ? 1 : 0,
      face_descriptor: data.face_descriptor || null,
      voice_fingerprint: data.voice_fingerprint || null,
      language_preference: data.language_preference || 'en-US',
    });
    return stmts.findById.get(info.lastInsertRowid);
  },

  updateLanguage: (id, lang) => stmts.updateLanguage.run(lang, id),

  updateTokens: (id, tokens) => stmts.updateTokens.run({
    id,
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token,
    google_token_expiry: tokens.expiry_date,
  }),

  saveBiometricData: (id, { hasFace, hasVoice, faceDescriptor, voiceFingerprint }) =>
    stmts.saveBiometricData.run({
      id,
      has_face: hasFace ? 1 : 0,
      has_voice: hasVoice ? 1 : 0,
      face_descriptor: faceDescriptor || null,
      voice_fingerprint: voiceFingerprint || null,
    }),

  // ── user_gmails ────────────────────────────────────────────────────────────
  findGmailsByUser: (userId) => stmts.findGmailsByUser.all(userId),
  findGmailById: (id) => stmts.findGmailById.get(id),
  findGmailByAddress: (userId, gmailAddress) => stmts.findGmailByAddress.get(userId, gmailAddress),

  // Add or update a Gmail account linked to a user
  upsertGmail: (userId, { gmailAddress, accessToken, refreshToken, expiryDate, label }) =>
    stmts.upsertGmail.run({
      user_id: userId,
      gmail_address: gmailAddress,
      google_access_token: accessToken || null,
      google_refresh_token: refreshToken || null,
      google_token_expiry: expiryDate || null,
      label: label || 'Personal',
    }),

  updateGmailTokens: (gmailId, { accessToken, refreshToken, expiryDate }) =>
    stmts.updateGmailTokens.run({
      id: gmailId,
      google_access_token: accessToken,
      google_refresh_token: refreshToken || null,
      google_token_expiry: expiryDate,
    }),

  removeGmail: (gmailId, userId) => stmts.deleteGmail.run(gmailId, userId),

  // ── contacts helpers ──────────────────────────────────────────────────
  findContactsByUser: (userId) => {
    return db.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC').all(userId);
  },
  findWhatsAppContactsByUser: (userId) => {
    return db.prepare('SELECT * FROM contacts WHERE user_id = ? AND phone_number IS NOT NULL AND phone_number != \'\' ORDER BY name ASC').all(userId);
  },
  findTelegramContactsByUser: (userId) => {
    return db.prepare('SELECT * FROM contacts WHERE user_id = ? AND telegram_chat_id IS NOT NULL AND telegram_chat_id != \'\' ORDER BY name ASC').all(userId);
  },
  findContactByName: (userId, name) => {
    return db.prepare('SELECT * FROM contacts WHERE user_id = ? AND lower(name) = lower(?)').get(userId, name);
  },
  upsertContact: (userId, name, phone_number, email, is_starred = 0) => {
    return db.prepare(`
      INSERT INTO contacts (user_id, name, phone_number, email, is_starred)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, name) DO UPDATE SET
        phone_number = excluded.phone_number,
        email = excluded.email,
        is_starred = coalesce(excluded.is_starred, is_starred)
    `).run(userId, name, phone_number, email, is_starred);
  },
  editContact: (userId, oldName, newName, newPhone, newEmail, isStarred) => {
    return db.prepare(`
      UPDATE contacts 
      SET name = ?, phone_number = ?, email = ?, is_starred = ?
      WHERE user_id = ? AND lower(name) = lower(?)
    `).run(newName, newPhone, newEmail, isStarred, userId, oldName);
  },
  updateContactById: (id, name, phone_number, email, is_starred) => {
    return db.prepare(`
      UPDATE contacts SET name = ?, phone_number = ?, email = ?, is_starred = ? WHERE id = ?
    `).run(name, phone_number, email, is_starred, id);
  },
  starContact: (userId, contactId, isStarred) => {
    return db.prepare('UPDATE contacts SET is_starred = ? WHERE user_id = ? AND id = ?').run(isStarred ? 1 : 0, userId, contactId);
  },
  deleteContact: (userId, contactId) => {
    return db.prepare('DELETE FROM contacts WHERE user_id = ? AND id = ?').run(userId, contactId);
  },
  deleteContactByName: (userId, name) => {
    return db.prepare('DELETE FROM contacts WHERE user_id = ? AND lower(name) = lower(?)').run(userId, name);
  },
  toggleStarByName: (userId, name, isStarred) => {
    return db.prepare('UPDATE contacts SET is_starred = ? WHERE user_id = ? AND lower(name) = lower(?)').run(isStarred ? 1 : 0, userId, name);
  },
  findContactsByPhoneNumber: (phoneNumber) => {
    // Attempt to match rightmost 10 digits for simplicity across region formats
    return db.prepare("SELECT * FROM contacts WHERE phone_number LIKE '%' || ?").all(phoneNumber.slice(-10));
  },

  // ── whatsapp messages helpers ──────────────────────────────────────────
  insertWhatsAppMessage: ({ userId, contactId, phoneNumber, messageText, direction, mediaUrl, whatsappMsgId }) => {
    const info = db.prepare(`
      INSERT INTO whatsapp_messages (user_id, contact_id, phone_number, message_text, direction, media_url, whatsapp_message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, contactId, phoneNumber, messageText, direction, mediaUrl, whatsappMsgId);
    return info.lastInsertRowid;
  },
  findWhatsAppConversations: (userId) => {
    return db.prepare(`
      SELECT m.*, c.name as contact_name
      FROM whatsapp_messages m
      LEFT JOIN contacts c ON m.contact_id = c.id
      WHERE m.user_id = ? AND m.id IN (
        SELECT MAX(id) FROM whatsapp_messages WHERE user_id = ? GROUP BY contact_id
      )
      ORDER BY m.timestamp DESC
    `).all(userId, userId);
  },
  findWhatsAppMessages: (userId, contactId) => {
    return db.prepare('SELECT * FROM whatsapp_messages WHERE user_id = ? AND contact_id = ? ORDER BY timestamp ASC').all(userId, contactId);
  },

  // ── telegram messages helpers ──────────────────────────────────────────
  insertTelegramMessage: ({ userId, contactId, telegramChatId, messageText, direction, telegramMsgId }) => {
    const info = db.prepare(`
      INSERT INTO telegram_messages (user_id, contact_id, telegram_chat_id, message_text, direction, telegram_message_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, contactId || null, telegramChatId, messageText, direction, telegramMsgId || null);
    return info.lastInsertRowid;
  },
  findTelegramConversations: (userId) => {
    return db.prepare(`
      SELECT m.*, c.name as contact_name
      FROM telegram_messages m
      LEFT JOIN contacts c ON m.contact_id = c.id
      WHERE m.user_id = ? AND m.id IN (
        SELECT MAX(id) FROM telegram_messages WHERE user_id = ? GROUP BY contact_id
      )
      ORDER BY m.timestamp DESC
    `).all(userId, userId);
  },
  findTelegramMessages: (userId, contactId) => {
    return db.prepare('SELECT * FROM telegram_messages WHERE user_id = ? AND contact_id = ? ORDER BY timestamp ASC').all(userId, contactId);
  },
  findContactsByTelegramChatId: (telegramChatId) => {
    return db.prepare("SELECT * FROM contacts WHERE telegram_chat_id = ?").all(String(telegramChatId));
  },
  setTelegramChatId: (userId, name, telegramChatId) => {
    return db.prepare('UPDATE contacts SET telegram_chat_id = ? WHERE user_id = ? AND lower(name) = lower(?)')
      .run(telegramChatId ? String(telegramChatId) : null, userId, name);
  },

  // ── admin helpers ──────────────────────────────────────────────────────────
  getAllUsersWithStats: () => {
    return db.prepare(`
      SELECT
        u.id, u.username, u.name, u.email, u.is_admin, u.created_at,
        u.has_face, u.has_voice, u.language_preference,
        (SELECT COUNT(*) FROM contacts c WHERE c.user_id = u.id) as contact_count,
        (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.user_id = u.id) as whatsapp_msg_count,
        (SELECT COUNT(*) FROM telegram_messages t WHERE t.user_id = u.id) as telegram_msg_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
  },
  getPlatformStats: () => {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const adminUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get().count;
    const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    const totalWhatsApp = db.prepare('SELECT COUNT(*) as count FROM whatsapp_messages').get().count;
    const totalTelegram = db.prepare('SELECT COUNT(*) as count FROM telegram_messages').get().count;
    const recentUsers = db.prepare(`
      SELECT id, username, name, email, created_at FROM users
      ORDER BY created_at DESC LIMIT 5
    `).all();
    return { totalUsers, adminUsers, totalContacts, totalWhatsApp, totalTelegram, recentUsers };
  },
  setAdminStatus: (userId, isAdmin) => {
    return db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(isAdmin, userId);
  },
  deleteUser: (userId) => {
    return db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  },

  getUserFullAnalytics: (userId) => {
    const user = db.prepare(`
      SELECT u.id, u.username, u.name, u.email, u.is_admin, u.created_at,
             u.has_face, u.has_voice, u.language_preference
      FROM users u WHERE u.id = ?
    `).get(userId);
    if (!user) return null;

    const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC').all(userId);
    const gmails   = db.prepare('SELECT id, gmail_address, label, created_at FROM user_gmails WHERE user_id = ?').all(userId);

    const whatsappSent = db.prepare(
      "SELECT COUNT(*) as count FROM whatsapp_messages WHERE user_id = ? AND direction = 'outbound'"
    ).get(userId).count;
    const whatsappRecv = db.prepare(
      "SELECT COUNT(*) as count FROM whatsapp_messages WHERE user_id = ? AND direction = 'inbound'"
    ).get(userId).count;
    const recentWhatsapp = db.prepare(
      'SELECT m.*, c.name as contact_name FROM whatsapp_messages m LEFT JOIN contacts c ON m.contact_id = c.id WHERE m.user_id = ? ORDER BY m.timestamp DESC LIMIT 10'
    ).all(userId);

    const telegramSent = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_messages WHERE user_id = ? AND direction = 'outbound'"
    ).get(userId).count;
    const telegramRecv = db.prepare(
      "SELECT COUNT(*) as count FROM telegram_messages WHERE user_id = ? AND direction = 'inbound'"
    ).get(userId).count;
    const recentTelegram = db.prepare(
      'SELECT m.*, c.name as contact_name FROM telegram_messages m LEFT JOIN contacts c ON m.contact_id = c.id WHERE m.user_id = ? ORDER BY m.timestamp DESC LIMIT 10'
    ).all(userId);

    return {
      ...user,
      gmails,
      contacts,
      whatsapp: { sent: whatsappSent, received: whatsappRecv, recent: recentWhatsapp },
      telegram: { sent: telegramSent, received: telegramRecv, recent: recentTelegram },
    };
  },

  getRecentActivity: (limit = 60) => {
    return db.prepare(`
      SELECT 'whatsapp' as platform, m.id, m.message_text, m.direction, m.timestamp,
             u.name as user_name, c.name as contact_name, m.user_id
      FROM whatsapp_messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN contacts c ON m.contact_id = c.id
      UNION ALL
      SELECT 'telegram' as platform, m.id, m.message_text, m.direction, m.timestamp,
             u.name as user_name, c.name as contact_name, m.user_id
      FROM telegram_messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN contacts c ON m.contact_id = c.id
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);
  },

  findById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
};
