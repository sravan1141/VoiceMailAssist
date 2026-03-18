import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Mic, ScanFace, LogIn, UserPlus, Eye, EyeOff,
    CheckCircle, Loader, Camera, X, ChevronRight,
    Mail, AlertCircle, Volume2, User, ArrowLeft, Shield
} from 'lucide-react';
import { authApi } from '../../api';
import VoiceInput from '../VoiceInput/VoiceInput';
import VoiceListener from '../VoiceInput/VoiceListener';
import {
    loadFaceModels,
    captureFaceDescriptor,
    descriptorToBase64,
    base64ToFloat32,
} from '../../lib/faceAuth';
import {
    recordAudio,
    extractFingerprint,
    matchVoiceFingerprint,
    fingerprintToBase64,
} from '../../lib/voiceAuth';
import { useLang } from '../../lib/LanguageContext';
import './AuthScreen.css';
import './GreetingModal.css';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Status message banner ────────────────────────────────────────────────────
const StatusMsg = ({ type, message }) => {
    if (!message) return null;
    return (
        <div className={`status-msg status-${type}`}>
            {type === 'success' && <CheckCircle size={16} />}
            {type === 'error' && <X size={16} />}
            {type === 'loading' && <Loader size={16} className="spin" />}
            <span>{message}</span>
        </div>
    );
};

