import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Inbox, Send, Trash2, AlertOctagon, Star, FileText,
    Settings, LogOut, Mail, MoreVertical, Plus,
    RefreshCw, Search, Loader, MailOpen, Wifi, WifiOff, Globe,
    Menu, X, User, ChevronRight, ArrowLeft, Home, Grid, Mic
} from 'lucide-react';
import VoiceAssistantOverlay from '../VoiceAssistant/VoiceAssistantOverlay';
import VoiceCompose from '../VoiceAssistant/VoiceCompose';
import VoiceInput from '../VoiceInput/VoiceInput';
import { gmailApi, authApi } from '../../api';
import { useLang } from '../../lib/LanguageContext';
import './Dashboard.css';

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'bn-IN', name: 'Bengali (India)' },
    { code: 'ta-IN', name: 'Tamil (India)' },
    { code: 'te-IN', name: 'Telugu (India)' }
];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Modals ───────────────────────────────────────────────────────────────────

const ConfirmModal = ({ email, onConfirm, onCancel }) => {
    const { t } = useLang();
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-panel glass-panel confirm-modal" onClick={e => e.stopPropagation()}>
                <div className="confirm-icon"><Trash2 size={32} color="var(--color-danger)" /></div>
                <h3>{t('deleteEmail')}</h3>
                <p>{t('deleteConfirmMsg').replace('{subject}', email?.subject || '')}</p>
                <div className="confirm-actions">
                    <button className="cancel-btn" onClick={onCancel}>{t('cancel')}</button>
                    <button className="danger-btn" onClick={onConfirm}>{t('delete')}</button>
                </div>
            </div>
        </div>
    );
};

