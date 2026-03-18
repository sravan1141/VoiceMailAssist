import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Mic, MicOff, Loader } from 'lucide-react';
import { gmailApi } from '../../api';
import './VoiceCompose.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const TRANSLATIONS = {
    'en-US': {
        welcome_reply: "Voice reply activated. Let me help you write the reply.",
        welcome_new: "Welcome to Voice Compose. Let me help you write an email.",
        body_start: "Voice reply activated. I will add your words to the message body. Ready when you are.",
        new_start: "Welcome to Voice Compose. I will help you write an email using your voice. Starting with recipient field.",
        speaking_field: "Now speaking {field}. Say the {field} now.",
        fav_hint: " You can also pick from your {count} favorites by saying favorite one, favorite two, and so on.",
        did_not_catch: "Sorry, I didn't catch that. Please try again.",
        fav_not_exist: "Favorite {num} doesn't exist. Please say the email address instead.",
        cleared: "{field} cleared. Please say the {field} again.",
        current_value: "Current {field} is: {val}. Please say the {field} or say skip to continue.",
        to_got_it: "Got it. Recipient is {val}. Now please tell me the email subject.",
        subj_got_it: "Subject set to {val}. Now please tell me your message.",
        body_got_it: "Message recorded. When you're finished, say \"send email\" to send or \"review\" to hear the complete email.",
        all_done: "All fields completed. Say \"review\" to hear the email or \"send email\" to send it.",
        which_edit: "Which field would you like to edit? Say recipient, subject, or message.",
        cmd_help: "Please say \"send email\", \"review\", or \"edit\".",
        say_new_to: "Please say the new recipient email address.",
        say_new_subj: "Please say the new email subject.",
        say_new_body: "Please say the new message.",
        say_edit_choice: "Please say recipient, subject, or message.",
        review_text: "Email to {to}. Subject: {subject}. Message: {body}. Say \"send email\" to send or \"edit\" to make changes.",
        ready_send: "Ready to send email to {to}. Say \"confirm send\" to send or \"cancel\" to go back.",
        send_cancelled: "Send cancelled. Say \"review\" to hear the email again or \"edit\" to make changes.",
        confirm_help: "Please say \"confirm send\" or \"cancel\".",
        missing_fields: "All fields are required. Please fill in the missing fields.",
        sending: "Sending your email now.",
        sent_success: "Your email has been sent successfully!",
        send_error: "Sorry, there was an error sending your email: {err}"
    },
    'hi-IN': {
        welcome_reply: "ध्वनि उत्तर सक्रिय हुआ। उत्तर लिखने में आपकी मदद करूँगा।",
        welcome_new: "वॉयस कंपोज़ में आपका स्वागत है। मैं ईमेल लिखने में आपकी मदद करूँगा।",
        body_start: "ध्वनि उत्तर सक्रिय हुआ। बॉडी में आपके शब्द जोड़े जाएंगे। आप तैयार हैं तो शुरू करें।",
        new_start: "वॉयस कंपोज़ में आपका स्वागत है। प्राप्तकर्ता से शुरू करते हैं।",
        speaking_field: "अब {field} के लिए बोलें।",
        fav_hint: " आप अपने {count} पसंदीदा में से एक को चुनने के लिए पसंदीदा एक, पसंदीदा दो आदि भी कह सकते हैं।",
        did_not_catch: "क्षमा करें, मैं समझ नहीं सका। कृपया पुनः प्रयास करें।",
        fav_not_exist: "पसंदीदा {num} मौजूद नहीं है। कृपया ईमेल पता बोलें।",
        cleared: "{field} को साफ़ कर दिया गया। कृपया {field} फिर से बोलें।",
        current_value: "वर्तमान {field} है: {val}। कृपया {field} बोलें या जारी रखने के लिए स्किप कहें।",
        to_got_it: "समझ गया। प्राप्तकर्ता {val} है। अब कृपया ईमेल विषय बताएं।",
        subj_got_it: "विषय {val} सेट किया गया। अब कृपया अपना संदेश बताएं।",
        body_got_it: "संदेश दर्ज किया गया। समाप्त होने पर, भेजने के लिए \"send email\" कहें या सुनने के लिए \"review\" कहें।",
        all_done: "सभी फ़ील्ड पूर्ण हुए। सुनने के लिए \"review\" कहें या भेजने के लिए \"send email\" कहें।",
        which_edit: "आप किस फ़ील्ड को संपादित करना चाहेंगे? recipient, subject या message कहें।",
        cmd_help: "कृपया \"send email\", \"review\" या \"edit\" कहें।",
        say_new_to: "कृपया नया प्राप्तकर्ता ईमेल पता बोलें।",
        say_new_subj: "कृपया नया ईमेल विषय बोलें।",
        say_new_body: "कृपया नया संदेश बोलें।",
        say_edit_choice: "कृपया recipient, subject या message कहें।",
        review_text: "प्राप्तकर्ता: {to}। विषय: {subject}। संदेश: {body}। भेजने के लिए \"send email\" कहें या बदलने के लिए \"edit\" कहें।",
        ready_send: "{to} को ईमेल भेजने के लिए तैयार। भेजने के लिए \"confirm send\" या वापस जाने के लिए \"cancel\" कहें।",
        send_cancelled: "भेजना रद्द कर दिया गया। फिर से सुनने के लिए \"review\" कहें या बदलने के लिए \"edit\" कहें।",
        confirm_help: "कृपया \"confirm send\" या \"cancel\" कहें।",
        missing_fields: "सभी फ़ील्ड आवश्यक हैं। कृपया छूटे हुए फ़ील्ड भरें।",
        sending: "आपका ईमेल अब भेज रहे हैं।",
        sent_success: "आपका ईमेल सफलतापूर्वक भेज दिया गया है!",
        send_error: "क्षमा करें, आपका ईमेल भेजते समय एक त्रुटि हुई: {err}"
    },
    'es-ES': {
        welcome_reply: "Respuesta por voz activada. Te ayudaré a escribir la respuesta.",
        welcome_new: "Bienvenido a Voice Compose. Te ayudaré a escribir un correo.",
        body_start: "Respuesta por voz activada. Añadiré tus palabras al cuerpo del mensaje. Listo cuando tú lo estés.",
        new_start: "Bienvenido a Voice Compose. Empecemos con el campo del destinatario.",
        speaking_field: "Ahora hablando {field}. Di el {field} ahora.",
        fav_hint: " También puedes elegir de tus {count} favoritos diciendo favorito uno, favorito dos, etc.",
        did_not_catch: "Lo siento, no entendí bien. Intenta de nuevo.",
        fav_not_exist: "El favorito {num} no existe. Por favor di el correo.",
        cleared: "{field} borrado. Di el {field} de nuevo.",
        current_value: "El {field} actual es: {val}. Di el {field} o saltar para continuar.",
        to_got_it: "Entendido. El destinatario es {val}. Ahora dime el asunto.",
        subj_got_it: "Asunto {val}. Ahora dime tu mensaje.",
        body_got_it: "Mensaje grabado. Di enviar (send) o revisar (review).",
        all_done: "Todo listo. Di revisar (review) para escuchar o enviar (send email) para mandarlo.",
        which_edit: "¿Qué campo quieres editar? Di recipient, subject o message.",
        cmd_help: "Di send email, review, o edit.",
        say_new_to: "Por favor di el nuevo correo del destinatario.",
        say_new_subj: "Por favor di el nuevo asunto.",
        say_new_body: "Por favor di el nuevo mensaje.",
        say_edit_choice: "Por favor di recipient, subject, o message.",
        review_text: "Correo para {to}. Asunto: {subject}. Mensaje: {body}. Di send email o edit.",
        ready_send: "Listo para enviar a {to}. Di confirm send o cancel.",
        send_cancelled: "Envío cancelado. Di review o edit.",
        confirm_help: "Di confirm send o cancel.",
        missing_fields: "Todos los campos son obligatorios.",
        sending: "Enviando tu correo...",
        sent_success: "¡Tu correo ha sido enviado con éxito!",
        send_error: "Hubo un error al enviar: {err}"
    },
    'fr-FR': {
        welcome_reply: "Réponse vocale activée. Je vais vous aider à écrire.",
        welcome_new: "Bienvenue. Je vais vous aider à écrire un email.",
        body_start: "Réponse vocale activée. Je vais ajouter vos mots. Prêt quand vous l'êtes.",
        new_start: "Bienvenue. Commençons par le destinataire.",
        speaking_field: "Champ {field}. Dites le {field} maintenant.",
        fav_hint: " Vous pouvez choisir parmi vos {count} favoris.",
        did_not_catch: "Désolé, je n'ai pas compris. Veuillez réessayer.",
        fav_not_exist: "Le favori {num} n'existe pas.",
        cleared: "{field} effacé. Répétez le {field}.",
        current_value: "{field} actuel: {val}. Dites le {field} ou passer (skip).",
        to_got_it: "Compris. Destinataire : {val}. Quel est le sujet ?",
        subj_got_it: "Sujet : {val}. Quel est votre message ?",
        body_got_it: "Message enregistré. Dites envoyer (send email) ou revoir (review).",
        all_done: "Champs terminés. Dites review ou send email.",
        which_edit: "Lequel éditer ? Dites recipient, subject, ou message.",
        cmd_help: "Dites send email, review, ou edit.",
        say_new_to: "Dites le nouveau destinataire.",
        say_new_subj: "Dites le nouveau sujet.",
        say_new_body: "Dites le nouveau message.",
        say_edit_choice: "Dites recipient, subject, ou message.",
        review_text: "Pour {to}. Sujet: {subject}. Message: {body}. Dites send email ou edit.",
        ready_send: "Prêt à envoyer à {to}. Dites confirm send ou cancel.",
        send_cancelled: "Annulé. Dites review ou edit.",
        confirm_help: "Dites confirm send ou cancel.",
        missing_fields: "Tous les champs sont requis.",
        sending: "Envoi en cours...",
        sent_success: "Email envoyé avec succès !",
        send_error: "Erreur lors de l'envoi : {err}"
    },
    'bn-IN': {
        welcome_reply: "ভয়েস রিপ্লাই চালু হয়েছে। আমি সাহায্য করবো।",
        welcome_new: "ভয়েস কম্পোজে স্বাগতম। আমি ইমেইল লিখতে সাহায্য করবো।",
        body_start: "আমি আপনার কথাগুলো মেসেজ বডিতে যোগ করবো।",
        new_start: "ভয়েস কম্পোজে স্বাগতম। প্রাপক দিয়ে শুরু করি।",
        speaking_field: "এখন {field} বলুন।",
        fav_hint: " আপনি আপনার প্রিয় থেকে বেছে নিতে পারেন।",
        did_not_catch: "দুঃখিত, বুঝিনি। আবার চেষ্টা করুন।",
        fav_not_exist: "ফেভারিট {num} নেই।",
        cleared: "{field} মুছে ফেলা হয়েছে। আবার বলুন।",
        current_value: "বর্তমান {field}: {val}। বলুন বা স্কিপ করুন।",
        to_got_it: "প্রাপক {val}। এবার বিষয় বলুন।",
        subj_got_it: "বিষয় {val}। এবার মেসেজ বলুন।",
        body_got_it: "রেকর্ড করা হয়েছে। পাঠাতে send email বা শুনতে review বলুন।",
        all_done: "শেষ হয়েছে। review বা send email বলুন।",
        which_edit: "কোন ফিল্ড এডিট করবেন? recipient, subject, না message?",
        cmd_help: "send email, review, বা edit বলুন।",
        say_new_to: "নতুন প্রাপক বলুন।",
        say_new_subj: "নতুন বিষয় বলুন।",
        say_new_body: "নতুন মেসেজ বলুন।",
        say_edit_choice: "recipient, subject, বা message বলুন।",
        review_text: "খসড়া তৈরি। {to}, {subject}, {body}। send email বা edit বলুন।",
        ready_send: "পাঠাতে প্রস্তুত। confirm send বা cancel বলুন।",
        send_cancelled: "বাতিল করা হয়েছে।",
        confirm_help: "confirm send বা cancel বলুন।",
        missing_fields: "সবগুলো ফিল্ড পূরণ করুন।",
        sending: "পাঠানো হচ্ছে...",
        sent_success: "পাঠানো সফল হয়েছে!",
        send_error: "ত্রুটি: {err}"
    },
    'ta-IN': {
        welcome_reply: "குரல் பதில் ஆரம்பம். நான் உதவுகிறேன்.",
        welcome_new: "குரல் மூலம் எழுத வரவேற்கிறோம்.",
        body_start: "நான் உங்கள் வார்த்தைகளை சேர்ப்பேன். நீங்கள் தயாரா.",
        new_start: "பெறுநரிடமிருந்து தொடங்கலாம்.",
        speaking_field: "இப்போது {field} சொல்லுங்கள்.",
        fav_hint: " உங்களுக்கு பிடித்தவைகளை தேர்வு செய்யலாம்.",
        did_not_catch: "மன்னிக்கவும், புரியவில்லை. மீண்டும் முயல்க.",
        fav_not_exist: "விருப்பம் {num} இல்லை.",
        cleared: "{field} நீக்கப்பட்டது. மீண்டும் சொல்லவும்.",
        current_value: "தற்போதைய {field}: {val}. தொடர skip சொல்லவும்.",
        to_got_it: "பெறுநர் {val}. இப்போ தலைப்பைச் சொல்லுங்கள்.",
        subj_got_it: "தலைப்பு {val}. செய்தியைச் சொல்லுங்கள்.",
        body_got_it: "பதிவு செய்யப்பட்டது. அனுப்ப send email அல்லது சரிபார்க்க review சொல்லுங்கள்.",
        all_done: "முடிந்தது. review அல்லது send email சொல்லுங்கள்.",
        which_edit: "எதை மாற்ற வேண்டும்? recipient, subject, அல்லது message?",
        cmd_help: "send email, review, அல்லது edit சொல்லவும்.",
        say_new_to: "புதிய பெறுநரைச் சொல்லவும்.",
        say_new_subj: "புதிய தலைப்பைச் சொல்லவும்.",
        say_new_body: "புதிய செய்தியைச் சொல்லவும்.",
        say_edit_choice: "recipient, subject, அல்லது message சொல்லவும்.",
        review_text: "To: {to}, Sub: {subject}, Msg: {body}. send email அல்லது edit சொல்லவும்.",
        ready_send: "அனுப்ப தயார். confirm send அல்லது cancel சொல்லவும்.",
        send_cancelled: "ரத்து செய்யப்பட்டது.",
        confirm_help: "confirm send அல்லது cancel சொல்லவும்.",
        missing_fields: "அனைத்து விவரங்களையும் நிரப்பவும்.",
        sending: "அனுப்புகிறது...",
        sent_success: "வெற்றிகரமாக அனுப்பப்பட்டது!",
        send_error: "பிழை: {err}"
    },
    'te-IN': {
        welcome_reply: "వాయిస్ రిప్లై యాక్టివేట్ అయింది. నేను సహాయం చేస్తాను.",
        welcome_new: "వాయిస్ కంపోజ్‌కు స్వాగతం. ఇమెయిల్ రాయడంలో సహాయం చేస్తాను.",
        body_start: "నేను మీ మాటలను మెసేజ్‌లో చేర్చుతాను. సిద్ధమేనా.",
        new_start: "వాయిస్ కంపోజ్‌కు స్వాగతం. స్వీకర్త తో ప్రారంభిద్దాం.",
        speaking_field: "ఇప్పుడు {field} చెప్పండి.",
        fav_hint: " మీకు ఇష్టమైనవి ఎంచుకోవచ్చు.",
        did_not_catch: "క్షమించండి, అర్థం కాలేదు. మళ్ళీ ప్రయత్నించండి.",
        fav_not_exist: "ఫేవరెట్ {num} లేదు.",
        cleared: "{field} తొలగించబడింది. మళ్ళీ చెప్పండి.",
        current_value: "ప్రస్తుతం {field}: {val}. కొనసాగడానికి skip చెప్పండి.",
        to_got_it: "స్వీకర్త {val}. ఇప్పుడు సబ్జెక్ట్ చెప్పండి.",
        subj_got_it: "సబ్జెక్ట్ {val}. ఇప్పుడు మెసేజ్ చెప్పండి.",
        body_got_it: "రికార్డ్ అయింది. పంపడానికి send email లేదా చెక్ చేయడానికి review చెప్పండి.",
        all_done: "పూర్తయింది. review లేదా send email చెప్పండి.",
        which_edit: "ఏది ఎడిట్ చేయాలి? recipient, subject, లేదా message?",
        cmd_help: "send email, review, లేదా edit చెప్పండి.",
        say_new_to: "కొత్త స్వీకర్తను చెప్పండి.",
        say_new_subj: "కొత్త సబ్జెక్ట్ చెప్పండి.",
        say_new_body: "కొత్త మెసేజ్ చెప్పండి.",
        say_edit_choice: "recipient, subject, లేదా message చెప్పండి.",
        review_text: "To: {to}, Sub: {subject}, Msg: {body}. send email లేదా edit చెప్పండి.",
        ready_send: "పంపేందుకు సిద్ధం. confirm send లేదా cancel చెప్పండి.",
        send_cancelled: "రద్దు చేయబడింది.",
        confirm_help: "confirm send లేదా cancel చెప్పండి.",
        missing_fields: "అన్ని వివరాలు నింపండి.",
        sending: "పంపుతున్నాము...",
        sent_success: "విజయవంతంగా పంపబడింది!",
        send_error: "లోపం: {err}"
    }
};

