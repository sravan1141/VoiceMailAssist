import React, { useEffect, useState } from 'react';
import { Mail, MessageCircle, LogOut, Mic, MicOff, Shield } from 'lucide-react';
import { useLang } from '../../lib/LanguageContext';
import './AppSelector.css';

const AppSelector = ({ user, onAppSelect, onLogout }) => {
    const { t, lang } = useLang();
    const [listening, setListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const recognitionRef = React.useRef(null);

    const speakAndListen = () => {
        if (!window.speechSynthesis) return;
        setListening(true);
        if (isMuted) {
            startListening();
            return;
        }

        const speechText = t.chooseApp;
        const utter = new SpeechSynthesisUtterance(speechText);
        utter.lang = lang;
        utter.onend = startListening;
        window.speechSynthesis.speak(utter);
    };

    const startListening = () => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognitionAPI) {
                setListening(false);
                return;
            }

            const rec = new SpeechRecognitionAPI();
            recognitionRef.current = rec;
            rec.lang = lang;
            rec.continuous = false;
            rec.interimResults = false;

            rec.onstart = () => setListening(true);
            rec.onresult = (e) => {
                const transcript = e.results[0][0].transcript.toLowerCase();
                // Explicitly release mic lock before navigating away
                rec.abort();
                window.speechSynthesis.cancel();
                
                // Mute logic (using english keywords for now or could map translated navs)
                if (transcript.includes('stop') || transcript.includes('mute') || transcript.includes('शांत') || transcript.includes('silencio')) {
                    setIsMuted(true);
                    setListening(false);
                } else if (transcript.includes('unmute') || transcript.includes('start') || transcript.includes('speak') || transcript.includes('बोल')) {
                    setIsMuted(false);
                    setListening(false);
                } else if (transcript.includes('admin') || transcript.includes('एडमिन')) {
                    onAppSelect('admin');
                } else if (transcript.includes('email') || transcript.includes('mail') || transcript.includes('ईमेल')) {
                    onAppSelect('email');
                } else if (transcript.includes('whatsapp') || transcript.includes('व्हाट्सएप')) {
                    onAppSelect('whatsapp');
                } else if (transcript.includes('telegram') || transcript.includes('टेलीग्राम')) {
                    onAppSelect('telegram');
                }
            };
            rec.onend = () => setListening(false);
            rec.start();
    };

    useEffect(() => {
        const timer = setTimeout(speakAndListen, 800);
        return () => {
            clearTimeout(timer);
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [onAppSelect]);

    return (
        <div className="app-selector-container">
            <div className="top-controls" style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button 
                    className="icon-btn" 
                    onClick={() => setIsMuted(!isMuted)} 
                    title={isMuted ? t.unmuteAssistant : t.muteAssistant}
                    style={{ background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)' }}
                >
                    {isMuted ? <MicOff size={20} color="#ef4444" /> : <Mic size={20} />}
                </button>
                <button className="icon-btn" onClick={onLogout} title={t.logout}>
                    <LogOut size={20} />
                </button>
            </div>

            <div className="selector-glass">
                <h2>{t('welcomeUser', { name: user?.name || user?.username || 'User' })}</h2>
                <p>{t.chooseApp}</p>
                {listening ? (
                    <p className="listening-pulse">{t.listening}</p>
                ) : (
                    <button className="mic-trigger-btn" onClick={speakAndListen}>
                        <Mic size={20} /> {t.tapToSpeak}
                    </button>
                )}

                <div className="app-cards mt-4">
                    <div className="app-card email-card" onClick={() => onAppSelect('email')}>
                        <Mail size={48} />
                        <h3>{t.emailAssistant}</h3>
                        <p>{t.manageGmail}</p>
                    </div>
                    <div className="app-card whatsapp-card" onClick={() => onAppSelect('whatsapp')}>
                        <MessageCircle size={48} />
                        <h3>{t.whatsappAssistant}</h3>
                        <p>{t.manageMessages}</p>
                    </div>
                    <div className="app-card" style={{ background: 'linear-gradient(135deg, #2AABEE, #1c8dcb)', color: 'white' }} onClick={() => onAppSelect('telegram')}>
                        <MessageCircle size={48} />
                        <h3>{t.telegramAssistant}</h3>
                        <p>{t.manageTelegram}</p>
                    </div>
                    {user?.is_admin === 1 && (
                        <div className="app-card" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', color: 'white' }} onClick={() => onAppSelect('admin')}>
                            <Shield size={48} />
                            <h3>{t.adminPanel}</h3>
                            <p>{t.manageUsersStats}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppSelector;