const generateReplyRecommendations = (email, lang) => {
    const body = (email?.body || email?.snippet || '').toLowerCase();
    const subject = (email?.subject || '').toLowerCase();
    const sender = email?.sender || 'them';
    const senderName = sender.replace(/<.*>/, '').trim() || 'them';

    const isQuestion = body.includes('?') || subject.includes('?');
    const isMeeting = body.includes('meeting') || body.includes('schedule') || body.includes('appointment') || body.includes('call');
    const isThankYou = body.includes('thank') || body.includes('appreciate') || body.includes('grateful');
    const isUrgent = body.includes('urgent') || body.includes('asap') || body.includes('immediately') || subject.includes('urgent');
    const isInvitation = body.includes('invite') || body.includes('invitation') || body.includes('join us') || body.includes('event');

    const suggestions = {
        'en-US': isQuestion
            ? ['Thank you for your message. I will get back to you shortly.', 'Yes, that sounds good to me.', 'Could you provide more details about this?']
            : isMeeting
            ? ['Yes, that time works for me.', 'I will check my calendar and confirm.', 'Can we reschedule to a later date?']
            : isThankYou
            ? ['You are most welcome!', 'Happy to help anytime.', 'Thank you for letting me know.']
            : isUrgent
            ? ['I am on it, I will update you soon.', 'Received — handling this right away.', 'Please give me a moment to look into this.']
            : isInvitation
            ? ['I would love to attend!', 'Thank you for the invitation — I will be there.', 'Sorry, I have a prior commitment at that time.']
            : ['Thank you for your email.', 'I will follow up on this soon.', 'Got it, thank you for letting me know.'],
        'hi-IN': isQuestion
            ? ['आपके संदेश के लिए धन्यवाद। मैं जल्द ही आपसे संपर्क करूँगा।', 'हाँ, यह मुझे ठीक लगता है।', 'क्या आप इसके बारे में अधिक जानकारी दे सकते हैं?']
            : isMeeting
            ? ['हाँ, वह समय मेरे लिए ठीक है।', 'मैं अपना कैलेंडर जाँचूँगा और पुष्टि करूँगा।', 'क्या हम तारीख बदल सकते हैं?']
            : ['आपके ईमेल के लिए धन्यवाद।', 'मैं जल्द ही इस पर वापस आऊँगा।', 'समझ गया, धन्यवाद।'],
        'te-IN': isQuestion
            ? ['మీ సందేశానికి ధన్యవాదాలు. నేను త్వరలో మీకు సమాధానమిస్తాను.', 'అవును, అది నాకు సరిపోతుంది.', 'దయచేసి మరిన్ని వివరాలు ఇవ్వగలరా?']
            : isMeeting
            ? ['అవును, ఆ సమయం నాకు సరిపోతుంది.', 'నేను నా క్యాలెండర్ తనిఖీ చేసి నిర్ధారిస్తాను.', 'మనం తేదీ మార్చగలమా?']
            : ['మీ ఇమెయిల్‌కు ధన్యవాదాలు.', 'నేను త్వరలో అనుసరిస్తాను.', 'అర్థమైంది, తెలియజేసినందుకు ధన్యవాదాలు.'],
        'ta-IN': isQuestion
            ? ['உங்கள் செய்திக்கு நன்றி. நான் விரைவில் பதில் அளிக்கிறேன்.', 'ஆம், அது எனக்கு சரியாக இருக்கும்.', 'மேலும் விவரங்கள் தர முடியுமா?']
            : ['உங்கள் மின்னஞ்சலுக்கு நன்றி.', 'நான் விரைவில் தொடர்புகொள்கிறேன்.', 'புரிந்தது, நன்றி.'],
        'bn-IN': isQuestion
            ? ['আপনার বার্তার জন্য ধন্যবাদ। আমি শীঘ্রই আপনার সাথে যোগাযোগ করব।', 'হ্যাঁ, এটি আমার জন্য ঠিক আছে।', 'আরও বিস্তারিত বলতে পারবেন?']
            : ['আপনার ইমেইলের জন্য ধন্যবাদ।', 'আমি শীঘ্রই এটি অনুসরণ করব।', 'বুঝলাম, জানানোর জন্য ধন্যবাদ।'],
        'es-ES': isQuestion
            ? ['Gracias por su mensaje. Me pondré en contacto pronto.', 'Sí, me parece bien.', '¿Podría darme más detalles?']
            : ['Gracias por su correo.', 'Le haré seguimiento pronto.', 'Entendido, gracias por informarme.'],
        'fr-FR': isQuestion
            ? ['Merci pour votre message. Je vous répondrai bientôt.', 'Oui, cela me convient.', 'Pouvez-vous me donner plus de détails?']
            : ['Merci pour votre email.', 'Je ferai un suivi bientôt.', 'Compris, merci de m\'avoir informé.'],
    };

    return suggestions[lang] || suggestions['en-US'];
};

