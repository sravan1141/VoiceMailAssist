'use strict';

const express = require('express');
const db = require('../db');
const whatsappService = require('../services/whatsapp_service');

const router = express.Router();

// Middleware: ensure user is authenticated
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// ─── POST /api/whatsapp/send ──────────────────────────────────────────────────
router.post('/send', requireAuth, async (req, res, next) => {
    try {
        const { contact_name, message, media_url } = req.body;

        if (!contact_name || (!message && !media_url)) {
            return res.status(400).json({ error: 'contact_name and either message or media_url are required.' });
        }

        // Look up the contact
        const contact = db.findContactByName(req.user.id, contact_name);
        if (!contact) {
            return res.status(404).json({ error: `Contact '${contact_name}' not found in your address book.` });
        }

        if (!contact.phone_number) {
            return res.status(400).json({ error: `Contact '${contact_name}' does not have a phone number.` });
        }

        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (!phoneNumberId) {
            throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured on the server');
        }

        const formattedPhone = contact.phone_number.replace(/\D/g, '');
        let response;

        // Use media or text message based on content
        if (media_url) {
            // Note: In real app you'd need the type (image, video, etc.). 
            // Defaulting to image as placeholder for simple voice flow parsing.
            // If whatsappService doesn't have media sending implemented yet, fallback gracefully.
            if (whatsappService.sendMediaMessage) {
                response = await whatsappService.sendMediaMessage(phoneNumberId, formattedPhone, media_url, 'image');
            } else {
                throw new Error("Media sending not implemented in whatsappService");
            }
        } else {
            response = await whatsappService.sendTextMessage(phoneNumberId, formattedPhone, message);
        }

        const messageId = response.messages?.[0]?.id;

        // Save sent message to database
        db.insertWhatsAppMessage({
            userId: req.user.id,
            contactId: contact.id,
            phoneNumber: formattedPhone,
            messageText: message || '[Media]',
            direction: 'sent',
            mediaUrl: media_url || null,
            whatsappMsgId: messageId
        });

        res.json({ ok: true, messageId });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/whatsapp/send-template ─────────────────────────────────────────
router.post('/send-template', requireAuth, async (req, res, next) => {
    try {
        const { contact_name, template_name } = req.body;
        if (!contact_name) {
            return res.status(400).json({ error: 'contact_name is required.' });
        }

        const contact = db.findContactByName(req.user.id, contact_name);
        if (!contact || !contact.phone_number) {
            return res.status(404).json({ error: `Contact '${contact_name}' not found or lacks a phone number.` });
        }

        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');

        const formattedPhone = contact.phone_number.replace(/\D/g, '');
        const tpl = template_name || 'hello_world';
        const response = await whatsappService.sendTemplateMessage(phoneNumberId, formattedPhone, tpl);
        const messageId = response.messages?.[0]?.id;

        // Save sent message to database
        db.insertWhatsAppMessage({
            userId: req.user.id,
            contactId: contact.id,
            phoneNumber: formattedPhone,
            messageText: `[Template: ${tpl}]`,
            direction: 'sent',
            mediaUrl: null,
            whatsappMsgId: messageId
        });

        res.json({ ok: true, messageId });
    } catch (err) {
        next(err);
    }
});


// ─── GET /api/whatsapp/status ─────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
    const isConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    res.json({ configured: isConfigured });
});

// ─── GET /api/whatsapp/conversations ──────────────────────────────────────────
router.get('/conversations', requireAuth, (req, res, next) => {
    try {
        const conversations = db.findWhatsAppConversations(req.user.id);
        res.json({ ok: true, conversations });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/whatsapp/messages/:contactId ────────────────────────────────────
router.get('/messages/:contactId', requireAuth, (req, res, next) => {
    try {
        const messages = db.findWhatsAppMessages(req.user.id, req.params.contactId);
        res.json({ ok: true, messages });
    } catch (err) {
        next(err);
    }
});

// ─── GET & POST /api/whatsapp/contacts ────────────────────────────────────────
router.get('/contacts', requireAuth, (req, res, next) => {
    try {
        const contacts = db.findWhatsAppContactsByUser(req.user.id);
        res.json({ ok: true, contacts });
    } catch (err) {
        next(err);
    }
});

router.post('/contacts', requireAuth, (req, res, next) => {
    try {
        const { name, phone_number, email, is_starred } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        db.upsertContact(req.user.id, name, phone_number, email, is_starred ? 1 : 0);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post('/contacts/edit', requireAuth, (req, res, next) => {
    try {
        const { old_name, new_name, phone_number, email, is_starred } = req.body;
        if (!old_name || !new_name) return res.status(400).json({ error: 'Old name and new name are required' });

        db.editContact(req.user.id, old_name, new_name, phone_number, email, is_starred ? 1 : 0);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/contacts/:name', requireAuth, (req, res, next) => {
    try {
        const { name } = req.params;
        db.deleteContactByName(req.user.id, name);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/contacts/:name/star', requireAuth, (req, res, next) => {
    try {
        const { name } = req.params;
        const { is_starred } = req.body;
        db.toggleStarByName(req.user.id, name, is_starred ? 1 : 0);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── WEBHOOK (Meta incoming messages) ─────────────────────────────────────────
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    res.sendStatus(400);
});

router.post('/webhook', (req, res) => {
    const body = req.body;
    if (body.object) {
        if (
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0] &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]
        ) {
            const phoneNumber = body.entry[0].changes[0].value.messages[0].from;
            const messageObj = body.entry[0].changes[0].value.messages[0];
            const msgBody = messageObj.text?.body || '[Media Attached]';
            const messageId = messageObj.id;

            console.log(`Incoming WhatsApp message from ${phoneNumber}: ${msgBody}`);

            // Find any matched contacts who have this phone number
            const matchingContacts = db.findContactsByPhoneNumber(phoneNumber);

            if (matchingContacts.length > 0) {
                // If found, associate this message with the contact and their user
                matchingContacts.forEach(contact => {
                    db.insertWhatsAppMessage({
                        userId: contact.user_id,
                        contactId: contact.id,
                        phoneNumber: phoneNumber,
                        messageText: msgBody,
                        direction: 'received',
                        mediaUrl: null, // Depending on webhook payload, extract URL 
                        whatsappMsgId: messageId
                    });
                });
            } else {
                console.log(`Received message from unknown number: ${phoneNumber}. Cannot associate with a user.`);
            }
        } else if (
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0] &&
            body.entry[0].changes[0].value.statuses &&
            body.entry[0].changes[0].value.statuses[0]
        ) {
            const statusObj = body.entry[0].changes[0].value.statuses[0];
            if (statusObj.status === 'failed') {
                console.error(`\n❌ WhatsApp message ${statusObj.id} failed to deliver asynchronously.`);
                console.error(`❌ Meta Server Error Response:`, JSON.stringify(statusObj.errors, null, 2));
                console.error(`❌ Note: If using a Test Number, free-form messages will fail unless the recipient has replied to the test number within the last 24 hours.\n`);
            } else {
                console.log(`WhatsApp message status update: ${statusObj.status} for msg ${statusObj.id}`);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;
