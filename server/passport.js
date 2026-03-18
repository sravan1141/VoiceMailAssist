'use strict';
require('dotenv').config();

const passport = require('passport');
const db = require('./db');

passport.serializeUser((user, done) => {
    if (user.pendingRegistration) {
        return done(null, `pending:${user.username}`);
    }
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    if (typeof id === 'string' && id.startsWith('pending:')) {
        return done(null, { pendingRegistration: true, username: id.substring(8) });
    }
    const user = db.findById(id);
    done(null, user || false);
});

// Only register Google strategy if credentials are configured
const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (
    clientID && clientID !== 'your_google_client_id_here' &&
    clientSecret && clientSecret !== 'your_google_client_secret_here'
) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy(
        {
            clientID,
            clientSecret,
            callbackURL: `http://localhost:${process.env.PORT || 3002}/api/auth/google/callback`,
            accessType: 'offline',
            prompt: 'consent',
            passReqToCallback: true,
        },
        async (req, _accessToken, refreshToken, params, profile, done) => {
            try {
                console.log('=== GOOGLE OAUTH CALLBACK DEBUG ===');
                console.log('Session ID:', req.sessionID);
                console.log('Session data:', JSON.stringify(req.session, null, 2));
                console.log('Is authenticated:', req.isAuthenticated());
                console.log('Req.user:', req.user);
                
                const email = profile.emails?.[0]?.value;
                if (!email) return done(new Error('No email returned from Google'));
                
                console.log('Google profile email:', email);

                const tokens = {
                    accessToken: params.access_token,
                    refreshToken: refreshToken || null,
                    expiryDate: params.expiry_date || null,
                };
                console.log('Tokens received:', { ...tokens, accessToken: '***' });

                // Check if this is a Gmail connection during registration
                const pendingUsername = req.session?.pendingRegistrationUsername;
                console.log('Pending registration username:', pendingUsername);
                
                if (pendingUsername) {
                    console.log('🔗 Gmail connection during registration for user:', pendingUsername);
                    
                    // Store Gmail data in session for user creation later
                    req.session.pendingGmailData = {
                        gmailAddress: email,
                        ...tokens,
                        label: profile.displayName || 'Gmail',
                    };
                    console.log('✅ Gmail data stored for registration:', email);
                    
                    // Clear the pending registration flag
                    delete req.session.pendingRegistrationUsername;
                    
                    // Return success to frontend
                    return done(null, { 
                        username: pendingUsername,
                        name: profile.displayName || pendingUsername,
                        email: email,
                        gmailConnected: true,
                        pendingRegistration: true
                    });
                }

                // If the user is already logged in → add Gmail to their account
                if (req.isAuthenticated && req.isAuthenticated()) {
                    db.upsertGmail(req.user.id, {
                        gmailAddress: email,
                        ...tokens,
                        label: profile.displayName || 'Gmail',
                    });
                    // Return the same user (re-fetched to get fresh data)
                    const freshUser = db.findById(req.user.id);
                    return done(null, freshUser);
                }

                // Not logged in — find or create user by email (legacy / Google-first flow)
                let user = db.findByEmail(email);
                if (!user) {
                    // Try to find by gmail in user_gmails table
                    const allUsers = db.findByUsername(email); // fallback — none expected
                    if (!allUsers) {
                        // Create a brand-new user with a username derived from email
                        const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        console.log('📧 Creating new user from email (legacy flow):', baseUsername);
                        user = db.createUser({
                            username: baseUsername,
                            name: profile.displayName || email,
                            email,
                            has_face: false,
                            has_voice: false,
                        });
                    } else {
                        user = allUsers;
                    }
                }

                // Upsert the gmail entry
                db.upsertGmail(user.id, {
                    gmailAddress: email,
                    ...tokens,
                    label: profile.displayName || 'Gmail',
                });

                // Also keep legacy tokens on user row for backward compat
                db.updateTokens(user.id, {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken || (user.google_refresh_token ?? null),
                    expiry_date: tokens.expiryDate,
                });

                user = db.findById(user.id);
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    console.log('✅  Google OAuth strategy registered.');
} else {
    console.warn('⚠️   Google OAuth not configured — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env');
}