const ReadEmailModal = ({ email, onClose, onReply, lang }) => {
    const { t, lang: ctxLang } = useLang();
    const currentLang = lang || ctxLang;
    const [suggestions, setSuggestions] = React.useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

    React.useEffect(() => {
        if (!email) return;
        setLoadingSuggestions(true);
        const recs = generateReplyRecommendations(email, currentLang);
        setSuggestions(recs);
        setLoadingSuggestions(false);
    }, [email, currentLang]);

    const handleUseSuggestion = (text) => {
        onReply({ ...email, prefillBody: text });
        onClose();
    };

    return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-panel glass-panel read-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="read-header">
                <div className="read-meta">
                    <div className="read-avatar">{email?.sender?.[0]?.toUpperCase()}</div>
                    <div>
                        <h3>{email?.subject}</h3>
                        <p>From: <strong>{email?.sender}</strong> &bull; {email?.date ? new Date(email.date).toLocaleString() : email?.date}</p>
                    </div>
                </div>
                <button className="icon-close" onClick={onClose}><MailOpen size={18} /></button>
            </div>
            <div className="read-body">
                <pre className="email-fullbody">{email?.body || email?.snippet}</pre>
            </div>

            {/* Reply Recommendations */}
            <div className="reply-recommendations">
                <div className="reply-rec-header">
                    <span>💡 {t('replyRecommendations') || 'Reply Suggestions'}</span>
                </div>
                {loadingSuggestions ? (
                    <div className="reply-rec-loading">{t('generating') || 'Generating...'}</div>
                ) : (
                    <div className="reply-rec-list">
                        {suggestions.map((s, i) => (
                            <button key={i} className="reply-rec-item" onClick={() => handleUseSuggestion(s)} title={t('useThisReply') || 'Use this reply'}>
                                <span className="reply-rec-text">{s}</span>
                                <span className="reply-rec-arrow">→</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="read-actions">
                <button className="action-pill reply" onClick={() => { onReply(email); onClose(); }}>{t('reply')}</button>
            </div>
        </div>
    </div>
    );
};



const ComposeModal = ({ user, prefill, onClose, onSent }) => {
    const { t, lang } = useLang();
    const [form, setForm] = useState({ to: prefill?.to || '', subject: prefill?.subject ? `Re: ${prefill.subject}` : '', body: prefill?.prefillBody || prefill?.body || '' });
    const [status, setStatus] = useState({ type: '', msg: '' });

    const handleSend = async (e) => {
        e.preventDefault();
        if (!form.to || !form.subject || !form.body) {
            return setStatus({ type: 'error', msg: 'All fields are required.' });
        }
        setStatus({ type: 'loading', msg: 'Sending...' });
        try {
            await gmailApi.sendMessage(form);
            setStatus({ type: 'success', msg: '✓ Email sent successfully!' });
            await delay(1200);
            onSent?.();
            onClose();
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel glass-panel compose-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title"><Send size={18} /> {t('newEmail')}</span>
                    <button className="icon-close" onClick={onClose}>✕</button>
                </div>
                {status.type === 'success' ? (
                    <div className="sent-confirmation">{t('emailSentSuccess')}</div>
                ) : (
                    <form onSubmit={handleSend} className="compose-form">
                        {status.msg && (
                            <div className={`compose-status ${status.type}`}>{status.msg}</div>
                        )}
                        <VoiceInput value={form.to} onChange={(v) => setForm(f => ({ ...f, to: v }))}>
                            <input type="email" placeholder="To: recipient@example.com" value={form.to}
                                onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required autoFocus />
                        </VoiceInput>
                        <VoiceInput value={form.subject} onChange={(v) => setForm(f => ({ ...f, subject: v }))}>
                            <input type="text" placeholder="Subject" value={form.subject}
                                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                        </VoiceInput>
                        <VoiceInput value={form.body} onChange={(v) => setForm(f => ({ ...f, body: v }))} continuous>
                            <textarea placeholder="Write your message here..." value={form.body}
                                onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={7} required />
                        </VoiceInput>
                        <button type="submit" className="send-btn" disabled={status.type === 'loading'}>
                            {status.type === 'loading' ? <><Loader size={16} className="spin" /> Sending...</> : <><Send size={16} /> {t('send')}</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Voice Assistant Language</label>
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
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Folder definitions ───────────────────────────────────────────────────────
const FOLDERS = [
    { id: 'INBOX',   tKey: 'inbox',   icon: Inbox },
    { id: 'SENT',    tKey: 'sent',    icon: Send },
    { id: 'DRAFTS',  tKey: 'drafts',  icon: FileText },
    { id: 'SPAM',    tKey: 'spam',    icon: AlertOctagon },
    { id: 'TRASH',   tKey: 'trash',   icon: Trash2 },
    { id: 'STARRED', tKey: 'starred', icon: Star },
];

// ─── Gmail Selector Modal ───────────────────────────────────────────────────
const GmailSelectorModal = ({ user, gmails, onSelect, onClose }) => {
    const { t } = useLang();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [listening, setListening] = useState(false);
    const [voiceHint, setVoiceHint] = useState('Say an account name or email to switch');
    const recognitionRef = useRef(null);
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    const handleSelect = async (gmailId) => {
        if (busy) return;
        stopVoice();
        setBusy(true);
        setErr('');
        try {
            await authApi.selectGmail(gmailId);
            onSelect(gmailId);
        } catch (e) {
            setBusy(false);
            setErr(e.message);
        }
    };

    const stopVoice = () => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setListening(false);
    };

    const startVoice = () => {
        if (!SpeechAPI || busy) return;
        stopVoice();
        const rec = new SpeechAPI();
        rec.lang = user?.language_preference || 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onstart = () => { setListening(true); setVoiceHint('Listening...'); };
        rec.onend = () => { setListening(false); setVoiceHint('Say an account name or email to switch'); };
        rec.onerror = () => { setListening(false); setVoiceHint('Could not hear — tap mic or click an account'); };
        rec.onresult = (e) => {
            const heard = e.results[0][0].transcript.toLowerCase().trim();
            setVoiceHint(`Heard: "${heard}"`);
            // Match against gmail address or label
            const matched = gmails.find(g =>
                heard.includes(g.address.toLowerCase()) ||
                heard.includes((g.label || '').toLowerCase()) ||
                g.address.toLowerCase().split('@')[0].includes(heard) ||
                heard.includes(g.address.toLowerCase().split('@')[0])
            );
            if (matched) {
                setVoiceHint(`Switching to ${matched.address}...`);
                handleSelect(matched.id);
            } else {
                setVoiceHint(`No match for "${heard}" — try again or click an account`);
                setTimeout(() => startVoice(), 1500);
            }
        };
        rec.start();
        recognitionRef.current = rec;
    };

    // Auto-start listening when modal opens
    useEffect(() => {
        if (SpeechAPI) {
            setTimeout(() => startVoice(), 400);
        }
        return () => stopVoice();
    }, []);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel glass-panel confirm-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'left', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={20} /> Select Account</h3>
                    <button className="icon-close" onClick={() => { stopVoice(); onClose(); }}>✕</button>
                </div>

                {/* Voice hint bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: listening ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${listening ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, marginBottom: '1rem', transition: 'all 0.3s' }}>
                    <button
                        onClick={listening ? stopVoice : startVoice}
                        disabled={busy}
                        style={{ background: listening ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0, animation: listening ? 'pulse 1.2s ease-in-out infinite' : 'none' }}
                        title={listening ? 'Stop listening' : 'Tap to speak'}
                    >
                        <Mic size={15} />
                    </button>
                    <span style={{ fontSize: '0.8rem', color: listening ? 'rgba(200,200,255,0.9)' : 'rgba(255,255,255,0.55)' }}>{voiceHint}</span>
                </div>

                {err && <p className="error-text" style={{ marginBottom: '1rem' }}>{err}</p>}

                <div className="gmail-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {gmails.map((g, i) => (
                        <button
                            key={g.id}
                            className={`gmail-list-item ${busy ? 'disabled' : ''}`}
                            onClick={() => handleSelect(g.id)}
                            disabled={busy}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                width: '100%', padding: '12px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                    {g.address[0].toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.address}</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Say "{i === 0 ? 'first' : 'second'}" or "{g.address.split('@')[0]}"</span>
                                </div>
                            </div>
                            <ChevronRight size={18} />
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="cancel-btn" onClick={() => { stopVoice(); onClose(); }}>{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = ({ user, onLogout, onBack, onSwitchApp, onLanguageChanged }) => {
    const { t, lang } = useLang();
    console.log('[Dashboard] User object:', user);
    const [activeFolder, setActiveFolder] = useState('INBOX');
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [labelCounts, setLabelCounts] = useState({});
    const [modal, setModal] = useState(null);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [composePrefill, setComposePrefill] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [hasGmail, setHasGmail] = useState(user?.hasGmail || false);
    const [enableAutoListen, setEnableAutoListen] = useState(false);
    const [localUser, setLocalUser] = useState(user);
    const [gmails, setGmails] = useState(user?.gmails || []);

    const fetchUser = useCallback(async () => {
        try {
            const data = await authApi.me();
            if (data.user) {
                setLocalUser(data.user);
                setGmails(data.user.gmails || []);
                setHasGmail(data.user.hasGmail);
            }
        } catch (err) {
            console.error('[Dashboard] Failed to refresh user:', err);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const activeGmail = gmails.find(g => g.id === localUser?.activeGmailId) || gmails[0];



    // ── Fetch emails ──
    const fetchEmails = useCallback(async (folder = activeFolder, q = searchQuery) => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await gmailApi.listMessages(folder, q);
            setEmails(data.messages || []);
        } catch (err) {
            setLoadError(err.message);
            setEmails([]);
        } finally {
            setLoading(false);
        }
    }, [activeFolder, searchQuery]);

    // ── Fetch label unread counts ──
    const fetchLabels = useCallback(async () => {
        try {
            const data = await gmailApi.getLabels();
            const map = {};
            (data.labels || []).forEach(l => { map[l.id] = l.unread; });
            setLabelCounts(map);
        } catch { }
    }, []);

    useEffect(() => {
        if (hasGmail) {
            fetchEmails();
            fetchLabels();
        } else {
            setLoading(false);
        }
    }, [activeFolder, hasGmail]);

    // Enable auto-listening after initial load
    useEffect(() => {
        console.log('[Dashboard] Auto-listening effect:', { loading, hasGmail, enableAutoListen });
        if (!loading) {
            // Enable auto-listening after a short delay to let everything settle
            const timer = setTimeout(() => {
                console.log('[Dashboard] Setting enableAutoListen to true');
                setEnableAutoListen(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    const handleFolderChange = (folder) => {
        setActiveFolder(folder);
        setSearchQuery('');
        setSearchInput('');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        fetchEmails(activeFolder, searchInput);
    };

    // ── Open email ──
    const handleOpenEmail = async (email, voiceRead = false) => {
        // If we only have the summary, fetch the full message
        let fullEmail = email;
        if (!email.body && email.id) {
            try {
                const data = await gmailApi.getMessage(email.id);
                fullEmail = data.message;
            } catch { }
        }
        setSelectedEmail(fullEmail);
        setModal('read');
        // Mark as read
        if (!email.read && email.id) {
            gmailApi.markRead(email.id).catch(() => { });
            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
        }

        // Notify voice assistant if it should read this out loud
        if (voiceRead && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('va-read-email', { detail: fullEmail }));
        }

        return fullEmail;
    };

    // ── Delete email ──
    const handleDeleteConfirm = (email) => { setSelectedEmail(email); setModal('confirm'); };
    const handleDeleteExecute = async () => {
        try {
            await gmailApi.deleteMessage(selectedEmail.id);
            setEmails(prev => prev.filter(e => e.id !== selectedEmail.id));
            fetchLabels();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        } finally {
            setModal(null);
            setSelectedEmail(null);
        }
    };

    // ── Star email ──
    const handleToggleStar = async (email) => {
        const isStarred = email.labels?.includes('STARRED');
        // Optimistic UI update
        setEmails(prev => prev.map(e => e.id === email.id
            ? { ...e, labels: isStarred ? e.labels.filter(l => l !== 'STARRED') : [...(e.labels || []), 'STARRED'] }
            : e
        ));
        if (selectedEmail?.id === email.id) {
            setSelectedEmail(prev => ({
                ...prev,
                labels: isStarred ? prev.labels.filter(l => l !== 'STARRED') : [...(prev.labels || []), 'STARRED']
            }));
        }
        try {
            await gmailApi.toggleStar(email.id, !isStarred);
            fetchLabels();
        } catch (err) {
            console.error('Failed to toggle star', err);
            // Revert on failure
            fetchEmails();
        }
    };

    // Voice handlers for context
    const handleDeleteContextual = async () => {
        if (!selectedEmail) return false;
        await gmailApi.deleteMessage(selectedEmail.id);
        setEmails(prev => prev.filter(e => e.id !== selectedEmail.id));
        setSelectedEmail(null);
        setModal(null);
        fetchLabels();
        return true;
    };

    const handleDeleteIndex = async (index) => {
        const email = emails[index];
        if (!email) return false;
        await gmailApi.deleteMessage(email.id);
        setEmails(prev => prev.filter(e => e.id !== email.id));
        fetchLabels();
        return true;
    };

    const handleStarContextual = async () => {
        if (!selectedEmail) return false;
        await handleToggleStar(selectedEmail);
        return true;
    };

    // ── Reply ──
    const handleReply = (email) => {
        const sender = email.sender?.match(/<(.+)>/)?.[1] || email.sender || '';
        setComposePrefill({
            to: sender,
            subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            body: `\n\n---\nOn ${email.date}, ${email.sender} wrote:\n${email.body?.slice(0, 500) || ''}`,
        });
        setModal('compose');
    };

    // ── Voice Next/Prev/Reply ──
    const handleNextEmail = async () => {
        if (!selectedEmail || emails.length === 0) return null;
        const currentIndex = emails.findIndex(e => e.id === selectedEmail.id);
        if (currentIndex !== -1 && currentIndex < emails.length - 1) {
            return await handleOpenEmail(emails[currentIndex + 1], true);
        }
        return null;
    };

    const handlePrevEmail = async () => {
        if (!selectedEmail || emails.length === 0) return null;
        const currentIndex = emails.findIndex(e => e.id === selectedEmail.id);
        if (currentIndex > 0) {
            return await handleOpenEmail(emails[currentIndex - 1], true);
        }
        return null;
    };

    const handleVoiceReply = () => {
        if (selectedEmail) {
            const sender = selectedEmail.sender?.match(/<(.+)>/)?.[1] || selectedEmail.sender || '';
            setComposePrefill({
                to: sender,
                subject: selectedEmail.subject?.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
                body: `\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.sender} wrote:\n${selectedEmail.body?.slice(0, 500) || ''}`,
            });
            setModal('voice-compose');
            return true;
        }
        return false;
    };

    // ── Connect Gmail ──
    const handleConnectGmail = () => {
        window.location.href = 'http://localhost:3002/api/auth/google?relink=1';
    };

    // ── Logout ──
    const handleLogout = async () => {
        try { await authApi.logout(); } catch { }
        onLogout();
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-container">
            {/* Modals */}
            {modal === 'read' && <ReadEmailModal email={selectedEmail} onClose={() => setModal(null)} onReply={handleReply} />}
            {modal === 'compose' && <ComposeModal user={localUser} prefill={composePrefill} onClose={() => { setModal(null); setComposePrefill(null); }} onSent={fetchLabels} />}
            {modal === 'voice-compose' && <VoiceCompose user={localUser} prefill={composePrefill} onClose={() => { setModal(null); setComposePrefill(null); }} onSent={fetchLabels} />}
            {modal === 'confirm' && <ConfirmModal email={selectedEmail} onConfirm={handleDeleteExecute} onCancel={() => setModal(null)} />}
            {modal === 'settings' && (
                <SettingsModal user={localUser} onClose={() => setModal(null)} onLanguageChanged={(updatedUser) => {
                    setLocalUser(updatedUser);
                    onLanguageChanged?.(updatedUser);
                }} />
            )}

            {modal === 'switch-account' && (
                <GmailSelectorModal
                    user={localUser}
                    gmails={gmails}
                    onSelect={(gmailId) => {
                        // Immediately update local state so the sidebar reflects the new account
                        setLocalUser(prev => ({ ...prev, activeGmailId: gmailId }));
                        setModal(null);
                        // Reload emails for the new account
                        setTimeout(() => fetchEmails(), 100);
                    }}
                    onClose={() => setModal(null)}
                />
            )}


            {/* Sidebar */}
            <aside className="dashboard-sidebar glass-panel">
                <div className="sidebar-header">
                    <div className="brand-wrap">
                        <div className="brand-logo"><Mail size={24} /></div>
                        <h2>{t('emailAssist')}</h2>
                    </div>
                    <button className="icon-btn" onClick={onBack} title={t('exitToApps')}>
                        <Home size={20} />
                    </button>
                </div>

                <div className="user-profile-summary">
                    <div className="user-info-brief">
                        <span className="user-name">{localUser?.username}</span>
                        <div className="active-email-wrap" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="user-email">{activeGmail?.address || t('noGmailLinked')}</span>
                            {gmails.length > 1 && (
                                <button
                                    className="icon-btn-xs"
                                    onClick={() => setModal('switch-account')}
                                    title="Switch Account"
                                    style={{ padding: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}
                                >
                                    <RefreshCw size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <button className="compose-btn" onClick={() => { setComposePrefill(null); setModal('compose'); }}>
                    <Plus size={18} /> {t('compose')}
                </button>

                <nav className="sidebar-nav">
                    {FOLDERS.map(({ id, tKey, icon: Icon }) => (
                        <button key={id}
                            className={`nav-item ${activeFolder === id ? 'active' : ''}`}
                            onClick={() => handleFolderChange(id)}>
                            <Icon size={17} />
                            <span>{t(tKey)}</span>
                            {!!labelCounts[id] && <span className="badge">{labelCounts[id]}</span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="user-avatar">{localUser?.name?.[0]?.toUpperCase() ?? 'U'}</div>
                    <div className="user-info">
                        <span className="user-name">{localUser?.name ?? 'User'}</span>
                        <span className="user-email">{activeGmail?.address || localUser?.email || ''}</span>
                    </div>
                </div>

                <div className="sidebar-bottom-controls">
                    <button className="nav-item" onClick={() => setModal('settings')}>
                        <Settings size={17} /> <span>{t('settings')}</span>
                    </button>
                    {!hasGmail && (
                        <button className="nav-item gmail-connect" onClick={handleConnectGmail}>
                            <Wifi size={17} /> <span>{t('connectGmail')}</span>
                        </button>
                    )}
                    <button className="nav-item danger" onClick={handleLogout}>
                        <LogOut size={17} /> <span>{t('logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dash-header">
                    <div className="folder-title">
                        <h1>{t(FOLDERS.find(f => f.id === activeFolder)?.tKey ?? 'inbox')}</h1>
                        <span className="email-count">{loading ? '...' : `${emails.length} ${t('messages') || 'messages'}`}</span>
                    </div>
                    <div className="header-actions">
                        <form className="search-wrap" onSubmit={handleSearch}>
                            <Search size={16} />
                            <VoiceInput value={searchInput} onChange={(v) => { setSearchInput(v); }}>
                                <input
                                    type="text"
                                    placeholder={t('searchEmails') || 'Search emails...'}
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                />
                            </VoiceInput>
                        </form>
                        <button className="icon-btn refresh-btn" title="Refresh"
                            onClick={() => { fetchEmails(); fetchLabels(); }}>
                            <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        </button>
                        <div className="va-status">
                            <span className="pulse-dot"></span> {t('assistantActive')}
                        </div>
                    </div>
                </header>

                {/* No Gmail connected */}
                {!hasGmail ? (
                    <div className="glass-panel email-list no-gmail">
                        <WifiOff size={48} color="rgba(255,255,255,0.15)" />
                        <h3>{t('gmailNotConnected')}</h3>
                        <p>{t('connectGmailToReadAndSend')}</p>
                        <button className="primary-btn" style={{ maxWidth: '220px' }} onClick={handleConnectGmail}>
                            {t('connectGmail')}
                        </button>
                    </div>
                ) : loading ? (
                    <div className="glass-panel email-list loading-emails">
                        <Loader size={36} className="spin" color="var(--color-primary)" />
                        <p>{t('loadingEmails') || 'Loading emails...'}</p>
                    </div>
                ) : loadError ? (
                    <div className="glass-panel email-list error-emails">
                        {loadError.includes('gmail_token_expired') || loadError.includes('expired') ? (
                            <>
                                <p className="error-text">⚠ {t('gmailSessionExpired') || 'Your Gmail session has expired.'}</p>
                                <a
                                    href="http://localhost:3002/api/auth/google?relink=1"
                                    className="primary-btn"
                                    style={{ maxWidth: '220px', display: 'inline-block', textAlign: 'center', marginTop: '12px', textDecoration: 'none' }}
                                >
                                    {t('reconnectGmail') || 'Reconnect Gmail'}
                                </a>
                            </>
                        ) : (
                            <>
                                <p className="error-text">⚠ {loadError}</p>
                                <button className="primary-btn" style={{ maxWidth: '180px' }} onClick={() => fetchEmails()}>{t('retry') || 'Retry'}</button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="email-list glass-panel">
                        {emails.length === 0 ? (
                            <div className="empty-folder">
                                <MailOpen size={48} color="rgba(255,255,255,0.15)" />
                                <p>{(t('noEmailsIn') || 'No emails in ') + (t(activeFolder?.toLowerCase()) || (FOLDERS.find(f => f.id === activeFolder)?.label || 'folder'))}</p>
                            </div>
                        ) : emails.map(email => (
                            <div key={email.id} className={`email-row ${!email.read ? 'unread' : ''}`}>
                                <div className="email-avatar">{email.sender?.[0]?.toUpperCase()}</div>
                                <div className="email-body" onClick={() => handleOpenEmail(email)}>
                                    <div className="email-top">
                                        <span className="email-sender">{email.sender?.replace(/<.+>/, '').trim()}</span>
                                        <span className="email-time">{email.date ? new Date(email.date).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div className="email-subject">{email.subject}</div>
                                    <p className="email-preview">{email.snippet}</p>
                                </div>
                                <div className="email-actions">
                                    <button className={`email-action-btn star ${email.labels?.includes('STARRED') ? 'starred' : ''}`} title="Star"
                                        onClick={(e) => { e.stopPropagation(); handleToggleStar(email); }}>
                                        <Star size={16} fill={email.labels?.includes('STARRED') ? 'currentColor' : 'none'} color={email.labels?.includes('STARRED') ? 'var(--color-warning)' : 'currentColor'} />
                                    </button>
                                    <button className="email-action-btn delete" title="Delete"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteConfirm(email); }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <div style={{ display: modal === 'voice-compose' ? 'none' : 'block' }}>
                <VoiceAssistantOverlay
                    autoListen={enableAutoListen && (!modal || modal === 'read')}
                    isVoiceComposeActive={modal === 'voice-compose'}
                    selectedEmail={selectedEmail}
                    user={localUser}
                    onCompose={() => { setComposePrefill(null); setModal('voice-compose'); }}
                    onReadLatest={() => emails.length ? handleOpenEmail(emails[0], true) : null}
                    onLogout={handleLogout}
                    onNavigate={(folder) => handleFolderChange(folder)}
                    onReply={handleVoiceReply}
                    onNextEmail={handleNextEmail}
                    onPrevEmail={handlePrevEmail}
                    onDeleteContextual={handleDeleteContextual}
                    onDeleteIndex={handleDeleteIndex}
                    onStarContextual={handleStarContextual}
                    emails={emails}
                    onGoApps={onBack}
                    onSwitchWhatsApp={() => onSwitchApp('whatsapp')}
                    onSwitchAccount={() => setModal('switch-account')}
                />
            </div>

        </div>
    );
};

export default Dashboard;
