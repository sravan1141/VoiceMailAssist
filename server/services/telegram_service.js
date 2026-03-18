'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE_URL = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const apiUrl = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    return `${apiUrl}/bot${token}`;
};

async function apiCall(method, body = {}) {
    const url = `${BASE_URL()}/${method}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
        throw new Error(data.description || `Telegram API error: ${res.status}`);
    }
    return data.result;
}

async function sendMessage(chatId, text) {
    return apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
    });
}

async function editMessage(chatId, messageId, newText) {
    return apiCall('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'HTML'
    });
}

async function deleteMessage(chatId, messageId) {
    return apiCall('deleteMessage', {
        chat_id: chatId,
        message_id: messageId
    });
}

async function forwardMessage(chatId, fromChatId, messageId) {
    return apiCall('forwardMessage', {
        chat_id: chatId,
        from_chat_id: fromChatId,
        message_id: messageId
    });
}

async function sendPhoto(chatId, photoUrl, caption = '') {
    return apiCall('sendPhoto', {
        chat_id: chatId,
        photo: photoUrl,
        caption
    });
}

async function sendDocument(chatId, documentUrl, caption = '') {
    return apiCall('sendDocument', {
        chat_id: chatId,
        document: documentUrl,
        caption
    });
}

async function getUpdates(offset = 0, limit = 20) {
    return apiCall('getUpdates', { offset, limit, timeout: 0 });
}

module.exports = {
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
    sendPhoto,
    sendDocument,
    getUpdates
};
