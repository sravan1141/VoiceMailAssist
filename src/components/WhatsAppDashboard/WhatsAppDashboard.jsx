import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, LogOut, ArrowLeft, Send, Users, Activity, Plus, Image as ImageIcon, Paperclip, Settings, Globe, Sparkles } from 'lucide-react';
import { whatsappApi, authApi, aiApi } from '../../api';
import VoiceWhatsAppOverlay from './VoiceWhatsAppOverlay';
import VoiceWhatsAppCompose from './VoiceWhatsAppCompose';
import VoiceWhatsAppAddContact from './VoiceWhatsAppAddContact';
import { useLang } from '../../lib/LanguageContext';
import '../Dashboard/Dashboard.css'; // Leverage existing dashboard styles
import './WhatsAppDashboard.css'; // We'll assume custom override styles

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'bn-IN', name: 'Bengali (India)' },
    { code: 'ta-IN', name: 'Tamil (India)' },
    { code: 'te-IN', name: 'Telugu (India)' }
];

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
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={20} /> {t('settings')}</h3>
                    <button className="icon-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('voiceLanguage') || 'Voice Assistant Language'}</label>
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1rem' }}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
                        This controls the language used for voice commands, readouts, and speech-to-text.
                    </p>
                </div>

                <div className="confirm-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="cancel-btn" onClick={onClose}>{t('cancel')}</button>
                    <button className="primary-btn" style={{ margin: 0 }} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const WhatsAppDashboard = ({ user, onLogout, onBack, onSwitchApp, onLanguageChanged }) => {
    const { t } = useLang();
    const [configured, setConfigured] = useState(false);
    const [activeTab, setActiveTab] = useState('conversations'); // 'conversations', 'contacts', 'status'
    const [modal, setModal] = useState(null);
    const [composePrefill, setComposePrefill] = useState(null);
    const [isMuted, setIsMuted] = useState(false);

    const [conversations, setConversations] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);

    // Composing state
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const messagesEndRef = useRef(null);
    const [localUser, setLocalUser] = useState(user);

    useEffect(() => { setLocalUser(user); }, [user]);

    // Initial Data Fetching
    useEffect(() => {
        whatsappApi.getStatus()
            .then(res => setConfigured(res.configured))
            .catch(() => setConfigured(false));

        fetchContacts();
        fetchConversations();
    }, []);

    // Auto scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchContacts = async () => {
        try {
            const res = await whatsappApi.getContacts();
            if (res.ok) setContacts(res.contacts);
        } catch (e) {
            console.error("Failed to load contacts", e);
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await whatsappApi.getConversations();
            if (res.ok) setConversations(res.conversations);
        } catch (e) {
            console.error("Failed to load conversations", e);
        }
    };

    const loadChat = async (contact) => {
        setActiveContact(contact);
        setActiveTab('chat');
        setSuggestions([]);
        try {
            const res = await whatsappApi.getMessages(contact.id);
            if (res.ok) {
                setMessages(res.messages);
                // Fetch AI suggestions after messages load
                setLoadingSuggestions(true);
                aiApi.suggestReply(res.messages, 'WhatsApp')
                    .then(r => { if (r.ok) setSuggestions(r.suggestions || []); })
                    .catch(() => {})
                    .finally(() => setLoadingSuggestions(false));
            }
        } catch (e) {
            console.error("Failed to load messages", e);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || !activeContact) return;

        const messageToSend = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            // Optimistic update
            const tempMsg = {
                id: Date.now(),
                message_text: messageToSend,
                direction: 'sent',
                timestamp: Math.floor(Date.now() / 1000)
            };
            setMessages(prev => [...prev, tempMsg]);

            await whatsappApi.sendMessage(activeContact.name, messageToSend);
            fetchConversations(); // refresh latest msg
        } catch (e) {
            alert("WhatsApp error: " + (e.message || 'Unknown error'));
        } finally {
            setSending(false);
        }
    };

    const handleVoiceSend = async (contactName, message, mediaUrl = null) => {
        try {
            await whatsappApi.sendMessage(contactName, message, mediaUrl);
            fetchConversations();
            if (activeContact && activeContact.name.toLowerCase() === contactName.toLowerCase()) {
                loadChat(activeContact); // Refresh current chat if open
            }
        } catch (e) {
            console.error(e);
            alert("WhatsApp error: " + (e.message || 'Unknown error'));
            throw e;
        }
    };

    const handleSendTemplate = async () => {
        if (!activeContact) return;
        if (!window.confirm(`Send test 'hello_world' template to ${activeContact.name}? This helps verify your Meta setup is working.`)) return;

        setSending(true);
        try {
            await whatsappApi.sendTemplateMessage(activeContact.name);
            fetchConversations();
            loadChat(activeContact);
            alert("Test template sent successfully! It should arrive immediately if your number is verified in the Meta dashboard.");
        } catch (e) {
            console.error(e);
            alert("Template error: " + (e.message || 'Unknown error'));
        } finally {
            setSending(false);
        }
    };

    const handleDeleteContact = async (contactName) => {
        try {
            await whatsappApi.deleteContact(contactName);
            fetchContacts();
            fetchConversations();
        } catch (e) {
            console.error("Failed to delete contact", e);
        }
    };

    const handleStarContact = async (contactName, isStarred) => {
        try {
            await whatsappApi.starContact(contactName, isStarred);
            fetchContacts();
        } catch (e) {
            console.error("Failed to toggle star", e);
        }
    };

    return (
        <div className="dashboard-container">
            {/* Modals */}
            {modal === 'voice-compose' && (
                <VoiceWhatsAppCompose
                    user={user}
                    prefill={composePrefill}
                    onClose={() => { setModal(null); setComposePrefill(null); }}
                    onSent={() => { fetchConversations(); fetchContacts(); }}
                    contacts={contacts}
                    isMuted={isMuted}
                />
            )}
            {modal === 'add-contact' && (
                <VoiceWhatsAppAddContact
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

            {/* ── Sidebar ── */}
            <aside className="dashboard-sidebar glass-panel">
                <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <button className="icon-btn" onClick={onBack} title="Back to App Selector">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="sidebar-brand">
                        <div className="brand-ic" style={{ background: '#25D366' }}><MessageCircle size={20} /></div>
                        <span>WhatsApp Hub</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button className={`nav-item ${activeTab === 'conversations' || activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('conversations')}>
                        <MessageCircle size={17} />
                        <span>{t('conversations') || 'Conversations'}</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
                        <Users size={17} />
                        <span>{t('contacts') || 'Contacts'}</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
                        <Activity size={17} />
                        <span>{t('systemStatus') || 'System Status'}</span>
                    </button>
                </nav>

                <div className="sidebar-user" style={{ marginTop: 'auto' }}>
                    <div className="user-avatar">{localUser?.name?.[0]?.toUpperCase() ?? 'U'}</div>
                    <div className="user-info">
                        <span className="user-name">{localUser?.name ?? 'User'}</span>
                    </div>
                </div>

                <div className="sidebar-bottom-controls">
                    <button className="nav-item" onClick={() => setModal('settings')}>
                        <Settings size={17} /> <span>{t('settings')}</span>
                    </button>
                    <button className="nav-item danger" onClick={onLogout}>
                        <LogOut size={17} />
                        <span>{t('logout')}</span>
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="dashboard-main glass-panel" style={{ margin: '12px 12px 12px 0', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>

                {/* Conversations List View */}
                {activeTab === 'conversations' && (
                    <>
                        <div className="dash-header" style={{ padding: '20px 24px' }}>
                            <div className="folder-title">
                                <h1>{t('recentActivity') || 'Recent Conversations'}</h1>
                                <span className="email-count">{conversations.length} Active Chats</span>
                            </div>
                        </div>
                        <div className="email-list">
                            {conversations.length === 0 ? (
                                <div className="empty-folder">
                                    <MessageCircle size={48} style={{ opacity: 0.5 }} />
                                    <p>{t('noActiveConversations') || 'No active conversations found.'}</p>
                                </div>
                            ) : (
                                conversations.map(conv => (
                                    <div key={conv.id} className="email-row" style={{ cursor: 'pointer' }} onClick={() => loadChat({ id: conv.contact_id, name: conv.contact_name, phone_number: conv.phone_number })}>
                                        <div className="email-avatar" style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                                            {conv.contact_name?.[0]?.toUpperCase() || '#'}
                                        </div>
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
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Contacts List View */}
                {activeTab === 'contacts' && (
                    <>
                        <div className="dash-header" style={{ padding: '20px 24px' }}>
                            <div className="folder-title">
                                <h1>{t('contacts') || 'Address Book'}</h1>
                                <span className="email-count">{contacts.length} {t('contacts') || 'Contacts'}</span>
                            </div>
                            <button className="action-pill reply" onClick={() => setModal('add-contact')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} /> {t('addContact') || 'New Contact'}
                            </button>
                        </div>
                        <div className="email-list" style={{ padding: '0 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', paddingTop: '16px' }}>
                                {contacts.map(contact => (
                                    <div key={contact.id} className="contact-card" onClick={() => loadChat(contact)} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                                        {contact.is_starred ? <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#fbbf24' }}>★</div> : null}
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                                            {contact.name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{contact.name}</h4>
                                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{contact.phone_number}</p>
                                        </div>
                                        {/* Hover Actions */}
                                        <div className="contact-actions" style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}>
                                            <button
                                                className="icon-btn"
                                                onClick={(e) => { e.stopPropagation(); setEditingContact(contact); setModal('add-contact'); }}
                                                style={{ background: 'rgba(255,255,255,0.1)', padding: '6px' }}
                                                title="Edit Contact"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={(e) => { e.stopPropagation(); handleStarContact(contact.name, !contact.is_starred); }}
                                                style={{ background: 'rgba(255,255,255,0.1)', padding: '6px' }}
                                                title={contact.is_starred ? "Unstar Contact" : "Star Contact"}
                                            >
                                                {contact.is_starred ? '⭐' : '☆'}
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Are you sure you want to delete ${contact.name}?`)) {
                                                        handleDeleteContact(contact.name);
                                                    }
                                                }}
                                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px' }}
                                                title="Delete Contact"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Chat Window View */}
                {activeTab === 'chat' && activeContact && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="read-header" style={{ background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="read-meta" style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
                                <div className="read-avatar" style={{ background: '#25D366', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>{activeContact.name[0]?.toUpperCase()}</div>
                                <div>
                                    <h3 style={{ margin: 0 }}>{activeContact.name}</h3>
                                    <p style={{ margin: 0, opacity: 0.7 }}>{activeContact.phone_number}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSendTemplate}
                                disabled={sending}
                                style={{ background: 'transparent', border: '1px solid #25D366', color: '#25D366', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                            >
                                <Send size={14} /> {t('sendTestTemplate') || 'Send Test Template'}
                            </button>
                        </div>

                        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{ alignSelf: msg.direction === 'sent' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                    <div style={{
                                        background: msg.direction === 'sent' ? '#075E54' : 'rgba(255,255,255,0.1)',
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: msg.direction === 'sent' ? '4px' : '16px',
                                        borderBottomLeftRadius: msg.direction === 'received' ? '4px' : '16px'
                                    }}>
                                        {msg.media_url && (
                                            <ImageIcon size={48} style={{ opacity: 0.5, marginBottom: '8px' }} />
                                        )}
                                        <div style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>{msg.message_text}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '6px', textAlign: 'right' }}>
                                            {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* AI Suggestion Chips */}
                        {(suggestions.length > 0 || loadingSuggestions) && (
                            <div className="ai-suggestions">
                                <span className="ai-suggest-label"><Sparkles size={13} /> {t('aiSuggestions') || 'AI Suggestions'}</span>
                                {loadingSuggestions
                                    ? <span className="ai-suggest-loading">{t('generatingSuggestions') || 'Generating suggestions...'}</span>
                                    : suggestions.map((s, i) => (
                                        <button key={i} className="ai-chip" onClick={() => setInputText(s)}>
                                            {s}
                                        </button>
                                    ))
                                }
                            </div>
                        )}

                        {/* Composer Footer */}
                        <div className="chat-composer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button className="icon-btn"><Paperclip size={20} /></button>
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={`${t('message') || 'Message'} ${activeContact.name}...`}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '12px 20px', color: 'white', fontFamily: 'inherit' }}
                                disabled={sending}
                            />
                            <button
                                className="icon-btn"
                                style={{ background: inputText.trim() ? '#25D366' : 'rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '50%' }}
                                onClick={handleSendMessage}
                                disabled={sending || !inputText.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* System Status View */}
                {activeTab === 'status' && (
                    <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
                        <div style={{ textAlign: 'center', maxWidth: '500px', background: 'rgba(255, 255, 255, 0.03)', padding: '48px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            {!configured ? (
                                <>
                                    <MessageCircle size={64} color="rgba(255,255,255,0.2)" style={{ marginBottom: '24px' }} />
                                    <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#fff' }}>WhatsApp Not Configured</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                                        To enable WhatsApp messaging, connect your Meta Developer account. Set <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> in your <code>.env</code> file.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                                        <Send size={64} color="#25D366" />
                                        <span style={{ position: 'absolute', bottom: -5, right: -5, width: 20, height: 20, background: '#25D366', borderRadius: '50%', border: '4px solid #18181b' }}></span>
                                    </div>
                                    <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#fff' }}>{t('whatsappCloudActive') || 'WhatsApp Cloud Active'}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                                        {t('whatsappEngineOnline') || 'The secure messaging engine is online. Say'} <strong>"{t('sendWhatsAppTo') || 'Send WhatsApp to'} [Name]"</strong> {t('toSecurelyTransmit') || 'to securely transmit a real message through your Meta Cloud API.'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <div style={{ display: modal ? 'none' : 'block' }}>
                <VoiceWhatsAppOverlay
                    onLogout={onLogout}
                    configured={configured}
                    onGoApps={onBack}
                    onSwitchEmail={() => onSwitchApp('email')}
                    onSendVoiceMessage={handleVoiceSend}
                    onCompose={() => { setComposePrefill(null); setModal('voice-compose'); }}
                    onAddContact={() => setModal('add-contact')}
                    onEditContact={(contact) => { setEditingContact(contact); setModal('add-contact'); }}
                    onDeleteContact={handleDeleteContact}
                    onStarContact={handleStarContact}
                    onOpenChat={(contact) => loadChat(contact)}
                    autoListen={!modal}
                    isVoiceComposeActive={modal === 'voice-compose' || modal === 'add-contact'}
                    contacts={contacts}
                    conversations={conversations}
                    activeContact={activeContact}
                    messages={messages}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                />
            </div>
        </div>
    );
};

export default WhatsAppDashboard;
