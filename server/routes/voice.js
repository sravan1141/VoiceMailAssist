'use strict';
const express = require('express');
const { createClient } = require('@deepgram/sdk');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/voice/transcribe
 * Accepts audio (WebM/WAV blob) and returns Deepgram transcript.
 * Falls back gracefully if DEEPGRAM_API_KEY is not set.
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
    try {
        const apiKey = process.env.DEEPGRAM_API_KEY;

        if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
            return res.status(503).json({
                error: 'Deepgram API key not configured.',
                hint: 'Add DEEPGRAM_API_KEY to server/.env from https://console.deepgram.com',
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file attached. Send as multipart form-data field "audio".' });
        }

        const deepgram = createClient(apiKey);
        const language = req.body.language || 'en-US';

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            req.file.buffer,
            {
                model: 'nova-2',
                smart_format: true,
                language: language,
                punctuate: true,
            }
        );

        if (error) throw error;

        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

        res.json({ transcript, confidence, languageUsed: language });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/voice/transcribe-stream
 * Accepts a text command and returns a structured command intent.
 * (Placeholder for future Deepgram streaming integration)
 */
router.post('/intent', express.json(), (req, res) => {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    const lower = transcript.toLowerCase();
    const INTENTS = [
        { phrases: ['compose', 'new email', 'send email', 'write email'], intent: 'compose' },
        { phrases: ['read', 'open email', 'latest email', 'my email'], intent: 'read_latest' },
        { phrases: ['logout', 'sign out', 'goodbye', 'exit'], intent: 'logout' },
        { phrases: ['inbox', 'go to inbox'], intent: 'navigate_inbox' },
        { phrases: ['spam', 'spam folder'], intent: 'navigate_spam' },
        { phrases: ['sent', 'sent folder'], intent: 'navigate_sent' },
        { phrases: ['drafts', 'drafts folder'], intent: 'navigate_drafts' },
        { phrases: ['delete', 'trash', 'remove'], intent: 'delete_email' },
        { phrases: ['refresh', 'reload', 'check mail', 'check email'], intent: 'refresh' },
        { phrases: ['reply', 'respond', 'write back'], intent: 'reply' },
        { phrases: ['search', 'find email', 'look for'], intent: 'search' },
    ];

    const matched = INTENTS.find(i => i.phrases.some(p => lower.includes(p)));

    // Extract any email address mentioned
    const emailMatch = lower.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    res.json({
        transcript,
        intent: matched?.intent || 'unknown',
        entities: {
            email: emailMatch?.[0] || null,
        },
    });
});

module.exports = router;
