'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });



const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function sendTextMessage(phoneNumberId, toPhoneNumber, message) {
    if (!WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: toPhoneNumber,
        type: 'text',
        text: {
            body: message
        }
    };

    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error?.message || `WhatsApp API error: ${response.status}`);
    }

    return data;
}

async function sendMediaMessage(phoneNumberId, toPhoneNumber, mediaUrl, mediaType = 'image') {
    if (!WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: toPhoneNumber,
        type: mediaType,
        [mediaType]: {
            link: mediaUrl
        }
    };

    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error?.message || `WhatsApp API error: ${response.status}`);
    }

    return data;
}

async function sendTemplateMessage(phoneNumberId, toPhoneNumber, templateName = 'hello_world', languageCode = 'en_US') {
    // Dynamic token retrieval so it picks up env changes if process.env gets updated
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
        throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: toPhoneNumber,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode }
        }
    };

    const url = `${process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0'}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error?.message || `WhatsApp API error: ${response.status}`);
    }

    return data;
}

module.exports = {
    sendTextMessage,
    sendMediaMessage,
    sendTemplateMessage
};
