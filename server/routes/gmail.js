'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { google } = require('googleapis');
const db = require('../db');

const router = express.Router();

// ─── Guard — must be authenticated & have an active Gmail account ─────────────
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

    // Determine active gmail: from session or first linked gmail
    const gmails = db.findGmailsByUser(req.user.id);
    let activeGmail = null;

    if (req.session.activeGmailId) {
        activeGmail = gmails.find(g => g.id === req.session.activeGmailId);
    }
    if (!activeGmail && gmails.length > 0) {
        activeGmail = gmails[0];
    }

    // Fall back to legacy user-level tokens
    if (!activeGmail) {
        if (!req.user.google_access_token && !req.user.google_refresh_token) {
            return res.status(403).json({ error: 'No Gmail account connected. Please link a Gmail account.' });
        }
        // Build synthetic gmail record from user row
        activeGmail = {
            id: null,
            gmail_address: req.user.email,
            google_access_token: req.user.google_access_token,
            google_refresh_token: req.user.google_refresh_token,
            google_token_expiry: req.user.google_token_expiry,
        };
    }

    req.activeGmail = activeGmail;
    next();
}

// ─── Build an OAuth2 client for the active Gmail account ─────────────────────
function getOAuth2Client(activeGmail) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `http://localhost:${process.env.PORT || 3000}/api/auth/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: activeGmail.google_access_token,
        refresh_token: activeGmail.google_refresh_token,
        expiry_date: activeGmail.google_token_expiry,
    });

    // Persist refreshed tokens back to user_gmails
    oauth2Client.on('tokens', (tokens) => {
        if ((tokens.access_token || tokens.refresh_token) && activeGmail.id) {
            db.updateGmailTokens(activeGmail.id, {
                accessToken: tokens.access_token || activeGmail.google_access_token,
                refreshToken: tokens.refresh_token || null,
                expiryDate: tokens.expiry_date || activeGmail.google_token_expiry,
            });
        }
    });

    return oauth2Client;
}

// ─── Helper: parse a Gmail message into a clean object ───────────────────────
function parseMessage(msg) {
    const headers = msg.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    function decodeBody(payload) {
        if (!payload) return '';
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        if (payload.parts) {
            const plain = payload.parts.find(p => p.mimeType === 'text/plain');
            if (plain?.body?.data)
                return Buffer.from(plain.body.data, 'base64').toString('utf-8');
            const html = payload.parts.find(p => p.mimeType === 'text/html');
            if (html?.body?.data)
                return Buffer.from(html.body.data, 'base64').toString('utf-8');
            for (const part of payload.parts) {
                const result = decodeBody(part);
                if (result) return result;
            }
        }
        return '';
    }

    return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getHeader('subject') || '(no subject)',
        sender: getHeader('from'),
        to: getHeader('to'),
        date: getHeader('date'),
        snippet: msg.snippet || '',
        body: decodeBody(msg.payload),
        read: !msg.labelIds?.includes('UNREAD'),
        labels: msg.labelIds || [],
    };
}

// ─── GET /api/gmail/messages ──────────────────────────────────────────────────
router.get('/messages', requireAuth, async (req, res, next) => {
    try {
        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });

        const folder = (req.query.folder || 'INBOX').toUpperCase();
        const q = req.query.q || '';
        const pageToken = req.query.pageToken || undefined;

        const labelMap = {
            INBOX: 'INBOX', SENT: 'SENT', DRAFTS: 'DRAFT',
            SPAM: 'SPAM', TRASH: 'TRASH', STARRED: 'STARRED',
        };
        const labelIds = labelMap[folder] ? [labelMap[folder]] : ['INBOX'];

        const listRes = await gmail.users.messages.list({
            userId: 'me', labelIds, q, maxResults: 20, pageToken,
        });

        const ids = listRes.data.messages || [];
        if (ids.length === 0) return res.json({ messages: [], nextPageToken: null });

        const messages = await Promise.all(
            ids.map(({ id }) =>
                gmail.users.messages.get({ userId: 'me', id, format: 'full' })
                    .then(r => parseMessage(r.data))
                    .catch(() => null)
            )
        );

        res.json({ messages: messages.filter(Boolean), nextPageToken: listRes.data.nextPageToken || null });
    } catch (err) { next(err); }
});

// ─── GET /api/gmail/messages/:id ─────────────────────────────────────────────
router.get('/messages/:id', requireAuth, async (req, res, next) => {
    try {
        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });
        const msgRes = await gmail.users.messages.get({ userId: 'me', id: req.params.id, format: 'full' });
        res.json({ message: parseMessage(msgRes.data) });
    } catch (err) { next(err); }
});

// ─── PATCH /api/gmail/mark-read/:id ──────────────────────────────────────────
router.patch('/mark-read/:id', requireAuth, async (req, res, next) => {
    try {
        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.modify({
            userId: 'me', id: req.params.id,
            requestBody: { removeLabelIds: ['UNREAD'] },
        });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

// ─── PATCH /api/gmail/toggle-star/:id ────────────────────────────────────────
router.patch('/toggle-star/:id', requireAuth, async (req, res, next) => {
    try {
        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });
        const { star } = req.body; // true to star, false to unstar
        await gmail.users.messages.modify({
            userId: 'me', id: req.params.id,
            requestBody: star
                ? { addLabelIds: ['STARRED'] }
                : { removeLabelIds: ['STARRED'] },
        });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

// ─── DELETE /api/gmail/messages/:id ──────────────────────────────────────────
router.delete('/messages/:id', requireAuth, async (req, res, next) => {
    try {
        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.trash({ userId: 'me', id: req.params.id });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

// ─── POST /api/gmail/send ─────────────────────────────────────────────────────
router.post('/send', requireAuth, async (req, res, next) => {
    try {
        const { to, subject, body } = req.body;
        if (!to || !subject || !body)
            return res.status(400).json({ error: 'to, subject, and body are required.' });

        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });

        // Use the active Gmail address as From
        const from = req.activeGmail.gmail_address || req.user.email || '';
        const rawMail = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            '',
            body,
        ].join('\r\n');

        const encoded = Buffer.from(rawMail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const sendRes = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encoded },
        });

        res.json({ ok: true, id: sendRes.data.id });
    } catch (err) { next(err); }
});

// ─── GET /api/gmail/labels ────────────────────────────────────────────────────
router.get('/labels', requireAuth, async (req, res, next) => {
    try {
        const auth = getOAuth2Client(req.activeGmail);
        const gmail = google.gmail({ version: 'v1', auth });

        const labelsRes = await gmail.users.labels.list({ userId: 'me' });
        const labels = labelsRes.data.labels || [];

        const keyLabels = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED'];
        const details = await Promise.all(
            labels
                .filter(l => keyLabels.includes(l.id))
                .map(l => gmail.users.labels.get({ userId: 'me', id: l.id })
                    .then(r => ({
                        id: l.id,
                        name: r.data.name,
                        total: r.data.messagesTotal || 0,
                        unread: r.data.messagesUnread || 0,
                    }))
                    .catch(() => null)
                )
        );

        res.json({ labels: details.filter(Boolean) });
    } catch (err) { next(err); }
});

// ─── Error middleware: catch invalid_grant / token expired ───────────────────
router.use((err, req, res, next) => {
    const msg = (err.message || '').toLowerCase();
    const isTokenError = msg.includes('invalid_grant') || msg.includes('token has been expired') || msg.includes('token has been revoked');
    if (isTokenError) {
        return res.status(401).json({
            error: 'gmail_token_expired — Your Gmail session has expired. Please reconnect your Gmail account.',
            code: 'gmail_token_expired',
        });
    }
    next(err);
});

module.exports = router;
