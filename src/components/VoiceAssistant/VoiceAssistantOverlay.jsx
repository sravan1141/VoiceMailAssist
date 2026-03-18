import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X, Send, MailOpen, MicOff, Wifi } from 'lucide-react';
import { voiceApi } from '../../api';
import './VoiceAssistantOverlay.css';
import './AutoListeningIndicator.css';

const COMMANDS = [
    // Email commands
    { phrases: ['compose', 'new email', 'send email', 'write email', 'ईमेल लिखें', 'नया ईमेल', 'escribir correo', 'correo nuevo', 'nouveau message', 'nouvel email', 'নতুন ইমেইল', 'புதிய மின்னஞ்சல்', 'కొత్త ఇమెయిల్'], action: 'compose', replyKey: 'compose' },
    { phrases: ['read', 'open email', 'latest email', 'first email', 'my email', 'ईमेल पढ़ें', 'leer correo', 'lire email', 'ইমেইল পড়ুন', 'மின்னஞ்சல் படி', 'ఇమెయిల్ చదవండి'], action: 'read', replyKey: 'read' },
    { phrases: ['logout', 'exit', 'goodbye', 'sign out', 'लॉगआउट', 'बाहर निकलें', 'cerrar sesión', 'déconnexion', 'লগআউট', 'வெளியேறு', 'లాగ్అవుట్'], action: 'logout', replyKey: 'logout' },
    { phrases: ['inbox', 'go to inbox', 'इनबॉक्स', 'bandeja de entrada', 'boîte de réception', 'ইনবক্স', 'இன்பாக்ஸ்', 'ఇన్‌బాక్స్'], action: 'inbox', replyKey: 'inbox' },
    { phrases: ['spam', 'spam folder', 'junk', 'स्पैम', 'correo no deseado', 'indésirable', 'স্প্যাম', 'ஸ்பேம்', 'స్పామ్'], action: 'spam', replyKey: 'spam' },
    { phrases: ['sent', 'sent folder', 'sent emails', 'भेजे गए', 'enviados', 'envoyés', 'পাঠানো', 'அனுப்பியவை', 'పంపినవి'], action: 'sent', replyKey: 'sent' },
    { phrases: ['drafts', 'draft folder', 'ड्राफ्ट', 'borradores', 'brouillons', 'খসড়া', 'வரைவுகள்', 'డ్రాఫ్ట్‌లు'], action: 'drafts', replyKey: 'drafts' },
    { phrases: ['trash', 'trash folder', 'open trash', 'कचरा', 'papelera', 'corbeille', 'ট্র্যাশ', 'குப்பை', 'ట్రాష్'], action: 'trash', replyKey: 'trash' },
    { phrases: ['delete', 'remove email', 'हटाएं', 'eliminar', 'supprimer', 'মুছে ফেলুন', 'நீக்கு', 'తొలగించు'], action: 'delete', replyKey: 'delete' },
    { phrases: ['favourite addresses', 'favorites folder', 'open favourites', 'पसंदीदा', 'favoritos', 'favoris', 'পছন্দনীয়', 'பிடித்தவை', 'ఇష్టమైనవి'], action: 'favorites', replyKey: 'favorites' },
    { phrases: ['star', 'mark as star', 'starred', 'favorite this', 'तारांकित', 'destacar', 'étoiler', 'স্টার', 'நட்சத்திரம்', 'నక్షత్రం'], action: 'star', replyKey: 'star' },
    { phrases: ['next', 'next email', 'forward', 'अगला', 'siguiente', 'suivant', 'পরবর্তী', 'அடுத்தது', 'తరువాత'], action: 'next', replyKey: 'next' },
    { phrases: ['previous', 'previous email', 'back', 'पिछला', 'anterior', 'précédent', 'পূর্ববর্তী', 'முந்தையது', 'మునుపటి'], action: 'prev', replyKey: 'prev' },
    { phrases: ['reply', 'respond', 'write back', 'जवाब दें', 'responder', 'répondre', 'উত্তর', 'பதில்', 'ప్రత్యుత్తరం'], action: 'reply', replyKey: 'reply' },
    { phrases: ['add favorite address', 'save address', 'save to favorites', 'add to favourites', 'पसंदीदा में जोड़ें', 'guardar dirección', 'enregistrer adresse'], action: 'save_address', replyKey: 'save_address' },
    { phrases: ['search', 'find email', 'look for', 'खोजें', 'buscar', 'rechercher', 'অনুসন্ধান', 'தேடு', 'శోధించు'], action: 'search', replyKey: 'search' },
    { phrases: ['open whatsapp', 'switch to whatsapp', 'go to whatsapp', 'व्हाट्सएप खोलें', 'abrir whatsapp', 'ouvrir whatsapp'], action: 'switch_whatsapp', replyKey: 'switch_whatsapp' },
    { phrases: ['go to apps', 'show apps', 'home', 'switch apps', 'change app', 'app selector', 'ऐप्स पर जाएं', 'ir a aplicaciones', 'aller aux applis'], action: 'go_apps', replyKey: 'go_apps' },
    { phrases: ['switch account', 'change account', 'switch email', 'change email', 'ईमेल बदलें', 'खाता बदलें', 'cambiar cuenta', 'changer de compte'], action: 'switch_account', replyKey: 'switch_account' },


    // Assistance commands
    { phrases: ['check my emails', 'check emails', 'see emails', 'मेरे ईमेल देखें'], action: 'read', replyKey: 'read' },
    { phrases: ['send a new email', 'send new email', 'write email', 'voice compose'], action: 'compose', replyKey: 'compose' },
    { phrases: ['search for emails', 'find emails', 'email search'], action: 'search', replyKey: 'search' },
    { phrases: ['organize my inbox', 'organize inbox', 'clean inbox'], action: 'inbox', replyKey: 'inbox' },
    { phrases: ['check calendar', 'calendar', 'my calendar'], action: 'calendar', replyKey: 'calendar' },
    { phrases: ['set up reminders', 'reminders', 'set reminders'], action: 'reminders', replyKey: 'reminders' },

    // Control commands
    { phrases: ['stop', 'cancel', 'never mind', 'nevermind', 'रद्द करें', 'cancelar', 'annuler', 'বাতিল করুন', 'ரத்து செய்', 'రద్దు చేయి'], action: 'stop', replyKey: 'stop' },
    { phrases: ['help', 'what can i do', 'what can you do', 'commands', 'मदद', 'ayuda', 'aide', 'সাহায্য', 'உதவி', 'సహాయం'], action: 'help', replyKey: 'help' },
];