// ─── Face Scanner Modal ────────────────────────────────────────────────────────
const FaceScannerModal = ({ onClose, onSuccess, mode }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [stage, setStage] = useState('starting');
    const [errMsg, setErrMsg] = useState('');
    const [loadingStep, setLoadingStep] = useState('Starting camera…');

    // Proper cleanup function for camera stream
    const cleanupCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const setVideoRef = useCallback((node) => {
        videoRef.current = node;
        if (node && streamRef.current) {
            node.srcObject = streamRef.current;
            node.play().catch(() => { });
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const init = async () => {
            try {
                setLoadingStep('Starting camera…');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setLoadingStep('Loading face recognition AI…');
                await loadFaceModels();
                if (!cancelled) setStage('ready');
            } catch (err) {
                if (!cancelled) {
                    setErrMsg(err.name === 'NotAllowedError'
                        ? 'Camera access denied. Allow camera access and try again.'
                        : `Could not start camera: ${err.message || err.name}`);
                    setStage('error');
                }
            }
        };
        init();
        return () => {
            cancelled = true;
            cleanupCamera();
        };
    }, [cleanupCamera]);

    useEffect(() => {
        return () => {
            cleanupCamera(); // Ensure cleanup when component unmounts
        };
    }, [cleanupCamera]);

    const handleCapture = async () => {
        if (!videoRef.current) return;
        setStage('scanning');
        try {
            const descriptor = await captureFaceDescriptor(videoRef.current);
            if (!descriptor) {
                setErrMsg('No face detected. Centre your face and ensure good lighting.');
                setStage('error');
                return;
            }
            setStage('success');
            cleanupCamera(); // Use the cleanup function
            await delay(700);
            onSuccess(descriptorToBase64(descriptor));
        } catch (err) {
            setErrMsg('Detection failed: ' + (err.message || 'Unknown error'));
            setStage('error');
        }
    };

    const retry = () => {
        setStage('starting');
        setErrMsg('');
        cleanupCamera(); // Clean up before retrying
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
            .then(async (stream) => {
                streamRef.current = stream;
                if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
                setStage('ready');
            })
            .catch(() => { setErrMsg('Camera still unavailable.'); setStage('error'); });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-panel glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title"><ScanFace size={20} /> {mode === 'register' ? 'Register Face ID' : 'Face Verification'}</span>
                    <button className="icon-close" onClick={() => { cleanupCamera(); onClose(); }}><X size={18} /></button>
                </div>
                <div className="face-scan-area">
                    {stage === 'success' ? (
                        <div className="scan-success-state">
                            <CheckCircle size={60} color="var(--color-success)" />
                            <p>Face {mode === 'register' ? 'registered' : 'verified'}!</p>
                        </div>
                    ) : stage === 'error' ? (
                        <div className="scan-error-state">
                            <AlertCircle size={50} color="#f87171" />
                            <p>{errMsg}</p>
                            <button className="primary-btn" onClick={retry}>Try Again</button>
                        </div>
                    ) : (
                        <>
                            <div className={`face-oval ${stage === 'scanning' ? 'scanning' : ''}`}>
                                <video ref={setVideoRef} className="face-video" muted playsInline autoPlay />
                                {stage === 'scanning' && <div className="scan-line" />}
                                {stage === 'starting' && (
                                    <div className="face-loading-overlay">
                                        <Loader size={28} className="spin" />
                                        <span>{loadingStep}</span>
                                    </div>
                                )}
                            </div>
                            <p className="scan-hint">
                                {stage === 'starting' && loadingStep}
                                {stage === 'ready' && 'Centre your face in the oval, then click Capture'}
                                {stage === 'scanning' && 'Analysing — hold still…'}
                            </p>
                            {stage === 'ready' && (
                                <button className="primary-btn" onClick={handleCapture}>
                                    <Camera size={16} /> Capture Face
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Voice Recorder Modal ──────────────────────────────────────────────────────
const VoiceRecorderModal = ({ onClose, onSuccess, mode }) => {
    const [stage, setStage] = useState('ready');
    const [countdown, setCountdown] = useState(3);
    const [errMsg, setErrMsg] = useState('');
    const [waveLevel, setWaveLevel] = useState(0);
    const animRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => () => {
        cancelAnimationFrame(animRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    // Auto-start recording for login mode
    useEffect(() => {
        if (mode === 'login' && stage === 'ready') {
            const timer = setTimeout(() => {
                startRecording();
            }, 1000); // Small delay to let modal render
            return () => clearTimeout(timer);
        }
    }, [mode, stage]);

    const startWaveAnimation = useCallback((stream) => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
            analyser.getByteFrequencyData(data);
            setWaveLevel(data.reduce((a, b) => a + b, 0) / data.length / 128);
            animRef.current = requestAnimationFrame(tick);
        };
        tick();
    }, []);

    const startRecording = async () => {
        setErrMsg('');
        try {
            const previewStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = previewStream;
            startWaveAnimation(previewStream);
            setStage('countdown');
            for (let i = 3; i >= 1; i--) { setCountdown(i); await delay(1000); }
            setStage('recording');
            cancelAnimationFrame(animRef.current);
            previewStream.getTracks().forEach(t => t.stop());
            const pcm = await recordAudio(3000);
            setStage('processing');
            const fingerprint = extractFingerprint(pcm);
            const fpBase64 = fingerprintToBase64(fingerprint);
            setStage('success');
            await delay(600);
            onSuccess(fpBase64);
        } catch (err) {
            setErrMsg('Microphone access denied or recording failed: ' + (err.message || 'Unknown error'));
            setStage('error');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-panel glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title"><Mic size={20} /> {mode === 'register' ? 'Record Voice Code' : 'Voice Verification'}</span>
                    <button className="icon-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="voice-record-area">
                    {stage === 'success' ? (
                        <div className="scan-success-state">
                            <CheckCircle size={60} color="var(--color-success)" />
                            <p>Voice {mode === 'register' ? 'registered' : 'verified'}!</p>
                        </div>
                    ) : stage === 'error' ? (
                        <div className="scan-error-state">
                            <AlertCircle size={50} color="#f87171" />
                            <p>{errMsg}</p>
                            <button className="primary-btn" onClick={() => { setStage('ready'); setErrMsg(''); }}>Try Again</button>
                        </div>
                    ) : (
                        <>
                            <div className={`mic-orb ${stage === 'recording' || stage === 'countdown' ? 'recording' : ''}`}
                                style={{ '--wave': stage === 'recording' ? waveLevel : 0 }}>
                                <Mic size={48} />
                                {stage === 'countdown' && <div className="countdown-ring">{countdown}</div>}
                                {stage === 'recording' && <div className="countdown-ring rec-live">●</div>}
                            </div>
                            {stage === 'processing' && (
                                <div className="verifying-text"><Loader size={16} className="spin" /> Analyzing voiceprint…</div>
                            )}
                            <div className="phrase-box">
                                <p className="phrase-label">Say this phrase clearly:</p>
                                <p className="phrase-text">"My voice is my password"</p>
                                {stage === 'countdown' && <p className="phrase-hint">Get ready… {countdown}</p>}
                                {stage === 'recording' && <p className="phrase-hint recording-hint">🔴 Recording — speak now!</p>}
                            </div>
                            {stage === 'ready' && (
                                <button className="primary-btn" onClick={startRecording}>
                                    <Mic size={16} /> Start Recording
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Greeting Modal ─────────────────────────────────────────────────────────────
const GreetingModal = ({ username, onClose }) => {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        setShowConfetti(true);

        // Speak short welcome greeting
        const speakWelcome = () => {
            if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();

                // Short welcome message
                const welcomeMessage = `Welcome ${username}`;

                const utter = new SpeechSynthesisUtterance(welcomeMessage);
                utter.rate = 0.95;
                utter.pitch = 1.0;
                utter.volume = 1.0;

                // Don't auto-close until speech completes
                utter.onend = () => {
                    // Close after speech completes
                    setTimeout(() => {
                        onClose();
                    }, 500);
                };

                utter.onerror = () => {
                    // Close even if speech fails
                    setTimeout(() => {
                        onClose();
                    }, 500);
                };

                // Small delay to allow modal to render
                setTimeout(() => {
                    window.speechSynthesis.speak(utter);
                }, 300);
            } else {
                // If speech not supported, close after 2 seconds
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        };

        speakWelcome();

        // Fallback timer in case speech doesn't work
        const fallbackTimer = setTimeout(() => {
            onClose();
        }, 4000);

        return () => {
            clearTimeout(fallbackTimer);
            window.speechSynthesis?.cancel();
        };
    }, [username, onClose]);

    return (
        <div className="modal-overlay">
            <div className="modal-panel greeting-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="greeting-content">
                    {showConfetti && (
                        <div className="confetti-container">
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className="confetti-piece"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random() * 2}s`,
                                        animationDuration: `${2 + Math.random() * 2}s`
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    <div className="greeting-icon">
                        <CheckCircle size={60} color="var(--color-success)" />
                    </div>
                    <h2>Welcome Back!</h2>
                    <p>Hello <strong>{username}</strong></p>
                    <p className="greeting-subtitle">Authentication successful</p>
                    <div className="greeting-loader">
                        <Loader size={20} className="spin" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Post-Login Assistance Modal ───────────────────────────────────────────────────
const AssistanceModal = ({ username, onClose }) => {
    const [listening, setListening] = useState(false);
    const [suggestions] = useState([
        "Check my emails",
        "Send a new email",
        "Search for emails",
        "Organize my inbox",
        "Check calendar",
        "Set up reminders"
    ]);

    useEffect(() => {
        // Speak assistance prompt after modal renders
        const speakAssistance = () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();

                const message = `Hello ${username}. What can I do for you today?`;
                const utter = new SpeechSynthesisUtterance(message);
                utter.rate = 0.95;
                utter.pitch = 1.0;
                utter.volume = 1.0;

                utter.onend = () => {
                    setListening(true);
                };

                utter.onerror = () => {
                    setListening(true);
                };

                setTimeout(() => {
                    window.speechSynthesis.speak(utter);
                }, 500);
            } else {
                setListening(true);
            }
        };

        speakAssistance();

        return () => {
            window.speechSynthesis?.cancel();
        };
    }, [username]);

    const handleVoiceCommand = (transcript) => {
        const command = transcript.toLowerCase().trim();
        console.log('User command:', command);

        // Handle basic commands
        if (command.includes('email') || command.includes('mail')) {
            onClose(); // Close modal and let main app handle email functionality
        } else if (command.includes('close') || command.includes('nothing') || command.includes('cancel')) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-panel assistance-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="assistance-content">
                    <div className="assistance-header">
                        <div className="assistance-icon">
                            <Volume2 size={40} />
                        </div>
                        <h2>What can I do for you?</h2>
                        <p>Hello <strong>{username}</strong>! I'm ready to help you with your email and productivity tasks.</p>
                    </div>

                    <div className="suggestions-grid">
                        {suggestions.map((suggestion, index) => (
                            <div key={index} className="suggestion-card">
                                <span className="suggestion-text">{suggestion}</span>
                            </div>
                        ))}
                    </div>

                    <div className="assistance-input">
                        <VoiceListener
                            active={listening}
                            onResult={handleVoiceCommand}
                            placeholder="Tell me what you'd like to do..."
                        />
                    </div>

                    <div className="assistance-actions">
                        <button className="secondary-btn" onClick={onClose}>
                            I'll explore myself
                        </button>
                    </div>

                    <div className="assistance-footer">
                        <p className="assistance-hint">
                            <Volume2 size={14} /> Say what you'd like to do, or click to explore
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Gmail Selector — shown after login if user has multiple Gmails ────────────
const GmailSelector = ({ gmails, onSelect, username }) => {
    const [listening, setListening] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const handleVoiceResult = (transcript) => {
        const t = transcript.toLowerCase().trim();
        // Match "select 1" / "first" / "one" / the email address itself
        for (let i = 0; i < gmails.length; i++) {
            const num = i + 1;
            const addr = gmails[i].address.toLowerCase();
            const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
            if (
                t.includes(String(num)) ||
                t.includes(ordinals[i] || '') ||
                t.includes(addr)
            ) {
                handleSelect(gmails[i].id);
                return;
            }
        }
        setErr(`Didn't catch that. Say "select 1", "select 2", or the email address.`);
    };

    const handleSelect = async (gmailId) => {
        setListening(false);
        setBusy(true);
        setErr('');
        try {
            await authApi.selectGmail(gmailId);
            onSelect(gmailId);
        } catch (e) {
            setBusy(false);
            setListening(true);
            setErr(e.message);
        }
    };

    return (
        <div className="gmail-selector-step">
            <div className="card-header">
                <div className="brand-icon-wrap sm"><Mail size={22} /></div>
                <h2>Select Gmail Account</h2>
                <p>Welcome back, <strong>{username}</strong>! Which inbox would you like to open?</p>
            </div>

            <VoiceListener
                active={listening && !busy}
                onResult={handleVoiceResult}
                placeholder="Say a number or email address…"
            />

            {err && <StatusMsg type="error" message={err} />}
            {busy && <StatusMsg type="loading" message="Loading your inbox…" />}

            <div className="gmail-list">
                {gmails.map((g, i) => (
                    <button
                        key={g.id}
                        className="gmail-list-item"
                        onClick={() => handleSelect(g.id)}
                        disabled={busy}
                    >
                        <div className="gmail-num">{i + 1}</div>
                        <div className="gmail-info">
                            <span className="gmail-addr">{g.address}</span>
                            {g.label && g.label !== 'Gmail' && <span className="gmail-label">{g.label}</span>}
                        </div>
                        <ChevronRight size={18} />
                    </button>
                ))}
            </div>
            <p className="vl-footer-hint">
                <Volume2 size={13} /> Say "select 1", "select 2"… or tap an account
            </p>
        </div>
    );
};

// ─── Landing Step — voice-first Login or Register choice ──────────────────────
const LandingStep = ({ onChoose }) => {
    const { t, lang } = useLang();
    const [listening, setListening] = useState(true);
    const [pulse, setPulse] = useState(false);
    const [hasSpoken, setHasSpoken] = useState(false);

    const speak = useCallback((text, requireUserInteraction = false) => {
        // Cancel any ongoing speech
        window.speechSynthesis?.cancel();

        // IMPORTANT: Stop voice listener BEFORE speaking to prevent feedback
        setListening(false);

        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return false;
        }

        // Create and configure utterance
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1.05;
        utter.volume = 1.0;

        let spokenSuccessfully = false;

        // Set up event handlers to manage voice listener state
        utter.onstart = () => {
            spokenSuccessfully = true;
            console.log('Speech synthesis started:', text);
            // Voice listener already stopped above, but ensure it's disabled
            setListening(false);
        };

        utter.onend = () => {
            // Re-enable voice listener after speaking
            console.log('Speech synthesis ended, re-enabling voice listener');
            setTimeout(() => {
                setListening(true);
            }, 800); // Longer delay to ensure speech has finished
        };

        utter.onerror = (error) => {
            console.warn('Speech synthesis error:', error);
            // If it's a permission error, don't retry automatically
            if (error.error === 'not-allowed') {
                console.log('Speech synthesis blocked by browser - requires user interaction first');
                setListening(true);
                return;
            }
            // Re-enable voice listener on other errors
            setTimeout(() => {
                setListening(true);
            }, 800);
        };

        // Try to speak - handle potential permission issues
        try {
            window.speechSynthesis.speak(utter);
            return spokenSuccessfully;
        } catch (error) {
            console.warn('Speech synthesis failed:', error);
            setListening(true);
            return false;
        }
    }, [setListening]);

    // Speak welcome message on first load - only after user interaction
    useEffect(() => {
        if (!hasSpoken) {
            const handleUserInteraction = () => {
                if (!hasSpoken) {
                    setHasSpoken(true);
                    speak("Welcome to Voice Mail Assist. Please say login to sign in to your account, or register to create a new account.");
                    document.removeEventListener('click', handleUserInteraction);
                    document.removeEventListener('keydown', handleUserInteraction);
                }
            };

            document.addEventListener('click', handleUserInteraction);
            document.addEventListener('keydown', handleUserInteraction);

            return () => {
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('keydown', handleUserInteraction);
            };
        }
    }, [hasSpoken, speak]);

    const handleVoice = (transcript) => {
        const t = transcript.toLowerCase();
        if (t.includes('login') || t.includes('log in') || t.includes('sign in') || t.includes('signin')) {
            setPulse(false);
            setListening(false);
            speak("Login selected. Please follow the instructions to sign in.");
            onChoose('login');
        } else if (t.includes('register') || t.includes('sign up') || t.includes('signup') || t.includes('create') || t.includes('new')) {
            setPulse(false);
            setListening(false);
            speak("Registration selected. Please follow the instructions to create your account.");
            onChoose('register');
        } else {
            setPulse(true);
            setTimeout(() => setPulse(false), 500);
            // Gentle reminder for unrecognized commands
            setTimeout(() => {
                speak("I didn't catch that. Please say login or register.");
            }, 800);
        }
    };

    return (
        <div className="auth-card glass-panel slide-in landing-step">
            <div className="auth-bg">
                <div className="glow-orb primary" />
                <div className="glow-orb secondary" />
                <div className="glow-orb tertiary" />
            </div>
            <div className="brand">
                <div className="brand-icon-wrap"><Mail size={32} /></div>
                <h1>VoiceMailAssist</h1>
                <p>Voice-first email — for everyone</p>
            </div>

            {/* Voice listener with animated rings */}
            <div className={`landing-mic-area ${pulse ? 'mis-pulse' : ''}`}>
                <VoiceListener
                    active={listening}
                    onResult={handleVoice}
                    placeholder='Say "Login" or "Register"…'
                />
            </div>

            {/* Manual buttons always visible */}
            <div className="landing-actions" style={{ position: 'relative' }}>
                <button className="primary-btn large" onClick={() => {
                    setListening(false);
                    speak("Login selected. Please follow the instructions to sign in.");
                    onChoose('login');
                }}>
                    <LogIn size={20} /> {t.signIn}
                </button>
                <button className="secondary-btn large" onClick={() => {
                    setListening(false);
                    speak("Registration selected. Please follow the instructions to create your account.");
                    onChoose('register');
                }}>
                    <UserPlus size={20} /> {t.signUp}
                </button>
                
                {/* Subtle Admin entry point (bottom right of landing step) */}
                <button 
                  className="icon-btn" 
                  onClick={() => onChoose('login')} 
                  onDoubleClick={() => {
                    setListening(false);
                    speak("Admin mode enabled. Please enter admin credentials.");
                    onChoose('login');
                  }}
                  style={{ position: 'absolute', bottom: '-40px', right: '0', opacity: 0.3, fontSize: '0.7rem', background: 'none' }}
                >
                  <Shield size={14} /> Admin Access
                </button>
            </div>
            <p className="vl-footer-hint"><Volume2 size={13} /> Say "Login" or "Register" to get started</p>
        </div>
    );
};

// ─── Login Flow ───────────────────────────────────────────────────────────────
const LoginFlow = ({ onAuthenticated, onBack }) => {
    const { t, lang } = useLang();
    const [step, setStep] = useState('username'); // username | auth | gmail-select
    const [username, setUsername] = useState('');
    const [usernameInput, setUsernameInput] = useState('');
    const [userInfo, setUserInfo] = useState(null); // { hasFace, hasVoice, name }
    const [listeningUsername, setListeningUsername] = useState(true);
    const [listeningAuth, setListeningAuth] = useState(false);
    const [modal, setModal] = useState(null); // 'face' | 'voice'
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [gmails, setGmails] = useState([]);
    const [confirming, setConfirming] = useState(false);
    const [heardUsername, setHeardUsername] = useState('');
    const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
    const [showGreeting, setShowGreeting] = useState(false);
    const [showAssistance, setShowAssistance] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPasswordField, setShowPasswordField] = useState(false);
    const voiceCooldownRef = useRef(false);

    const setError = (msg) => setStatus({ type: 'error', message: msg });
    const setLoading = (msg) => setStatus({ type: 'loading', message: msg });
    const setSuccess = (msg) => setStatus({ type: 'success', message: msg });
    const clearStatus = () => setStatus({ type: '', message: '' });

    const speak = useCallback((text, requireUserInteraction = false) => {
        // Cancel any ongoing speech
        window.speechSynthesis?.cancel();

        // IMPORTANT: Stop voice listener BEFORE speaking to prevent feedback
        setListeningUsername(false);

        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return false;
        }

        // Create and configure utterance
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1.05;
        utter.volume = 1.0;

        let spokenSuccessfully = false;

        // Set up event handlers to manage voice listener state
        utter.onstart = () => {
            spokenSuccessfully = true;
            console.log('Speech synthesis started:', text);
            // Voice listener already stopped above, but ensure it's disabled
            setListeningUsername(false);
        };

        utter.onend = () => {
            // Re-enable voice listener after speaking
            console.log('Speech synthesis ended, re-enabling voice listener');
            setTimeout(() => {
                setListeningUsername(true);
            }, 800); // Longer delay to ensure speech has finished
        };

        utter.onerror = (error) => {
            console.warn('Speech synthesis error:', error);
            // If it's a permission error, don't retry automatically
            if (error.error === 'not-allowed') {
                console.log('Speech synthesis blocked by browser - requires user interaction first');
                setListeningUsername(true);
                return;
            }
            // Re-enable voice listener on other errors
            setTimeout(() => {
                setListeningUsername(true);
            }, 800);
        };

        // Try to speak - handle potential permission issues
        try {
            window.speechSynthesis.speak(utter);
            return spokenSuccessfully;
        } catch (error) {
            console.warn('Speech synthesis failed:', error);
            setListeningUsername(true);
            return false;
        }
    }, [setListeningUsername]);

    // Speak welcome message when username step loads - only after user interaction
    useEffect(() => {
        if (step === 'username' && !hasSpokenWelcome && !busy) {
            const handleUserInteraction = () => {
                if (!hasSpokenWelcome) {
                    setHasSpokenWelcome(true);
                    speak("Welcome back. Please say your username to sign in.");
                    document.removeEventListener('click', handleUserInteraction);
                    document.removeEventListener('keydown', handleUserInteraction);
                }
            };

            document.addEventListener('click', handleUserInteraction);
            document.addEventListener('keydown', handleUserInteraction);

            return () => {
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('keydown', handleUserInteraction);
            };
        }
    }, [step, hasSpokenWelcome, busy, speak]);

    // When user says their username (via voice)
    const handleUsernameVoice = (transcript) => {
        console.log('=== USERNAME VOICE INPUT ===');
        console.log('Raw transcript:', transcript);
        console.log('Current step:', step);
        console.log('Confirming:', confirming);

        // Prevent multiple rapid inputs
        if (voiceCooldownRef.current || busy) return;

        // Clean the heard text into a valid username
        // Remove spaces only between letters (when user spells out name), but keep spaces between words
        let heard = transcript.trim().toLowerCase();

        // If it looks like individual letters with spaces (like "s r a v n"), remove the spaces
        if (/^[a-z]\s+[a-z]/i.test(heard)) {
            heard = heard.replace(/\s+/g, '');
        } else {
            // Otherwise, just replace spaces with underscores for multi-word usernames
            heard = heard.replace(/\s+/g, '_');
        }

        // Remove any non-alphanumeric characters except underscores
        heard = heard.replace(/[^a-z0-9_]/g, '');

        console.log('Processed username:', heard);

        if (!heard) return;

        // Set cooldown to prevent multiple inputs
        voiceCooldownRef.current = true;
        setTimeout(() => { voiceCooldownRef.current = false; }, 2000);

        // Stop listening immediately to prevent multiple inputs
        setListeningUsername(false);
        setHeardUsername(heard);
        setUsernameInput(heard);

        console.log('Set confirming to true with username:', heard);

        // Small delay before showing confirmation to ensure voice listener stops
        setTimeout(() => {
            setConfirming(true);
            // Reset voice cooldown to allow immediate confirmation response
            voiceCooldownRef.current = false;

            // Create custom speech handling for confirmation that doesn't interfere with VoiceListener
            const confirmationMessage = `I heard "${heard}". Is this correct? Say yes or no.`;
            const utter = new SpeechSynthesisUtterance(confirmationMessage);
            utter.rate = 0.95;
            utter.pitch = 1.05;
            utter.volume = 1.0;

            utter.onstart = () => {
                console.log('Confirmation speech started:', confirmationMessage);
                // Don't modify listening states during confirmation - let VoiceListener handle it
            };

            utter.onend = () => {
                console.log('Confirmation speech ended');
                // Add a small delay before VoiceListener becomes fully active
                setTimeout(() => {
                    console.log('VoiceListener should now be fully active');
                }, 300);
            };

            utter.onerror = (error) => {
                console.warn('Confirmation speech error:', error);
            };

            window.speechSynthesis?.cancel();
            window.speechSynthesis?.speak(utter);
        }, 100);
    };

    // User confirms the heard username
    const handleConfirmVoice = (transcript) => {
        console.log('=== CONFIRMATION VOICE INPUT ===');
        console.log('Transcript:', transcript);
        console.log('HeardUsername:', heardUsername);
        console.log('VoiceCooldown:', voiceCooldownRef.current);
        console.log('Busy:', busy);

        // Prevent multiple rapid inputs during confirmation
        if (voiceCooldownRef.current || busy) return;

        const t = transcript.toLowerCase().trim();
        console.log('Processed transcript:', t);

        // More specific confirmation checks - require exact matches or clear start of phrase
        const isYes = t === 'yes' || t === 'correct' || t === 'yeah' || t === 'yep' ||
            t.startsWith('yes ') || t.startsWith('correct ') || t.startsWith('yeah ') || t.startsWith('yep ');
        const isNo = t === 'no' || t === 'wrong' || t === 'retry' || t === 'again' ||
            t.startsWith('no ') || t.startsWith('wrong ') || t.startsWith('retry ') || t.startsWith('again ');

        console.log('IsYes:', isYes, 'IsNo:', isNo);

        if (isYes) {
            console.log('✅ Confirmation received - submitting username');
            // Set cooldown immediately
            voiceCooldownRef.current = true;
            setTimeout(() => { voiceCooldownRef.current = false; }, 2000);

            submitUsername(heardUsername);
        } else if (isNo) {
            console.log('❌ Rejection received - retrying');
            // Set cooldown immediately
            voiceCooldownRef.current = true;
            setTimeout(() => { voiceCooldownRef.current = false; }, 2000);

            speak("Let's try again. Please say your username.");
            setConfirming(false);
            setHeardUsername('');
            setUsernameInput('');
            setListeningUsername(true);
        } else {
            console.log('⚠️ Unrecognized confirmation - ignoring');
            // Don't do anything for unrecognized commands
        }
    };

    // Handle voice commands for authentication method selection
    const handleAuthMethodVoice = (transcript) => {
        if (voiceCooldownRef.current || busy) return;

        const t = transcript.toLowerCase().trim();

        // Voice authentication commands
        if (t.includes('voice') || t.includes('verify voice') || t.includes('select voice')) {
            if (userInfo?.hasVoice) {
                voiceCooldownRef.current = true;
                setTimeout(() => { voiceCooldownRef.current = false; }, 2000);
                setListeningAuth(false); // Disable auth listening when modal opens
                clearStatus();
                setBusy(false); // Reset busy state
                setModal('voice');
                speak("Voice authentication selected. Please speak your passphrase.");
            } else {
                speak("Voice authentication is not available for this account.");
            }
        }
        // Face authentication commands
        else if (t.includes('face') || t.includes('verify face') || t.includes('select face')) {
            if (userInfo?.hasFace) {
                voiceCooldownRef.current = true;
                setTimeout(() => { voiceCooldownRef.current = false; }, 2000);
                setListeningAuth(false); // Disable auth listening when modal opens
                clearStatus();
                setBusy(false); // Reset busy state
                setModal('face');
                speak("Face authentication selected. Please look at your camera.");
            } else {
                speak("Face authentication is not available for this account.");
            }
        }
        // Gmail authentication commands
        else if (t.includes('gmail') || t.includes('google') || t.includes('continue with gmail') || t.includes('continue with google')) {
            voiceCooldownRef.current = true;
            setTimeout(() => { voiceCooldownRef.current = false; }, 2000);
            speak("Continuing with Google authentication.");
            window.location.href = authApi.googleOAuthUrl();
        }
    };

    const submitUsername = async (uname) => {
        const cleaned = (uname || usernameInput).trim().toLowerCase().replace(/\s+/g, '_');
        if (!cleaned) return setError('Please say or type your username.');
        setConfirming(false);
        setHeardUsername('');
        setUsernameInput('');
        setBusy(true);
        setLoading('Looking up your account…');

        console.log('=== LOGIN DEBUG ===');
        console.log('Looking up username:', cleaned);

        try {
            const info = await authApi.lookupUsername(cleaned);
            console.log('✅ Account found:', info);
            console.log('User has voice:', info.hasVoice, 'User has face:', info.hasFace);

            speak("Account found. Signing you in.");
            setUserInfo(info);
            setUsername(cleaned); // Use the exact username that was looked up
            clearStatus();
            setBusy(false);
            setStep('auth');
            // Auto-show password field when no biometrics registered (e.g., admin account)
            if (!info.hasFace && !info.hasVoice) {
                setShowPasswordField(true);
            }
        } catch (err) {
            console.log('❌ Account not found for username:', cleaned);
            console.log('Error details:', err);

            setBusy(false);
            speak("Account not found. Please check your username and try again.");
            setError(err.message);
            setConfirming(false);
            setHeardUsername('');
            setUsernameInput('');
            setListeningUsername(true);
        }
    };

    // After biometric auth succeeds
    const afterAuth = async (userData) => {
        // Direct to App Selector after auth, regardless of Gmail count
        // User will select/switch Gmail within the Email app if needed
        setSuccess(`Welcome back, ${userData.name}!`);
        onAuthenticated(userData);
    };

    const handleGreetingClose = () => {
        setShowGreeting(false);
        // Get current user data and authenticate, then show assistance modal
        const authenticateUser = async () => {
            try {
                const data = await authApi.me();
                onAuthenticated(data.user);
                // Show assistance modal after authentication completes
                setTimeout(() => {
                    setShowAssistance(true);
                }, 500);
            } catch {
                onAuthenticated({ username, name: userInfo?.name || username });
                // Show assistance modal after authentication completes
                setTimeout(() => {
                    setShowAssistance(true);
                }, 500);
            }
        };
        authenticateUser();
    };

    const handleAssistanceClose = () => {
        setShowAssistance(false);
        // User is now ready to use the app
    };

    // Speak guidance when auth method step loads
    useEffect(() => {
        if (step === 'auth' && userInfo && !busy) {
            const timer = setTimeout(() => {
                const availableMethods = [];
                if (userInfo.hasVoice) availableMethods.push("voice code");
                if (userInfo.hasFace) availableMethods.push("face recognition");

                let message = `Hello ${userInfo.name || username}. Please select your identification method.`;

                // Create custom speech handling for auth step
                const utter = new SpeechSynthesisUtterance(message);
                utter.rate = 0.95;
                utter.pitch = 1.05;
                utter.volume = 1.0;

                utter.onstart = () => {
                    console.log('Auth guidance speech started:', message);
                    setListeningAuth(false); // Ensure listening is disabled while speaking
                };

                utter.onend = () => {
                    console.log('Auth guidance speech ended, enabling voice listener');
                    setTimeout(() => {
                        setListeningAuth(true); // Enable listening after speech completes
                    }, 500); // Brief delay to ensure speech has fully finished
                };

                utter.onerror = (error) => {
                    console.warn('Auth guidance speech error:', error);
                    setTimeout(() => {
                        setListeningAuth(true); // Enable listening even on error
                    }, 500);
                };

                window.speechSynthesis?.cancel();
                window.speechSynthesis?.speak(utter);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [step, userInfo, busy, username]);

    const handleFaceSuccess = async (descriptorBase64) => {
        // Security check: only allow face authentication if face modal is currently open
        if (modal !== 'face') {
            console.error('Security: Face authentication attempted without modal being open');
            return;
        }
        setModal(null);
        setBusy(true);
        setLoading('Face captured. Verifying identity…');
        try {
            const descriptor = Array.from(base64ToFloat32(descriptorBase64));
            const data = await authApi.loginFace({ username, faceDescriptor: descriptor });
            await afterAuth(data.user);
        } catch (err) { setBusy(false); setError(err.message); }
    };

    const handleVoiceSuccess = async (fpBase64) => {
        // Security check: only allow voice authentication if voice modal is currently open
        if (modal !== 'voice') {
            console.error('Security: Voice authentication attempted without modal being open');
            return;
        }
        setModal(null);
        setBusy(true);
        setLoading('Voice captured. Verifying identity…');
        try {
            const fp = Array.from(base64ToFloat32(fpBase64));
            const data = await authApi.loginVoice({ username, voiceFingerprint: fp });
            await afterAuth(data.user);
        } catch (err) { setBusy(false); setError(err.message); }
    };

    const handlePasswordLogin = async () => {
        if (!passwordInput.trim()) return;
        setBusy(true);
        setLoading('Verifying password…');
        try {
            const data = await authApi.loginWithPassword(username, passwordInput);
            await afterAuth(data.user);
        } catch (err) { setBusy(false); setError(err.message); }
    };

    const handleGmailSelected = async (gmailId) => {
        const found = gmails.find(g => g.id === gmailId);
        // Fetch fresh user data
        try {
            const data = await authApi.me();
            setSuccess(`Opening ${found?.address || 'inbox'}…`);
            await delay(500);
            onAuthenticated(data.user);
        } catch { onAuthenticated({ username, name: userInfo?.name || username, gmails }); }
    };

    return (
        <div className="auth-card glass-panel slide-in">
            {modal === 'face' && (
                <FaceScannerModal mode="login" onClose={() => {
                    setModal(null);
                    setListeningAuth(true);
                    clearStatus();
                    setBusy(false);
                    // Reset any partial authentication state
                }} onSuccess={handleFaceSuccess} />
            )}
            {modal === 'voice' && (
                <VoiceRecorderModal mode="login" onClose={() => {
                    setModal(null);
                    setListeningAuth(true);
                    clearStatus();
                    setBusy(false);
                    // Reset any partial authentication state
                }} onSuccess={handleVoiceSuccess} />
            )}

            {/* Greeting and Assistance modals have been removed for seamless progression */}

            {step !== 'gmail-select' && (
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={16} /> Back
                </button>
            )}

            {/* ── Step: Username ── */}
            {step === 'username' && (
                <div className="login-username-step">
                    <div className="card-header">
                        <div className="brand-icon-wrap sm"><User size={22} /></div>
                        <h2>Welcome Back</h2>
                        <p>Say your username or type it below</p>
                    </div>

                    <StatusMsg type={status.type} message={status.message} />

                    {/* Voice listener — default on */}
                    {!confirming ? (
                        <>
                            <VoiceListener
                                active={listeningUsername && !busy && !voiceCooldownRef.current}
                                onResult={handleUsernameVoice}
                                placeholder='Say your username…'
                            />
                            <div className="or-divider"><span>or type it</span></div>
                            <div className="form-group">
                                <div className="input-with-icon">
                                    <User size={16} className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="your_username"
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && submitUsername()}
                                        disabled={busy}
                                        autoComplete="username"
                                    />
                                </div>
                            </div>
                            <button className="primary-btn" onClick={() => submitUsername()} disabled={busy || !usernameInput.trim()}>
                                {busy ? <><Loader size={16} className="spin" /> Searching…</> : <>Continue <ChevronRight size={16} /></>}
                            </button>
                        </>
                    ) : (
                        /* Confirmation prompt */
                        <div className="confirm-step">
                            <div className="confirm-bubble">
                                <span className="confirm-label">I heard:</span>
                                <span className="confirm-username">"{heardUsername}"</span>
                                <span className="confirm-label">Is this correct?</span>
                            </div>
                            <VoiceListener
                                active={confirming && !voiceCooldownRef.current && !busy}
                                onResult={handleConfirmVoice}
                                placeholder='Say "Yes" to confirm or "No" to retry…'
                            />
                            {/* Debug info */}
                            {confirming && (
                                <div style={{ fontSize: '12px', color: 'gray', marginTop: '10px' }}>
                                    Debug: Confirming={confirming.toString()}, Cooldown={voiceCooldownRef.current.toString()}, Busy={busy.toString()}
                                </div>
                            )}
                            <div className="confirm-btns">
                                <button className="primary-btn" onClick={() => submitUsername(heardUsername)}>
                                    <CheckCircle size={16} /> Yes, that's me
                                </button>
                                <button className="secondary-btn" onClick={() => { setConfirming(false); setHeardUsername(''); setUsernameInput(''); setListeningUsername(true); }}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Step: Auth Method ── */}
            {step === 'auth' && (
                <div className="login-auth-step">
                    <div className="card-header">
                        <div className="brand-icon-wrap sm"><LogIn size={22} /></div>
                        <h2>Verify Identity</h2>
                        <p>Hello <strong>{userInfo?.name || username}</strong>! Choose how to authenticate</p>
                    </div>
                    <StatusMsg type={status.type} message={status.message} />

                    {/* Voice listener for authentication method selection */}
                    <VoiceListener
                        active={step === 'auth' && listeningAuth && !voiceCooldownRef.current && !busy}
                        onResult={handleAuthMethodVoice}
                        placeholder='Say "select voice", "select face", or "continue with gmail"...'
                    />

                    <div className="method-grid">
                        {userInfo?.hasVoice && (
                            <button className="method-card" disabled={busy} onClick={() => {
                                clearStatus();
                                setBusy(false);
                                setModal('voice');
                            }}>
                                <div className="method-icon"><Mic size={32} /></div>
                                <span>Voice Code</span>
                                <small>Speak your passphrase</small>
                            </button>
                        )}
                        {userInfo?.hasFace && (
                            <button className="method-card" disabled={busy} onClick={() => {
                                clearStatus();
                                setBusy(false);
                                setModal('face');
                            }}>
                                <div className="method-icon"><ScanFace size={32} /></div>
                                <span>Face Recognition</span>
                                <small>Look at your camera</small>
                            </button>
                        )}
                        {(!userInfo?.hasVoice && !userInfo?.hasFace) && (
                            <div className="no-biometric-notice">
                                <AlertCircle size={24} />
                                <p>No biometric methods registered. Connect Gmail to access your account.</p>
                                <button className="google-oauth-btn" onClick={() => window.location.href = authApi.googleOAuthUrl()}>
                                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    Continue with Google
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Password Login Field — shown when toggled */}
                    {showPasswordField && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div className="input-with-icon">
                                <Shield size={16} className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Enter password"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                                    autoFocus
                                />
                            </div>
                            <button className="primary-btn" onClick={handlePasswordLogin} disabled={busy || !passwordInput.trim()}>
                                {busy ? <><Loader size={16} className="spin" /> Verifying…</> : <><Shield size={16}/> Login with Password</>}
                            </button>
                        </div>
                    )}
                    {!showPasswordField && (
                        <button style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:12,marginTop:4}} onClick={()=>setShowPasswordField(true)}>
                            Use password instead
                        </button>
                    )}

                    <div className="divider"><span>or</span></div>
                    <button className="google-oauth-btn" onClick={() => window.location.href = authApi.googleOAuthUrl()} disabled={busy}>
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Continue with Google
                    </button>
                    <p className="vl-footer-hint"><Volume2 size={13} /> Voice or face authentication is the default</p>
                </div>
            )}

            {/* ── Step: Gmail Select ── */}
            {step === 'gmail-select' && (
                <GmailSelector
                    gmails={gmails}
                    username={userInfo?.name || username}
                    onSelect={handleGmailSelected}
                />
            )}
        </div>
    );
};

// ─── Register Flow ────────────────────────────────────────────────────────────
const RegisterFlow = ({ onAuthenticated, onBack }) => {
    const { t, lang } = useLang();
    const [step, setStep] = useState('username'); // username | voice | face | gmail
    const [username, setUsername] = useState('');
    const [usernameInput, setUsernameInput] = useState('');
    const [listenUsername, setListenUsername] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [heardUsername, setHeardUsername] = useState('');
    const [voiceFingerprint, setVoiceFingerprint] = useState(null);
    const [faceDescriptor, setFaceDescriptor] = useState(null);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [modal, setModal] = useState(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
    const voiceCooldownRef = useRef(false);

    const setError = (msg) => setStatus({ type: 'error', message: msg });
    const setLoading = (msg) => setStatus({ type: 'loading', message: msg });
    const setSuccess = (msg) => setStatus({ type: 'success', message: msg });
    const clearStatus = () => setStatus({ type: '', message: '' });

    const speak = useCallback((text, requireUserInteraction = false) => {
        // Cancel any ongoing speech
        window.speechSynthesis?.cancel();

        // IMPORTANT: Stop voice listener BEFORE speaking to prevent feedback
        setListenUsername(false);

        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return false;
        }

        // Create and configure utterance
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1.05;
        utter.volume = 1.0;

        let spokenSuccessfully = false;

        // Set up event handlers to manage voice listener state
        utter.onstart = () => {
            spokenSuccessfully = true;
            console.log('Speech synthesis started:', text);
            // Voice listener already stopped above, but ensure it's disabled
            setListenUsername(false);
        };

        utter.onend = () => {
            // Re-enable voice listener after speaking
            console.log('Speech synthesis ended, re-enabling voice listener');
            setTimeout(() => {
                setListenUsername(true);
            }, 800); // Longer delay to ensure speech has finished
        };

        utter.onerror = (error) => {
            console.warn('Speech synthesis error:', error);
            // If it's a permission error, don't retry automatically
            if (error.error === 'not-allowed') {
                console.log('Speech synthesis blocked by browser - requires user interaction first');
                setListenUsername(true);
                return;
            }
            // Re-enable voice listener on other errors
            setTimeout(() => {
                setListenUsername(true);
            }, 800);
        };

        // Try to speak - handle potential permission issues
        try {
            window.speechSynthesis.speak(utter);
            return spokenSuccessfully;
        } catch (error) {
            console.warn('Speech synthesis failed:', error);
            setListenUsername(true);
            return false;
        }
    }, [setListenUsername]);

    // Speak welcome message when registration starts - only after user interaction
    useEffect(() => {
        if (step === 'username' && !hasSpokenWelcome && !busy) {
            const handleUserInteraction = () => {
                if (!hasSpokenWelcome) {
                    setHasSpokenWelcome(true);
                    speak("Let's create your account. Please say your desired username to get started.");
                    document.removeEventListener('click', handleUserInteraction);
                    document.removeEventListener('keydown', handleUserInteraction);
                }
            };

            document.addEventListener('click', handleUserInteraction);
            document.addEventListener('keydown', handleUserInteraction);

            return () => {
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('keydown', handleUserInteraction);
            };
        }
    }, [step, hasSpokenWelcome, busy, speak]);

    // Speak guidance for voice registration step
    useEffect(() => {
        if (step === 'voice' && !busy) {
            const timer = setTimeout(() => {
                // Stop voice listener before speaking
                setListenUsername(false);
                setTimeout(() => {
                    speak("Great! Now let's set up your voice authentication. Please click the button and say the phrase 'My voice is my password' clearly.");
                }, 100);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [step, busy, speak]);

    // Speak guidance for face registration step
    useEffect(() => {
        if (step === 'face' && !busy) {
            const timer = setTimeout(() => {
                // Stop voice listener before speaking
                setListenUsername(false);
                setTimeout(() => {
                    speak("Excellent! Now let's set up face recognition. Please click the button and center your face in the oval when prompted.");
                }, 100);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [step, busy, speak]);

    // Speak guidance for Gmail connection step
    useEffect(() => {
        if (step === 'gmail' && !busy) {
            const timer = setTimeout(() => {
                // Stop voice listener before speaking
                setListenUsername(false);
                setTimeout(() => {
                    // Check if user is coming back from Google OAuth
                    const params = new URLSearchParams(window.location.search);
                    if (params.get.auth === 'success') {
                        // Gmail was connected successfully
                        const verifyUser = async () => {
                            try {
                                const userData = await authApi.me();
                                const expectedUsername = sessionStorage.getItem('pendingRegistrationUsername') || username;

                                if (userData.user) {
                                    // User exists (either was already registered or just created during OAuth)
                                    console.log('✅ Gmail OAuth successful for user:', userData.user.username);

                                    if (userData.user.username === expectedUsername) {
                                        // Check if this is pending registration or existing user
                                        if (userData.user.gmailConnected && !userData.user.hasVoice && !userData.user.hasFace) {
                                            // Pending registration - Gmail connected but user not fully created yet
                                            console.log('📝 Gmail connected for pending registration');
                                            setGmailConnected(true);
                                            speak("Great! Gmail connected successfully. Please complete your voice and face setup to finish registration.");
                                            setSuccess(`Gmail connected as ${userData.user.email}`);

                                            // Set user info for UI but don't proceed to authentication yet
                                            setUserInfo({
                                                username: userData.user.username,
                                                name: userData.user.name,
                                                email: userData.user.email,
                                                hasVoice: false,
                                                hasFace: false,
                                                gmailConnected: true
                                            });
                                        } else {
                                            // Existing user with biometrics already set up
                                            setGmailConnected(true);
                                            speak("Great! Gmail connected successfully. You can now create your account.");
                                            setSuccess(`Gmail connected as ${userData.user.email}`);
                                            setUserInfo(userData.user);
                                        }
                                    } else {
                                        // Different user (session issue)
                                        speak('Session issue detected. Please try again.');
                                        setError('Session issue detected. Please restart registration.');
                                        setGmailConnected(false);
                                    }
                                } else {
                                    // No user authenticated
                                    speak('Gmail connection failed. Please try again.');
                                    setError('Gmail connection failed. Please try again.');
                                    setGmailConnected(false);
                                }

                                // Clear the stored username
                                sessionStorage.removeItem('pendingRegistrationUsername');
                            } catch (err) {
                                console.error('Gmail OAuth verification error:', err);
                                speak('Error verifying Gmail connection. Please try again.');
                                setError('Gmail connection verification failed. Please try again.');
                                setGmailConnected(false);
                                sessionStorage.removeItem('pendingRegistrationUsername');
                            }
                            window.history.replaceState({}, '', '/');
                        };
                        verifyUser();
                    } else {
                        speak("Almost done! Please connect your Gmail account to complete registration.");
                    }
                }, 100);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [step, busy, speak, username]);

    const handleUsernameVoice = (transcript) => {
        // Prevent multiple rapid inputs
        if (voiceCooldownRef.current || busy) return;

        // Clean the heard text into a valid username
        // Remove spaces only between letters (when user spells out name), but keep spaces between words
        let heard = transcript.trim().toLowerCase();

        // If it looks like individual letters with spaces (like "s r a v n"), remove the spaces
        if (/^[a-z]\s+[a-z]/i.test(heard)) {
            heard = heard.replace(/\s+/g, '');
        } else {
            // Otherwise, just replace spaces with underscores for multi-word usernames
            heard = heard.replace(/\s+/g, '_');
        }

        // Remove any non-alphanumeric characters except underscores
        heard = heard.replace(/[^a-z0-9_]/g, '');

        if (!heard) return;

        // Set cooldown to prevent multiple inputs
        voiceCooldownRef.current = true;
        setTimeout(() => { voiceCooldownRef.current = false; }, 2000);

        // Stop listening immediately to prevent multiple inputs
        setListenUsername(false);
        setHeardUsername(heard);
        setUsernameInput(heard);

        // Small delay before showing confirmation to ensure voice listener stops
        setTimeout(() => {
            setConfirming(true);
            // Reset voice cooldown to allow immediate confirmation response
            voiceCooldownRef.current = false;
            // Briefly speak confirmation prompt to help user
            setTimeout(() => {
                const success = speak(`I heard "${heard}". Is this correct? Say yes or no.`);
                if (!success) {
                    // If speech failed, just show visual confirmation
                    console.log('Speech synthesis failed, showing visual confirmation only');
                }
            }, 500);
        }, 100);
    };

    const handleConfirmVoice = (transcript) => {
        console.log('=== CONFIRMATION VOICE INPUT RECEIVED ===');
        console.log('Transcript:', transcript);
        console.log('Voice cooldown state:', voiceCooldownRef.current);
        console.log('Busy state:', busy);
        console.log('Confirming state:', confirming);

        // Prevent multiple rapid inputs during confirmation
        if (voiceCooldownRef.current || busy) {
            console.log('BLOCKED: Voice input rejected due to cooldown or busy state');
            return;
        }

        const t = transcript.toLowerCase().trim();
        console.log('Voice confirmation received:', t);
        console.log('Trimmed transcript:', `"${t}"`);

        // Immediately set cooldown to prevent multiple rapid inputs
        voiceCooldownRef.current = true;

        if (t.includes('yes') || t.includes('correct') || t.includes('yeah') || t.includes('yep') || t === 'yes' || t === 'yeah') {
            console.log('✅ CONFIRMATION DETECTED: Positive response');
            setTimeout(() => { voiceCooldownRef.current = false; }, 2000);

            speak("Username confirmed. Let's check if it's available.");
            setConfirming(false); // Stop listening immediately
            checkUsername(heardUsername);
        } else if (t.includes('no') || t.includes('wrong') || t.includes('retry') || t.includes('again') || t === 'no' || t === 'retry') {
            console.log('❌ CONFIRMATION DETECTED: Negative response');
            setTimeout(() => { voiceCooldownRef.current = false; }, 2000);

            speak("Let's try again. Please say your desired username.");
            setConfirming(false);
            setHeardUsername('');
            setUsernameInput('');
            setListenUsername(true);
        } else {
            // Unrecognized response - ask again and ensure voice listener is active
            console.log('❓ UNRECOGNIZED RESPONSE:', t);
            console.log('Response length:', t.length);
            console.log('Response includes yes:', t.includes('yes'));
            console.log('Response includes no:', t.includes('no'));

            // If we get an empty transcript, it might mean voice recognition isn't working
            if (!t || t.length === 0) {
                console.log('⚠️ EMPTY TRANSCRIPT - Voice recognition may not be working');
                setTimeout(() => { voiceCooldownRef.current = false; }, 1500);
                setTimeout(() => {
                    speak("I didn't catch that. Please say yes to confirm or no to try again. You can also click the Yes button below.");
                }, 1000);
                return;
            }

            setTimeout(() => { voiceCooldownRef.current = false; }, 1500);

            setTimeout(() => {
                speak("Please say yes to confirm or no to try again.");
            }, 1000);
        }
    };

    const checkUsername = async (uname) => {
        const originalInput = uname || usernameInput;
        console.log('=== USERNAME CHECK DEBUG ===');
        console.log('Original input:', JSON.stringify(originalInput));
        console.log('Input type:', typeof originalInput);
        console.log('Input length:', originalInput?.length);

        const cleaned = originalInput.trim().toLowerCase().replace(/\s+/g, '_');
        console.log('Cleaned username:', JSON.stringify(cleaned));
        console.log('Cleaned length:', cleaned.length);

        if (!cleaned || cleaned.length < 2) {
            console.log('❌ Username validation failed');
            return setError('Username must be at least 2 characters.');
        }

        console.log('✅ Username validation passed, making API call...');
        setBusy(true);
        setLoading('Checking availability…');
        setConfirming(false);
        setHeardUsername('');
        setUsernameInput('');

        try {
            console.log('Making API call to check username availability:', cleaned);
            const response = await authApi.checkUsernameAvailability(cleaned);
            console.log('✅ Username availability check response:', response);

            if (response.available) {
                // Username is available!
                console.log('✅ Username is available:', cleaned);
                speak(`Great! The username "${cleaned}" is available. Let's continue with setup.`);
                setUsername(cleaned);
                setBusy(false);
                clearStatus();
                setStep('voice');
            } else {
                // Username is taken
                setBusy(false);
                speak(`Sorry, the username "${cleaned}" is already taken. Please choose another.`);
                setError(response.error || `Username "${cleaned}" is already taken. Please choose another.`);
                setConfirming(false);
                setHeardUsername('');
                setUsernameInput('');
                setListenUsername(true);
            }
        } catch (err) {
            console.log('❌ Username availability check failed:', err);
            setBusy(false);
            setError(err.message || 'Failed to check username availability. Please try again.');
            setConfirming(false);
            setHeardUsername('');
            setUsernameInput('');
            setListenUsername(true);
        }
    };

    const handleRegisterDone = async () => {
        setBusy(true);
        setLoading('Creating your account…');
        try {
            console.log('=== REGISTRATION DEBUG ===');
            console.log('Current registration state:', {
                username,
                hasVoice: !!voiceFingerprint,
                hasFace: !!faceDescriptor,
                gmailConnected,
                voiceFingerprint: voiceFingerprint ? 'present' : 'missing',
                faceDescriptor: faceDescriptor ? 'present' : 'missing'
            });

            // Create user with all collected data including Gmail
            const registrationData = {
                username,
                voiceFingerprint: voiceFingerprint || null,
                faceDescriptor: faceDescriptor || null,
            };

            console.log('Final registration payload:', registrationData);

            const data = await authApi.register(registrationData);

            console.log('Registration response:', data); // Debug log

            speak('Account created successfully! Welcome to Voice Mail Assist!');
            setSuccess('Account created!');
            await delay(400);

            // The registration API call should establish a session for the new user
            // Let's verify we're authenticated as the new user
            const userData = await authApi.me();
            console.log('Current user after registration:', userData); // Debug log

            if (userData.user && userData.user.username === username) {
                // Successfully authenticated as new user
                console.log('✅ Registration successful and session established for:', username);
                onAuthenticated(userData.user);
            } else {
                // Session issue - show error and ask to login manually
                console.error('❌ Session mismatch. Expected:', username, 'Got:', userData.user?.username);
                speak('There was a session issue. Please log in manually with your new account.');
                setError('Session issue detected. Please login manually with your new account.');
                setBusy(false);
                return;
            }

            setBusy(false);
        } catch (err) {
            console.error('❌ Registration error:', err); // Debug log
            console.error('Error details:', {
                message: err.message,
                status: err.status,
                response: err.response
            });
            setBusy(false);
            setError(err.message || 'Registration failed. Please try again.');
        }
    };

    const handleConnectGmail = async () => {
        console.log('=== GMAIL CONNECTION DEBUG ===');
        console.log('Current username state:', username);
        console.log('Voice fingerprint present:', !!voiceFingerprint);
        console.log('Face descriptor present:', !!faceDescriptor);

        // For registration flow, we need to create the user first, then connect Gmail
        if (!username) {
            speak('Please complete the username step first.');
            setError('Username is required before connecting Gmail.');
            return;
        }

        // Store the pending username for post-OAuth registration
        try {
            const response = await fetch('/api/auth/set-pending-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to set pending username');
            }

            console.log('✅ Pending username set successfully:', username);
        } catch (err) {
            console.error('Failed to set pending username:', err);
            speak('Failed to prepare Gmail connection. Please try again.');
            setError('Failed to prepare Gmail connection. Please try again.');
            return;
        }

        window.location.href = authApi.googleOAuthUrl();
    };
    const handleSkipGmail = () => {
        speak("Gmail connection is required to create your account. Please connect your Gmail to continue.");
    };

    const steps = ['Username', 'Voice Code', 'Face ID', 'Gmail'];
    const stepIdx = { username: 0, voice: 1, face: 2, gmail: 3 }[step] || 0;

    return (
        <div className="auth-card auth-card-wide glass-panel slide-in">
            {modal === 'face' && (
                <FaceScannerModal mode="register" onClose={() => setModal(null)}
                    onSuccess={(desc) => { setFaceDescriptor(desc); setModal(null); setSuccess('Face ID registered! ✓'); }} />
            )}
            {modal === 'voice' && (
                <VoiceRecorderModal mode="register" onClose={() => setModal(null)}
                    onSuccess={(fp) => { setVoiceFingerprint(fp); setModal(null); setSuccess('Voice code recorded! ✓'); }} />
            )}

            <button className="back-btn" onClick={step === 'username' ? onBack : () => {
                const prev = ['username', 'voice', 'face', 'gmail'];
                setStep(prev[Math.max(0, stepIdx - 1)]);
                clearStatus();
            }}>
                <ArrowLeft size={16} /> {t.back}
            </button>

            <div className="card-header">
                <h2>Create Your Profile</h2>
                <div className="step-indicator">
                    {steps.map((label, i) => (
                        <div key={i} className={`step-dot ${i <= stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}>
                            <span className="dot-num">{i < stepIdx ? '✓' : i + 1}</span>
                            <span className="dot-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <StatusMsg type={status.type} message={status.message} />

            {/* ── Step 0: Choose Username ── */}
            {step === 'username' && (
                <div className="reg-username-step">
                    <p className="section-hint">Choose a unique username to identify yourself. No email needed!</p>

                    {!confirming ? (
                        <>
                            <VoiceListener
                                active={listenUsername && !busy && !voiceCooldownRef.current}
                                onResult={handleUsernameVoice}
                                placeholder='Say your desired username…'
                            />
                            <div className="or-divider"><span>or type it</span></div>
                            <div className="form-group">
                                <div className="input-with-icon">
                                    <User size={16} className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="your_username (min 2 chars)"
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                        onKeyDown={(e) => e.key === 'Enter' && checkUsername()}
                                        disabled={busy}
                                    />
                                </div>
                            </div>
                            <button className="primary-btn" onClick={() => checkUsername()} disabled={busy || usernameInput.trim().length < 2}>
                                {busy ? <><Loader size={16} className="spin" /> Checking…</> : <>Next <ChevronRight size={16} /></>}
                            </button>
                        </>
                    ) : (
                        <div className="confirm-step">
                            <div className="confirm-bubble">
                                <span className="confirm-label">I heard your username as:</span>
                                <span className="confirm-username">"{heardUsername}"</span>
                                <span className="confirm-label">Is this correct?</span>
                            </div>
                            <VoiceListener
                                active={confirming && !busy && !voiceCooldownRef.current}
                                onResult={handleConfirmVoice}
                                placeholder='Say "Yes" to confirm or "No" to retry…'
                            />
                            <div className="confirm-btns">
                                <button className="primary-btn" onClick={() => checkUsername(heardUsername)}>
                                    <CheckCircle size={16} /> Yes, use this
                                </button>
                                <button className="secondary-btn" onClick={() => { setConfirming(false); setHeardUsername(''); setUsernameInput(''); setListenUsername(true); }}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 1: Voice Code ── */}
            {step === 'voice' && (
                <div className="reg-biometrics">
                    <p className="section-hint">
                        Record a voice passphrase to authenticate by voice. Say <strong>"My voice is my password"</strong>.
                    </p>
                    <div className={`biometric-card ${voiceFingerprint ? 'done' : ''}`}>
                        <div className="biometric-icon"><Mic size={36} /></div>
                        <div className="biometric-info">
                            <h4>Voice Code</h4>
                            <p>{voiceFingerprint ? 'Voice passphrase recorded ✓' : 'Record your unique voice passphrase'}</p>
                        </div>
                        <button className={`biometric-action ${voiceFingerprint ? 'done-btn' : ''}`}
                            onClick={() => { setModal('voice'); clearStatus(); }}
                            disabled={!!voiceFingerprint}>
                            {voiceFingerprint ? <><CheckCircle size={16} /> Registered</> : 'Record Now'}
                        </button>
                    </div>

                    <div className="reg-action-btns">
                        <button className="primary-btn" onClick={() => setStep('face')} disabled={busy}>
                            {voiceFingerprint ? <>Next <ChevronRight size={16} /></> : <>Skip Voice <ChevronRight size={16} /></>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 2: Face ID ── */}
            {step === 'face' && (
                <div className="reg-biometrics">
                    <p className="section-hint">
                        Scan your face for face recognition login. Your face data stays encrypted.
                    </p>
                    <div className={`biometric-card ${faceDescriptor ? 'done' : ''}`}>
                        <div className="biometric-icon"><ScanFace size={36} /></div>
                        <div className="biometric-info">
                            <h4>Face ID</h4>
                            <p>{faceDescriptor ? 'Face registered ✓' : 'Webcam scan using AI face recognition'}</p>
                        </div>
                        <button className={`biometric-action ${faceDescriptor ? 'done-btn' : ''}`}
                            onClick={() => { setModal('face'); clearStatus(); }}
                            disabled={!!faceDescriptor}>
                            {faceDescriptor ? <><CheckCircle size={16} /> Registered</> : 'Set Up'}
                        </button>
                    </div>
                    <div className="reg-action-btns">
                        <button className="primary-btn" onClick={() => setStep('gmail')} disabled={busy}>
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Connect Gmail ── */}
            {step === 'gmail' && (
                <div className="reg-gmail">
                    <p className="section-hint">
                        Connect your Gmail first, then we'll create your account with Gmail linked.
                    </p>
                    <div className="gmail-connect-card">
                        <div className="gmail-icon"><Mail size={40} /></div>
                        <div className="gmail-info">
                            <h4>Link Gmail Account</h4>
                            <p>{gmailConnected ? 'Gmail connected ✓' : 'Connect via Google OAuth 2.0'}</p>
                        </div>
                        <button className={`google-btn ${gmailConnected ? 'done-btn' : ''}`}
                            onClick={handleConnectGmail}
                            disabled={gmailConnected}>
                            {gmailConnected ? <><CheckCircle size={16} /> Connected</> : 'Connect'}
                        </button>
                    </div>

                        <button className="primary-btn" onClick={handleRegisterDone} disabled={busy}>
                            {busy ? <><Loader size={16} className="spin" /> Creating…</> : <>Create Account <ChevronRight size={16} /></>}
                        </button>


                    <p className="section-hint" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                        {gmailConnected ? 'Ready to create your account!' : 'Connect Gmail to continue with registration'}
                    </p>
                </div>
            )}

            <p className="auth-switch">
                {t.alreadyHaveAccount}{' '}
                <button className="link-btn" onClick={onBack}>{t.signIn}</button>
            </p>
        </div>
    );
};

// ─── Main AuthScreen ───────────────────────────────────────────────────────────
const AuthScreen = ({ onAuthenticated }) => {
    const [view, setView] = useState('landing'); // landing | login | register

    return (
        <div className="auth-container">
            <div className="auth-bg">
                <div className="glow-orb primary" />
                <div className="glow-orb secondary" />
                <div className="glow-orb tertiary" />
            </div>

            {view === 'landing' && (
                <LandingStep onChoose={(choice) => setView(choice)} />
            )}
            {view === 'login' && (
                <LoginFlow onAuthenticated={onAuthenticated} onBack={() => setView('landing')} />
            )}
            {view === 'register' && (
                <RegisterFlow onAuthenticated={onAuthenticated} onBack={() => setView('landing')} />
            )}
        </div>
    );
};

export default AuthScreen;

