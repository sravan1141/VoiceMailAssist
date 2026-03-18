import React, { useState, useRef, useEffect } from 'react';
import './VoiceInput.css';

/**
 * VoiceInput — wraps any input/textarea with a mic button.
 * On click: starts SpeechRecognition → appends transcript to field value.
 *
 * Props:
 *   value       — controlled field value
 *   onChange    — (newValue: string) => void
 *   continuous  — keep listening until stop (default false)
 *   children    — the input/textarea to render
 */
const VoiceInput = ({ value = '', onChange, continuous = false, children }) => {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognition;

    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, []);

    const toggleListen = () => {
        if (!supported) return;

        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }

        const rec = new SpeechRecognition();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = continuous;

        rec.onstart = () => setListening(true);

        rec.onresult = (e) => {
            const said = e.results[e.results.length - 1][0].transcript;
            onChange(value ? `${value} ${said}` : said);
        };

        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);

        rec.start();
        recognitionRef.current = rec;
    };

    return (
        <div className="voice-input-wrap">
            {children}
            {supported && (
                <button
                    type="button"
                    className={`voice-input-mic ${listening ? 'listening' : ''}`}
                    onClick={toggleListen}
                    title={listening ? 'Stop listening' : 'Speak to fill'}
                    aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                >
                    {listening ? (
                        <span className="mic-waves">
                            <span /><span /><span />
                        </span>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

export default VoiceInput;