const TRANSLATIONS = {
    'en-US': {
        compose: "Opening voice compose. I'll help you write an email using your voice.",
        read: "Opening your latest email now.",
        logout: "Logging you out. Goodbye!",
        inbox: "Navigating to your inbox.",
        spam: "Opening your spam folder.",
        sent: "Opening your sent folder.",
        drafts: "Opening your drafts.",
        trash: "Opening your trash folder.",
        delete: "Processing delete request...",
        favorites: "Opening favourite addresses.",
        star: "Processing star request...",
        next: "Checking for next email.",
        prev: "Checking for previous email.",
        reply: "Preparing a reply.",
        save_address: "Saving this sender to your favourite addresses.",
        search: "What would you like to search for?",
        switch_whatsapp: "Switching to WhatsApp Assistant.",
        go_apps: "Opening App Selector.",
        switch_account: "Which account would you like to switch to?",

        calendar: "Calendar feature coming soon!",
        reminders: "Reminder feature coming soon!",
        stop: "Okay, cancelled.",
        help: "You can say: compose, read emails, search, inbox, sent, drafts, spam, refresh, or logout.",
        defaultPrompt: "Tap the mic and speak a command",
        listening: "Listening...",
        processing: "Processing...",
        speaking: "Speaking...",
        nothingDetected: "Nothing detected — please try again."
    },
    'hi-IN': {
        compose: "ध्वनि रचना खोल रहा हूँ। मैं आवाज़ से ईमेल लिखने में आपकी मदद करूँगा।",
        read: "आपका नवीनतम ईमेल खोल रहा हूँ।",
        logout: "आपको लॉग आउट कर रहा हूँ। अलविदा!",
        inbox: "आपके इनबॉक्स में जा रहा हूँ।",
        spam: "आपका स्पैम फ़ोल्डर खोल रहा हूँ।",
        sent: "आपका भेजे गए ईमेल फ़ोल्डर खोल रहा हूँ।",
        drafts: "आपके ड्राफ्ट खोल रहा हूँ।",
        trash: "आपका कचरा फ़ोल्डर खोल रहा हूँ।",
        delete: "हटाने के अनुरोध को संसाधित कर रहा हूँ...",
        favorites: "पसंदीदा पते खोल रहा हूँ।",
        star: "तारांकित करने के अनुरोध को संसाधित कर रहा हूँ...",
        next: "अगले ईमेल की जाँच कर रहा हूँ।",
        prev: "पिछले ईमेल की जाँच कर रहा हूँ।",
        reply: "जवाब तैयार कर रहा हूँ।",
        save_address: "इस प्रेषक को आपके पसंदीदा पतों में सहेज रहा हूँ।",
        search: "आप क्या खोजना चाहेंगे?",
        switch_whatsapp: "व्हाट्सएप सहायक पर स्विच कर रहा हूँ।",
        go_apps: "ऐप चयनकर्ता खोल रहा हूँ।",
        calendar: "कैलेंडर सुविधा जल्द ही आ रही है!",
        reminders: "अनुस्मारक सुविधा जल्द ही आ रही है!",
        stop: "ठीक है, रद्द कर दिया गया।",
        help: "आप कह सकते हैं: रचना करें, ईमेल पढ़ें, खोजें, इनबॉक्स, भेजे गए, ड्राफ्ट, या लॉगआउट।",
        defaultPrompt: "माइक पर टैप करें और कोई आदेश बोलें",
        listening: "सुन रहा हूँ...",
        processing: "संसाधित कर रहा हूँ...",
        speaking: "बोल रहा हूँ...",
        nothingDetected: "कुछ भी पता नहीं चला — कृपया पुनः प्रयास करें।"
    },
    'es-ES': {
        compose: "Abriendo redacción por voz. Te ayudaré a escribir un correo.",
        read: "Abriendo tu último correo.",
        logout: "Cerrando sesión. ¡Adiós!",
        inbox: "Navegando a tu bandeja de entrada.",
        spam: "Abriendo tu carpeta de spam.",
        sent: "Abriendo tu carpeta de enviados.",
        drafts: "Abriendo tus borradores.",
        trash: "Abriendo tu papelera.",
        delete: "Procesando solicitud de eliminación...",
        favorites: "Abriendo direcciones favoritas.",
        star: "Procesando solicitud de estrella...",
        next: "Buscando el siguiente correo.",
        prev: "Buscando el correo anterior.",
        reply: "Preparando una respuesta.",
        save_address: "Guardando este remitente en tus direcciones favoritas.",
        search: "¿Qué te gustaría buscar?",
        switch_whatsapp: "Cambiando al Asistente de WhatsApp.",
        go_apps: "Abriendo selector de aplicaciones.",
        calendar: "¡La función de calendario llegará pronto!",
        reminders: "¡La función de recordatorios llegará pronto!",
        stop: "De acuerdo, cancelado.",
        help: "Puedes decir: redactar, leer correos, buscar, entrada, enviados, borradores o salir.",
        defaultPrompt: "Toca el micrófono y di un comando",
        listening: "Escuchando...",
        processing: "Procesando...",
        speaking: "Hablando...",
        nothingDetected: "No se detectó nada — por favor intenta de nuevo."
    },
    'fr-FR': {
        compose: "Ouverture de la rédaction vocale. Je vais vous aider à écrire un email.",
        read: "Ouverture de votre dernier email.",
        logout: "Déconnexion. Au revoir !",
        inbox: "Navigation vers votre boîte de réception.",
        spam: "Ouverture de votre dossier indésirable.",
        sent: "Ouverture de votre dossier envoyés.",
        drafts: "Ouverture de vos brouillons.",
        trash: "Ouverture de votre corbeille.",
        delete: "Traitement de la demande de suppression...",
        favorites: "Ouverture des adresses favorites.",
        star: "Traitement de la demande de mise en favori...",
        next: "Vérification de l'email suivant.",
        prev: "Vérification de l'email précédent.",
        reply: "Préparation d'une réponse.",
        save_address: "Enregistrement de cet expéditeur dans vos adresses favorites.",
        search: "Que souhaitez-vous rechercher ?",
        switch_whatsapp: "Passage à l'Assistant WhatsApp.",
        go_apps: "Ouverture du sélecteur d'applications.",
        calendar: "La fonction calendrier arrive bientôt !",
        reminders: "La fonction rappels arrive bientôt !",
        stop: "D'accord, annulé.",
        help: "Vous pouvez dire: composer, lire, rechercher, boîte de réception, envoyés, brouillons, ou déconnexion.",
        defaultPrompt: "Appuyez sur le micro et dites une commande",
        listening: "Écoute...",
        processing: "Traitement...",
        speaking: "Je parle...",
        nothingDetected: "Rien n'a été détecté - veuillez réessayer."
    },
    'bn-IN': {
        compose: "ভয়েস কম্পোজ খোলা হচ্ছে। আমি আপনাকে ভয়েস দিয়ে ইমেইল লিখতে সাহায্য করবো।",
        read: "আপনার সর্বশেষ ইমেইলটি খোলা হচ্ছে।",
        logout: "আপনাকে লগ আউট করা হচ্ছে। বিদায়!",
        inbox: "আপনার ইনবক্সে যাওয়া হচ্ছে।",
        spam: "আপনার স্প্যাম ফোল্ডার খোলা হচ্ছে।",
        sent: "আপনার পাঠানো ফোল্ডার খোলা হচ্ছে।",
        drafts: "আপনার খসড়া খোলা হচ্ছে।",
        trash: "আপনার ট্র্যাশ ফোল্ডার খোলা হচ্ছে।",
        delete: "মুছে ফেলার অনুরোধ প্রক্রিয়া করা হচ্ছে...",
        favorites: "পছন্দনীয় ঠিকানা খোলা হচ্ছে।",
        star: "স্টার করার অনুরোধ প্রক্রিয়া করা হচ্ছে...",
        next: "পরবর্তী ইমেইল খোঁজা হচ্ছে।",
        prev: "পূর্ববর্তী ইমেইল খোঁজা হচ্ছে।",
        reply: "একটি উত্তর প্রস্তুত করা হচ্ছে।",
        save_address: "এই প্রেরককে আপনার পছন্দনীয় ঠিকানায় সেভ করা হচ্ছে।",
        search: "আপনি কি খুঁজতে চান?",
        switch_whatsapp: "WhatsApp অ্যাসিস্ট্যান্টে যাওয়া হচ্ছে।",
        go_apps: "অ্যাপ সিলেক্টর খোলা হচ্ছে।",
        calendar: "ক্যালেন্ডার ফিচার শীঘ্রই আসছে!",
        reminders: "রিমাইন্ডার ফিচার শীঘ্রই আসছে!",
        stop: "ঠিক আছে, বাতিল করা হয়েছে।",
        help: "আপনি বলতে পারেন: কম্পোজ, ইমেইল পড়ুন, অনুসন্ধান, ইনবক্স, পাঠানো, ড্রাফটস, বা লগআউট।",
        defaultPrompt: "মাইক্রোফোনে ট্যাপ করুন এবং একটি কমান্ড বলুন",
        listening: "শুনছি...",
        processing: "প্রক্রিয়া করা হচ্ছে...",
        speaking: "বলছি...",
        nothingDetected: "কিছু শোনা যায়নি — দয়া করে আবার চেষ্টা করুন।"
    },
    'ta-IN': {
        compose: "குரல் மூலம் எழுதும் பகுதி திறக்கப்படுகிறது. குரல் மூலம் மின்னஞ்சல் எழுத நான் உதவுகிறேன்.",
        read: "உங்கள் சமீபத்திய மின்னஞ்சலை இப்போது திறக்கிறேன்.",
        logout: "உங்களை வெளியேற்றுகிறேன். போய் வாருங்கள்!",
        inbox: "உங்கள் இன்பாக்ஸுக்கு செல்கிறது.",
        spam: "உங்கள் ஸ்பேம் கோப்பை திறக்கிறது.",
        sent: "தங்கள் அனுப்பியவை கோப்பை திறக்கிறது.",
        drafts: "உங்கள் வரைவுகளை திறக்கிறது.",
        trash: "உங்கள் குப்பைத் தொட்டியை திறக்கிறது.",
        delete: "நீக்கும் கோரிக்கை செயல்படுத்தப்படுகிறது...",
        favorites: "பிடித்த முகவரிகளை திறக்கிறது.",
        star: "நட்சத்திர கோரிக்கை செயல்படுத்தப்படுகிறது...",
        next: "அடுத்த மின்னஞ்சலை சரிபார்க்கிறது.",
        prev: "முந்தைய மின்னஞ்சலை சரிபார்க்கிறது.",
        reply: "பதிலை தயார் செய்கிறது.",
        save_address: "இந்த அனுப்புநரை உங்களுக்கு பிடித்த முகவரிகளில் சேமிக்கிறது.",
        search: "நீங்கள் எதைத் தேட விரும்புகிறீர்கள்?",
        switch_whatsapp: "WhatsApp உதவியாளருக்கு மாறுகிறது.",
        go_apps: "ஆப் தேர்வியை திறக்கிறது.",
        calendar: "காலண்டர் அம்சம் விரைவில் வருகிறது!",
        reminders: "நினைவூட்டல் அம்சம் விரைவில் வருகிறது!",
        stop: "சரி, ரத்து செய்யப்பட்டது.",
        help: "நீங்கள் சொல்லலாம்: உருவாக்கு, படி, தேடு, இன்பாக்ஸ், அனுப்பியவை, வரைவுகள், அல்லது வெளியேறு.",
        defaultPrompt: "மைக்கைத் தட்டி ஒரு கட்டளையைச் சொல்லுங்கள்",
        listening: "கேட்கிறது...",
        processing: "செயல்படுத்துகிறது...",
        speaking: "பேசுகிறது...",
        nothingDetected: "எதுவும் கேட்கவில்லை — மீண்டும் முயற்சிக்கவும்."
    },
    'te-IN': {
        compose: "వాయిస్ కంపోజ్ తెరుస్తున్నాను. వాయిస్ ఉపయోగించి ఇమెయిల్ రాయడంలో నేను సహాయం చేస్తాను.",
        read: "మీ తాజా ఇమెయిల్‌ను తెరుస్తున్నాను.",
        logout: "లాగ్ అవుట్ చేస్తున్నాను. వీడ్కోలు!",
        inbox: "మీ ఇన్‌బాక్స్‌కి వెళుతున్నాను.",
        spam: "మీ స్పామ్ ఫాల్డర్‌ని తెరుస్తున్నాను.",
        sent: "మీ పంపిన ఫాల్డర్‌ని తెరుస్తున్నాను.",
        drafts: "మీ డ్రాఫ్ట్‌లను తెరుస్తున్నాను.",
        trash: "మీ ట్రాష్ ఫాల్డర్‌ని తెరుస్తున్నాను.",
        delete: "తొలగించు అభ్యర్థన ప్రాసెస్ చేయబడుతోంది...",
        favorites: "ఇష్టమైన చిరునామాలను తెరుస్తున్నాను.",
        star: "స్టార్ అభ్యర్థన ప్రాసెస్ చేయబడుతోంది...",
        next: "తదుపరి ఇమెయిల్ కోసం తనిఖీ చేస్తున్నాను.",
        prev: "మునుపటి ఇమెయిల్ కోసం తనిఖీ చేస్తున్నాను.",
        reply: "ప్రత్యుత్తరాన్ని సిద్ధం చేస్తున్నాను.",
        save_address: "ఈ పంపినవారిని మీ ఇష్టమైన చిరునామాలకు సేవ్ చేస్తున్నాను.",
        search: "మీరు ఏమి వెతకాలి అనుకుంటున్నారు?",
        switch_whatsapp: "WhatsApp అసిస్టెంట్‌కి మారుతున్నాను.",
        go_apps: "యాప్ సెలెక్టర్‌ని తెరుస్తున్నాను.",
        calendar: "క్యాలెండర్ ఫీచర్ త్వరలో వస్తుంది!",
        reminders: "రిమైండర్ ఫీచర్ త్వరలో వస్తుంది!",
        stop: "సరే, రద్దు చేయబడింది.",
        help: "మీరు చెప్పవచ్చు: కంపోజ్, చదవండి, శోధించండి, ఇన్‌బాక్స్, పంపినవి, డ్రాఫ్ట్‌లు, మరియు లాగ్అవుట్.",
        defaultPrompt: "మైక్‌ను నొక్కి కమాండ్ చెప్పండి",
        listening: "వింటున్నాను...",
        processing: "ప్రాసెస్ చేస్తున్నాను...",
        speaking: "మాట్లాడుతున్నాను...",
        nothingDetected: "ఏమీ కనుగొనబడలేదు — దయచేసి మళ్లీ ప్రయత్నించండి."
    }
};