const getT = (lang) => TRANSLATIONS[lang] || TRANSLATIONS['en-US'];
const replaceT = (text, vars) => {
    let output = text;
    for (const [key, val] of Object.entries(vars)) {
        output = output.split(`{${key}}`).join(val);
    }
    return output;
};

const VoiceCompose = ({ user, onClose, onSent, prefill }) => {
    const userLang = user?.language_preference || 'en-US';
    const t = getT(userLang);

    const defaultForm = prefill || { to: '', subject: '', body: '' };
    const [form, setForm] = useState(defaultForm);
    const [status, setStatus] = useState({ type: '', msg: '' });

    // If prefill exists and has a 'to' field, start with the 'body', otherwise start with 'to'
    const startField = prefill && prefill.to ? 'body' : 'to';
    const [currentField, setCurrentField] = useState(startField);

    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [guidance, setGuidance] = useState(prefill && prefill.to ? t.welcome_reply : t.welcome_new);
    const [confirmationMode, setConfirmationMode] = useState(false);
    const [confirmationDetails, setConfirmationDetails] = useState(null);

    const recognitionRef = useRef(null);
    const formRef = useRef(form);
    const fieldOrder = ['to', 'subject', 'body'];
    const fieldLabels = {
        to: t.labels?.to || 'recipient email address',
        subject: t.labels?.subject || 'email subject',
        body: t.labels?.body || 'email message'
    };

    // Check if system is currently speaking
    const isSystemSpeaking = useCallback(() => {
        return 'speechSynthesis' in window && window.speechSynthesis.speaking;
    }, []);

    // Auto-start voice guidance when component mounts
    useEffect(() => {
        console.log('[VoiceCompose] Component mounted, starting auto-guidance');
        if (prefill && prefill.to) {
            speakGuidance(t.body_start, () => {
                console.log('[VoiceCompose] Speech completed, starting body listening');
                setTimeout(() => startFieldListening('body'), 1500);
            });
        } else {
            speakGuidance(t.new_start, () => {
                console.log('[VoiceCompose] Speech completed, starting field listening');
                // Start listening after speech completes with proper delay
                setTimeout(() => startFieldListening('to'), 1500);
            });
        }
    }, [t]);

    // Update formRef when form state changes
    useEffect(() => {
        formRef.current = form;
        console.log('[VoiceCompose] Form state updated:', form);
    }, [form]);

    // Voice guidance function with speech interference protection
    const speakGuidance = useCallback((text, callback = null) => {
        console.log('[VoiceCompose] speakGuidance called:', text, 'callback:', !!callback);
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = userLang;
            utter.rate = 0.9;
            utter.pitch = 1.05;

            utter.onstart = () => {
                console.log('[VoiceCompose] Speech started');
                setIsSpeaking(true);
                setGuidance(text);
            };

            utter.onend = () => {
                console.log('[VoiceCompose] Speech ended, callback:', !!callback);
                setIsSpeaking(false);
                // Wait longer after speech ends to ensure it's fully complete
                if (callback) {
                    setTimeout(callback, 1200); // Increased delay to prevent interference
                }
            };

            utter.onerror = (error) => {
                console.log('[VoiceCompose] Speech error:', error);
                setIsSpeaking(false);
                if (callback) {
                    setTimeout(callback, 1200); // Also increased delay for errors
                }
            };

            window.speechSynthesis.speak(utter);
        } else if (callback) {
            console.log('[VoiceCompose] No speech synthesis, calling callback directly');
            setTimeout(callback, 1500);
        }
    }, []);

    // Start listening for a specific field
    const startFieldListening = useCallback((field) => {
        if (!SpeechRecognition) return;

        setCurrentField(field);

        let introSpeech = replaceT(t.speaking_field, { field: fieldLabels[field] });
        if (field === 'to') {
            let favs = [];
            try { favs = JSON.parse(localStorage.getItem('fav_addresses') || '[]'); } catch { }
            if (favs.length > 0) {
                introSpeech += replaceT(t.fav_hint, { count: favs.length });
            }
        }
        setGuidance(introSpeech);

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US';
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
            if (!isSystemSpeaking()) {
                setIsListening(true);
            }
        };

        rec.onresult = (e) => {
            const result = e.results[e.results.length - 1];
            if (result.isFinal) {
                const transcript = result[0].transcript.trim();
                handleFieldInput(field, transcript);
                rec.stop();
            }
        };

        rec.onerror = (error) => {
            console.error('Speech recognition error:', error.error);
            setIsListening(false);
            if (error.error !== 'aborted' && error.error !== 'not-allowed') {
                setGuidance(t.did_not_catch);
                setTimeout(() => startFieldListening(field), 2000);
            }
        };

        rec.onend = () => {
            setIsListening(false);
        };

        // Only start if not currently speaking
        if (!isSystemSpeaking()) {
            rec.start();
            recognitionRef.current = rec;
        }
    }, [isSystemSpeaking]);

    // Handle input for a specific field
    const handleFieldInput = (field, transcript) => {
        let processedText = transcript;
        const lowerTrans = transcript.toLowerCase();

        // Process favourite address selection
        if (field === 'to' && (lowerTrans.includes('favorite') || lowerTrans.includes('favourite'))) {
            let favs = [];
            try { favs = JSON.parse(localStorage.getItem('fav_addresses') || '[]'); } catch { }

            const numMap = { 'first': 1, '1st': 1, 'one': 1, '1': 1, 'second': 2, '2nd': 2, 'two': 2, '2': 2, 'third': 3, '3rd': 3, 'three': 3, '3': 3, 'fourth': 4, '4th': 4, 'four': 4, '4': 4, 'fifth': 5, '5th': 5, 'five': 5, '5': 5 };
            const match = Object.keys(numMap).find(k => lowerTrans.includes(k));

            if (match) {
                const index = numMap[match] - 1;
                if (favs[index]) {
                    processedText = favs[index];
                } else {
                    speakGuidance(replaceT(t.fav_not_exist, { num: numMap[match] }), () => startFieldListening('to'));
                    return;
                }
            }
        } else if (field === 'to' && processedText && !processedText.includes('@')) {
            // Auto-add @gmail.com for email addresses if not already included and it wasn't a mapped favorite
            processedText = processedText.replace(/\s+/g, '').toLowerCase() + '@gmail.com';
        }

        // Process special commands
        if (transcript.toLowerCase().includes('clear')) {
            setForm(prev => ({ ...prev, [field]: '' }));
            speakGuidance(replaceT(t.cleared, { field: fieldLabels[field] }), () => {
                setTimeout(() => startFieldListening(field), 2000);
            });
            return;
        }

        if (transcript.toLowerCase().includes('skip')) {
            moveToNextField(field);
            return;
        }

        if (transcript.toLowerCase().includes('repeat')) {
            speakGuidance(replaceT(t.current_value, { field: fieldLabels[field], val: form[field] || 'empty' }), () => {
                setTimeout(() => startFieldListening(field), 3000);
            });
            return;
        }

        // Update the field
        console.log('[VoiceCompose] Updating field:', field, 'with:', processedText);
        setForm(prev => ({ ...prev, [field]: processedText }));
        console.log('[VoiceCompose] Form updated:', { ...form, [field]: processedText });

        // Provide feedback and move to next field
        if (field === 'to') {
            speakGuidance(replaceT(t.to_got_it, { val: processedText }), () => {
                setTimeout(() => startFieldListening('subject'), 1000);
            });
        } else if (field === 'subject') {
            speakGuidance(replaceT(t.subj_got_it, { val: processedText }), () => {
                setTimeout(() => startFieldListening('body'), 1000);
            });
        } else if (field === 'body') {
            speakGuidance(t.body_got_it, () => {
                setTimeout(() => startCommandListening(), 1000);
            });
        }
    };

    // Move to the next field
    const moveToNextField = (currentField) => {
        const currentIndex = fieldOrder.indexOf(currentField);
        if (currentIndex < fieldOrder.length - 1) {
            const nextField = fieldOrder[currentIndex + 1];
            setTimeout(() => startFieldListening(nextField), 1000);
        } else {
            // All fields completed, offer to review or send
            console.log('[VoiceCompose] All fields completed, starting command listening');
            speakGuidance(t.all_done, () => {
                console.log('[VoiceCompose] Speech completed, starting command listening');
                setTimeout(() => {
                    console.log('[VoiceCompose] Delay completed, starting command listening');
                    startCommandListening();
                }, 1000);
            });
        }
    };

    // Start listening for commands (send, review, edit)
    const startCommandListening = () => {
        console.log('[VoiceCompose] startCommandListening called');
        if (!SpeechRecognition) {
            console.log('[VoiceCompose] SpeechRecognition not available');
            return;
        }

        if (isSystemSpeaking()) {
            console.log('[VoiceCompose] System is speaking, delaying command listening');
            setTimeout(() => startCommandListening(), 1000);
            return;
        }

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US';
        rec.interimResults = false;
        rec.continuous = false;

        rec.onstart = () => {
            console.log('[VoiceCompose] Command listening started');
            setIsListening(true);
        };

        rec.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            console.log('[VoiceCompose] Command recognized:', transcript);
            console.log('[VoiceCompose] Full transcript:', e.results[e.results.length - 1][0].transcript);

            // More flexible command matching
            const isSendCommand = transcript.includes('send') ||
                transcript.includes('send email') ||
                transcript === 'send' ||
                transcript === 'email' ||
                transcript.includes('sending');

            const isReviewCommand = transcript.includes('review') ||
                transcript === 'review';

            const isEditCommand = transcript.includes('edit') ||
                transcript === 'edit';

            console.log('[VoiceCompose] Command analysis:', {
                transcript,
                isSendCommand,
                isReviewCommand,
                isEditCommand
            });

            if (isSendCommand) {
                console.log('[VoiceCompose] Send command detected, calling sendEmail');
                sendEmail();
            } else if (isReviewCommand) {
                console.log('[VoiceCompose] Review command detected');
                reviewEmail();
            } else if (isEditCommand) {
                console.log('[VoiceCompose] Edit command detected');
                speakGuidance(t.which_edit, () => {
                    startEditListening();
                });
            } else {
                console.log('[VoiceCompose] Unknown command:', transcript);
                speakGuidance(t.cmd_help, () => {
                    startCommandListening();
                });
            }

            rec.stop();
        };

        rec.onerror = (error) => {
            console.log('[VoiceCompose] Command listening error:', error.error);
            setIsListening(false);
            if (error.error !== 'aborted' && error.error !== 'not-allowed') {
                setTimeout(() => startCommandListening(), 2000);
            }
        };

        rec.onend = () => {
            console.log('[VoiceCompose] Command listening ended');
            setIsListening(false);
        };

        console.log('[VoiceCompose] Starting command recognition');
        rec.start();
        recognitionRef.current = rec;
    };

    // Start listening for edit commands
    const startEditListening = () => {
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US';
        rec.interimResults = false;
        rec.continuous = false;

        rec.onstart = () => setIsListening(true);

        rec.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();

            if (transcript.includes('recipient') || transcript.includes('to')) {
                speakGuidance(t.say_new_to, () => startFieldListening('to'));
            } else if (transcript.includes('subject')) {
                speakGuidance(t.say_new_subj, () => startFieldListening('subject'));
            } else if (transcript.includes('message') || transcript.includes('body')) {
                speakGuidance(t.say_new_body, () => startFieldListening('body'));
            } else {
                speakGuidance(t.say_edit_choice, () => startEditListening());
            }

            rec.stop();
        };

        rec.onerror = (error) => {
            setIsListening(false);
            if (error.error !== 'aborted' && error.error !== 'not-allowed') {
                setTimeout(() => startEditListening(), 2000);
            }
        };

        rec.onend = () => setIsListening(false);

        rec.start();
        recognitionRef.current = rec;
    };

    // Review the complete email
    const reviewEmail = () => {
        const review = replaceT(t.review_text, { to: formRef.current.to, subject: formRef.current.subject, body: formRef.current.body });
        setGuidance(review);
        speakGuidance(review, () => {
            startCommandListening();
        });
    };

    // Prepare send confirmation
    const prepareSendConfirmation = () => {
        setConfirmationDetails({
            to: form.to,
            subject: form.subject,
            body: form.body
        });
        setConfirmationMode(true);
        speakGuidance(replaceT(t.ready_send, { to: form.to }), () => {
            startConfirmationListening();
        });
    };

    // Start listening for send confirmation
    const startConfirmationListening = () => {
        if (!SpeechRecognition) return;

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US';
        rec.interimResults = false;
        rec.continuous = false;

        rec.onstart = () => setIsListening(true);

        rec.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();

            if (transcript.includes('confirm') || transcript.includes('send')) {
                sendEmail();
            } else if (transcript.includes('cancel')) {
                setConfirmationMode(false);
                speakGuidance(t.send_cancelled, () => {
                    startCommandListening();
                });
            } else {
                speakGuidance(t.confirm_help, () => {
                    startConfirmationListening();
                });
            }

            rec.stop();
        };

        rec.onerror = (error) => {
            setIsListening(false);
            if (error.error !== 'aborted' && error.error !== 'not-allowed') {
                setTimeout(() => startConfirmationListening(), 2000);
            }
        };

        rec.onend = () => setIsListening(false);

        rec.start();
        recognitionRef.current = rec;
    };

    // Send the email
    const sendEmail = async () => {
        const currentForm = formRef.current;
        console.log('[VoiceCompose] sendEmail called, current form data:', currentForm);

        if (!currentForm.to || !currentForm.subject || !currentForm.body) {
            console.log('[VoiceCompose] Missing fields:', {
                to: !!currentForm.to,
                subject: !!currentForm.subject,
                body: !!currentForm.body
            });
            speakGuidance(t.missing_fields);
            return;
        }

        setStatus({ type: 'loading', msg: 'Sending...' });
        speakGuidance(t.sending);

        try {
            await gmailApi.sendMessage(currentForm);
            setStatus({ type: 'success', msg: '✓ Email sent successfully!' });
            speakGuidance(t.sent_success);
            await new Promise(resolve => setTimeout(resolve, 2000));
            onSent?.();
            onClose();
        } catch (err) {
            const isTokenError = err.message?.toLowerCase().includes('gmail_token_expired')
                || err.message?.toLowerCase().includes('invalid_grant')
                || err.message?.toLowerCase().includes('expired');
            if (isTokenError) {
                setStatus({ type: 'error', msg: '⚠ Gmail session expired. Please reconnect your Gmail account.', reconnect: true });
                speakGuidance('Your Gmail session has expired. Please reconnect your Gmail account from the sidebar.');
            } else {
                setStatus({ type: 'error', msg: err.message });
                speakGuidance(replaceT(t.send_error, { err: err.message }));
            }
        }

    };

    // Manual send button handler
    const handleManualSend = async () => {
        if (!form.to || !form.subject || !form.body) {
            setStatus({ type: 'error', msg: 'All fields are required.' });
            return;
        }
        await sendEmail();
    };

    // Stop current listening session
    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return (
        <div className="voice-compose-overlay">
            <div className="voice-compose-modal glass-panel">
                <div className="voice-compose-header">
                    <span className="modal-title">
                        <Send size={18} /> Voice Compose
                    </span>
                    <button className="icon-close" onClick={onClose}>✕</button>
                </div>

                {/* Voice Guidance Section */}
                <div className="voice-guidance">
                    <div className="guidance-content">
                        <div className="guidance-icon">
                            {isListening ? <MicOff className="pulse" size={20} /> : <Mic size={20} />}
                        </div>
                        <div className="guidance-text">
                            <p className="guidance-main">{guidance}</p>
                            {currentField && (
                                <p className="guidance-field">
                                    Current field: <strong>{fieldLabels[currentField]}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                    {isListening && (
                        <div className="listening-indicator">
                            <span className="listening-dot"></span>
                            <span className="listening-dot"></span>
                            <span className="listening-dot"></span>
                        </div>
                    )}
                </div>

                {/* Email Form */}
                <div className="voice-compose-form">
                    {status.msg && (
                        <div className={`status-message ${status.type}`}>
                            {status.type === 'loading' && <Loader size={16} className="spin" />}
                            {status.msg}
                            {status.reconnect && (
                                <a
                                    href="http://localhost:3002/api/auth/google?relink=1"
                                    style={{ display: 'block', marginTop: '8px', color: '#4F8EF7', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    → Reconnect Gmail
                                </a>
                            )}
                        </div>
                    )}


                    <div className="form-field">
                        <label>To:</label>
                        <div className="field-content">
                            <input
                                type="email"
                                value={form.to}
                                onChange={(e) => setForm(prev => ({ ...prev, to: e.target.value }))}
                                placeholder="recipient@example.com"
                                className={currentField === 'to' ? 'active-field' : ''}
                            />
                            <button
                                type="button"
                                className="field-mic-btn"
                                onClick={() => startFieldListening('to')}
                                disabled={isListening}
                            >
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Subject:</label>
                        <div className="field-content">
                            <input
                                type="text"
                                value={form.subject}
                                onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Email subject"
                                className={currentField === 'subject' ? 'active-field' : ''}
                            />
                            <button
                                type="button"
                                className="field-mic-btn"
                                onClick={() => startFieldListening('subject')}
                                disabled={isListening}
                            >
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Message:</label>
                        <div className="field-content">
                            <textarea
                                value={form.body}
                                onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                                placeholder="Your message..."
                                rows={6}
                                className={currentField === 'body' ? 'active-field' : ''}
                            />
                            <button
                                type="button"
                                className="field-mic-btn"
                                onClick={() => startFieldListening('body')}
                                disabled={isListening}
                            >
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="compose-actions">
                        <button
                            className="review-btn"
                            onClick={reviewEmail}
                            disabled={isListening}
                        >
                            Review Email
                        </button>
                        <button
                            className="send-btn"
                            onClick={handleManualSend}
                            disabled={status.type === 'loading' || isListening}
                        >
                            {status.type === 'loading' ? (
                                <>
                                    <Loader size={16} className="spin" /> Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={16} /> Send Email
                                </>
                            )}
                        </button>
                    </div>

                    {/* Voice Commands Help */}
                    <div className="voice-commands-help">
                        <h4>Voice Commands:</h4>
                        <ul>
                            <li><strong>"Clear"</strong> - Clear current field</li>
                            <li><strong>"Skip"</strong> - Skip current field</li>
                            <li><strong>"Repeat"</strong> - Hear current field value</li>
                            <li><strong>"Review"</strong> - Hear complete email</li>
                            <li><strong>"Edit"</strong> - Edit a specific field</li>
                            <li><strong>"Send email"</strong> - Send the email</li>
                            <li><strong>"Confirm send"</strong> - Confirm sending</li>
                            <li><strong>"Cancel"</strong> - Cancel send operation</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceCompose;
