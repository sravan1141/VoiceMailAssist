import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ArrowLeft, MessageCircle, Users, Activity, LogOut, Send,
    Paperclip, Plus, Edit2, Trash2, Settings, Globe, Sparkles, VolumeX, Volume2
} from 'lucide-react';
import { telegramApi, authApi, aiApi } from '../../api';
import VoiceTelegramOverlay from './VoiceTelegramOverlay';
import VoiceTelegramCompose from './VoiceTelegramCompose';
import VoiceTelegramAddContact from './VoiceTelegramAddContact';
import { useLang } from '../../lib/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';
import '../Dashboard/Dashboard.css';
import './TelegramDashboard.css';

// Removed local LANGUAGES array as we use SUPPORTED_LANGUAGES from i18n

const SettingsModal = ({ user, onClose, onLanguageChanged }) => {
    const { t } = useLang();
    const [selectedLanguage, setSelectedLanguage] = useState(user?.language_preference || 'en-US');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await authApi.updateLanguage(selectedLanguage);
            onLanguageChanged(res.user);
            onClose();
        } catch (err) {
            alert('Failed to save language: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel glass-panel confirm-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={20} /> {t.settings}</h3>
                    <button className="icon-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t.voiceLanguage}</label>
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1rem' }}
                    >
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
                        {t.voiceLanguageHint}
                    </p>
                </div>

                <div className="confirm-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="cancel-btn" onClick={onClose}>{t.cancel}</button>
                    <button className="primary-btn" style={{ margin: 0 }} onClick={handleSave} disabled={saving}>
                        {saving ? t.saveChanges + '...' : t.saveChanges}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TelegramDashboard = ({ user, onBack, onLogout, onLanguageChanged }) => {
    const { t } = useLang();
    const [activeTab, setActiveTab] = useState('conversations');
    const [conversations, setConversations] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [configured, setConfigured] = useState(null);
    const [modal, setModal] = useState(null);
    const [editingContact, setEditingContact] = useState(null);
    const [composePrefill, setComposePrefill] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const messagesEndRef = useRef(null);
    const [localUser, setLocalUser] = useState(user);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => { setLocalUser(user); }, [user]);

    useEffect(() => {
        telegramApi.getStatus().then(r => setConfigured(r.configured)).catch(() => setConfigured(false));
        fetchConversations();
        fetchContacts();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const r = await telegramApi.getConversations();
            if (r.ok) setConversations(r.conversations);
        } catch (e) { console.error('Failed to load Telegram conversations', e); }
    };

    const fetchContacts = async () => {
        try {
            const r = await telegramApi.getContacts();
            if (r.ok) setContacts(r.contacts);
        } catch (e) { console.error('Failed to load contacts', e); }
    };

    const loadChat = useCallback(async (contact) => {
        setActiveContact(contact);
        setActiveTab('chat');
        setSuggestions([]);
        try {
            const r = await telegramApi.getMessages(contact.id);
            if (r.ok) {
                setMessages(r.messages);
                setLoadingSuggestions(true);
                aiApi.suggestReply(r.messages, 'Telegram')
                    .then(res => { if (res.ok) setSuggestions(res.suggestions || []); })
                    .catch(() => {})
                    .finally(() => setLoadingSuggestions(false));
            }
        } catch (e) { console.error('Failed to load Telegram messages', e); }
    }, []);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !activeContact) return;
        const msg = inputText.trim();
        setInputText('');
        setSending(true);
        const tempMsg = { id: Date.now(), message_text: msg, direction: 'sent', timestamp: Math.floor(Date.now() / 1000) };
        setMessages(prev => [...prev, tempMsg]);
        try {
            await telegramApi.sendMessage(activeContact.name, msg);
            fetchConversations();
        } catch (e) {
            alert('Telegram error: ' + (e.message || 'Unknown error'));
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (msg) => {
        if (!activeContact || !msg.telegram_message_id) return;
        if (!window.confirm('Delete this message?')) return;
        try {
            await telegramApi.deleteMessage(activeContact.name, msg.telegram_message_id);
            setMessages(prev => prev.filter(m => m.id !== msg.id));
        } catch (e) {
            alert('Could not delete: ' + (e.message || 'Error'));
        }
    };

    const handleEditMessage = async (msg) => {
        const newText = window.prompt('Edit message:', msg.message_text);
        if (!newText || !activeContact || !msg.telegram_message_id) return;
        try {
            await telegramApi.editMessage(activeContact.name, msg.telegram_message_id, newText);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message_text: newText } : m));
        } catch (e) {
            alert('Could not edit: ' + (e.message || 'Error'));
        }
    };

    const handleDeleteContact = async (name) => {
        try {
            await telegramApi.deleteContact(name);
            fetchContacts(); fetchConversations();
        } catch (e) { console.error('Delete contact failed', e); }
    };

    const handleStarContact = async (name, isStarred) => {
        try {
            await telegramApi.starContact(name, isStarred);
            fetchContacts();
        } catch (e) { console.error('Star contact failed', e); }
    };

    return (
        <div className="dashboard-container">
            {/* Modals */}
            {modal === 'voice-compose' && (
                <VoiceTelegramCompose
                    user={user}
                    prefill={composePrefill}
                    onClose={() => { setModal(null); setComposePrefill(null); }}
                    onSent={() => { fetchConversations(); fetchContacts(); }}
                    contacts={contacts}
                    isMuted={isMuted}
                />
            )}
            {modal === 'add-contact' && (
                <VoiceTelegramAddContact
                    user={localUser}
                    contactToEdit={editingContact}
                    onClose={() => { setModal(null); setEditingContact(null); }}
                    onAdded={() => { fetchContacts(); fetchConversations(); }}
                    isMuted={isMuted}
                />
            )}
            {modal === 'settings' && (
                <SettingsModal user={localUser} onClose={() => setModal(null)} onLanguageChanged={(updatedUser) => {
                    setLocalUser(updatedUser);
                    onLanguageChanged?.(updatedUser);
                }} />
            )}

            {/* Sidebar */}
            <aside className="dashboard-sidebar glass-panel">
                <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <button className="icon-btn" onClick={onBack} title="Back"><ArrowLeft size={20} /></button>
                    <div className="sidebar-brand">
                        <div className="brand-ic" style={{ background: '#2AABEE' }}><MessageCircle size={20} /></div>
                        <span>{t.telegramHub}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button className={`nav-item ${activeTab === 'conversations' || activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('conversations')}>
                        <MessageCircle size={17} /><span>{t.conversations}</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
                        <Users size={17} /><span>{t.contacts}</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
                        <Activity size={17} /><span>{t.systemStatus}</span>
                    </button>
                </nav>

                <div className="sidebar-user" style={{ marginTop: 'auto' }}>
                    <div className="user-avatar">{localUser?.name?.[0]?.toUpperCase() ?? 'U'}</div>
                    <div className="user-info"><span className="user-name">{localUser?.name ?? 'User'}</span></div>
                </div>
                <div className="sidebar-bottom-controls">
                    <button className="nav-item" onClick={() => setModal('settings')}>
                        <Settings size={17} /> <span>{t.settings}</span>
                    </button>
                    <button className="nav-item danger" onClick={onLogout}>
                        <LogOut size={17} /><span>{t.logout}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main glass-panel" style={{ margin: '12px 12px 12px 0', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>

                {/* Conversations */}
                {activeTab === 'conversations' && (
                    <>
                        <div className="dash-header" style={{ padding: '20px 24px' }}>
                            <div className="folder-title">
                                <h1>{t.recentConversations}</h1>
                                <span className="email-count">{t('activeChats', { n: conversations.length })}</span>
                            </div>
                            <button className="action-pill reply" onClick={() => setModal('voice-compose')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Send size={16} /> {t.newMessage}
                            </button>
                        </div>
                        <div className="email-list">
                            {conversations.length === 0 ? (
                                <div className="empty-folder">
                                    <MessageCircle size={48} style={{ opacity: 0.5 }} />
                                    <p>{t.noTelegramConversations}</p>
                                </div>
                            ) : conversations.map(conv => (
                                <div key={conv.id} className="email-row" style={{ cursor: 'pointer' }} onClick={() => loadChat({ id: conv.contact_id, name: conv.contact_name, telegram_chat_id: conv.telegram_chat_id })}>
                                    <div className="tg-avatar">{conv.contact_name?.[0]?.toUpperCase() || '#'}</div>
                                    <div className="email-body">
                                        <div className="email-top">
                                            <span className="email-sender">{conv.contact_name}</span>
                                            <span className="email-time">{new Date(conv.timestamp * 1000).toLocaleDateString()}</span>
                                        </div>
                                        <div className="email-subject" style={{ fontWeight: 'normal' }}>
                                            {conv.direction === 'sent' ? 'You: ' : ''}{conv.message_text}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Contacts */}
                {activeTab === 'contacts' && (
                    <>
                        <div className="dash-header" style={{ padding: '20px 24px' }}>
                            <div className="folder-title">
                                <h1>{t.telegramContacts}</h1>
                                <span className="email-count">{contacts.length} {t.contacts}</span>
                            </div>
                            <button className="action-pill reply" onClick={() => setModal('add-contact')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} /> {t.newContact}
                            </button>
                        </div>
                        <div className="email-list" style={{ padding: '0 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', paddingTop: '16px' }}>
                                {contacts.map(contact => (
                                    <div key={contact.id} className="contact-card" onClick={() => loadChat(contact)} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                                        {contact.is_starred ? <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#fbbf24' }}>★</div> : null}
                                        <div className="tg-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>{contact.name[0]?.toUpperCase()}</div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{contact.name}</h4>
                                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{contact.phone_number}</p>
                                            {contact.telegram_chat_id && (
                                                <span className="chat-id-pill">💬 {contact.telegram_chat_id}</span>
                                            )}
                                        </div>
                                        <div className="contact-actions" style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}>
                                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditingContact(contact); setModal('add-contact'); }} style={{ background: 'rgba(255,255,255,0.1)', padding: '6px' }} title={t.edit}>✏️</button>
                                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleStarContact(contact.name, !contact.is_starred); }} style={{ background: 'rgba(255,255,255,0.1)', padding: '6px' }} title="Star">
                                                {contact.is_starred ? '⭐' : '☆'}
                                            </button>
                                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete ${contact.name}?`)) handleDeleteContact(contact.name); }} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px' }} title={t.delete}>🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Chat Window */}
                {activeTab === 'chat' && activeContact && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="read-header" style={{ background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="read-meta" style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
                                <div className="tg-avatar">{activeContact.name[0]?.toUpperCase()}</div>
                                <div>
                                    <h3 style={{ margin: 0 }}>{activeContact.name}</h3>
                                    <p style={{ margin: 0, opacity: 0.7, fontSize: '13px' }}>{t.chatId}: {activeContact.telegram_chat_id || t.chatIdNotSet}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setComposePrefill({ to: activeContact.name }); setModal('voice-compose'); }}
                                style={{ background: 'transparent', border: '1px solid #2AABEE', color: '#2AABEE', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                            >
                                <MessageCircle size={14} /> {t.voiceCompose}
                            </button>
                        </div>

                        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{ alignSelf: msg.direction === 'sent' ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
                                    <div className={msg.direction === 'sent' ? 'tg-bubble-sent' : 'tg-bubble-received'}>
                                        <div style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>{msg.message_text}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                                            {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {msg.direction === 'sent' && (
                                            <div className="tg-msg-actions">
                                                <button onClick={() => handleEditMessage(msg)} style={{ background: 'rgba(42,171,238,0.2)', border: 'none', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', color: '#2AABEE', fontSize: '12px' }}><Edit2 size={12} /></button>
                                                <button onClick={() => handleDeleteMessage(msg)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}><Trash2 size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* AI Suggestion Chips */}
                        {(suggestions.length > 0 || loadingSuggestions) && (
                            <div className="ai-suggestions">
                                <span className="ai-suggest-label"><Sparkles size={13} /> {t.aiSuggestions}</span>
                                {loadingSuggestions
                                    ? <span className="ai-suggest-loading">{t.generatingSuggestions}</span>
                                    : suggestions.map((s, i) => (
                                        <button key={i} className="ai-chip tg-chip" onClick={() => setInputText(s)}>
                                            {s}
                                        </button>
                                    ))
                                }
                            </div>
                        )}

                        {/* Composer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button className="icon-btn"><Paperclip size={20} /></button>
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t('messagePlaceholder', { name: activeContact.name })}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '12px 20px', color: 'white', fontFamily: 'inherit' }}
                                disabled={sending}
                            />
                            <button
                                className="icon-btn"
                                style={{ background: inputText.trim() ? '#2AABEE' : 'rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '50%' }}
                                onClick={handleSendMessage}
                                disabled={sending || !inputText.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* System Status */}
                {activeTab === 'status' && (
                    <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
                        <div style={{ textAlign: 'center', maxWidth: '500px', background: 'rgba(255,255,255,0.03)', padding: '48px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {!configured ? (
                                <>
                                    <MessageCircle size={64} color="rgba(255,255,255,0.2)" style={{ marginBottom: '24px' }} />
                                    <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#fff' }}>{t.telegramNotConfigured}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: t.telegramConfigHint }}>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                                        <MessageCircle size={64} color="#2AABEE" />
                                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#22c55e', border: '3px solid #1a1a2e' }} />
                                    </div>
                                    <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#2AABEE' }}>{t.telegramConnected}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: t.telegramConnectedHint }}>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Voice Assistant Overlay */}
            {/* Voice Assistant Overlay */}
            <div style={{ display: modal ? 'none' : 'block', position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
                <VoiceTelegramOverlay
                    user={localUser}
                    contacts={contacts}
                    conversations={conversations}
                    activeContact={activeContact}
                    messages={messages}
                    configured={configured}
                    onNavigate={setActiveTab}
                    onCompose={() => setModal('voice-compose')}
                    onAddContact={() => setModal('add-contact')}
                    onEditContact={(contact) => {
                        setEditingContact(contact);
                        setModal('add-contact');
                    }}
                    onDeleteContact={handleDeleteContact}
                    onStarContact={handleStarContact}
                    onOpenChat={loadChat}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                />
            </div>
        </div>
    );
};

export default TelegramDashboard;

