'use strict';

const express = require('express');
const db = require('../db');
const telegramService = require('../services/telegram_service');

const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// ─── GET /api/telegram/status ─────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
    // Dynamically reload .env for better dev experience without server restart
    require('dotenv').config({ override: true });
    
    const isConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token_here');
    res.json({ configured: isConfigured });
});

// ─── POST /api/telegram/send ──────────────────────────────────────────────────
router.post('/send', requireAuth, async (req, res, next) => {
    try {
        const { contact_name, message } = req.body;
        if (!contact_name || !message) {
            return res.status(400).json({ error: 'contact_name and message are required.' });
        }

        const contact = db.findContactByName(req.user.id, contact_name);
        if (!contact) return res.status(404).json({ error: `Contact '${contact_name}' not found.` });
        if (!contact.telegram_chat_id) return res.status(400).json({ error: `Contact '${contact_name}' does not have a Telegram Chat ID.` });

        const result = await telegramService.sendMessage(contact.telegram_chat_id, message);
        const msgId = result?.message_id;

        db.insertTelegramMessage({
            userId: req.user.id,
            contactId: contact.id,
            telegramChatId: contact.telegram_chat_id,
            messageText: message,
            direction: 'sent',
            telegramMsgId: msgId ? String(msgId) : null
        });

        res.json({ ok: true, messageId: msgId });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/telegram/edit ──────────────────────────────────────────────────
router.post('/edit', requireAuth, async (req, res, next) => {
    try {
        const { contact_name, message_id, new_text } = req.body;
        if (!contact_name || !message_id || !new_text) {
            return res.status(400).json({ error: 'contact_name, message_id, and new_text are required.' });
        }

        const contact = db.findContactByName(req.user.id, contact_name);
        if (!contact || !contact.telegram_chat_id) return res.status(404).json({ error: `Contact '${contact_name}' not found or has no Telegram Chat ID.` });

        await telegramService.editMessage(contact.telegram_chat_id, parseInt(message_id), new_text);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/telegram/delete ────────────────────────────────────────────────
router.post('/delete', requireAuth, async (req, res, next) => {
    try {
        const { contact_name, message_id } = req.body;
        if (!contact_name || !message_id) {
            return res.status(400).json({ error: 'contact_name and message_id are required.' });
        }

        const contact = db.findContactByName(req.user.id, contact_name);
        if (!contact || !contact.telegram_chat_id) return res.status(404).json({ error: `Contact '${contact_name}' not found or has no Telegram Chat ID.` });

        await telegramService.deleteMessage(contact.telegram_chat_id, parseInt(message_id));
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/telegram/forward ───────────────────────────────────────────────
router.post('/forward', requireAuth, async (req, res, next) => {
    try {
        const { to_contact_name, from_contact_name, message_id } = req.body;
        if (!to_contact_name || !from_contact_name || !message_id) {
            return res.status(400).json({ error: 'to_contact_name, from_contact_name, and message_id are required.' });
        }
        const toContact = db.findContactByName(req.user.id, to_contact_name);
        const fromContact = db.findContactByName(req.user.id, from_contact_name);
        if (!toContact?.telegram_chat_id) return res.status(404).json({ error: `'${to_contact_name}' has no Telegram Chat ID.` });
        if (!fromContact?.telegram_chat_id) return res.status(404).json({ error: `'${from_contact_name}' has no Telegram Chat ID.` });

        const result = await telegramService.forwardMessage(toContact.telegram_chat_id, fromContact.telegram_chat_id, parseInt(message_id));
        res.json({ ok: true, messageId: result?.message_id });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/telegram/conversations ──────────────────────────────────────────
router.get('/conversations', requireAuth, (req, res, next) => {
    try {
        const conversations = db.findTelegramConversations(req.user.id);
        res.json({ ok: true, conversations });
    } catch (err) { next(err); }
});

// ─── GET /api/telegram/messages/:contactId ────────────────────────────────────
router.get('/messages/:contactId', requireAuth, (req, res, next) => {
    try {
        const messages = db.findTelegramMessages(req.user.id, req.params.contactId);
        res.json({ ok: true, messages });
    } catch (err) { next(err); }
});

// ─── GET & POST /api/telegram/contacts ────────────────────────────────────────
router.get('/contacts', requireAuth, (req, res, next) => {
    try {
        const contacts = db.findTelegramContactsByUser(req.user.id);
        res.json({ ok: true, contacts });
    } catch (err) { next(err); }
});

router.post('/contacts', requireAuth, (req, res, next) => {
    try {
        const { name, phone_number, email, is_starred, telegram_chat_id } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        db.upsertContact(req.user.id, name, phone_number, email, is_starred ? 1 : 0);
        // Update telegram_chat_id separately if provided
        if (telegram_chat_id !== undefined) {
            db.setTelegramChatId(req.user.id, name, telegram_chat_id);
        }
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.post('/contacts/edit', requireAuth, (req, res, next) => {
    try {
        const { old_name, new_name, phone_number, email, is_starred, telegram_chat_id } = req.body;
        if (!old_name || !new_name) return res.status(400).json({ error: 'Old name and new name are required' });

        // Find contact by name first to get its ID — avoids UNIQUE constraint on plain UPDATE
        const contact = db.findContactByName(req.user.id, old_name);
        if (!contact) return res.status(404).json({ error: `Contact '${old_name}' not found.` });

        // Update by primary key — no UNIQUE constraint conflicts possible
        db.updateContactById(
            contact.id,
            new_name,
            phone_number !== undefined ? phone_number : contact.phone_number,
            email !== undefined && email !== '' ? email : contact.email,
            is_starred ? 1 : 0
        );

        if (telegram_chat_id !== undefined) {
            db.setTelegramChatId(req.user.id, new_name, telegram_chat_id);
        }
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.delete('/contacts/:name', requireAuth, (req, res, next) => {
    try {
        db.deleteContactByName(req.user.id, req.params.name);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.patch('/contacts/:name/star', requireAuth, (req, res, next) => {
    try {
        db.toggleStarByName(req.user.id, req.params.name, req.body.is_starred ? 1 : 0);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.patch('/contacts/:name/telegram-id', requireAuth, (req, res, next) => {
    try {
        const { telegram_chat_id } = req.body;
        db.setTelegramChatId(req.user.id, req.params.name, telegram_chat_id);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

// ─── POST /api/telegram/webhook ──────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        const msg = update.message || update.edited_message;
        if (msg) {
            const chatId = String(msg.chat.id);
            const text = msg.text || '[Media]';
            const msgId = String(msg.message_id);

            const matchingContacts = db.findContactsByTelegramChatId(chatId);
            if (matchingContacts.length > 0) {
                matchingContacts.forEach(contact => {
                    db.insertTelegramMessage({
                        userId: contact.user_id,
                        contactId: contact.id,
                        telegramChatId: chatId,
                        messageText: text,
                        direction: 'received',
                        telegramMsgId: msgId
                    });
                });
            } else {
                console.log(`Telegram message from unknown chat_id: ${chatId}`);
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error('Telegram webhook error:', err);
        res.sendStatus(500);
    }
});

// ─── BACKGROUND POLLING ───────────────────────────────────────────────────────
// Provide an alternative for users running locally who cannot receive webhooks
let lastUpdateId = 0;
setInterval(async () => {
    // Only poll if a bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'your_telegram_bot_token_here') return;
    
    try {
        const updates = await telegramService.getUpdates(lastUpdateId + 1);
        if (updates && updates.length > 0) {
            updates.forEach(update => {
                if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;
                
                const msg = update.message || update.edited_message;
                if (msg && !msg.from?.is_bot) {
                    const chatId = String(msg.chat.id);
                    const text = msg.text || '[Media]';
                    const msgId = String(msg.message_id);

                    const matchingContacts = db.findContactsByTelegramChatId(chatId);
                    if (matchingContacts.length > 0) {
                        try {
                            matchingContacts.forEach(contact => {
                                db.insertTelegramMessage({
                                    userId: contact.user_id,
                                    contactId: contact.id,
                                    telegramChatId: chatId,
                                    messageText: text,
                                    direction: 'received',
                                    telegramMsgId: msgId
                                });
                            });
                        } catch (e) {
                            // Suppress unique constraint failures if it was already processed
                            if (!e.message.includes('UNIQUE')) console.error("Error saving polled msg:", e);
                        }
                    } else {
                        // Keep quiet to avoid spamming the console for unlinked contacts
                    }
                }
            });
        }
    } catch (err) {
        // Ignore timeouts or network drops
        if (err.message && !err.message.includes('timeout')) {
            console.error('Telegram poll error:', err.message);
        }
    }
}, 3000);

module.exports = router;
