import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * VoiceListener — always-on voice listener using Web Speech API.
 * Props:
 *   active       {bool}    — whether to start/restart listening
 *   onResult     {fn}      — called with final transcript string
 *   onInterim    {fn}      — called with interim transcript (preview)
 *   placeholder  {string}  — hint text shown in the listening bubble
 *   compact      {bool}    — small inline version vs full bubble
 */
const VoiceListener = ({ active, onResult, onInterim, placeholder = 'Listening…', compact = false }) => {
    const [supported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    const [listening, setListening] = useState(false);
    const [interim, setInterim] = useState('');
    const [error, setError] = useState('');
    const [restartCount, setRestartCount] = useState(0);
    const recognitionRef = useRef(null);
    const restartTimeoutRef = useRef(null);
    const maxRestarts = 3; // Limit restart attempts

    const startListening = useCallback(() => {
        if (!supported || restartCount >= maxRestarts) return;
        
        // Additional safeguard: Don't start if speech synthesis is active
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            console.log('Speech synthesis is active, delaying voice listener start');
            restartTimeoutRef.current = setTimeout(() => {
                startListening();
            }, 1000);
            return;
        }
        
        // Clear any pending restart
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }
        
        setError('');
        setInterim('');

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.maxAlternatives = 1;

        rec.onstart = () => {
            console.log('Voice recognition started');
            setListening(true);
            setRestartCount(0); // Reset restart count on successful start
        };
        
        rec.onend = () => {
            console.log('Voice recognition ended');
            setListening(false);
            
            // Only restart if still active and haven't exceeded max restarts
            if (active && recognitionRef.current === rec && restartCount < maxRestarts) {
                restartTimeoutRef.current = setTimeout(() => {
                    setRestartCount(prev => prev + 1);
                    console.log(`Restarting voice listener (attempt ${restartCount + 1})`);
                    startListening();
                }, 1000); // Longer delay to prevent rapid restarts
            }
        };
        
        rec.onerror = (e) => {
            console.error('Voice recognition error:', e.error);
            setListening(false);
            
            if (e.error === 'no-speech') {
                // Don't show error for no-speech, just restart normally
                return;
            }
            
            if (e.error === 'aborted') {
                // User manually stopped, don't restart
                return;
            }
            
            setError(`Mic error: ${e.error}`);
            
            // Don't restart on network or permission errors
            if (['network', 'not-allowed', 'service-not-allowed'].includes(e.error)) {
                setRestartCount(maxRestarts); // Stop further restart attempts
            }
        };
        
        rec.onresult = (event) => {
            console.log('=== VOICE LISTENER RESULT ===');
            console.log('Active state:', active);
            console.log('Listening state:', listening);
            console.log('Speech synthesis speaking:', window.speechSynthesis?.speaking);
            
            let interimText = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += t;
                else interimText += t;
            }
            if (interimText) {
                setInterim(interimText);
                onInterim?.(interimText);
            }
            if (finalText) {
                console.log('Voice result:', finalText);
                setInterim('');
                setRestartCount(0); // Reset on successful result
                onResult?.(finalText.trim());
            }
        };

        recognitionRef.current = rec;
        try { 
            rec.start();
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setError('Failed to start microphone');
        }
    }, [active, supported, onResult, onInterim, restartCount]);

    const stopListening = useCallback(() => {
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }
        
        if (recognitionRef.current) {
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }
        setListening(false);
        setInterim('');
        setRestartCount(0);
    }, []);

    useEffect(() => {
        if (active) {
            startListening();
        } else {
            stopListening();
        }
        
        return () => stopListening();
    }, [active, startListening, stopListening]);

    if (!supported) return null;

    if (compact) {
        return (
            <div className={`vl-compact ${listening ? 'vl-on' : 'vl-off'}`} title={listening ? 'Listening…' : 'Voice off'}>
                {listening ? <Mic size={14} /> : <MicOff size={14} />}
                {interim && <span className="vl-interim-inline">{interim}</span>}
                {error && <span className="vl-error-inline">{error}</span>}
            </div>
        );
    }

    return (
        <div className={`vl-bubble ${listening ? 'vl-listening' : ''}`}>
            <div className="vl-icon-wrap">
                <div className={`vl-rings ${listening ? 'vl-animate' : ''}`}>
                    <span /><span /><span />
                </div>
                <Mic size={28} className="vl-mic-icon" />
            </div>
            <div className="vl-text">
                {error
                    ? <span className="vl-error">{error}</span>
                    : interim
                        ? <span className="vl-interim">"{interim}"</span>
                        : <span className="vl-hint">{listening ? placeholder : (active ? 'Listening...' : 'Click mic to speak')}</span>
                }
            </div>
        </div>
    );
};

export default VoiceListener;
