import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X, MessageCircle, MicOff } from 'lucide-react';
import '../VoiceAssistant/VoiceAssistantOverlay.css';
import './VoiceWhatsAppOverlay.css';
import '../VoiceAssistant/AutoListeningIndicator.css';
import { useLang } from '../../lib/LanguageContext';

const TRANSLATIONS = {
    'en-US': {
        cmds: {
            compose: { phrases: ['send whatsapp', 'send message', 'whatsapp', 'compose message', 'compose', 'new message'], reply: "Preparing WhatsApp message." },
            compose_media: { phrases: ['send image', 'send picture', 'send media'], reply: "Preparing media message." },
            read_latest: { phrases: ['read', 'read latest', 'read my messages', 'what are my messages', 'read latest message', 'read latest chat'], reply: "Reading latest message." },
            read_from: { phrases: ['read messages from', 'read from'], reply: "Checking messages." },
            add_contact: { phrases: ['add contact', 'new contact', 'save contact', 'add new contact'], reply: "Opening add contact." },
            edit_contact: { phrases: ['edit contact', 'change contact'], reply: "Checking contact to edit." },
            delete_contact: { phrases: ['delete contact', 'remove contact'], reply: "Deleting contact." },
            star_contact: { phrases: ['star contact', 'favorite contact'], reply: "Starring contact." },
            open_chat: { phrases: ['open chat', 'start chat', 'open conversation', 'chat with'], reply: "Opening chat." },
            reply: { phrases: ['reply', 'respond', 'write back'], reply: "Preparing a reply." },
            logout: { phrases: ['logout', 'exit', 'goodbye', 'sign out'], reply: "Logging you out. Goodbye!" },
            stop: { phrases: ['stop', 'cancel', 'never mind', 'nevermind'], reply: "Okay, cancelled." },
            mute_assist: { phrases: ['stop assist', 'mute assist', 'shut up', 'quiet', 'silent', 'silence', 'be quiet'], reply: "Bot speech muted. I will only listen." },
            unmute_assist: { phrases: ['start assist', 'unmute assist', 'start voice assist', 'activate voice assist', 'speak up'], reply: "Voice assistant now active." },
            help: { phrases: ['help'], reply: "Say 'Send WhatsApp to' followed by a contact name, or 'Read latest messages'." },
            switch_email: { phrases: ['open email', 'switch to email', 'go to email', 'check email'], reply: "Switching to Email Assistant." },
            go_apps: { phrases: ['go to apps', 'show apps', 'home', 'switch apps', 'change app', 'app selector'], reply: "Opening App Selector." }
        },
        no_api: "WhatsApp API is not configured yet.",
        no_recent: "You have no recent WhatsApp conversations.",
        latest_from: "Latest message from {name} says: {text}",
        latest_sent: "You recently sent to {name}: {text}",
        did_not_catch_name: "I didn't catch the name. Say 'read messages from' followed by a contact.",
        latest_with: "Latest message with {name} is: {text}",
        no_recent_from: "I couldn't find any recent messages from {name}.",
        who_edit: "Who do you want to edit?",
        open_edit_for: "Opening edit contact for {name}.",
        contact_not_found: "I couldn't find a contact named {name}.",
        who_delete: "Who do you want to delete?",
        deleting_contact: "Deleting contact {name}.",
        who_star: "Who do you want to star?",
        starring_contact: "Starring contact {name}.",
        who_chat: "Who do you want to open a chat with?",
        open_chat_for: "Opening chat with {name}.",
        open_compose_reply: "Opening voice compose to reply.",
        no_active_conv: "There is no active conversation to reply to.",
        open_compose_reply_to: "Opening voice compose to reply to {name}.",
        did_not_understand: "I didn't understand. You can say 'Send WhatsApp'.",
        did_not_catch: "Sorry, didn't catch that.",
        not_supported: "Speech recognition not supported in this browser.",
        tap_mic: "Tap the mic and speak a command",
        listening: "Listening...",
        ready: "Ready",
        not_configured: "Not Configured",
        processing: "Processing...",
        speaking: "Speaking...",
        tap_speak: "Tap & Speak"
    },
    'hi-IN': {
        cmds: {
            compose: { phrases: ['व्हाट्सएप भेजो', 'संदेश भेजो', 'व्हाट्सएप', 'नया संदेश'], reply: "व्हाट्सएप संदेश तैयार कर रहा हूँ।" },
            compose_media: { phrases: ['चित्र भेजो', 'तस्वीर भेजो', 'मीडिया भेजो'], reply: "मीडिया संदेश तैयार कर रहा हूँ।" },
            read_latest: { phrases: ['पढ़ो', 'नवीनतम पढ़ो', 'मेरे संदेश पढ़ो', 'मेरा नवीनतम संदेश पढ़ो'], reply: "नवीनतम संदेश पढ़ रहा हूँ।" },
            read_from: { phrases: ['से संदेश पढ़ो', 'से पढ़ो'], reply: "संदेशों की जाँच कर रहा हूँ।" },
            add_contact: { phrases: ['संपर्क जोड़ें', 'नया संपर्क', 'संपर्क सहेजें'], reply: "अतिरिक्त संपर्क खोल रहा हूँ।" },
            edit_contact: { phrases: ['संपर्क संपादित करें', 'संपर्क बदलें'], reply: "संपादित करने के लिए संपर्क की जाँच कर रहा हूँ।" },
            delete_contact: { phrases: ['संपर्क हटाएं', 'संपर्क मिटाएं'], reply: "संपर्क हटा रहा हूँ।" },
            star_contact: { phrases: ['संपर्क को तारांकित करें', 'पसंदीदा संपर्क'], reply: "संपर्क को तारांकित कर रहा हूँ।" },
            open_chat: { phrases: ['चैट खोलें', 'बातचीत शुरू करें', 'के साथ चैट करें'], reply: "चैट खोल रहा हूँ।" },
            reply: { phrases: ['उत्तर दें', 'जवाब दें'], reply: "एक उत्तर तैयार कर रहा हूँ।" },
            logout: { phrases: ['लॉगआउट', 'बाहर जाएं', 'अलविदा'], reply: "आपको लॉग आउट कर रहा हूँ। अलविदा!" },
            stop: { phrases: ['रुकें', 'रद्द करें', 'कोई बात नहीं'], reply: "ठीक है, रद्द कर दिया।" },
            mute_assist: { phrases: ['असिस्ट बंद करो', 'म्यूट करो', 'चुप रहो', 'शांत रहो'], reply: "बॉट की आवाज़ म्यूट कर दी गई है।" },
            unmute_assist: { phrases: ['असिस्ट शुरू करो', 'अनम्यूट करो', 'आवाज़ चालू करो'], reply: "वॉयस असिस्टेंट अब सक्रिय है।" },
            help: { phrases: ['मदद'], reply: "कहें 'के लिए व्हाट्सएप भेजें' और फिर संपर्क का नाम, या 'नवीनतम संदेश पढ़ें'।" },
            switch_email: { phrases: ['ईमेल खोलें', 'ईमेल पर जाएं', 'ईमेल देखें'], reply: "ईमेल सहायक पर स्विच कर रहा हूँ।" },
            go_apps: { phrases: ['अप्प्स पर जाएं', 'अप्प्स दिखाएँ', 'होम'], reply: "ऐप सिलेक्टर खोल रहा हूँ।" }
        },
        no_api: "व्हाट्सएप एपीआई अभी कॉन्फ़िगर नहीं किया गया है।",
        no_recent: "आपके पास कोई हालिया व्हाट्सएप बातचीत नहीं है।",
        latest_from: "{name} का नवीनतम संदेश कहता है: {text}",
        latest_sent: "आपने हाल ही में {name} को भेजा: {text}",
        did_not_catch_name: "मैंने नाम नहीं सुना। 'से संदेश पढ़ें' कहें और फिर संपर्क का नाम।",
        latest_with: "{name} के साथ नवीनतम संदेश है: {text}",
        no_recent_from: "मुझे {name} से कोई नवीनतम संदेश नहीं मिला।",
        who_edit: "आप किसे संपादित करना चाहते हैं?",
        open_edit_for: "{name} के लिए संपादन संपर्क खोल रहा हूँ।",
        contact_not_found: "मुझे {name} नाम का कोई संपर्क नहीं मिला।",
        who_delete: "आप किसे हटाना चाहते हैं?",
        deleting_contact: "संपर्क {name} को हटा रहा हूँ।",
        who_star: "आप किसे तारांकित करना चाहते हैं?",
        starring_contact: "संपर्क {name} को तारांकित कर रहा हूँ।",
        who_chat: "आप किसके साथ चैट खोलना चाहते हैं?",
        open_chat_for: "{name} के साथ चैट खोल रहा हूँ।",
        open_compose_reply: "उत्तर देने के लिए ध्वनि रचना खोल रहा हूँ।",
        no_active_conv: "उत्तर देने के लिए कोई सक्रिय बातचीत नहीं है।",
        open_compose_reply_to: "{name} को उत्तर देने के लिए ध्वनि रचना खोल रहा हूँ।",
        did_not_understand: "मुझे समझ नहीं आया। आप 'व्हाट्सएप भेजो' कह सकते हैं।",
        did_not_catch: "क्षमा करें, मैं समझ नहीं सका।",
        not_supported: "वाक् पहचान आपके ब्राउज़र में समर्थित नहीं है।",
        tap_mic: "माइक पर टैप करें और एक कमांड बोलें",
        listening: "सुन रहे हैं...",
        ready: "तैयार",
        not_configured: "कॉन्फ़िगर नहीं किया गया",
        processing: "संसाधित कर रहे हैं...",
        speaking: "बोल रहे हैं...",
        tap_speak: "टैप करें और बोलें"
    },
    'es-ES': {
        cmds: {
            compose: { phrases: ['enviar whatsapp', 'enviar mensaje', 'whatsapp', 'nuevo mensaje'], reply: "Preparando mensaje de WhatsApp." },
            compose_media: { phrases: ['enviar imagen', 'enviar foto', 'enviar medios'], reply: "Preparando mensaje multimedia." },
            read_latest: { phrases: ['leer', 'leer último', 'leer mis mensajes'], reply: "Leyendo último mensaje." },
            read_from: { phrases: ['leer mensajes de', 'leer de'], reply: "Revisando mensajes." },
            add_contact: { phrases: ['añadir contacto', 'nuevo contacto', 'guardar contacto'], reply: "Abriendo añadir contacto." },
            edit_contact: { phrases: ['editar contacto', 'cambiar contacto'], reply: "Revisando contacto para editar." },
            delete_contact: { phrases: ['eliminar contacto', 'borrar contacto'], reply: "Eliminando contacto." },
            star_contact: { phrases: ['destacar contacto', 'contacto favorito'], reply: "Destacando contacto." },
            open_chat: { phrases: ['abrir chat', 'iniciar chat', 'chatear con'], reply: "Abriendo chat." },
            reply: { phrases: ['responder', 'contestar'], reply: "Preparando respuesta." },
            logout: { phrases: ['cerrar sesión', 'salir', 'adiós'], reply: "Cerrando sesión. ¡Adiós!" },
            stop: { phrases: ['parar', 'cancelar', 'olvídalo'], reply: "Vale, cancelado." },
            mute_assist: { phrases: ['parar asistente', 'silenciar asistente', 'cállate', 'silencio', 'no hables'], reply: "Voz del bot silenciada. Solo escucharé." },
            unmute_assist: { phrases: ['iniciar asistente', 'activar asistente', 'habla de nuevo'], reply: "Asistente de voz ahora activo." },
            help: { phrases: ['ayuda'], reply: "Di 'Enviar WhatsApp a' seguido del nombre del contacto, o 'Leer últimos mensajes'." },
            switch_email: { phrases: ['abrir email', 'ir al correo', 'revisar correo'], reply: "Cambiando a Asistente de Email." },
            go_apps: { phrases: ['ir a aplicaciones', 'mostrar aplicaciones', 'inicio'], reply: "Abriendo Selector de Apps." }
        },
        no_api: "La API de WhatsApp no está configurada aún.",
        no_recent: "No tienes conversaciones recientes de WhatsApp.",
        latest_from: "El último mensaje de {name} dice: {text}",
        latest_sent: "Recientemente enviaste a {name}: {text}",
        did_not_catch_name: "No entendí el nombre. Di 'leer mensajes de' seguido de un contacto.",
        latest_with: "El último mensaje con {name} es: {text}",
        no_recent_from: "No encontré mensajes recientes de {name}.",
        who_edit: "¿A quién quieres editar?",
        open_edit_for: "Abriendo editar contacto para {name}.",
        contact_not_found: "No encontré un contacto llamado {name}.",
        who_delete: "¿A quién quieres eliminar?",
        deleting_contact: "Eliminando contacto {name}.",
        who_star: "¿A quién quieres destacar?",
        starring_contact: "Destacando contacto {name}.",
        who_chat: "¿Con quién quieres abrir un chat?",
        open_chat_for: "Abriendo chat con {name}.",
        open_compose_reply: "Abriendo composición por voz para responder.",
        no_active_conv: "No hay una conversación activa para responder.",
        open_compose_reply_to: "Abriendo composición por voz para responder a {name}.",
        did_not_understand: "No entendí. Puedes decir 'Enviar WhatsApp'.",
        did_not_catch: "Lo siento, no entendí eso.",
        not_supported: "Reconocimiento de voz no soportado en este navegador.",
        tap_mic: "Toca el micro y di un comando",
        listening: "Escuchando...",
        ready: "Listo",
        not_configured: "No configurado",
        processing: "Procesando...",
        speaking: "Hablando...",
        tap_speak: "Tocar y Hablar"
    },
    'fr-FR': {
        cmds: {
            compose: { phrases: ['envoyer whatsapp', 'envoyer un message', 'whatsapp', 'nouveau message'], reply: "Préparation du message WhatsApp." },
            compose_media: { phrases: ['envoyer une image', 'envoyer une photo'], reply: "Préparation du message multimédia." },
            read_latest: { phrases: ['lire', 'lire le dernier', 'lire mes messages'], reply: "Lecture du dernier message." },
            read_from: { phrases: ['lire les messages de', 'lire de'], reply: "Vérification des messages." },
            add_contact: { phrases: ['ajouter un contact', 'nouveau contact', 'enregistrer le contact'], reply: "Ouverture d'ajouter un contact." },
            edit_contact: { phrases: ['modifier le contact', 'changer le contact'], reply: "Vérification du contact à modifier." },
            delete_contact: { phrases: ['supprimer le contact', 'enlever le contact'], reply: "Suppression du contact." },
            star_contact: { phrases: ['mettre en favori le contact', 'contact favori'], reply: "Mise en favori du contact." },
            open_chat: { phrases: ['ouvrir le chat', 'démarrer une discussion', 'discuter avec'], reply: "Ouverture du chat." },
            reply: { phrases: ['répondre'], reply: "Préparation d'une réponse." },
            logout: { phrases: ['déconnexion', 'quitter', 'au revoir'], reply: "Vous êtes déconnecté. Au revoir!" },
            stop: { phrases: ['arrêter', 'annuler', 'laisse tomber'], reply: "D'accord, annulé." },
            help: { phrases: ['aide'], reply: "Dites 'Envoyer WhatsApp à' suivi d'un nom de contact, ou 'Lire les derniers messages'." },
            switch_email: { phrases: ['ouvrir email', 'aller à email', 'vérifier le courrier'], reply: "Passage à l'Assistant Email." },
            go_apps: { phrases: ['aller aux applications', 'montrer les applications', 'accueil'], reply: "Ouverture du Sélecteur d'Applis." }
        },
        no_api: "L'API WhatsApp n'est pas encore configurée.",
        no_recent: "Vous n'avez pas de conversations WhatsApp récentes.",
        latest_from: "Le dernier message de {name} dit: {text}",
        latest_sent: "Vous avez récemment envoyé à {name}: {text}",
        did_not_catch_name: "Je n'ai pas compris le nom. Dites 'lire les messages de' suivi d'un contact.",
        latest_with: "Le dernier message avec {name} est: {text}",
        no_recent_from: "Je n'ai pas trouvé de messages récents de {name}.",
        who_edit: "Qui voulez-vous modifier?",
        open_edit_for: "Ouverture de modifier contact pour {name}.",
        contact_not_found: "Je n'ai pas trouvé de contact nommé {name}.",
        who_delete: "Qui voulez-vous supprimer?",
        deleting_contact: "Suppression du contact {name}.",
        who_star: "Qui voulez-vous mettre en favori?",
        starring_contact: "Mise en favori du contact {name}.",
        who_chat: "Avec qui voulez-vous ouvrir un chat?",
        open_chat_for: "Ouverture du chat avec {name}.",
        open_compose_reply: "Ouverture de la composition vocale pour répondre.",
        no_active_conv: "Il n'y a pas de conversation active à laquelle répondre.",
        open_compose_reply_to: "Ouverture de la composition vocale pour répondre à {name}.",
        did_not_understand: "Je n'ai pas compris. Vous pouvez dire 'Envoyer WhatsApp'.",
        did_not_catch: "Désolé, je n'ai pas compris cela.",
        not_supported: "La reconnaissance vocale n'est pas supportée dans ce navigateur.",
        tap_mic: "Appuyez sur le micro et dites une commande",
        listening: "Écoute...",
        ready: "Prêt",
        not_configured: "Non configuré",
        processing: "Traitement...",
        speaking: "Parle...",
        tap_speak: "Appuyer & Parler"
    },
    'bn-IN': {
        cmds: {
            compose: { phrases: ['হোয়াটসঅ্যাপ পাঠান', 'বার্তা পাঠান', 'হোয়াটসঅ্যাপ', 'নতুন বার্তা'], reply: "হোয়াটসঅ্যাপ বার্তা প্রস্তুত করা হচ্ছে।" },
            compose_media: { phrases: ['ছবি পাঠান', 'মিডিয়া পাঠান'], reply: "মিডিয়া বার্তা প্রস্তুত করা হচ্ছে।" },
            read_latest: { phrases: ['পড়ুন', 'সর্বশেষ পড়ুন', 'আমার বার্তা পড়ুন'], reply: "সর্বশেষ বার্তা পড়া হচ্ছে।" },
            read_from: { phrases: ['এর থেকে বার্তা পড়ুন', 'থেকে পড়ুন'], reply: "বার্তা চেক করা হচ্ছে।" },
            add_contact: { phrases: ['যোগাযোগ যোগ করুন', 'নতুন যোগাযোগ', 'যোগাযোগ সংরক্ষণ করুন'], reply: "যোগাযোগ যোগ খোলা হচ্ছে।" },
            edit_contact: { phrases: ['যোগাযোগ সম্পাদনা করুন', 'যোগাযোগ পরিবর্তন করুন'], reply: "সম্পাদনা করার জন্য যোগাযোগ চেক করা হচ্ছে।" },
            delete_contact: { phrases: ['যোগাযোগ মুছুন'], reply: "যোগাযোগ মোছা হচ্ছে।" },
            star_contact: { phrases: ['যোগাযোগ তারকাচিহ্নিত করুন', 'প্রিয় যোগাযোগ'], reply: "যোগাযোগ তারকাচিহ্নিত করা হচ্ছে।" },
            open_chat: { phrases: ['চ্যাট খুলুন', 'কথা শুরু করুন', 'এর সাথে কথা বলুন'], reply: "চ্যাট খোলা হচ্ছে।" },
            reply: { phrases: ['উত্তর দিন', 'জবাব দিন'], reply: "একটি উত্তর প্রস্তুত করা হচ্ছে।" },
            logout: { phrases: ['লগআউট', 'প্রস্থান করুন', 'বিদায়'], reply: "লগ আউট করা হচ্ছে। বিদায়!" },
            stop: { phrases: ['থামুন', 'বাতিল করুন', 'থাক'], reply: "ঠিক আছে, বাতিল করা হয়েছে।" },
            help: { phrases: ['সাহায্য'], reply: "'হোয়াটসঅ্যাপ পাঠান এর কাছে' বলে যোগাযোগের নাম বলুন, বা 'সর্বশেষ বার্তা পড়ুন' বলুন।" },
            switch_email: { phrases: ['ইমেইল খুলুন', 'ইমেইলে যান', 'ইমেইল চেক করুন'], reply: "ইমেইল অ্যাসিস্ট্যান্টে স্যুইচ করা হচ্ছে।" },
            go_apps: { phrases: ['অ্যাপে যান', 'অ্যাপ দেখান', 'হোম'], reply: "অ্যাপ সিলেক্টর খোলা হচ্ছে।" }
        },
        no_api: "হোয়াটসঅ্যাপ এপিআই এখনও কনফিগার করা হয়নি।",
        no_recent: "আপনার সাম্প্রতিক কোন হোয়াটসঅ্যাপ কথোপকথন নেই।",
        latest_from: "{name} এর সর্বশেষ বার্তাটি হলো: {text}",
        latest_sent: "আপনি সম্প্রতি {name} কে পাঠিয়েছেন: {text}",
        did_not_catch_name: "আমি নামটি বুঝতে পারিনি। 'এর থেকে বার্তা পড়ুন' বলে একটি যোগাযোগ বলুন।",
        latest_with: "{name} এর সাথে সর্বশেষ বার্তাটি হলো: {text}",
        no_recent_from: "আমি {name} এর থেকে সাম্প্রতিক কোন বার্তা পাইনি।",
        who_edit: "আপনি কাকে সম্পাদনা করতে চান?",
        open_edit_for: "{name} এর জন্য সম্পাদনা যোগাযোগ খোলা হচ্ছে।",
        contact_not_found: "আমি {name} নামের কোন যোগাযোগ পাইনি।",
        who_delete: "আপনি কাকে মুছতে চান?",
        deleting_contact: "যোগাযোগ {name} মোছা হচ্ছে।",
        who_star: "আপনি কাকে তারকাচিহ্নিত করতে চান?",
        starring_contact: "যোগাযোগ {name} তারকাচিহ্নিত করা হচ্ছে।",
        who_chat: "আপনি কার সাথে চ্যাট খুলতে চান?",
        open_chat_for: "{name} এর সাথে চ্যাট খোলা হচ্ছে।",
        open_compose_reply: "উত্তর দিতে ভয়েস কম্পোজ খোলা হচ্ছে।",
        no_active_conv: "উত্তর দেওয়ার জন্য কোন সক্রিয় কথোপকথন নেই।",
        open_compose_reply_to: "{name} কে উত্তর দিতে ভয়েস কম্পোজ খোলা হচ্ছে।",
        did_not_understand: "আমি বুঝতে পারিনি। আপনি 'হোয়াটসঅ্যাপ পাঠান' বলতে পারেন।",
        did_not_catch: "দুঃখিত, আমি বুঝতে পারিনি।",
        not_supported: "এই ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয়।",
        tap_mic: "মাইকে আলতো চাপুন এবং একটি কমান্ড বলুন",
        listening: "শুনছি...",
        ready: "প্রস্তুত",
        not_configured: "কনফিগার করা নেই",
        processing: "প্রক্রিয়াজাত করা হচ্ছে...",
        speaking: "বলছি...",
        tap_speak: "ট্যাপ করুন এবং কথা বলুন"
    },
    'ta-IN': {
        cmds: {
            compose: { phrases: ['வாட்ஸ்அப் அனுப்பு', 'செய்தி அனுப்பு', 'வாட்ஸ்அப்', 'புதிய செய்தி'], reply: "வாட்ஸ்அப் செய்தியை தயார் செய்கிறது." },
            compose_media: { phrases: ['படம் அனுப்பு', 'புகைப்படம் அனுப்பு'], reply: "புகைப்பட செய்தியை தயார் செய்கிறது." },
            read_latest: { phrases: ['படிக்கவும்', 'சமீபத்தியதை படி', 'என் செய்திகளை படி'], reply: "சமீபத்திய செய்தியைப் படிக்கிறது." },
            read_from: { phrases: ['இடமிருந்து செய்திகளைப் படி', 'இடமிருந்து படி'], reply: "செய்திகளை சரிபார்க்கிறது." },
            add_contact: { phrases: ['தொடர்பைச் சேர்', 'புதிய தொடர்பு', 'தொடர்பை சேமி'], reply: "புதிய தொடர்பை சேர்ப்பதைத் திறக்கிறது." },
            edit_contact: { phrases: ['தொடர்பை திருத்து', 'தொடர்பை மாற்று'], reply: "திருத்தத் தொடர்பை சரிபார்க்கிறது." },
            delete_contact: { phrases: ['தொடர்பை நீக்கு', 'தொடர்பை அழி'], reply: "தொடர்பை நீக்குகிறது." },
            star_contact: { phrases: ['தொடர்பை நட்சத்திரமிடு', 'பிடித்த தொடர்பு'], reply: "தொடர்பை நட்சத்திரமிடுகிறது." },
            open_chat: { phrases: ['அரட்டையைத் திற', 'பேச ஆரம்பி', 'உடன் பேசு'], reply: "அரட்டையை திறக்கிறது." },
            reply: { phrases: ['பதிலளி', 'பதில் சொல்'], reply: "பதிலை தயார் செய்கிறது." },
            logout: { phrases: ['வெளியேறு', 'விடைபெறு'], reply: "வெளியேறுகிறது. விடைபெறுகிறேன்!" },
            stop: { phrases: ['நிறுத்து', 'ரத்துசெய்', 'பரவாயில்லை'], reply: "சரி, ரத்து செய்யப்பட்டது." },
            help: { phrases: ['உதவி'], reply: "'வாட்ஸ்அப் அனுப்பு' என்று சொல்லி பெயரைக் கூறுங்கள், அல்லது 'சமீபத்திய செய்திகளைப் படி' என்று சொல்லுங்கள்." },
            switch_email: { phrases: ['மின்னஞ்சலைத் திற', 'மின்னஞ்சலுக்குச் செல்', 'மின்னஞ்சலைச் சரிபார்'], reply: "மின்னஞ்சல் உதவியாளருக்கு மாறுகிறது." },
            go_apps: { phrases: ['செயலிகளுக்குச் செல்', 'செயலிகளைக் காட்டு', 'முகப்பு'], reply: "செயலி தேர்வு திறக்கிறது." }
        },
        no_api: "வாட்ஸ்அப் API இன்னும் கட்டமைக்கப்படவில்லை.",
        no_recent: "உங்களுக்கு சமீபத்திய வாட்ஸ்அப் உரையாடல்கள் எதுவும் இல்லை.",
        latest_from: "{name} இன் சமீபத்திய செய்தி: {text}",
        latest_sent: "நீங்கள் சமீபத்தில் {name} க்கு அனுப்பியுள்ளீர்கள்: {text}",
        did_not_catch_name: "பெயர் எனக்குப் புரியவில்லை. 'இடமிருந்து செய்திகளைப் படி' என்று ஒரு பெயரைத் சொல்லுங்கள்.",
        latest_with: "{name} உடனான சமீபத்திய செய்தி: {text}",
        no_recent_from: "{name} இடமிருந்து சமீபத்திய செய்திகள் எதுவும் கிடைக்கவில்லை.",
        who_edit: "யாரை திருத்த விரும்புகிறீர்கள்?",
        open_edit_for: "{name} க்கான திருத்தத் தொடர்பைத் திறக்கிறது.",
        contact_not_found: "{name} என்ற பெயரில் தொடர்பு இல்லை.",
        who_delete: "யாரை நீக்க விரும்புகிறீர்கள்?",
        deleting_contact: "தொடர்பு {name} ஐ நீக்குகிறது.",
        who_star: "யாரை நட்சத்திரமிட விரும்புகிறீர்கள்?",
        starring_contact: "தொடர்பு {name} ஐ நட்சத்திரமிடுகிறது.",
        who_chat: "யாருடன் அரட்டையைத் திறக்க விரும்புகிறீர்கள்?",
        open_chat_for: "{name} உடன் அரட்டையைத் திறக்கிறது.",
        open_compose_reply: "பதிலளிக்க குரல் மூலம் எழுதுதலை திறக்கிறது.",
        no_active_conv: "பதிலளிக்க செயலில் உள்ள உரையாடல் எதுவும் இல்லை.",
        open_compose_reply_to: "{name} க்கு பதிலளிக்க குரல் மூலம் எழுதுதலை திறக்கிறது.",
        did_not_understand: "எனக்குப் புரியவில்லை. நீங்கள் 'வாட்ஸ்அப் அனுப்பு' என்று சொல்லலாம்.",
        did_not_catch: "மன்னிக்கவும், எனக்குப் புரியவில்லை.",
        not_supported: "இந்த உலாவியில் பேச்சு அறிதல் ஆதரிக்கப்படவில்லை.",
        tap_mic: "மைக்கை தட்டி ஒரு கட்டளையைச் சொல்லுங்கள்",
        listening: "கேட்கிறது...",
        ready: "தயார்",
        not_configured: "அமைக்கப்படவில்லை",
        processing: "செயலாக்குகிறது...",
        speaking: "பேசுகிறது...",
        tap_speak: "தட்டிப் பேசுங்கள்"
    },
    'te-IN': {
        cmds: {
            compose: { phrases: ['వాట్సాప్ పంపు', 'సందేశం పంపు', 'వాట్సాప్', 'కొత్త సందేశం'], reply: "వాట్సాప్ సందేశం సిద్ధం చేస్తున్నాను." },
            compose_media: { phrases: ['చిత్రం పంపు', 'ఫోటో పంపు'], reply: "మీడియా సందేశం సిద్ధం చేస్తున్నాను." },
            read_latest: { phrases: ['చదువు', 'తాజా చదువు', 'నా సందేశాలు చదువు'], reply: "తాజా సందేశం చదువుతున్నాను." },
            read_from: { phrases: ['నుండి సందేశాలు చదువు', 'నుండి చదువు'], reply: "సందేశాలను తనిఖీ చేస్తున్నాను." },
            add_contact: { phrases: ['పరిచయం జోడించు', 'కొత్త పరిచయం', 'పరిచయం సేవ్ చేయి'], reply: "కొత్త పరిచయం జోడించడం తెరుస్తున్నాను." },
            edit_contact: { phrases: ['పరిచయం సవరించు', 'పరిచయం మార్చు'], reply: "సవరించడానికి పరిచయం తనిఖీ చేస్తున్నాను." },
            delete_contact: { phrases: ['పరిచయం తొలగించు'], reply: "పరిచయం తొలగిస్తున్నాను." },
            star_contact: { phrases: ['పరిచయం నక్షత్రం చేయి', 'ఇష్టమైన పరిచయం'], reply: "పరిచయం నక్షత్రం చేస్తున్నాను." },
            open_chat: { phrases: ['చాట్ తెరువు', 'సంభాషణ ప్రారంభించు', 'తో చాట్ చేయి'], reply: "చాట్ తెరుస్తున్నాను." },
            reply: { phrases: ['ప్రత్యుత్తరం ఇవ్వు', 'జవాబు చెప్పు'], reply: "ప్రత్యుత్తరం సిద్ధం చేస్తున్నాను." },
            logout: { phrases: ['లాగౌట్', 'బయటకు వెళ్లు', 'వీడ్కోలు'], reply: "లాగౌట్ చేస్తున్నాను. వీడ్కోలు!" },
            stop: { phrases: ['ఆపు', 'రద్దు చేయి', 'పర్వాలేదు'], reply: "సరే, రద్దు చేయబడింది." },
            help: { phrases: ['సహాయం'], reply: "'వాట్సాప్ పంపు' అని చెప్పి పేరు చెప్పండి, లేదా 'తాజా సందేశాలు చదువు' అని చెప్పండి." },
            switch_email: { phrases: ['ఈమెయిల్ తెరువు', 'ఈమెయిల్‌కు వెళ్ళు', 'ఈమెయిల్ తనిఖీ చేయి'], reply: "ఈమెయిల్ అసిస్టెంట్‌కు మారుస్తున్నాను." },
            go_apps: { phrases: ['యాప్‌లకు వెళ్ళు', 'యాప్‌లు చూపించు', 'హోమ్'], reply: "యాప్ సెలెక్టర్ తెరుస్తున్నాను." }
        },
        no_api: "వాట్సాప్ API ఇంకా కాన్ఫిగర్ చేయబడలేదు.",
        no_recent: "మీకు తాజా వాట్సాప్ సంభాషణలు ఏవీ లేవు.",
        latest_from: "{name} తాజా సందేశం: {text}",
        latest_sent: "మీరు ఇటీవల {name} కి పంపారు: {text}",
        did_not_catch_name: "నాకు పేరు వినబడలేదు. 'నుండి సందేశాలు చదువు' అని పేరు చెప్పండి.",
        latest_with: "{name} తో తాజా సందేశం: {text}",
        no_recent_from: "{name} నుండి నాకు తాజా సందేశాలు ఏవీ కనుగొనబడలేదు.",
        who_edit: "మీరు ఎవరిని సవరించాలనుకుంటున్నారు?",
        open_edit_for: "{name} కోసం సవరణ పరిచయం తెరుస్తున్నాను.",
        contact_not_found: "{name} అనే పేరుతో పరిచయం లేదు.",
        who_delete: "మీరు ఎవరిని తొలగించాలనుకుంటున్నారు?",
        deleting_contact: "పరిచయం {name} నీ తొలగిస్తున్నాను.",
        who_star: "మీరు ఎవరిని నక్షత్రం చేయాలనుకుంటున్నారు?",
        starring_contact: "పరిచయం {name} నీ నక్షత్రం చేస్తున్నాను.",
        who_chat: "మీరు ఎవరితో చాట్ తెరవాలనుకుంటున్నారు?",
        open_chat_for: "{name} తో చాట్ తెరుస్తున్నాను.",
        open_compose_reply: "ప్రత్యుత్తరం ఇవ్వడానికి వాయిస్ కంపోజ్ తెరుస్తున్నాను.",
        no_active_conv: "ప్రత్యుత్తరం ఇవ్వడానికి సక్రియ సంభాషణ ఏదీ లేదు.",
        open_compose_reply_to: "{name} కి ప్రత్యుత్తరం ఇవ్వడానికి వాయిస్ కంపోజ్ తెరుస్తున్నాను.",
        did_not_understand: "నాకు అర్థం కాలేదు. మీరు 'వాట్సాప్ పంపు' అని చెప్పవచ్చు.",
        did_not_catch: "క్షమించండి, నాకు అర్థం కాలేదు.",
        not_supported: "స్పీచ్ రికగ్నిషన్ ఈ బ్రౌజర్‌లో మద్దతు లేదు.",
        tap_mic: "మైక్‌ను నొక్కి ఆదేశం చెప్పండి",
        listening: "వింటున్నాను...",
        ready: "సిద్ధం",
        not_configured: "కాన్ఫిగర్ చేయబడలేదు",
        processing: "ప్రాసెస్ చేయబడుతోంది...",
        speaking: "మాట్లాడుతున్నాను...",
        tap_speak: "నొక్కండి & మాట్లాడండి"
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

const COMMAND_KEYS = [
    'compose', 'compose_media', 'read_latest', 'read_from',
    'add_contact', 'edit_contact', 'delete_contact', 'star_contact',
    'open_chat', 'reply', 'logout', 'stop', 'mute_assist', 'unmute_assist', 'help', 'switch_email', 'go_apps'
];

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;


const VoiceWhatsAppOverlay = ({ user, onLogout, configured, onGoApps, onSwitchEmail, onCompose, onAddContact, onEditContact, onDeleteContact, onStarContact, onOpenChat, onSendVoiceMessage, contacts = [], conversations = [], activeContact = null, messages = [], autoListen = true, isVoiceComposeActive = false, isMuted, setIsMuted }) => {
    const { lang } = useLang();
    const userLang = lang || 'en-US';
    const t = getT(userLang);

    const COMMANDS = COMMAND_KEYS.map(key => ({
        action: key,
        phrases: t.cmds[key]?.phrases || TRANSLATIONS['en-US'].cmds[key].phrases,
        reply: t.cmds[key]?.reply || TRANSLATIONS['en-US'].cmds[key].reply
    }));

    const [assistantState, setAssistantState] = useState('idle');
    const [transcript, setTranscript] = useState('');
    const [assistantReply, setAssistantReply] = useState(t.tap_mic);
    const [isListening, setIsListening] = useState(false);

    // Auto-listen state
    const [autoListeningEnabled, setAutoListeningEnabled] = useState(false);
    const recognitionRef = useRef(null);
    const busyRef = useRef(false);
    const autoListenTimeoutRef = useRef(null);
    const autoListenRef = useRef(autoListeningEnabled);
    autoListenRef.current = autoListeningEnabled;
    const startAutoListeningRef = useRef(null);
    const pendingActionRef = useRef(null);

    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            window.speechSynthesis?.cancel();
            if (autoListenTimeoutRef.current) clearTimeout(autoListenTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (autoListen) {
            autoListenTimeoutRef.current = setTimeout(() => {
                setAutoListeningEnabled(true);
            }, 1500);
        } else {
            setAutoListeningEnabled(false);
            recognitionRef.current?.abort();
            setIsListening(false);
        }
        return () => {
            if (autoListenTimeoutRef.current) clearTimeout(autoListenTimeoutRef.current);
        }
    }, [autoListen]);

    useEffect(() => {
        if (autoListeningEnabled && !isListening && assistantState === 'idle' && !busyRef.current && !window.speechSynthesis?.speaking && !isVoiceComposeActive) {
            startAutoListeningRef.current?.();
        }
    }, [autoListeningEnabled, isListening, assistantState, isVoiceComposeActive]);

    const isSystemSpeaking = useCallback(() => window.speechSynthesis?.speaking, []);

    const speak = useCallback((text, callback, forceSpeak = false) => {
        if (isMuted && !forceSpeak) {
            if (callback) setTimeout(callback, 200);
            return;
        }

        window.speechSynthesis?.cancel();
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = userLang;
            utter.onend = () => callback && callback();
            utter.onerror = () => callback && callback();
            window.speechSynthesis.speak(utter);
        } else if (callback) {
            setTimeout(callback, 1000);
        }
    }, [userLang, isMuted]);

    const extractContactName = (lowerText, prefixes) => {
        for (let p of prefixes) {
            if (lowerText.includes(p)) {
                let nameStr = lowerText.split(p)[1];
                if (nameStr.includes(' saying ')) nameStr = nameStr.split(' saying ')[0];
                return nameStr.trim();
            }
        }
        return '';
    }

    const startDictation = useCallback((callback) => {
        if (!SpeechRecognitionAPI) {
            speak(t.not_supported, () => setAssistantState('idle'));
            return;
        }

        const rec = new SpeechRecognitionAPI();
        rec.lang = userLang || 'en-US';
        rec.continuous = false;
        rec.interimResults = true;

        rec.onstart = () => { setIsListening(true); setAssistantState('listening'); };
        rec.onresult = (e) => {
            const result = e.results[e.results.length - 1];
            if (result.isFinal) {
                const text = result[0].transcript.trim();
                setTranscript(text);
                setIsListening(false);
                rec.stop();
                callback(text);
            } else {
                setTranscript(result[0].transcript);
            }
        };
        rec.onerror = (err) => {
            setIsListening(false);
            if (err.error === 'not-allowed') {
                setAssistantState('idle');
                if (autoListenRef.current) setTimeout(() => startAutoListeningRef.current?.(), 2000);
            } else if (err.error !== 'aborted') {
                if (autoListenRef.current) {
                    setAssistantState('idle');
                    setTimeout(() => startAutoListeningRef.current?.(), 1000);
                } else {
                    speak(t.did_not_catch, () => setAssistantState('idle'));
                }
            } else {
                setAssistantState('idle');
            }
        };
        rec.onend = () => {
            setIsListening(false);
            if (autoListenRef.current && !busyRef.current && assistantState === 'idle') {
                setTimeout(() => startAutoListeningRef.current?.(), 500);
            }
        };

        if (!isSystemSpeaking()) {
            try {
                rec.start();
                recognitionRef.current = rec;
            } catch (e) {
                console.error("Dictation start error", e);
            }
        } else {
            if (autoListenRef.current) setTimeout(() => startAutoListeningRef.current?.(), 1000);
        }
    }, [isSystemSpeaking, speak]);

    startAutoListeningRef.current = useCallback(() => {
        if (!autoListenRef.current || busyRef.current || isListening || isSystemSpeaking() || isVoiceComposeActive) return;
        startDictation((heard) => {
            if (heard) processCommand(heard);
        });
    }, [isListening, isSystemSpeaking, startDictation, isVoiceComposeActive]);

    const processCommand = useCallback(async (heard) => {
        if (busyRef.current) return;
        busyRef.current = true;

        const lower = heard.toLowerCase().trim();

        setAssistantState('speaking');

        const matched = COMMANDS.find((c) => c.phrases.some((p) => lower.includes(p)));

        if (pendingActionRef.current) {
            const action = pendingActionRef.current;
            
            // If the user says a new command like stop/cancel, abort the pending action
            if (matched && (matched.action === 'stop' || matched.action === 'cancel')) {
                pendingActionRef.current = null;
                speak(t.cmds.stop.reply, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                return;
            }
            // If they didn't say a clear global command, assume it's the requested name
            if (!matched || matched.action === action) {
                pendingActionRef.current = null;
                const foundContact = contacts.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()));
                
                if (!foundContact) {
                    speak(replaceT(t.contact_not_found, { name: heard }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }

                if (action === 'edit_contact') {
                    speak(replaceT(t.open_edit_for, { name: foundContact.name }), () => {
                        busyRef.current = false; setAssistantState('idle'); if (onEditContact) onEditContact(foundContact);
                    });
                } else if (action === 'delete_contact') {
                    speak(replaceT(t.deleting_contact, { name: foundContact.name }), () => {
                        busyRef.current = false; setAssistantState('idle'); if (onDeleteContact) onDeleteContact(foundContact.name);
                    });
                } else if (action === 'star_contact') {
                    speak(replaceT(t.starring_contact, { name: foundContact.name }), () => {
                        busyRef.current = false; setAssistantState('idle'); if (onStarContact) onStarContact(foundContact.name, !foundContact.is_starred);
                    });
                } else if (action === 'open_chat') {
                    speak(replaceT(t.open_chat_for, { name: foundContact.name }), () => {
                        busyRef.current = false; setAssistantState('idle'); if (onOpenChat) onOpenChat(foundContact);
                    });
                } else if (action === 'read_from') {
                    const conv = conversations.find(c => c.contact_name?.toLowerCase().includes(foundContact.name.toLowerCase()));
                    if (conv) {
                        speak(replaceT(t.latest_with, { name: conv.contact_name, text: conv.message_text }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    } else {
                        speak(replaceT(t.no_recent_from, { name: foundContact.name }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    }
                }
                return;
            } else {
                // Was matched to a DIFFERENT global command. Clear pending and just fall through to global match below
                pendingActionRef.current = null;
            }
        }

        if (matched) {
            setAssistantReply(matched.reply);

            if (matched.action === 'compose' || matched.action === 'compose_media') {
                if (!configured) {
                    speak(t.no_api, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }

                speak(matched.reply, () => {
                    busyRef.current = false;
                    setAssistantState('idle');
                    if (onCompose) onCompose();
                });
                return;
            }
            else if (matched.action === 'read_latest') {
                if (conversations.length === 0) {
                    speak(t.no_recent, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                } else {
                    const latest = conversations[0];
                    const msg = latest.direction === 'received'
                        ? replaceT(t.latest_from, { name: latest.contact_name, text: latest.message_text })
                        : replaceT(t.latest_sent, { name: latest.contact_name, text: latest.message_text });
                    speak(msg, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                }
            }
            else if (matched.action === 'read_from') {
                const targetName = extractContactName(lower, t.cmds.read_from.phrases.map(p => p + ' '));
                if (!targetName) {
                    pendingActionRef.current = 'read_from';
                    speak(t.did_not_catch_name, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }
                const conv = conversations.find(c => c.contact_name?.toLowerCase().includes(targetName.toLowerCase()));
                if (conv) {
                    speak(replaceT(t.latest_with, { name: conv.contact_name, text: conv.message_text }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                } else {
                    speak(replaceT(t.no_recent_from, { name: targetName }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                }
            }
            else if (matched.action === 'add_contact') {
                speak(matched.reply, () => {
                    busyRef.current = false;
                    setAssistantState('idle');
                    if (onAddContact) onAddContact();
                });
            }
            else if (matched.action === 'edit_contact') {
                const targetName = extractContactName(lower, t.cmds.edit_contact.phrases.map(p => p + ' '));
                if (!targetName) {
                    pendingActionRef.current = 'edit_contact';
                    speak(t.who_edit, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }
                const foundContact = contacts.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
                if (foundContact) {
                    speak(replaceT(t.open_edit_for, { name: foundContact.name }), () => {
                        busyRef.current = false;
                        setAssistantState('idle');
                        if (onEditContact) onEditContact(foundContact);
                    });
                } else {
                    speak(replaceT(t.contact_not_found, { name: targetName }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                }
            }
            else if (matched.action === 'delete_contact') {
                const targetName = extractContactName(lower, t.cmds.delete_contact.phrases.map(p => p + ' '));
                if (!targetName) {
                    pendingActionRef.current = 'delete_contact';
                    speak(t.who_delete, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }
                const foundContact = contacts.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
                if (foundContact) {
                    speak(replaceT(t.deleting_contact, { name: foundContact.name }), () => {
                        busyRef.current = false;
                        setAssistantState('idle');
                        if (onDeleteContact) onDeleteContact(foundContact.name);
                    });
                } else {
                    speak(replaceT(t.contact_not_found, { name: targetName }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                }
            }
            else if (matched.action === 'star_contact') {
                const targetName = extractContactName(lower, t.cmds.star_contact.phrases.map(p => p + ' '));
                if (!targetName) {
                    pendingActionRef.current = 'star_contact';
                    speak(t.who_star, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }
                const foundContact = contacts.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
                if (foundContact) {
                    speak(replaceT(t.starring_contact, { name: foundContact.name }), () => {
                        busyRef.current = false;
                        setAssistantState('idle');
                        if (onStarContact) onStarContact(foundContact.name, !foundContact.is_starred);
                    });
                } else {
                    speak(replaceT(t.contact_not_found, { name: targetName }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                }
            }
            else if (matched.action === 'open_chat') {
                const targetName = extractContactName(lower, t.cmds.open_chat.phrases.map(p => p + ' '));
                if (!targetName) {
                    pendingActionRef.current = 'open_chat';
                    speak(t.who_chat, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    return;
                }
                const foundContact = contacts.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
                if (foundContact) {
                    speak(replaceT(t.open_chat_for, { name: foundContact.name }), () => {
                        busyRef.current = false;
                        setAssistantState('idle');
                        if (onOpenChat) onOpenChat(foundContact);
                    });
                } else {
                    speak(replaceT(t.contact_not_found, { name: targetName }), () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                }
            }
            else if (matched.action === 'reply') {
                if (!activeContact) {
                    if (conversations.length > 0) {
                        speak(t.open_compose_reply, () => {
                            busyRef.current = false;
                            setAssistantState('idle');
                            if (onCompose) onCompose();
                        });
                    } else {
                        speak(t.no_active_conv, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
                    }
                } else {
                    speak(replaceT(t.open_compose_reply_to, { name: activeContact.name }), () => {
                        busyRef.current = false;
                        setAssistantState('idle');
                        if (onCompose) onCompose();
                    });
                }
            }
            else if (matched.action === 'mute_assist') {
                setIsMuted(true);
                setAssistantReply(matched.reply);
                busyRef.current = false;
                setAssistantState('idle');
            }
            else if (matched.action === 'unmute_assist') {
                setIsMuted(false);
                speak(matched.reply, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); }, true);
            }
            else if (matched.action === 'logout' && onLogout) {
                speak(matched.reply, () => { busyRef.current = false; onLogout(); });
            }
            else if (matched.action === 'switch_email' && onSwitchEmail) {
                speak(matched.reply, () => { busyRef.current = false; onSwitchEmail(); });
            }
            else if (matched.action === 'go_apps' && onGoApps) {
                speak(matched.reply, () => { busyRef.current = false; onGoApps(); });
            }
            else {
                speak(matched.reply, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
            }
        } else if (lower) {
            setAssistantReply(`I heard: "${heard}"`);
            speak(t.did_not_understand, () => { busyRef.current = false; setAssistantState('idle'); if (autoListenRef.current) startAutoListeningRef.current?.(); });
        } else {
            busyRef.current = false;
            setAssistantState('idle');
            if (autoListenRef.current) startAutoListeningRef.current?.();
        }
    }, [configured, conversations, contacts, activeContact, onLogout, speak, startDictation, onSwitchEmail, onGoApps, onCompose, onAddContact, onEditContact, onDeleteContact, onStarContact, onOpenChat, COMMANDS, t]);

    const handleMicClick = () => {
        if (isListening || isSystemSpeaking()) {
            recognitionRef.current?.stop();
            window.speechSynthesis?.cancel();
            setIsListening(false);
            setAutoListeningEnabled(false);
            setAssistantState('idle');
        } else {
            setTranscript('');
            setAssistantReply(t.listening);
            setAutoListeningEnabled(false); // temp disable auto to do manual
            startDictation(processCommand);
        }
    };

    if (isVoiceComposeActive) {
        return null; // Hide overlay entirely when voice compose is active
    }

    return (
        <div className="voice-overlay-container" style={{ pointerEvents: 'none', zIndex: 9999 }}>
            <div className={`glass-panel voice-panel ${autoListeningEnabled ? 'auto-listening-mode' : ''}`} style={{ pointerEvents: 'auto', position: 'fixed', bottom: '2rem', right: '2rem', transition: 'all 0.3s ease', borderTop: '2px solid rgba(37, 211, 102, 0.5)' }}>

                <div className="voice-visualizer">
                    <div className={`orb orb--${assistantState}`} style={assistantState === 'listening' ? { background: 'radial-gradient(circle, #25D366 0%, transparent 70%)', boxShadow: '0 0 40px #25D366' } : {}}>
                        <div className="orb-core" style={{ background: '#25D366', boxShadow: '0 0 20px #25D366' }} />
                        <div className="orb-ring ring-1" style={{ borderColor: '#25D366' }} />
                        <div className="orb-ring ring-2" style={{ borderColor: '#128C7E' }} />
                    </div>
                    <p className="orb-state-label" style={{ color: '#25D366' }}>
                        {assistantState === 'idle' ? (configured ? t.ready : t.not_configured) :
                            assistantState === 'listening' ? t.listening :
                                assistantState === 'processing' ? t.processing : t.speaking}
                    </p>
                </div>

                <div className="voice-text">
                    {transcript && <p className="transcript">"{transcript}"</p>}
                    <p className={`va-reply ${assistantState === 'speaking' ? 'speaking' : ''}`}>{assistantReply}</p>
                </div>

                <div className="va-mic-section">
                    <button
                        className={`va-mic-btn ${isListening ? 'va-mic-active' : ''}`}
                        style={isListening ? { background: '#25D366', color: '#000' } : {}}
                        onClick={handleMicClick}
                        disabled={!configured || assistantState === 'processing' || assistantState === 'speaking'}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        {isListening ? t.listening : t.tap_speak}
                    </button>
                    <button 
                        className="primary-btn" 
                        onClick={() => setIsMuted(m => !m)} 
                        style={{ background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: isMuted ? '#ef4444' : '#fff', border: isMuted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)', flex: 1, padding: '10px' }}
                    >
                        {isMuted ? 'Unmute Assist' : 'Mute Assist'}
                    </button>
                    <button className="primary-btn" onClick={() => onCompose && onCompose()} style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.3)', flex: 1, padding: '10px' }}>
                        Voice Compose
                    </button>
                </div>

                {assistantState === 'idle' && (
                    <div className="demo-commands">
                        <p className="demo-label">Quick commands:</p>
                        <div className="demo-btns">
                            {['Send WhatsApp message', 'Read latest message', 'Read messages from...', 'Switch to Email'].map(cmd => (
                                <button key={cmd} className="demo-cmd" onClick={() => processCommand(cmd)} style={{ borderColor: 'rgba(37, 211, 102, 0.3)' }}>{cmd}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceWhatsAppOverlay;
