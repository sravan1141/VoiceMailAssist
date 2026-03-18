'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const db = require('../db');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeUser = (u, gmails, activeGmailId) => u ? {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    is_admin: u.is_admin,
    activeGmailId: activeGmailId || (gmails && gmails.length > 0 ? gmails[0].id : null),
    language_preference: u.language_preference || 'en-US',
    hasFace: !!u.has_face,
    hasVoice: !!u.has_voice,
    hasGmail: !!(u.google_refresh_token || u.google_access_token || (gmails && gmails.length > 0)),
    gmails: gmails || [],
} : null;

function requireAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
}

/** Cosine similarity between two plain number arrays */
function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Euclidean distance between two arrays */
function euclideanDist(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}

/** Decode base64-encoded Float32Array to JS number array */
function base64ToArray(b64) {
    const bin = Buffer.from(b64, 'base64');
    const arr = [];
    for (let i = 0; i < bin.length; i += 4) arr.push(bin.readFloatLE(i));
    return arr;
}

function getUserWithGmails(userId) {
    const user = db.findById(userId);
    if (!user) return null;
    const gmails = db.findGmailsByUser(userId).map(g => ({
        id: g.id,
        address: g.gmail_address,
        label: g.label,
    }));
    return { user, gmails };
}

// ─── GET /api/auth/me — restore session ───────────────────────────────────────
router.get('/me', (req, res) => {
    if (!req.user) return res.json({ user: null });
    const result = getUserWithGmails(req.user.id);
    if (!result) return res.json({ user: null });
    const { user, gmails } = result;
    res.json({ user: safeUser(user, gmails, req.session.activeGmailId) });
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Body: { username, voiceFingerprint?, faceDescriptor? }
router.post('/register', async (req, res, next) => {
    try {
        const { username, voiceFingerprint, faceDescriptor } = req.body;

        console.log('=== BACKEND REGISTRATION DEBUG ===');
        console.log('Received registration request:', {
            username,
            hasVoice: !!voiceFingerprint,
            hasFace: !!faceDescriptor,
            voiceFingerprintLength: voiceFingerprint ? voiceFingerprint.length : 0,
            faceDescriptorLength: faceDescriptor ? faceDescriptor.length : 0
        });

        if (!username?.trim() || username.trim().length < 2)
            return res.status(400).json({ error: 'Username must be at least 2 characters.' });

        const usernameClean = username.trim().toLowerCase().replace(/\s+/g, '_');
        console.log('Cleaned username:', usernameClean);

        const existing = db.findByUsername(usernameClean);
        if (existing) {
            console.log('❌ Username already taken:', usernameClean);
            return res.status(409).json({ error: `Username "${usernameClean}" is already taken. Please choose another.` });
        }

        // Check for Gmail data in session (from OAuth flow)
        const gmailData = req.session?.pendingGmailData;
        console.log('Gmail data in session:', gmailData ? 'present' : 'none');

        const user = db.createUser({
            username: usernameClean,
            name: usernameClean,    // Use username as display name too
            email: gmailData?.gmailAddress || null,
            has_face: !!faceDescriptor,
            has_voice: !!voiceFingerprint,
            face_descriptor: faceDescriptor || null,
            voice_fingerprint: voiceFingerprint || null,
            google_access_token: gmailData?.accessToken || null,
            google_refresh_token: gmailData?.refreshToken || null,
            google_token_expiry: gmailData?.expiryDate || null,
        });

        console.log('✅ User created in database:', {
            id: user.id,
            username: user.username,
            has_face: user.has_face,
            has_voice: user.has_voice,
            face_descriptor_stored: !!user.face_descriptor,
            voice_fingerprint_stored: !!user.voice_fingerprint,
            gmail_linked: !!gmailData
        });

        // Link Gmail if data was provided
        if (gmailData) {
            console.log('🔗 Linking Gmail to newly created user');
            db.upsertGmail(user.id, {
                gmailAddress: gmailData.gmailAddress,
                accessToken: gmailData.accessToken,
                refreshToken: gmailData.refreshToken,
                expiryDate: gmailData.expiryDate,
                label: gmailData.label,
            });

            // Clear Gmail data from session
            delete req.session.pendingGmailData;
        }

        // Verify data persistence by querying the database again
        const verifyUser = db.findByUsername(usernameClean);
        console.log('🔍 VERIFICATION - User found in DB after creation:', {
            found: !!verifyUser,
            id: verifyUser?.id,
            username: verifyUser?.username,
            has_face: verifyUser?.has_face,
            has_voice: verifyUser?.has_voice,
            face_descriptor_present: !!verifyUser?.face_descriptor,
            voice_fingerprint_present: !!verifyUser?.voice_fingerprint
        });

        // CRITICAL: Verify the exact username that was stored
        if (!verifyUser || verifyUser.username !== usernameClean) {
            console.error('❌ CRITICAL ERROR: Username mismatch after creation!');
            console.error('Expected:', usernameClean, 'Got:', verifyUser?.username);
            return res.status(500).json({ error: 'Database inconsistency detected. Please try again.' });
        }

        req.login(user, (err) => {
            if (err) return next(err);
            const gmails = db.findGmailsByUser(user.id);
            console.log('✅ Session established for user:', user.username);
            res.status(201).json({ user: safeUser(user, gmails) });
        });
    } catch (err) {
        console.error('❌ Registration error:', err);
        next(err);
    }
});

// ─── POST /api/auth/set-pending-username — store username for Gmail OAuth ─────────────
router.post('/set-pending-username', (req, res) => {
    const { username } = req.body;
    console.log('🔗 Setting pending username for Gmail OAuth:', username);

    if (!username?.trim()) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    // Store in session for Google OAuth callback
    req.session.pendingRegistrationUsername = username.trim();
    console.log('✅ Pending username stored in session:', req.session.pendingRegistrationUsername);

    res.json({ success: true, username: req.session.pendingRegistrationUsername });
});

// ─── GET /api/auth/debug/users — debug endpoint to view all users ─────────────────
router.get('/debug/users', (req, res) => {
    try {
        const allUsers = db.prepare('SELECT id, username, name, has_face, has_voice, created_at FROM users ORDER BY created_at DESC').all();
        console.log('🔍 DEBUG - All users in database:', allUsers);
        res.json({
            count: allUsers.length,
            users: allUsers
        });
    } catch (err) {
        console.error('❌ Debug endpoint error:', err);
        res.status(500).json({ error: 'Debug endpoint failed' });
    }
});

// ─── POST /api/auth/check-availability — check if username is available for registration ─────────────────────────
router.post('/check-availability', (req, res) => {
    const { username } = req.body;

    console.log('=== USERNAME AVAILABILITY CHECK ===');
    console.log('Checking username availability for:', username);

    if (!username?.trim()) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    const trimmedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

    const existingUser = db.findByUsername(trimmedUsername);

    if (existingUser) {
        console.log('❌ Username already taken:', trimmedUsername);
        return res.status(409).json({
            available: false,
            error: `Username "${trimmedUsername}" is already taken.`
        });
    }

    console.log('✅ Username is available:', trimmedUsername);
    res.json({ available: true, username: trimmedUsername });
});

// ─── POST /api/auth/lookup — check if username exists ─────────────────────────
router.post('/lookup', (req, res) => {
    const { username } = req.body;

    console.log('=== BACKEND LOGIN DEBUG ===');
    console.log('Raw request body:', req.body);
    console.log('Username parameter:', username);
    console.log('Username type:', typeof username);
    console.log('Username value:', JSON.stringify(username));

    if (!username?.trim()) {
        console.log('❌ Username validation failed - empty or null');
        return res.status(400).json({ error: 'Username is required.' });
    }

    const trimmedUsername = username.trim();
    console.log('Trimmed username:', JSON.stringify(trimmedUsername));

    let user = db.findByUsername(trimmedUsername);

    if (!user) {
        console.log('❌ User not found in database:', trimmedUsername);
        return res.status(404).json({ error: 'No account found with that username.' });
    }

    console.log('✅ User found:', {
        id: user.id,
        username: user.username,
        has_face: user.has_face,
        has_voice: user.has_voice,
        face_descriptor_stored: !!user.face_descriptor,
        voice_fingerprint_stored: !!user.voice_fingerprint
    });

    res.json({
        found: true,
        hasFace: !!user.has_face,
        hasVoice: !!user.has_voice,
        name: user.username, // Use username as display name
        username: user.username,
    });
});

// ─── POST /api/auth/login/password — username + password login ─────────────────
router.post('/login/password', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username?.trim()) return res.status(400).json({ error: 'Username is required.' });
        if (!password)        return res.status(400).json({ error: 'Password is required.' });

        const user = db.findByUsername(username.trim());
        if (!user || !user.passcode_hash)
            return res.status(401).json({ error: 'No password set for this account.' });

        const match = await bcrypt.compare(password, user.passcode_hash);
        if (!match) return res.status(401).json({ error: 'Incorrect password.' });

        req.login(user, (err) => {
            if (err) return next(err);
            const gmails = db.findGmailsByUser(user.id).map(g => ({ id: g.id, address: g.gmail_address, label: g.label }));
            res.json({ user: safeUser(user, gmails) });
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/login/voice — voice biometric login ───────────────────────
router.post('/login/voice', async (req, res, next) => {
    try {
        const { username, voiceFingerprint } = req.body;
        if (!username?.trim()) return res.status(400).json({ error: 'Username is required.' });
        if (!voiceFingerprint) return res.status(400).json({ error: 'Voice fingerprint is required.' });

        const user = db.findByUsername(username.trim());
        if (!user || !user.has_voice || !user.voice_fingerprint)
            return res.status(401).json({ error: 'No voice code registered for this account.' });

        const live = Array.isArray(voiceFingerprint) ? voiceFingerprint : base64ToArray(voiceFingerprint);
        const stored = base64ToArray(user.voice_fingerprint);
        const sim = cosineSim(live, stored);
        console.log('[auth] voice similarity:', sim);

        if (sim < 0.70) return res.status(401).json({ error: 'Voice not recognized. Please try again.' });

        req.login(user, (err) => {
            if (err) return next(err);
            const gmails = db.findGmailsByUser(user.id).map(g => ({ id: g.id, address: g.gmail_address, label: g.label }));
            res.json({ user: safeUser(user, gmails) });
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/login/face — face biometric login ─────────────────────────
router.post('/login/face', async (req, res, next) => {
    try {
        const { username, faceDescriptor } = req.body;
        if (!username?.trim()) return res.status(400).json({ error: 'Username is required.' });
        if (!faceDescriptor) return res.status(400).json({ error: 'Face descriptor is required.' });

        const user = db.findByUsername(username.trim());
        if (!user || !user.has_face || !user.face_descriptor)
            return res.status(401).json({ error: 'No face ID registered for this account.' });

        const live = Array.isArray(faceDescriptor) ? faceDescriptor : base64ToArray(faceDescriptor);
        const stored = base64ToArray(user.face_descriptor);
        const dist = euclideanDist(live, stored);
        console.log('[auth] face distance:', dist);

        if (dist > 0.5) return res.status(401).json({ error: 'Face not recognized. Please try again.' });

        req.login(user, (err) => {
            if (err) return next(err);
            const gmails = db.findGmailsByUser(user.id).map(g => ({ id: g.id, address: g.gmail_address, label: g.label }));
            res.json({ user: safeUser(user, gmails) });
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/auth/google — initiate OAuth ────────────────────────────────────
const GOOGLE_CONFIGURED = (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here'
);

router.get('/google', (req, res, next) => {
    if (!GOOGLE_CONFIGURED) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${clientUrl}/?auth=error&reason=google_not_configured`);
    }
    passport.authenticate('google', {
        scope: [
            'profile',
            'email',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
        ],
        accessType: 'offline',
        prompt: 'consent',
        state: req.query.relink === '1' ? 'relink_gmail' : undefined,
    })(req, res, next);
});

// ─── GET /api/auth/google/callback ───────────────────────────────────────────
router.get('/google/callback',
    (req, res, next) => {
        if (!GOOGLE_CONFIGURED) return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?auth=error`);
        passport.authenticate('google', {
            failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/?auth=error`,
        })(req, res, next);
    },
    (req, res) => {
        const isRelink = req.query.state === 'relink_gmail';
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${clientUrl}/?auth=${isRelink ? 'relinked' : 'success'}`);
    }
);

// ─── GET /api/auth/gmails — list all linked Gmail accounts ────────────────────
router.get('/gmails', requireAuth, (req, res) => {
    const gmails = db.findGmailsByUser(req.user.id).map(g => ({
        id: g.id,
        address: g.gmail_address,
        label: g.label,
    }));
    res.json({ gmails });
});

// ─── POST /api/auth/select-gmail — set active gmail for this session ──────────
router.post('/select-gmail', requireAuth, (req, res) => {
    const { gmailId } = req.body;
    if (!gmailId) return res.status(400).json({ error: 'gmailId is required.' });

    const gmail = db.findGmailById(gmailId);
    if (!gmail || gmail.user_id !== req.user.id)
        return res.status(403).json({ error: 'Gmail account not found or not yours.' });

    req.session.activeGmailId = gmail.id;
    req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Failed to save session.' });
        res.json({ ok: true, gmailId: gmail.id, address: gmail.gmail_address });
    });
});

// ─── DELETE /api/auth/gmails/:gmailId — remove a linked Gmail ─────────────────
router.delete('/gmails/:gmailId', requireAuth, (req, res) => {
    const gmailId = parseInt(req.params.gmailId, 10);
    const gmails = db.findGmailsByUser(req.user.id);
    if (gmails.length <= 1)
        return res.status(400).json({ error: 'Cannot remove your last linked Gmail account.' });

    db.removeGmail(gmailId, req.user.id);
    if (req.session.activeGmailId === gmailId) delete req.session.activeGmailId;
    res.json({ ok: true });
});

// ─── PATCH /api/auth/biometrics — save face/voice descriptor + flags ─────────
router.patch('/biometrics', requireAuth, (req, res) => {
    const { hasFace, hasVoice, faceDescriptor, voiceFingerprint } = req.body;
    db.saveBiometricData(req.user.id, {
        hasFace: !!hasFace,
        hasVoice: !!hasVoice,
        faceDescriptor: faceDescriptor || null,
        voiceFingerprint: voiceFingerprint || null,
    });
    const fresh = db.findById(req.user.id);
    const gmails = db.findGmailsByUser(req.user.id).map(g => ({ id: g.id, address: g.gmail_address, label: g.label }));
    res.json({ user: safeUser(fresh, gmails) });
});

// ─── POST /api/auth/language ──────────────────────────────────────────────────
router.post('/language', requireAuth, (req, res) => {
    const { language_preference } = req.body;
    if (!language_preference || typeof language_preference !== 'string') {
        return res.status(400).json({ error: 'Valid language_preference string is required.' });
    }

    db.updateLanguage(req.user.id, language_preference);

    // Refresh user object
    const fresh = db.findById(req.user.id);
    const gmails = db.findGmailsByUser(req.user.id).map(g => ({ id: g.id, address: g.gmail_address, label: g.label }));

    res.json({ ok: true, user: safeUser(fresh, gmails) });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ ok: true });
        });
    });
});

module.exports = router;
