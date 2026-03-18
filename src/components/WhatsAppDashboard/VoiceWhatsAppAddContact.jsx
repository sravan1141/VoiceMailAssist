import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserPlus, Mic, MicOff, Loader } from 'lucide-react';
import { whatsappApi } from '../../api';
import '../VoiceAssistant/VoiceCompose.css';
const TRANSLATIONS = {
    'en-US': {
        labels: { name: 'contact name', phone_number: 'phone number' },
        edit_contact: 'Editing contact {name}.',
        adding_new_contact: 'Adding a new contact. Please say the contact\'s name.',
        edit_guidance: 'Editing contact {name}. You can say "edit name", "edit number", "star this contact", or "save" to finish.',
        listen_name: 'Listening for contact name...',
        listen_number: 'Listening for phone number. Please say the country code, like plus nine one, followed by the digits.',
        did_not_catch: "Sorry, didn't catch that. Please try again.",
        say_name: 'Say the contact name.',
        say_number: 'Say the phone number.',
        cleared: '{field} cleared. Say it again.',
        invalid_number: 'That doesn\'t sound like a valid phone number. Please clearly speak the numerical digits.',
        name_updated: 'Name updated to {name}. Say "save contact" to finish, or "edit number" to change it.',
        name_recorded: 'Name is {name}. Now please say their full phone number, starting with the country code.',
        number_recorded: 'Number recorded as {number}. Say "save contact" to finish, or "edit number" to change it.',
        cancel_add: 'Cancelled adding contact.',
        contact_starred: 'Contact starred. Say "save contact" to finish.',
        say_new_name: 'Say the new name.',
        say_new_number: 'Say the new number.',
        help_cmd: 'Please say "save contact", "edit name", "edit number", or "star this contact".',
        closing: 'Closing window.',
        help_error: 'Please say try again, or close window.',
        missing_fields: 'Name and number are required.',
        updating_contact: 'Updating contact.',
        saving_contact: 'Saving contact.',
        update_success: 'Contact updated successfully!',
        save_success: 'Contact saved successfully!',
        save_error: 'Failed to save contact. Say try again, or close window.'
    },
    'hi-IN': {
        labels: { name: 'संपर्क का नाम', phone_number: 'फोन नंबर' },
        edit_contact: 'संपर्क {name} संपादित कर रहा हूँ।',
        adding_new_contact: 'नया संपर्क जोड़ रहा हूँ। कृपया संपर्क का नाम बोलें।',
        edit_guidance: 'संपर्क {name} को संपादित कर रहा हूँ। आप "नाम बदलें", "नंबर बदलें", "इसे स्टार करें", या समाप्त करने के लिए "सहेजें" बोल सकते हैं।',
        listen_name: 'संपर्क का नाम सुन रहा हूँ...',
        listen_number: 'फोन नंबर सुन रहा हूँ। कृपया देश कोड बोलें, जैसे प्लस नौ एक, उसके बाद अंक।',
        did_not_catch: "क्षमा करें, समझ नहीं आया। कृपया पुनः प्रयास करें।",
        say_name: 'संपर्क का नाम बोलें।',
        say_number: 'फोन नंबर बोलें।',
        cleared: '{field} साफ़ किया गया। इसे फिर से बोलें।',
        invalid_number: 'यह एक वैध फोन नंबर नहीं लग रहा है। कृपया केवल संख्यात्मक अंक बोलें।',
        name_updated: 'नाम {name} में अपडेट किया गया। समाप्त करने के लिए "संपर्क सहेजें" बोलें, या इसे बदलने के लिए "नंबर संपादित करें" बोलें।',
        name_recorded: 'नाम {name} है। अब कृपया देश कोड से शुरू करते हुए उनका पूरा फोन नंबर बोलें।',
        number_recorded: 'नंबर {number} के रूप में रिकॉर्ड किया गया। समाप्त करने के लिए "संपर्क सहेजें" बोलें, या इसे बदलने के लिए "नंबर संपादित करें" बोलें।',
        cancel_add: 'संपर्क जोड़ना रद्द कर दिया गया।',
        contact_starred: 'संपर्क स्टार किया गया। समाप्त करने के लिए "संपर्क सहेजें" बोलें।',
        say_new_name: 'नया नाम बोलें।',
        say_new_number: 'नया नंबर बोलें।',
        help_cmd: 'कृपया "संपर्क सहेजें", "नाम संपादित करें", "नंबर संपादित करें", या "इसे स्टार करें" बोलें।',
        closing: 'विंडो बंद कर रहा हूँ।',
        help_error: 'कृपया पुनः प्रयास करें, या विंडो बंद करें बोलें।',
        missing_fields: 'नाम और नंबर आवश्यक हैं।',
        updating_contact: 'संपर्क अपडेट कर रहा हूँ।',
        saving_contact: 'संपर्क सहेज रहा हूँ।',
        update_success: 'संपर्क सफलतापूर्वक अपडेट किया गया!',
        save_success: 'संपर्क सफलतापूर्वक सहेजा गया!',
        save_error: 'संपर्क सहेजने में विफल। पुनः प्रयास करें, या विंडो बंद करें बोलें।'
    },
    'es-ES': {
        labels: { name: 'nombre de contacto', phone_number: 'número de teléfono' },
        edit_contact: 'Editando contacto {name}.',
        adding_new_contact: 'Agregando un nuevo contacto. Por favor diga el nombre del contacto.',
        edit_guidance: 'Editando contacto {name}. Puede decir "editar nombre", "editar número", "destacar contacto", o "guardar" para terminar.',
        listen_name: 'Escuchando el nombre del contacto...',
        listen_number: 'Escuchando el número de teléfono. Diga el código de país seguido de los dígitos.',
        did_not_catch: "Lo siento, no entendí. Por favor, inténtelo de nuevo.",
        say_name: 'Diga el nombre del contacto.',
        say_number: 'Diga el número de teléfono.',
        cleared: '{field} borrado. Dígalo de nuevo.',
        invalid_number: 'Ese no parece ser un número de teléfono válido. Por favor, diga claramente los dígitos numéricos.',
        name_updated: 'Nombre actualizado a {name}. Diga "guardar contacto" para terminar o "editar número" para cambiarlo.',
        name_recorded: 'El nombre es {name}. Ahora diga su número completo, comenzando con el código de país.',
        number_recorded: 'Número grabado como {number}. Diga "guardar contacto" para terminar o "editar número".',
        cancel_add: 'Adición de contacto cancelada.',
        contact_starred: 'Contacto destacado. Diga "guardar contacto" para terminar.',
        say_new_name: 'Diga el nuevo nombre.',
        say_new_number: 'Diga el nuevo número.',
        help_cmd: 'Diga "guardar contacto", "editar nombre", "editar número", o "destacar contacto".',
        closing: 'Cerrando ventana.',
        help_error: 'Diga intentar de nuevo o cerrar ventana.',
        missing_fields: 'El nombre y el número son obligatorios.',
        updating_contact: 'Actualizando contacto.',
        saving_contact: 'Guardando contacto.',
        update_success: '¡Contacto actualizado correctamente!',
        save_success: '¡Contacto guardado correctamente!',
        save_error: 'Error al guardar contacto. Diga intentar de nuevo o cerrar ventana.'
    },
    'fr-FR': {
        labels: { name: 'nom du contact', phone_number: 'numéro de téléphone' },
        edit_contact: 'Modification du contact {name}.',
        adding_new_contact: 'Ajout d\'un nouveau contact. Veuillez dire le nom du contact.',
        edit_guidance: 'Modification du contact {name}. Vous pouvez dire "modifier le nom", "modifier le numéro", "mettre en favori", ou "enregistrer".',
        listen_name: 'Écoute du nom du contact...',
        listen_number: 'Écoute du numéro. Veuillez dire l\'indicatif régional suivi des chiffres.',
        did_not_catch: "Désolé, je n'ai pas compris. Veuillez réessayer.",
        say_name: 'Dites le nom du contact.',
        say_number: 'Dites le numéro de téléphone.',
        cleared: '{field} effacé. Répétez-le.',
        invalid_number: 'Cela ne semble pas être un numéro valide. Veuillez dire clairement les chiffres.',
        name_updated: 'Nom mis à jour en {name}. Dites "enregistrer le contact" pour terminer ou "modifier le numéro".',
        name_recorded: 'Le nom est {name}. Dites maintenant le numéro complet.',
        number_recorded: 'Numéro enregistré comme {number}. Dites "enregistrer le contact" ou "modifier le numéro".',
        cancel_add: 'Ajout de contact annulé.',
        contact_starred: 'Contact mis en favori. Dites "enregistrer le contact" pour terminer.',
        say_new_name: 'Dites le nouveau nom.',
        say_new_number: 'Dites le nouveau numéro.',
        help_cmd: 'Dites "enregistrer", "modifier le nom", "modifier le numéro" ou "favori".',
        closing: 'Fermeture de la fenêtre.',
        help_error: 'Dites réessayer ou fermer la fenêtre.',
        missing_fields: 'Le nom et le numéro sont obligatoires.',
        updating_contact: 'Mise à jour du contact.',
        saving_contact: 'Enregistrement du contact.',
        update_success: 'Contact mis à jour avec succès!',
        save_success: 'Contact enregistré avec succès!',
        save_error: 'Échec de l\'enregistrement. Dites réessayer ou fermer la fenêtre.'
    },
    'bn-IN': {
        labels: { name: 'যোগাযোগের নাম', phone_number: 'ফোন নম্বর' },
        edit_contact: 'যোগাযোগ {name} সম্পাদনা করা হচ্ছে।',
        adding_new_contact: 'একটি নতুন যোগাযোগ যোগ করা হচ্ছে। দয়া করে নামটি বলুন।',
        edit_guidance: 'যোগাযোগ {name} সম্পাদনা করা হচ্ছে। আপনি "নাম সম্পাদনা", "নম্বর সম্পাদনা", "স্টার করুন", বা "সংরক্ষণ" বলতে পারেন।',
        listen_name: 'যোগাযোগের নাম শুনছি...',
        listen_number: 'ফোন নম্বর শুনছি। দয়া করে দেশের কোড এবং তারপর নম্বর বলুন।',
        did_not_catch: "দুঃখিত, বুঝতে পারিনি। আবার চেষ্টা করুন।",
        say_name: 'যোগাযোগের নাম বলুন।',
        say_number: 'ফোন নম্বর বলুন।',
        cleared: '{field} মুছে ফেলা হয়েছে। আবার বলুন।',
        invalid_number: 'এটি বৈধ নম্বর মনে হচ্ছে না। দয়া করে স্পষ্ট করে নম্বর বলুন।',
        name_updated: 'নাম {name} এ আপডেট করা হয়েছে। শেষ করতে "সংরক্ষণ" বা পরিবর্তন করতে "নম্বর সম্পাদনা" বলুন।',
        name_recorded: 'নাম হলো {name}। এখন দয়া করে নম্বরটি বলুন।',
        number_recorded: 'নম্বর {number} হিসেবে রেকর্ড করা হয়েছে। শেষ করতে "সংরক্ষণ" বা পরিবর্তন করতে "নম্বর সম্পাদনা" বলুন।',
        cancel_add: 'যোগাযোগ যোগ করা বাতিল হয়েছে।',
        contact_starred: 'যোগাযোগ স্টার করা হয়েছে। শেষ করতে "সংরক্ষণ" বলুন।',
        say_new_name: 'নতুন নামটি বলুন।',
        say_new_number: 'নতুন নম্বরটি বলুন।',
        help_cmd: 'দয়া করে "সংরক্ষণ", "নাম সম্পাদনা", "নম্বর সম্পাদনা" বা "স্টার করুন" বলুন।',
        closing: 'উইন্ডো বন্ধ করা হচ্ছে।',
        help_error: 'দয়া করে আবার চেষ্টা করুন বা উইন্ডো বন্ধ করুন বলুন।',
        missing_fields: 'নাম এবং নম্বর উভয়ই প্রয়োজন।',
        updating_contact: 'যোগাযোগ আপডেট করা হচ্ছে।',
        saving_contact: 'যোগাযোগ সংরক্ষণ করা হচ্ছে।',
        update_success: 'যোগাযোগ সফলভাবে আপডেট হয়েছে!',
        save_success: 'যোগাযোগ সফলভাবে সংরক্ষণ হয়েছে!',
        save_error: 'সংরক্ষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন বা বন্ধ করুন বলুন।'
    },
    'ta-IN': {
        labels: { name: 'தொடர்பு பெயர்', phone_number: 'தொலைபேசி எண்' },
        edit_contact: 'தொடர்பு {name} மாற்றப்படுகிறது.',
        adding_new_contact: 'புதிய தொடர்பு சேர்க்கப்படுகிறது. தொடர்பு பெயரை சொல்லவும்.',
        edit_guidance: 'தொடர்பு {name} மாற்றப்படுகிறது. "பெயரை மாற்று", "எண்ணை மாற்று", "நட்சத்திரமிடு", அல்லது "சேமி" என்று கூறலாம்.',
        listen_name: 'பெயரைக் கேட்கிறேன்...',
        listen_number: 'எண்ணைக் கேட்கிறேன். முதலில் நாட்டு குறியீட்டைச் சொல்லவும்.',
        did_not_catch: "மன்னிக்கவும், புரியவில்லை. மீண்டும் சொல்லவும்.",
        say_name: 'பெயரைச் சொல்லவும்.',
        say_number: 'எண்ணைச் சொல்லவும்.',
        cleared: '{field} அழிக்கப்பட்டது. மீண்டும் சொல்லவும்.',
        invalid_number: 'இது சரியான எண்ணாகத் தெரியவில்லை. சரியாக எண்களைக் கூறவும்.',
        name_updated: 'பெயர் {name} என மாற்றப்பட்டது. "சேமி" அல்லது "எண்ணை மாற்று" என்று கூறவும்.',
        name_recorded: 'பெயர் {name}. இப்போது முழு எண்ணைக் கூறவும்.',
        number_recorded: 'எண் {number} எனப் பதிவாகியுள்ளது. "சேமி" அல்லது "எண்ணை மாற்று" என்று கூறவும்.',
        cancel_add: 'தொடர்பு சேர்ப்பது ரத்து செய்யப்பட்டது.',
        contact_starred: 'தொடர்பு நட்சத்திரமிடப்பட்டது. "சேமி" என்று கூறவும்.',
        say_new_name: 'புதிய பெயரைச் சொல்லவும்.',
        say_new_number: 'புதிய எண்ணைச் சொல்லவும்.',
        help_cmd: '"சேமி", "பெயரை மாற்று", "எண்ணை மாற்று" அல்லது "நட்சத்திரமிடு" என்று கூறவும்.',
        closing: 'சாளரம் மூடப்படுகிறது.',
        help_error: 'மீண்டும் முயற்சிக்கவும், அல்லது மூடு என்று கூறவும்.',
        missing_fields: 'பெயர் மற்றும் எண் அவசியம்.',
        updating_contact: 'தொடர்பு புதுப்பிக்கப்படுகிறது.',
        saving_contact: 'தொடர்பு சேமிக்கப்படுகிறது.',
        update_success: 'தொடர்பு வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
        save_success: 'தொடர்பு வெற்றிகரமாக சேமிக்கப்பட்டது!',
        save_error: 'சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது மூடவும்.'
    },
    'te-IN': {
        labels: { name: 'పరిచయం పేరు', phone_number: 'ఫోన్ నంబర్' },
        edit_contact: 'పరిచయం {name} సవరించబడుతోంది.',
        adding_new_contact: 'కొత్త పరిచయం జోడించబడుతోంది. దయచేసి పేరు చెప్పండి.',
        edit_guidance: 'పరిచయం {name} సవరించబడుతోంది. "పేరు మార్చు", "నంబర్ మార్చు", "స్టార్ చేయి", లేదా "సేవ్ చేయి" అని చెప్పవచ్చు.',
        listen_name: 'పేరు వింటున్నాను...',
        listen_number: 'నంబర్ వింటున్నాను. కంట్రీ కోడ్‌తో సహా చెప్పండి.',
        did_not_catch: "క్షమించండి, అర్థం కాలేదు. మళ్ళీ చెప్పండి.",
        say_name: 'పేరు చెప్పండి.',
        say_number: 'నంబర్ చెప్పండి.',
        cleared: '{field} క్లియర్ చేయబడింది. మళ్ళీ చెప్పండి.',
        invalid_number: 'ఇది సరైన నంబర్ కాదు. దయచేసి అంకెలను స్పష్టంగా చెప్పండి.',
        name_updated: 'పేరు {name} కు మార్చబడింది. "సేవ్ చేయి" లేదా "నంబర్ మార్చు" అని చెప్పండి.',
        name_recorded: 'పేరు {name}. ఇప్పుడు పూర్తి నంబర్ చెప్పండి.',
        number_recorded: 'నంబర్ {number} రికార్డ్ చేయబడింది. "సేవ్ చేయి" లేదా "నంబర్ మార్చు" అని చెప్పండి.',
        cancel_add: 'పరిచయం జోడించడం రద్దు చేయబడింది.',
        contact_starred: 'పరిచయం స్టార్ చేయబడింది. "సేవ్ చేయి" అని చెప్పండి.',
        say_new_name: 'కొత్త పేరు చెప్పండి.',
        say_new_number: 'కొత్త నంబర్ చెప్పండి.',
        help_cmd: '"సేవ్ చేయి", "పేరు మార్చు", "నంబర్ మార్చు" లేదా "స్టార్ చేయి" అని చెప్పండి.',
        closing: 'విండో మూసివేయబడుతోంది.',
        help_error: 'మళ్ళీ ప్రయత్నించండి లేదా విండో మూసివేయండి అని చెప్పండి.',
        missing_fields: 'పేరు మరియు నంబర్ తప్పనిసరి.',
        updating_contact: 'పరిచయం అప్‌డేట్ అవుతోంది.',
        saving_contact: 'పరిచయం సేవ్ అవుతోంది.',
        update_success: 'పరిచయం విజయవంతంగా అప్‌డేట్ చేయబడింది!',
        save_success: 'పరిచయం విజయవంతంగా సేవ్ చేయబడింది!',
        save_error: 'సేవ్ చేయడం విఫలమైంది. మళ్ళీ ప్రయత్నించండి లేదా మూసివేయండి.'
    }
};