const getT = (lang) => {
    return TRANSLATIONS[lang] || TRANSLATIONS['en-US'];
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── helpers ────────────────────────────────────────────────────────────────────

/** Record audio for `durationMs` ms → returns Blob */
async function recordAudio(durationMs = 4000) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new Promise((resolve, reject) => {
        const chunks = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            resolve(new Blob(chunks, { type: 'audio/webm' }));
        };
        rec.onerror = reject;
        rec.start();
        setTimeout(() => rec.stop(), durationMs);
    });
}

/** Try Deepgram first; fall back to Web Speech API result */
async function getTranscriptDeepgram(audioBlob, language) {
    const data = await voiceApi.transcribe(audioBlob, language);
    return data.transcript || '';
}

// ── component ──────────────────────────────────────────────────────────────────

const VoiceAssistantOverlay = ({ user, onCompose, onReadLatest, onLogout, onNavigate, onNextEmail, onPrevEmail, onReply, onDeleteContextual, onDeleteIndex, onStarContextual, emails = [], autoListen = false, isVoiceComposeActive = false, selectedEmail = null, onGoApps, onSwitchWhatsApp, onSwitchAccount }) => {
    console.log('[VA] Props received:', { autoListen });
    const userLang = user?.language_preference || 'en-US';
    const t = getT(userLang);

    const [assistantState, setAssistantState] = useState('idle');
    const [transcript, setTranscript] = useState('');
    const [assistantReply, setAssistantReply] = useState(t.defaultPrompt);
    const [activeContext, setActiveContext] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [sttMode, setSttMode] = useState('deepgram'); // 'deepgram' | 'webspeech'
    const [autoListeningEnabled, setAutoListeningEnabled] = useState(false);
    const recognitionRef = useRef(null);
    const busyRef = useRef(false);
    const autoListenTimeoutRef = useRef(null);
    const autoListenRef = useRef(false);
    autoListenRef.current = autoListeningEnabled;
    const startAutoListeningRef = useRef(null);
    const activeContextRef = useRef(activeContext);
    activeContextRef.current = activeContext;
    const handleEmailChoiceRef = useRef(null);

    useEffect(() => {
        recognitionRef.current?.abort();
        window.speechSynthesis?.cancel();
        return () => {
            if (autoListenTimeoutRef.current) {
                clearTimeout(autoListenTimeoutRef.current);
            }
        };
    }, []);

    // Enable auto-listening when autoListen prop changes
    useEffect(() => {
        console.log('[VA] Auto-listening effect triggered:', { autoListen, autoListeningEnabled });
        if (autoListen && !autoListeningEnabled) {
            console.log('[VA] Enabling auto-listening...');
            setAutoListeningEnabled(true);
            // Start auto-listening after slightly longer delay to prevent mic collision with closing modals
            setTimeout(() => {
                console.log('[VA] Attempting to start auto-listening...');
                startAutoListening();
            }, 1500);
        } else if (!autoListen && autoListeningEnabled) {
            console.log('[VA] Disabling auto-listening...');
            setAutoListeningEnabled(false);
            stopListening();
        }
    }, [autoListen]);



    // The fallback timer was causing race conditions with the rec.onend handler.

    const speak = useCallback((text, onEnd = null) => {
        window.speechSynthesis?.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = userLang;
        utter.rate = 0.95; utter.pitch = 1.05;
        if (onEnd) {
            utter.onend = onEnd;
        }
        window.speechSynthesis?.speak(utter);
    }, [userLang]);

    const processCommand = useCallback(async (heard) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setTranscript(heard);
        setAssistantState('processing');
        setAssistantReply(t.processing || 'Processing…');
        await delay(350);

        const lower = heard.toLowerCase().trim();

        // Handle email choice context first
        if (activeContextRef.current === 'email-choice') {
            if (handleEmailChoiceRef.current) await handleEmailChoiceRef.current(heard);
            busyRef.current = false;
            return;
        }

        // Handle delete index context
        if (activeContextRef.current === 'delete-index-choice') {
            const numMap = {
                'first': 1, '1st': 1, 'one': 1, '1': 1,
                'second': 2, '2nd': 2, 'two': 2, '2': 2,
                'third': 3, '3rd': 3, 'three': 3, '3': 3,
                'fourth': 4, '4th': 4, 'four': 4, '4': 4,
                'fifth': 5, '5th': 5, 'five': 5, '5': 5
            };
            const match = Object.keys(numMap).find(k => lower.includes(k));
            if (match) {
                const index = numMap[match] - 1;
                if (emails[index]) {
                    if (onDeleteIndex) {
                        try {
                            await onDeleteIndex(index);
                            const msg = `Deleted email from ${emails[index].sender?.replace(/<.+>/, '').trim()}.`;
                            setAssistantReply(msg); speak(msg);
                        } catch {
                            setAssistantReply('Failed to delete email.'); speak('Failed to delete email.');
                        }
                    }
                } else {
                    speak("That email number doesn't exist on this page.");
                }
            } else if (lower.includes('cancel') || lower.includes('stop')) {
                speak("Deletion cancelled.");
            } else {
                speak("I didn't catch a valid number. Deletion cancelled.");
            }
            setActiveContext(null);
            busyRef.current = false;
            return;
        }

        const matched = COMMANDS.find((c) => c.phrases.some((p) => lower.includes(p.toLowerCase())));

        setAssistantState('speaking');
        if (matched) {
            const reply = t[matched.replyKey] || matched.replyKey;
            setAssistantReply(reply);
            speak(reply, () => {
                // Continue auto-listening after speaking if enabled
                if (autoListeningEnabled) {
                    setTimeout(() => {
                        startAutoListening();
                    }, 1000);
                }
            });
            await delay(1000);
            if (matched.action === 'compose' && onCompose) { setActiveContext('compose'); onCompose(); }
            if (matched.action === 'read' && onReadLatest) {
                setActiveContext('read');
                if (selectedEmail) {
                    readEmailWithSummary(selectedEmail);
                } else {
                    onReadLatest();
                }
            }
            else if (matched.action === 'logout' && onLogout) { await delay(600); onLogout(); }
            else if (matched.action === 'inbox' && onNavigate) { onNavigate('INBOX'); }
            else if (matched.action === 'spam' && onNavigate) { onNavigate('SPAM'); }
            else if (matched.action === 'sent' && onNavigate) { onNavigate('SENT'); }
            else if (matched.action === 'drafts' && onNavigate) { onNavigate('DRAFTS'); }
            else if (matched.action === 'trash' && onNavigate) { onNavigate('TRASH'); }
            else if (matched.action === 'refresh' && onNavigate) { onNavigate('REFRESH'); }
            else if (matched.action === 'favorites' && onNavigate) { onNavigate('STARRED'); }
            else if (matched.action === 'switch_whatsapp' && onSwitchWhatsApp) { onSwitchWhatsApp(); }
            else if (matched.action === 'go_apps' && onGoApps) { onGoApps(); }
            else if (matched.action === 'switch_account' && onSwitchAccount) { onSwitchAccount(); }

            else if (matched.action === 'delete') {
                if (selectedEmail && onDeleteContextual) {
                    try {
                        await onDeleteContextual();
                        const msg = "Email successfully deleted.";
                        setAssistantReply(msg); speak(msg);
                    } catch {
                        speak("Failed to delete the currently active email.");
                    }
                } else {
                    const msg = "Which email would you like to delete? Say first, second, third, etc.";
                    setAssistantReply(msg);
                    speak(msg, () => {
                        setActiveContext('delete-index-choice');
                        if (autoListeningEnabled) setTimeout(() => startAutoListening(), 1000);
                    });
                }
            }
            else if (matched.action === 'star') {
                if (selectedEmail && onStarContextual) {
                    try {
                        await onStarContextual();
                        const msg = "Toggled star for this email.";
                        setAssistantReply(msg); speak(msg);
                    } catch {
                        speak("Failed to star the currently active email.");
                    }
                } else {
                    speak("You must have an email open to star it.");
                }
            }
            else if (matched.action === 'save_address') {
                if (selectedEmail) {
                    try {
                        // Extract email from string like "Name <email@dom.com>"
                        const match = selectedEmail.sender?.match(/<(.+)>/);
                        const cleanEmail = match ? match[1] : selectedEmail.sender;

                        let favs = [];
                        try { favs = JSON.parse(localStorage.getItem('fav_addresses') || '[]'); } catch { }

                        if (!favs.includes(cleanEmail) && cleanEmail) {
                            favs.push(cleanEmail);
                            localStorage.setItem('fav_addresses', JSON.stringify(favs));
                        }
                        const msg = `Saved ${cleanEmail} to your favourites list.`;
                        setAssistantReply(msg); speak(msg);
                    } catch {
                        speak("Failed to save address.");
                    }
                } else {
                    speak("You must have an email open to save its sender address.");
                }
            }
            else if (matched.action === 'refresh' && onNavigate) { onNavigate('REFRESH'); }
            else if (matched.action === 'reply' && onReply) { onReply(); }
            else if (matched.action === 'next' && onNextEmail) {
                const nextE = await onNextEmail();
                if (nextE) readEmailWithSummary(nextE);
                else { setAssistantReply("No more emails."); speak("No more emails."); }
            }
            else if (matched.action === 'prev' && onPrevEmail) {
                const prevE = await onPrevEmail();
                if (prevE) readEmailWithSummary(prevE);
                else { setAssistantReply("No previous email."); speak("No previous email."); }
            }
        } else if (lower) {
            const reply = `I heard: "${heard}" — try saying read email, compose, inbox, or logout.`;
            setAssistantReply(reply);
            speak(reply, () => {
                // Continue auto-listening after speaking if enabled
                if (autoListenRef.current && startAutoListeningRef.current) {
                    setTimeout(() => {
                        startAutoListeningRef.current();
                    }, 1000);
                }
            });
        }

        await delay(2800);
        setAssistantState('idle');
        setAssistantReply(autoListeningEnabled ? (t.listening || 'Listening for your next command...') : (t.defaultPrompt || 'Tap the mic and speak a command'));
        setActiveContext(null);
        setTranscript('');
        busyRef.current = false;
    }, [onCompose, onReadLatest, onLogout, onNavigate, speak, autoListeningEnabled, t]);

    // Enhanced email reading with summary and choice
    const readEmailWithSummary = useCallback(async (email) => {
        if (!email) return;

        setActiveContext('reading');
        setAssistantState('processing');

        try {
            // Fetch full email if we only have summary
            let fullEmail = email;
            if (!email.body && email.id) {
                const data = await gmailApi.getMessage(email.id);
                fullEmail = data.message;
            }

            // Create summary of the message body
            const summary = createMessageSummary(fullEmail.body || fullEmail.snippet || '');

            // Read subject and summary
            const message = `Email from ${fullEmail.sender || 'Unknown sender'}. Subject: ${fullEmail.subject || 'No subject'}. Summary: ${summary}`;

            setAssistantReply(message);
            speak(message, () => {
                const choiceMessage = "Would you like to hear the full message, just the summary, or reply to this email? Say 'read message', 'summary', or 'reply'.";
                setAssistantReply(choiceMessage);
                speak(choiceMessage, () => {
                    setActiveContext('email-choice');
                    if (autoListenRef.current && startAutoListeningRef.current) {
                        setTimeout(() => startAutoListeningRef.current(), 500);
                    }
                });
            });

        } catch (error) {
            console.error('[VA] Error reading email:', error);
            setAssistantReply('Sorry, I had trouble reading that email.');
            speak('Sorry, I had trouble reading that email.');
            setActiveContext(null);
        }
    }, []);

    // Listen to explicit email reads sent from the dashboard
    useEffect(() => {
        const handleReadEvent = (e) => {
            if (e.detail) {
                setIsOpen(true);
                readEmailWithSummary(e.detail);
            }
        };
        window.addEventListener('va-read-email', handleReadEvent);
        return () => window.removeEventListener('va-read-email', handleReadEvent);
    }, [readEmailWithSummary]);

    // Create a simple summary of the message
    const createMessageSummary = (message) => {
        if (!message) return 'No message content.';

        // Simple summary logic - take first few sentences
        const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 0) return 'No message content.';

        // Take first 2-3 sentences for summary
        const summarySentences = sentences.slice(0, 2);
        const summary = summarySentences.join('. ').trim();

        // Add ellipsis if there's more content
        if (sentences.length > 2) {
            return summary + '...';
        }

        return summary + '.';
    };

    // Handle user choice after reading email summary
    const handleEmailChoice = useCallback(async (transcript) => {
        const choice = transcript.toLowerCase().trim();

        if (choice.includes('reply') || choice.includes('respond')) {
            setAssistantReply('Preparing a reply.');
            speak('Preparing a reply.');
            setActiveContext(null);
            if (onReply) onReply();
        } else if (choice.includes('next') || choice.includes('forward')) {
            setAssistantReply('Opening next email.');
            speak('Opening next email.');
            setActiveContext(null);
            if (onNextEmail) {
                const nextE = await onNextEmail();
                if (nextE) setTimeout(() => readEmailWithSummary(nextE), 1200);
                else speak("No more emails.", () => { if (autoListenRef.current && startAutoListeningRef.current) startAutoListeningRef.current(); });
            }
        } else if (choice.includes('previous') || choice.includes('back')) {
            setAssistantReply('Opening previous email.');
            speak('Opening previous email.');
            setActiveContext(null);
            if (onPrevEmail) {
                const prevE = await onPrevEmail();
                if (prevE) setTimeout(() => readEmailWithSummary(prevE), 1200);
                else speak("No previous email.", () => { if (autoListenRef.current && startAutoListeningRef.current) startAutoListeningRef.current(); });
            }
        } else if (choice.includes('summary') || choice.includes('summery')) {
            setAssistantReply('Reading the summary again.');
            speak('Here is the summary: ' + createMessageSummary(selectedEmail?.body || selectedEmail?.snippet || ''), () => {
                if (autoListenRef.current && startAutoListeningRef.current) setTimeout(() => startAutoListeningRef.current(), 1000);
            });
            setActiveContext(null);
        } else if (choice.includes('read') || choice.includes('message') || choice.includes('actual') || choice.includes('full')) {
            setAssistantReply('Reading the full message.');
            speak('Here is the full message: ' + (selectedEmail?.body || selectedEmail?.snippet || 'No message content.'), () => {
                if (autoListenRef.current && startAutoListeningRef.current) setTimeout(() => startAutoListeningRef.current(), 1000);
            });
            setActiveContext(null);
        } else {
            setAssistantReply('Please say "summary", "read message", or "reply".');
            speak('Please say "summary", "read message", or "reply".', () => {
                if (autoListenRef.current && startAutoListeningRef.current) setTimeout(() => startAutoListeningRef.current(), 1000);
            });
            return; // Don't restart manually outside below if we explicitly set it via callback
        }

    }, [selectedEmail, onReply, onNextEmail, onPrevEmail, speak]);

    handleEmailChoiceRef.current = handleEmailChoice;

    // ── Auto-listening function ────────────────────────────────────────────────────
    const startAutoListening = useCallback(() => {
        console.log('[VA] startAutoListening called:', { autoListeningEnabled: autoListenRef.current, isListening, busy: busyRef.current });

        if (!autoListenRef.current) {
            console.log('[VA] Auto-listening not enabled, skipping');
            return;
        }

        if (isListening) {
            console.log('[VA] Already listening, skipping');
            return;
        }

        if (busyRef.current) {
            console.log('[VA] System busy, skipping');
            return;
        }

        console.log('[VA] Starting auto-listening...');

        // Check if Speech Recognition API is available
        if (!SpeechRecognitionAPI) {
            console.error('[VA] Speech Recognition API not available');
            setAssistantReply('Speech recognition not supported in this browser');
            return;
        }

        // Stop any existing recognition
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        try {
            const rec = new SpeechRecognitionAPI();
            rec.lang = userLang || 'en-US';
            rec.interimResults = true;
            rec.maxAlternatives = 1;
            rec.continuous = false; // Listen for one command at a time

            rec.onstart = () => {
                console.log('[VA] Auto-listening started successfully');
                setIsListening(true);
                setAssistantState('listening');
                setAssistantReply(t.listening || 'Listening...');
                setTranscript('');
            };

            rec.onresult = (e) => {
                const interim = Array.from(e.results).map((r) => r[0].transcript).join(' ');
                setTranscript(interim);
                console.log('[VA] Speech result:', interim);
                if (e.results[e.results.length - 1].isFinal) {
                    console.log('[VA] Final result:', e.results[e.results.length - 1][0].transcript);
                    rec.stop();
                    processCommand(e.results[e.results.length - 1][0].transcript);
                }
            };

            rec.onerror = (error) => {
                console.error(`[VA] Auto-listening error: ${error.error}`);
                setIsListening(false);
                setAssistantState('idle');

                if (error.error === 'aborted') {
                    setAssistantReply('Listening paused.');
                } else if (error.error === 'not-allowed') {
                    console.warn('[VA] Microphone access not allowed. Retrying due to possible component collision...');
                    setAssistantReply('Microphone paused...');
                    // Try to restart after a delay to bypass Chrome's simultaneous speech instances block
                    if (autoListenRef.current) {
                        autoListenTimeoutRef.current = setTimeout(() => {
                            if (startAutoListeningRef.current) startAutoListeningRef.current();
                        }, 2000);
                    }
                } else if (error.error === 'no-speech') {
                    setAssistantReply('Listening...');
                } else {
                    setAssistantReply('Listening error. Retrying...');
                }
            };

            rec.onend = () => {
                console.log('[VA] Auto-listening ended');
                setIsListening(false);
                recognitionRef.current = null;

                // Clear any existing timeout to avoid overlapping retries
                if (autoListenTimeoutRef.current) {
                    clearTimeout(autoListenTimeoutRef.current);
                }

                // Restart listening if still in auto mode and not busy
                if (autoListenRef.current && !busyRef.current) {
                    autoListenTimeoutRef.current = setTimeout(() => {
                        console.log('[VA] Restarting auto-listening...');
                        if (startAutoListeningRef.current) startAutoListeningRef.current();
                    }, 500); // reduced delay slightly for snappier experience if it timed out on 'no-speech'
                }
            };

            // Start listening - use user interaction if needed
            try {
                rec.start();
                recognitionRef.current = rec;
                console.log('[VA] Speech recognition started');
            } catch (startError) {
                console.error('[VA] Error starting recognition:', startError);
                // Try with user interaction
                if (startError.name === 'NotAllowedError') {
                    setAssistantReply('Please allow microphone access and try again');
                } else {
                    setAssistantReply('Click the Test Listening button to start');
                }
            }

        } catch (error) {
            console.error('[VA] Error creating speech recognition:', error);
            setAssistantReply('Error initializing voice recognition');
        }
    }, [isListening, processCommand]);

    startAutoListeningRef.current = startAutoListening;

    // ── Deepgram recording ──────────────────────────────────────────────────────
    const startDeepgramListen = useCallback(async () => {
        if (isListening || busyRef.current) return;
        setIsListening(true);
        setAssistantState('listening');
        setAssistantReply(`${t.listening} (Deepgram 4s)...`);
        setTranscript('');
        try {
            const blob = await recordAudio(4000);
            setAssistantReply(t.processing || 'Transcribing…');
            const text = await getTranscriptDeepgram(blob, userLang);
            if (text) {
                processCommand(text);
            } else {
                setAssistantReply(t.nothingDetected || 'Nothing detected — please try again.');
                setAssistantState('idle');
            }
        } catch (err) {
            console.warn('[VA] Deepgram failed, switching to Web Speech:', err.message);
            setSttMode('webspeech');
            setAssistantReply('Switching to browser mic…');
            setAssistantState('idle');
        } finally {
            setIsListening(false);
        }
    }, [isListening, processCommand, t, userLang]);

    // ── Web Speech fallback ─────────────────────────────────────────────────────
    const startWebSpeechListen = useCallback(() => {
        if (!SpeechRecognitionAPI || isListening || busyRef.current) return;
        const rec = new SpeechRecognitionAPI();
        rec.lang = userLang || 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
        rec.onstart = () => { setIsListening(true); setAssistantState('listening'); setAssistantReply(t.listening || 'Listening…'); setTranscript(''); };
        rec.onresult = (e) => {
            const interim = Array.from(e.results).map((r) => r[0].transcript).join(' ');
            setTranscript(interim);
            if (e.results[e.results.length - 1].isFinal) {
                rec.stop();
                processCommand(e.results[e.results.length - 1][0].transcript);
            }
        };
        rec.onerror = () => { setIsListening(false); setAssistantState('idle'); setAssistantReply('Could not hear. Please try again.'); };
        rec.onend = () => setIsListening(false);
        rec.start();
        recognitionRef.current = rec;
    }, [isListening, processCommand]);

    const stopListening = useCallback(() => {
        if (autoListenTimeoutRef.current) {
            clearTimeout(autoListenTimeoutRef.current);
        }
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const handleMicClick = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            // Trigger the auto-listening loop logic if enabled, otherwise just do a single pass
            if (autoListeningEnabled) {
                startAutoListening();
            } else {
                startWebSpeechListen();
            }
        }
    }, [isListening, stopListening, autoListeningEnabled, startAutoListening, startWebSpeechListen]);

    // ── Full voice assistant panel (Unified) ───────────────────────
    return (
        <div className="voice-overlay-container" style={{ pointerEvents: 'none', zIndex: 9999 }}>
            {/* Always expanded voice panel that doesn't block the dashboard */}
            <div className={`glass-panel voice-panel ${autoListeningEnabled ? 'auto-listening-mode' : ''}`} style={{ pointerEvents: 'auto', position: 'fixed', bottom: '2rem', right: '2rem', transition: 'all 0.3s ease' }}>

                {/* Orb */}
                <div className="voice-visualizer">
                    <div className={`orb orb--${assistantState}`}>
                        <div className="orb-core" />
                        <div className="orb-ring ring-1" />
                        <div className="orb-ring ring-2" />
                    </div>
                    <p className="orb-state-label">
                        {assistantState === 'idle' ? 'Ready' :
                            assistantState === 'listening' ? 'Listening…' :
                                assistantState === 'processing' ? 'Processing…' : 'Speaking…'}
                    </p>
                </div>

                {/* STT mode badge */}
                <div className="stt-badge" title={sttMode === 'deepgram' ? 'Using Deepgram cloud STT' : 'Using browser Web Speech API'}>
                    <Wifi size={12} />
                    {sttMode === 'deepgram' ? 'Deepgram AI' : 'Browser STT'}
                    <button className="stt-switch" onClick={() => setSttMode(m => m === 'deepgram' ? 'webspeech' : 'deepgram')}>
                        Switch
                    </button>
                </div>

                {/* Transcript + reply */}
                <div className="voice-text">
                    {transcript && <p className="transcript">"{transcript}"</p>}
                    <p className={`va-reply ${assistantState === 'speaking' ? 'speaking' : ''}`}>{assistantReply}</p>
                </div>

                {/* Context cards */}
                {activeContext === 'compose' && (
                    <div className="context-card fade-in">
                        <div className="ctx-header"><Send size={15} /> Composing Email</div>
                        <div className="ctx-body"><span className="ctx-field active">Voice input active…</span></div>
                    </div>
                )}
                {activeContext === 'read' && (
                    <div className="context-card fade-in">
                        <div className="ctx-header"><MailOpen size={15} /> Reading Email</div>
                        <div className="ctx-body"><span className="ctx-field">Opening latest message…</span></div>
                    </div>
                )}

                {/* Mic button */}
                <div className="va-mic-section">
                    <button
                        className={`va-mic-btn ${isListening ? 'va-mic-active' : ''}`}
                        onClick={handleMicClick}
                        disabled={assistantState === 'processing' || assistantState === 'speaking'}
                        aria-label={isListening ? 'Stop listening' : 'Start voice command'}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        {isListening ? 'Listening…' : 'Tap & Speak'}
                    </button>
                </div>

                {/* Quick commands */}
                {assistantState === 'idle' && (
                    <div className="demo-commands">
                        <p className="demo-label">Quick commands:</p>
                        <div className="demo-btns">
                            {['Voice Compose', 'Read my email', 'Go to inbox', 'Go to apps', 'Switch Account', 'Logout'].map((cmd) => (
                                <button key={cmd} className="demo-cmd" onClick={() => processCommand(cmd)}>{cmd}</button>
                            ))}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceAssistantOverlay;
