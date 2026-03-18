'use strict';
const express = require('express');
const router = express.Router();
const https = require('https');

function requireAuth(req, res, next) {
    if (req.isAuthenticated() && req.user) return next();
    return res.status(401).json({ error: 'Not authenticated' });
}

function callGemini(prompt) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return reject(new Error('GEMINI_API_KEY not set in .env'));

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    resolve(text);
                } catch (e) {
                    reject(new Error('Failed to parse Gemini response'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── POST /api/ai/suggest-reply ─────────────────────────────────────────────────
// Body: { messages: [{direction, message_text}], platform }
router.post('/suggest-reply', requireAuth, async (req, res) => {
    try {
        const { messages = [], platform = 'WhatsApp' } = req.body;
        if (!messages.length) return res.json({ suggestions: [] });

        const conversation = messages.slice(-8).map(m =>
            `${m.direction === 'sent' ? 'Me' : 'Them'}: ${m.message_text}`
        ).join('\n');

        const prompt = `You are a helpful ${platform} messaging assistant. Based on this conversation, suggest exactly 3 short, natural reply options. Return ONLY a JSON array of 3 strings, no explanation.\n\nConversation:\n${conversation}\n\nReply options (JSON array only):`;

        const raw = await callGemini(prompt);

        // Extract JSON array from response
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) return res.json({ suggestions: ['👍 Okay!', 'Got it, thanks!', 'I\'ll check and get back to you.'] });

        const suggestions = JSON.parse(match[0]).slice(0, 3);
        res.json({ ok: true, suggestions });
    } catch (err) {
        console.error('[AI suggest-reply]', err.message);
        res.json({ ok: false, suggestions: ['👍 Okay!', 'Got it, thanks!', 'I\'ll get back to you!'] });
    }
});

// ── POST /api/ai/improve-message ─────────────────────────────────────────────
// Body: { text, platform }
router.post('/improve-message', requireAuth, async (req, res) => {
    try {
        const { text, platform = 'WhatsApp' } = req.body;
        if (!text || text.trim().length < 3) return res.json({ improved: text });

        const prompt = `Improve this ${platform} message to be clearer and more polite. Return ONLY the improved message text, nothing else:\n\n"${text}"`;

        const improved = (await callGemini(prompt)).trim().replace(/^"|"$/g, '');
        res.json({ ok: true, improved });
    } catch (err) {
        console.error('[AI improve-message]', err.message);
        res.json({ ok: false, improved: req.body.text });
    }
});

module.exports = router;