const getT = (lang) => TRANSLATIONS[lang] || TRANSLATIONS['en-US'];
const replaceT = (text, vars) => {
    let output = text;
    for (const [key, val] of Object.entries(vars)) {
        output = output.replace(`{${key}}`, val);
    }
    return output;
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceWhatsAppAddContact = ({ user, onClose, onAdded, contactToEdit, isMuted = false }) => {
    const isEditMode = !!contactToEdit;
    const [form, setForm] = useState({
        name: contactToEdit?.name || '',
        phone_number: contactToEdit?.phone_number || '',
        is_starred: contactToEdit?.is_starred || 0
    });

    const userLang = user?.language_preference || 'en-US';
    const t = getT(userLang);

    const [countryCode, setCountryCode] = useState('+91');
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [currentField, setCurrentField] = useState(isEditMode ? 'phone_number' : 'name');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [guidance, setGuidance] = useState(isEditMode ? replaceT(t.edit_contact, { name: contactToEdit.name }) : t.adding_new_contact);

    const recognitionRef = useRef(null);
    const formRef = useRef(form);
    const fieldLabels = {
        name: t.labels?.name || 'contact name',
        phone_number: t.labels?.phone_number || 'phone number'
    };

    const isSystemSpeaking = useCallback(() => {
        return 'speechSynthesis' in window && window.speechSynthesis.speaking;
    }, []);

    useEffect(() => {
        if (isEditMode) {
            speakGuidance(replaceT(t.edit_guidance, { name: contactToEdit.name }), () => {
                setTimeout(() => startCommandListening(), 1000);
            });
        } else {
            speakGuidance(t.adding_new_contact, () => {
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
            utter.lang = userLang;
            utter.rate = 0.9; utter.pitch = 1.05;
            utter.onstart = () => { setIsSpeaking(true); setGuidance(text); };
            utter.onend = () => { setIsSpeaking(false); if (callback) setTimeout(callback, 1200); };
            utter.onerror = () => { setIsSpeaking(false); if (callback) setTimeout(callback, 1200); };
            window.speechSynthesis.speak(utter);
        } else if (callback) {
            setTimeout(callback, 1500);
        }
    }, [userLang]);

    const startFieldListening = useCallback((field) => {
        if (!SpeechRecognition) return;
        setCurrentField(field);

        let introSpeech = field === 'name' ? t.listen_name : t.listen_number;
        setGuidance(introSpeech);

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US'; rec.interimResults = true; rec.continuous = false;

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
            if (error.error !== 'aborted' && error.error !== 'not-allowed') {
                isStopped = true;
                setGuidance(t.did_not_catch);
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

        // 1. Check for quick navigation commands first
        if (lowerTrans.includes('go to name') || lowerTrans.includes('edit name') || lowerTrans.includes('change name')) {
            speakGuidance(t.say_name, () => setTimeout(() => startFieldListening('name'), 1000));
            return;
        }
        if (lowerTrans.includes('go to number') || lowerTrans.includes('go to phone') || lowerTrans.includes('edit number') || lowerTrans.includes('change number')) {
            speakGuidance(t.say_number, () => setTimeout(() => startFieldListening('phone_number'), 1000));
            return;
        }

        if (lowerTrans.includes('clear')) {
            setForm(prev => ({ ...prev, [field]: '' }));
            speakGuidance(replaceT(t.cleared, { field: fieldLabels[field] }), () => setTimeout(() => startFieldListening(field), 2000));
            return;
        }

        // 2. Field processing & validation
        if (field === 'name') {
            processedText = processedText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else if (field === 'phone_number') {
            // Keep only digits and plus sign for country code
            processedText = processedText.replace(/[^\d+]/g, '');

            if (processedText.length < 5) { // Basic validation for "is it a phone number?"
                speakGuidance(t.invalid_number, () => {
                    setTimeout(() => startFieldListening('phone_number'), 2000);
                });
                return;
            }
        }

        setForm(prev => ({ ...prev, [field]: processedText }));

        if (field === 'name') {
            if (formRef.current.phone_number && formRef.current.phone_number.length >= 5) {
                speakGuidance(replaceT(t.name_updated, { name: processedText }), () => {
                    setTimeout(() => startCommandListening(), 1000);
                });
            } else {
                speakGuidance(replaceT(t.name_recorded, { name: processedText }), () => {
                    setTimeout(() => startFieldListening('phone_number'), 1000);
                });
            }
        } else if (field === 'phone_number') {
            speakGuidance(replaceT(t.number_recorded, { number: processedText.split('').join(' ') }), () => {
                setTimeout(() => startCommandListening(), 1000);
            });
        }
    };

    const startCommandListening = () => {
        if (!SpeechRecognition) return;
        if (isSystemSpeaking()) { setTimeout(() => startCommandListening(), 1000); return; }

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US'; rec.interimResults = false; rec.continuous = false;

        let isStopped = false;

        rec.onstart = () => setIsListening(true);
        rec.onresult = (e) => {
            isStopped = true;
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            if (transcript.includes('cancel')) {
                speakGuidance(t.cancel_add);
                onClose();
            } else if (transcript.includes('save') || transcript.includes('add') || transcript.includes('finish') || transcript.includes('yes')) {
                handleAddContact();
            } else if (transcript.includes('star') || transcript.includes('favorite')) {
                setForm(prev => ({ ...prev, is_starred: prev.is_starred ? 0 : 1 }));
                speakGuidance(t.contact_starred, () => startCommandListening());
                return;
            } else if (transcript.includes('edit name') || transcript.includes('change name') || transcript.includes('go to name')) {
                speakGuidance(t.say_new_name, () => startFieldListening('name'));
            } else if (transcript.includes('edit number') || transcript.includes('change number') || transcript.includes('go to number') || transcript.includes('go to phone')) {
                speakGuidance(t.say_new_number, () => startFieldListening('phone_number'));
            } else {
                speakGuidance(t.help_cmd, () => startCommandListening());
            }
            rec.stop();
        };
        rec.onerror = (e) => {
            setIsListening(false);
            if (e.error !== 'aborted' && e.error !== 'not-allowed') {
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

    const startErrorListening = () => {
        if (!SpeechRecognition) return;
        if (isSystemSpeaking()) { setTimeout(() => startErrorListening(), 1000); return; }

        const rec = new SpeechRecognition();
        rec.lang = userLang || 'en-US'; rec.interimResults = false; rec.continuous = false;
        let isStopped = false;

        rec.onstart = () => setIsListening(true);
        rec.onresult = (e) => {
            isStopped = true;
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            if (transcript.includes('try again') || transcript.includes('retry') || transcript.includes('yes')) {
                handleAddContact();
            } else if (transcript.includes('close') || transcript.includes('cancel') || transcript.includes('stop') || transcript.includes('no')) {
                speakGuidance(t.closing);
                onClose();
            } else {
                speakGuidance(t.help_error, () => startErrorListening());
            }
            rec.stop();
        };
        rec.onerror = (e) => {
            setIsListening(false);
            if (e.error !== 'aborted' && e.error !== 'not-allowed') {
                isStopped = true;
                setTimeout(() => startErrorListening(), 2000);
            }
        };
        rec.onend = () => {
            setIsListening(false);
            if (!isStopped && !isSystemSpeaking()) {
                setTimeout(() => startErrorListening(), 500);
            }
        };
        rec.start();
        recognitionRef.current = rec;
    };

    const handleAddContact = async () => {
        const currentForm = formRef.current;
        if (!currentForm.name || !currentForm.phone_number) {
            speakGuidance(t.missing_fields);
            return;
        }
        setStatus({ type: 'loading', msg: 'Saving contact...' });
        speakGuidance(isEditMode ? t.updating_contact : t.saving_contact);

        try {
            // If the user didn't speak a + sign, we assume they omitted the country code and we should prepend the selected one.
            let finalPhone = currentForm.phone_number;
            if (!finalPhone.startsWith('+')) {
                finalPhone = `${countryCode}${finalPhone}`;
            }

            if (isEditMode) {
                await whatsappApi.editContact(contactToEdit.name, currentForm.name, finalPhone, '', currentForm.is_starred);
            } else {
                await whatsappApi.addContact(currentForm.name, finalPhone, '', currentForm.is_starred);
            }
            setStatus({ type: 'success', msg: isEditMode ? '✓ Contact updated successfully!' : '✓ Contact saved successfully!' });
            speakGuidance(isEditMode ? t.update_success : t.save_success);
            await new Promise(resolve => setTimeout(resolve, 2000));
            onAdded?.();
            onClose();
        } catch (error) {
            console.error('Failed to save contact:', error);
            setStatus({ type: 'error', msg: 'Failed to save contact.' });
            speakGuidance(t.save_error, () => startErrorListening());
        }
    };

    return (
        <div className="voice-compose-overlay" style={{ zIndex: 99999 }}>
            <div className="voice-compose-modal glass-panel" style={{ borderTop: '4px solid #3b82f6' }}>
                <div className="voice-compose-header">
                    <span className="modal-title" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={18} /> {isEditMode ? 'Edit Contact' : 'Add Contact'}
                    </span>
                    <button className="icon-close" onClick={onClose}>✕</button>
                </div>

                <div className="voice-guidance">
                    <div className="guidance-content">
                        <div className="guidance-icon" style={isListening ? { color: '#3b82f6', textShadow: '0 0 10px #3b82f6' } : {}}>
                            {isListening ? <MicOff className="pulse" size={20} /> : <Mic size={20} />}
                        </div>
                        <div className="guidance-text">
                            <p className="guidance-main">{guidance}</p>
                            <p className="guidance-field">
                                Current field: <strong style={{ color: '#3b82f6' }}>{fieldLabels[currentField]}</strong>
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
                                style={currentField === 'name' ? { borderColor: '#3b82f6' } : {}}
                            />
                            <button type="button" className="field-mic-btn" onClick={() => startFieldListening('name')} disabled={isListening}>
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Phone Number:</label>
                        <div className="field-content" style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    padding: '0 8px',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    width: '80px'
                                }}
                            >
                                <option value="+91">🇮🇳 +91</option>
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+44">🇬🇧 +44</option>
                                <option value="+61">🇦🇺 +61</option>
                                <option value="+971">🇦🇪 +971</option>
                                <option value="+65">🇸🇬 +65</option>
                            </select>
                            <input
                                type="text"
                                value={form.phone_number}
                                onChange={(e) => setForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                placeholder="E.g., 9000000000"
                                className={currentField === 'phone_number' ? 'active-field' : ''}
                                style={{ ...(currentField === 'phone_number' ? { borderColor: '#3b82f6' } : {}), flex: 1 }}
                            />
                            <button type="button" className="field-mic-btn" onClick={() => startFieldListening('phone_number')} disabled={isListening}>
                                <Mic size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="form-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label>Starred Contact:</label>
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, is_starred: prev.is_starred ? 0 : 1 }))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: form.is_starred ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>
                            ★
                        </button>
                    </div>

                    <div className="compose-actions">
                        <button className="send-btn" style={{ background: '#3b82f6', color: '#fff', width: '100%' }} onClick={handleAddContact} disabled={status.type === 'loading' || isListening}>
                            {status.type === 'loading' ? <><Loader size={16} className="spin" /> Saving...</> : <><UserPlus size={16} /> Save Contact</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceWhatsAppAddContact;
