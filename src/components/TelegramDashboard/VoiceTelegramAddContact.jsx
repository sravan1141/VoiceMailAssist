import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserPlus, Mic, MicOff, Loader } from 'lucide-react';
import { telegramApi } from '../../api';
import '../VoiceAssistant/VoiceCompose.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceTelegramAddContact = ({ user, onClose, onAdded, contactToEdit, isMuted = false }) => {
    const isEditMode = !!contactToEdit;
    const userLang = user?.language_preference || 'en-US';
    const [form, setForm] = useState({
        name: contactToEdit?.name || '',
        phone_number: contactToEdit?.phone_number || '',
        telegram_chat_id: contactToEdit?.telegram_chat_id || '',
        is_starred: contactToEdit?.is_starred || 0
    });
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [currentField, setCurrentField] = useState(isEditMode ? 'telegram_chat_id' : 'name');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [guidance, setGuidance] = useState(isEditMode ? `Editing contact ${contactToEdit.name}.` : 'Adding a new Telegram contact. Please say the contact\'s name.');

    const recognitionRef = useRef(null);
    const formRef = useRef(form);
    const fieldLabels = {
        name: 'contact name',
        phone_number: 'phone number',
        telegram_chat_id: 'telegram chat ID'
    };

    const isSystemSpeaking = useCallback(() => {
        return 'speechSynthesis' in window && window.speechSynthesis.speaking;
    }, []);

    useEffect(() => {
        if (isEditMode) {
            speakGuidance(`Editing contact ${contactToEdit.name}. You can say "edit name", "edit chat ID", "star this contact", or "save" to finish.`, () => {
                setTimeout(() => startCommandListening(), 1000);
            });
        } else {
            speakGuidance('Adding a new Telegram contact. Please say the contact\'s name.', () => {
                setTimeout(() => startFieldListening('name'), 1500);
            });
        }
        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        formRef.current = form;
    }, [form]);

    const speakGuidance = useCallback((text, callback = null) => {
        if (isMuted) {
            if (callback) setTimeout(callback, 200);
            return;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = 0.9; utter.pitch = 1.05;
            utter.onstart = () => { setIsSpeaking(true); setGuidance(text); };
            utter.onend = () => { setIsSpeaking(false); if (callback) setTimeout(callback, 1200); };
            utter.onerror = () => { setIsSpeaking(false); if (callback) setTimeout(callback, 1200); };
            window.speechSynthesis.speak(utter);
        } else if (callback) {
            setTimeout(callback, 1500);
        }
    }, [isMuted]);

    const startFieldListening = useCallback((field) => {
        if (!SpeechRecognition) return;
        setCurrentField(field);

        let introSpeech = 'Listening...';
        if (field === 'name') introSpeech = 'Listening for contact name...';
        if (field === 'phone_number') introSpeech = 'Listening for phone number...';
        if (field === 'telegram_chat_id') introSpeech = 'Listening for Telegram Chat ID. Please say the digits clearly.';

        setGuidance(introSpeech);

        const rec = new SpeechRecognition();
        rec.lang = userLang; rec.interimResults = true; rec.continuous = false;

        let isStopped = false;

        rec.onstart = () => { if (!isSystemSpeaking()) setIsListening(true); };
        rec.onresult = (e) => {
            const result = e.results[e.results.length - 1];
            if (result.isFinal) {
                isStopped = true;
                const transcript = result[0].transcript.trim();
                handleFieldInput(field, transcript);
                rec.stop();
            }
        };
        rec.onerror = (error) => {
            setIsListening(false);
            if (error.error === 'aborted' || error.error === 'not-allowed') {
                isStopped = true;
            } else {
                isStopped = true;
                setGuidance('Sorry, didn\'t catch that. Please try again.');
                setTimeout(() => startFieldListening(field), 2000);
            }
        };
        rec.onend = () => {
            setIsListening(false);
            if (!isStopped && !isSystemSpeaking()) {
                setTimeout(() => startFieldListening(field), 500);
            }
        };

        if (!isSystemSpeaking()) {
            rec.start();
            recognitionRef.current = rec;
        }
    }, [isSystemSpeaking]);

    const handleFieldInput = (field, transcript) => {
        let processedText = transcript;
        const lowerTrans = transcript.toLowerCase();

        if (lowerTrans.includes('go to name') || lowerTrans.includes('edit name')) {
            speakGuidance('Say the contact name.', () => setTimeout(() => startFieldListening('name'), 1000));
            return;
        }
        if (lowerTrans.includes('go to chat') || lowerTrans.includes('edit chat id') || lowerTrans.includes('edit id')) {
            speakGuidance('Say the chat ID.', () => setTimeout(() => startFieldListening('telegram_chat_id'), 1000));
            return;
        }

        if (lowerTrans.includes('clear')) {
            setForm(prev => ({ ...prev, [field]: '' }));
            speakGuidance(`${fieldLabels[field]} cleared. Say it again.`, () => setTimeout(() => startFieldListening(field), 2000));
            return;
        }

        if (field === 'name') {
            processedText = processedText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else if (field === 'telegram_chat_id' || field === 'phone_number') {
            processedText = processedText.replace(/[^\d-]/g, ''); // Chat IDs can be negative for groups
        }

        setForm(prev => ({ ...prev, [field]: processedText }));

        if (field === 'name') {
            speakGuidance(`Name is ${processedText}. Now please say their Telegram Chat ID.`, () => {
                setTimeout(() => startFieldListening('telegram_chat_id'), 1000);
            });
        } else if (field === 'telegram_chat_id') {
            speakGuidance(`Chat ID recorded as ${processedText.split('').join(' ')}. Say "save contact" to finish.`, () => {
                setTimeout(() => startCommandListening(), 1000);
            });
        } else {
            speakGuidance(`Recorded. Say "save contact" to finish.`, () => {
                setTimeout(() => startCommandListening(), 1000);
            });
        }
    };

    const startCommandListening = () => {
        if (!SpeechRecognition) return;
        if (isSystemSpeaking()) { setTimeout(() => startCommandListening(), 1000); return; }

        const rec = new SpeechRecognition();
        rec.lang = userLang; rec.interimResults = false; rec.continuous = false;
        let isStopped = false;

        rec.onstart = () => setIsListening(true);
        rec.onresult = (e) => {
            isStopped = true;
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            if (transcript.includes('cancel')) {
                speakGuidance('Cancelled adding contact.');
                onClose();
            } else if (transcript.includes('save') || transcript.includes('add') || transcript.includes('finish') || transcript.includes('yes')) {
                handleAddContact();
            } else if (transcript.includes('edit name') || transcript.includes('change name')) {
                speakGuidance('Say the new name.', () => startFieldListening('name'));
            } else if (transcript.includes('edit id') || transcript.includes('edit chat id')) {
                speakGuidance('Say the new Chat ID.', () => startFieldListening('telegram_chat_id'));
            } else {
                speakGuidance('Please say "save contact", "edit name", or "edit chat id".', () => startCommandListening());
            }
            rec.stop();
        };
        rec.onerror = (e) => {
            setIsListening(false);
            if (e.error === 'aborted' || e.error === 'not-allowed') {
                isStopped = true;
            } else {
                isStopped = true;
                setTimeout(() => startCommandListening(), 2000);
            }
        };
        rec.onend = () => {
            setIsListening(false);
            if (!isStopped && !isSystemSpeaking()) {
                setTimeout(() => startCommandListening(), 500);
            }
        };
        rec.start();
        recognitionRef.current = rec;
    };

    const handleAddContact = async () => {
        if (isProcessing) return; // prevent double-submit
        const currentForm = formRef.current;
        if (!currentForm.name || !currentForm.telegram_chat_id) {
            speakGuidance('Name and Chat ID are both required for Telegram.');
            return;
        }
        setIsProcessing(true);
        setStatus({ type: 'loading', msg: 'Saving contact...' });
        speakGuidance(isEditMode ? 'Updating contact.' : 'Saving contact.');

        try {
            if (isEditMode) {
                await telegramApi.editContact(contactToEdit.name, currentForm.name, currentForm.phone_number, '', currentForm.is_starred, currentForm.telegram_chat_id);
            } else {
                await telegramApi.addContact(currentForm.name, currentForm.phone_number, '', currentForm.is_starred, currentForm.telegram_chat_id);
            }
            setStatus({ type: 'success', msg: '✓ Contact saved successfully!' });
            speakGuidance('Contact saved successfully!');
            await new Promise(resolve => setTimeout(resolve, 2000));
            onAdded?.();
            onClose();
        } catch (error) {
            console.error('Failed to save contact:', error);
            setStatus({ type: 'error', msg: error.message || 'Failed to save contact.' });
            speakGuidance('Failed to save contact. Try again.', () => setTimeout(() => startCommandListening(), 2000));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="voice-compose-overlay" style={{ zIndex: 99999 }}>
            <div className="voice-compose-modal glass-panel" style={{ borderTop: '4px solid #2AABEE' }}>
                <div className="voice-compose-header">
                    <span className="modal-title" style={{ color: '#2AABEE', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={18} /> {isEditMode ? 'Edit Telegram Contact' : 'Add Telegram Contact'}
                    </span>
                    <button className="icon-close" onClick={onClose}>✕</button>
                </div>

                <div className="voice-guidance">
                    <div className="guidance-content">
                        <div className="guidance-icon" style={isListening ? { color: '#2AABEE', textShadow: '0 0 10px #2AABEE' } : {}}>
                            {isListening ? <MicOff className="pulse" size={20} /> : <Mic size={20} />}
                        </div>
                        <div className="guidance-text">
                            <p className="guidance-main">{guidance}</p>
                            <p className="guidance-field">
                                Current field: <strong style={{ color: '#2AABEE' }}>{fieldLabels[currentField]}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="voice-compose-form">
                    {status.msg && (
                        <div className={`status-message ${status.type}`}>
                            {status.type === 'loading' && <Loader size={16} className="spin" />}
                            {status.msg}
                        </div>
                    )}

                    <div className="form-field">
                        <label>Name:</label>
                        <div className="field-content">
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="E.g., Rahul"
                                className={currentField === 'name' ? 'active-field' : ''}
                                style={currentField === 'name' ? { borderColor: '#2AABEE' } : {}}
                            />
                            <button type="button" className="field-mic-btn" onClick={() => startFieldListening('name')} disabled={isListening}>
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Telegram Chat ID:</label>
                        <div className="field-content">
                            <input
                                type="text"
                                value={form.telegram_chat_id}
                                onChange={(e) => setForm(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
                                placeholder="E.g., 123456789"
                                className={currentField === 'telegram_chat_id' ? 'active-field' : ''}
                                style={currentField === 'telegram_chat_id' ? { borderColor: '#2AABEE' } : {}}
                            />
                            <button type="button" className="field-mic-btn" onClick={() => startFieldListening('telegram_chat_id')} disabled={isListening}>
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Phone Number (Optional):</label>
                        <div className="field-content">
                            <input
                                type="text"
                                value={form.phone_number}
                                onChange={(e) => setForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                placeholder="E.g., +1234567890"
                                className={currentField === 'phone_number' ? 'active-field' : ''}
                                style={currentField === 'phone_number' ? { borderColor: '#2AABEE' } : {}}
                            />
                            <button type="button" className="field-mic-btn" onClick={() => startFieldListening('phone_number')} disabled={isListening}>
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="compose-actions" style={{ marginTop: '24px' }}>
                        <button className="send-btn" style={{ background: '#2AABEE', color: '#fff', width: '100%' }} onClick={handleAddContact} disabled={isProcessing}>
                            {isProcessing ? <><Loader size={16} className="spin" /> Saving...</> : <><UserPlus size={16} /> Save Contact</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceTelegramAddContact;
