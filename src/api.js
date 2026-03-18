// Central API helper — all components import from here
const BASE = '/api';

async function request(method, path, body) {
    const opts = {
        method,
        headers: {},
        credentials: 'include',
    };

    if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = new Error(data.error || `Request failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }

    return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
    me: () => request('GET', '/auth/me'),

    // Username-based registration (no email needed at registration)
    register: (body) => request('POST', '/auth/register', body),

    // Check if username is available for registration
    checkUsernameAvailability: (username) => request('POST', '/auth/check-availability', { username }),

    // Check if a username exists and what auth methods it has
    lookupUsername: (username) => request('POST', '/auth/lookup', { username }),

    // Biometric login — now use username instead of email
    loginVoice: (body) => request('POST', '/auth/login/voice', body),
    loginFace:  (body) => request('POST', '/auth/login/face', body),
    loginWithPassword: (username, password) => request('POST', '/auth/login/password', { username, password }),

    // Save biometric data after registration
    updateBiometrics: (body) => request('PATCH', '/auth/biometrics', body),
    updateLanguage: (language_preference) => request('POST', '/auth/language', { language_preference }),

    logout: () => request('POST', '/auth/logout'),

    // Google OAuth — full page redirect (must bypass Vite proxy)
    googleOAuthUrl: () => `http://localhost:3002/api/auth/google`,

    // Multi-Gmail management
    getLinkedGmails: () => request('GET', '/auth/gmails'),
    selectGmail: (gmailId) => request('POST', '/auth/select-gmail', { gmailId }),
    removeGmail: (gmailId) => request('DELETE', `/auth/gmails/${gmailId}`),
};

// ─── Gmail ────────────────────────────────────────────────────────────────────
export const gmailApi = {
    listMessages: (folder = 'INBOX', q = '', pageToken = '') =>
        request('GET', `/gmail/messages?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(q)}${pageToken ? `&pageToken=${pageToken}` : ''}`),

    getMessage: (id) => request('GET', `/gmail/messages/${id}`),
    markRead: (id) => request('PATCH', `/gmail/mark-read/${id}`),
    toggleStar: (id, star) => request('PATCH', `/gmail/toggle-star/${id}`, { star }),
    deleteMessage: (id) => request('DELETE', `/gmail/messages/${id}`),
    sendMessage: (body) => request('POST', '/gmail/send', body),
    getLabels: () => request('GET', '/gmail/labels'),
};

// ─── Voice / Deepgram ─────────────────────────────────────────────────────────
export const voiceApi = {
    transcribe: async (audioBlob, language = 'en-US') => {
        const form = new FormData();
        form.append('audio', audioBlob, 'recording.webm');
        form.append('language', language);
        const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: form,
            credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Transcription failed');
        return data;
    },

    getIntent: (transcript) => request('POST', '/voice/intent', { transcript }),
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export const whatsappApi = {
    getStatus: () => request('GET', '/whatsapp/status'),
    sendMessage: (contact_name, message, media_url = null) => request('POST', '/whatsapp/send', { contact_name, message, media_url }),
    getConversations: () => request('GET', '/whatsapp/conversations'),
    getMessages: (contactId) => request('GET', `/whatsapp/messages/${contactId}`),
    getContacts: () => request('GET', '/whatsapp/contacts'),
    addContact: (name, phone_number, email, is_starred) => request('POST', '/whatsapp/contacts', { name, phone_number, email, is_starred }),
    editContact: (old_name, new_name, phone_number, email, is_starred) => request('POST', '/whatsapp/contacts/edit', { old_name, new_name, phone_number, email, is_starred }),
    deleteContact: (name) => request('DELETE', `/whatsapp/contacts/${encodeURIComponent(name)}`),
    starContact: (name, is_starred) => request('PATCH', `/whatsapp/contacts/${encodeURIComponent(name)}/star`, { is_starred }),
    sendTemplateMessage: (contact_name, template_name = 'hello_world') => request('POST', '/whatsapp/send-template', { contact_name, template_name })
};

// ─── Telegram ───────────────────────────────────────────────────────────────────────────────
export const telegramApi = {
    getStatus: () => request('GET', '/telegram/status'),
    sendMessage: (contact_name, message) => request('POST', '/telegram/send', { contact_name, message }),
    editMessage: (contact_name, message_id, new_text) => request('POST', '/telegram/edit', { contact_name, message_id, new_text }),
    deleteMessage: (contact_name, message_id) => request('POST', '/telegram/delete', { contact_name, message_id }),
    forwardMessage: (to_contact_name, from_contact_name, message_id) => request('POST', '/telegram/forward', { to_contact_name, from_contact_name, message_id }),
    getConversations: () => request('GET', '/telegram/conversations'),
    getMessages: (contactId) => request('GET', `/telegram/messages/${contactId}`),
    getContacts: () => request('GET', '/telegram/contacts'),
    addContact: (name, phone_number, email, is_starred, telegram_chat_id) => request('POST', '/telegram/contacts', { name, phone_number, email, is_starred, telegram_chat_id }),
    editContact: (old_name, new_name, phone_number, email, is_starred, telegram_chat_id) => request('POST', '/telegram/contacts/edit', { old_name, new_name, phone_number, email, is_starred, telegram_chat_id }),
    deleteContact: (name) => request('DELETE', `/telegram/contacts/${encodeURIComponent(name)}`),
    starContact: (name, is_starred) => request('PATCH', `/telegram/contacts/${encodeURIComponent(name)}/star`, { is_starred }),
    setTelegramChatId: (name, telegram_chat_id) => request('PATCH', `/telegram/contacts/${encodeURIComponent(name)}/telegram-id`, { telegram_chat_id })
};

// ─── AI ──────────────────────────────────────────────────────────────────────
export const aiApi = {
    suggestReply: (messages, platform = 'WhatsApp') => request('POST', '/ai/suggest-reply', { messages, platform }),
    improveMessage: (text, platform = 'WhatsApp') => request('POST', '/ai/improve-message', { text, platform }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
    getUsers: () => request('GET', '/admin/users'),
    getStats: () => request('GET', '/admin/stats'),
    toggleAdmin: (userId) => request('PUT', `/admin/users/${userId}/toggle-admin`),
    deleteUser: (userId) => request('DELETE', `/admin/users/${userId}`),
    getActivity: () => request('GET', '/admin/activity'),
    getSystem: () => request('GET', '/admin/system'),
    getErrors: () => request('GET', '/admin/errors'),
    getUserAnalytics: (userId) => request('GET', `/admin/users/${userId}/analytics`),
};

