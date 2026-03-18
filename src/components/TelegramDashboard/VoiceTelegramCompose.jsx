import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Loader, MessageCircle, Users } from 'lucide-react';
import { telegramApi } from '../../api';
import '../VoiceAssistant/VoiceCompose.css';
import { useLang } from '../../lib/LanguageContext';

const TRANSLATIONS = {
    'en-US': {
        labels: { to: 'contact name', body: 'telegram message' },
        welcome_new: 'Welcome to Telegram Voice Compose. Let me help you write a message.',
        welcome_reply: 'Voice reply activated. Let me help you write the reply.',
        reply_activated: 'Voice reply activated. I will add your words to the message. Ready when you are.',
        welcome_long: 'Welcome to Telegram Voice Compose. I will help you compose securely. Starting with the contact name. There are {count} contacts on your screen. You can say their name or their number.',
        speak_now: 'Now speaking {field}. Say the {field} now.',
        who_message: 'Who do you want to message? You can say a contact name, or say number one, number two, etc.',
        did_not_catch: "Sorry, I didn't catch that. Please try again.",
        say_contact_name: 'Say the contact name.',
        say_message: 'Say the message.',
        contact_not_exist: "Contact number {num} doesn't exist. Please say the name instead.",
        cleared: '{field} cleared. Please say the {field} again.',
        contact_updated: 'Contact updated to {name}. Say "send message" to send or "review" to hear the complete message.',
        got_it_messaging: 'Got it. Messaging {name}. Now please tell me your message.',
        message_recorded: 'Message recorded. Say "send message" to send or "review" to hear the complete message.',
        cancel_compose: 'Cancelled composing message.',
        which_edit: 'Which field would you like to edit? Say contact or message.',
        help_cmd: 'Please say "send message", "review", or "edit".',
        say_new_contact: 'Please say the new contact.',
        say_new_message: 'Please say the new message.',
        cancel_edit: 'Cancelled edit. Say send message or review.',
        help_edit: 'Please say contact or message.',
        review_msg: 'Message to {to}. Message: {body}. Say "send message" to send or "edit" to make changes.',
        closing: 'Closing window.',
        help_error: 'Please say try again, or close window.',
        missing_fields: 'All fields are required. Please fill in the missing fields.',
        sending: 'Sending your message now.',
        sent_success: 'Your message has been sent successfully!',
        send_error: 'Failed to send message: {error}'
    },
    'hi-IN': {
        labels: { to: 'संपर्क का नाम', body: 'टेलीग्राम संदेश' },
        welcome_new: 'टेलीग्राम वॉयस कंपोज़ में आपका स्वागत है। मुझे एक संदेश लिखने में आपकी मदद करने दें।',
        welcome_reply: 'वॉयस रिप्लाई चालू हुआ। मुझे उत्तर लिखने में आपकी मदद करने दें।',
        reply_activated: 'वॉयस रिप्लाई चालू हुआ। मैं आपके शब्द संदेश में जोड़ दूँगा। जब आप तैयार हों, बोलें।',
        welcome_long: 'टेलीग्राम वॉयस कंपोज़ में आपका स्वागत है। मैं आपको सुरक्षित रूप से संदेश लिखने में मदद करूँगा। संपर्क नाम से शुरू करते हैं। आपकी स्क्रीन पर {count} संपर्क हैं। आप उनका नाम या नंबर बोल सकते हैं।',
        speak_now: 'अब {field} बोल रहे हैं। अपना {field} अभी बोलें।',
        who_message: 'आप किसे संदेश देना चाहते हैं? आप संपर्क का नाम बोल सकते हैं, या नंबर एक, नंबर दो बोल सकते हैं।',
        did_not_catch: "क्षमा करें, मैं समझ नहीं सका। कृपया पुनः प्रयास करें।",
        say_contact_name: 'संपर्क का नाम बोलें।',
        say_message: 'संदेश बोलें।',
        contact_not_exist: "संपर्क संख्या {num} मौजूद नहीं है। कृपया इसके बजाय नाम बोलें।",
        cleared: '{field} साफ़ किया गया। कृपया {field} फिर से बोलें।',
        contact_updated: 'संपर्क {name} पर अपडेट किया गया। भेजने के लिए "संदेश भेजें" बोलें या पूरा संदेश सुनने के लिए "समीक्षा" बोलें।',
        got_it_messaging: 'समझ गया। {name} को संदेश भेज रहा हूँ। अब कृपया अपना संदेश बताएँ।',
        message_recorded: 'संदेश दर्ज किया गया। भेजने के लिए "संदेश भेजें" बोलें या पूरा संदेश सुनने के लिए "समीक्षा" बोलें।',
        cancel_compose: 'संदेश लिखना रद्द कर दिया गया।',
        which_edit: 'आप किस फ़ील्ड को संपादित करना चाहते हैं? संपर्क या संदेश बोलें।',
        help_cmd: 'कृपया "संदेश भेजें", "समीक्षा" या "संपादित करें" बोलें।',
        say_new_contact: 'कृपया नया संपर्क बोलें।',
        say_new_message: 'कृपया नया संदेश बोलें।',
        cancel_edit: 'संपादन रद्द कर दिया गया। संदेश भेजें या समीक्षा बोलें।',
        help_edit: 'कृपया संपर्क या संदेश बोलें।',
        review_msg: '{to} को संदेश। संदेश: {body}। भेजने के लिए "संदेश भेजें" बोलें या बदलाव के लिए "संपादित करें" बोलें।',
        closing: 'विंडो बंद कर रहा हूँ।',
        help_error: 'कृपया पुनः प्रयास करें या विंडो बंद करें बोलें।',
        missing_fields: 'सभी फ़ील्ड आवश्यक हैं। कृपया छूटे हुए फ़ील्ड भरें।',
        sending: 'आपका संदेश अभी भेजा जा रहा है।',
        sent_success: 'आपका संदेश सफलतापूर्वक भेजा गया!',
        send_error: 'संदेश भेजने में विफल: {error}'
    },
    'es-ES': {
        labels: { to: 'nombre del contacto', body: 'mensaje de telegram' },
        welcome_new: 'Bienvenido a Telegram Composición por Voz. Déjame ayudarte a escribir un mensaje.',
        welcome_reply: 'Respuesta por voz activada. Déjame ayudarte a escribir la respuesta.',
        reply_activated: 'Respuesta por voz activada. Agregaré tus palabras al mensaje. Listo cuando tú lo estés.',
        welcome_long: 'Bienvenido a Composición por Voz de Telegram. Te ayudaré a redactar de forma segura. Empezando por el nombre del contacto. Hay {count} contactos en tu pantalla. Puedes decir su nombre o su número.',
        speak_now: 'Hablando de {field}. Di el {field} ahora.',
        who_message: '¿A quién quieres enviar un mensaje? Puedes decir el nombre del contacto, o decir número uno, número dos, etc.',
        did_not_catch: "Lo siento, no entendí eso. Por favor, inténtalo de nuevo.",
        say_contact_name: 'Di el nombre del contacto.',
        say_message: 'Di el mensaje.',
        contact_not_exist: "El contacto número {num} no existe. Por favor, di el nombre en su lugar.",
        cleared: '{field} borrado. Por favor, di el {field} de nuevo.',
        contact_updated: 'Contacto actualizado a {name}. Di "enviar mensaje" para enviarlo o "revisar" para escuchar el mensaje completo.',
        got_it_messaging: 'Entendido. Mensajeando a {name}. Ahora, por favor, dime tu mensaje.',
        message_recorded: 'Mensaje grabado. Di "enviar mensaje" para enviarlo o "revisar" para escuchar el mensaje completo.',
        cancel_compose: 'Composición del mensaje cancelada.',
        which_edit: '¿Qué campo te gustaría editar? Di contacto o mensaje.',
        help_cmd: 'Por favor di "enviar mensaje", "revisar", o "editar".',
        say_new_contact: 'Por favor, di el nuevo contacto.',
        say_new_message: 'Por favor, di el nuevo mensaje.',
        cancel_edit: 'Edición cancelada. Di enviar mensaje o revisar.',
        help_edit: 'Por favor, di contacto o mensaje.',
        review_msg: 'Mensaje a {to}. Mensaje: {body}. Di "enviar mensaje" para enviarlo o "editar" para hacer cambios.',
        closing: 'Cerrando ventana.',
        help_error: 'Por favor, di intentarlo de nuevo, o cerrar ventana.',
        missing_fields: 'Todos los campos son obligatorios. Por favor, completa los campos que faltan.',
        sending: 'Enviando tu mensaje ahora.',
        sent_success: '¡Tu mensaje se ha enviado correctamente!',
        send_error: 'Error al enviar el mensaje: {error}'
    },
    'fr-FR': {
        labels: { to: 'nom du contact', body: 'message telegram' },
        welcome_new: 'Bienvenue dans la Composition Vocale Telegram. Laissez-moi vous aider à écrire un message.',
        welcome_reply: 'Réponse vocale activée. Laissez-moi vous aider à écrire la réponse.',
        reply_activated: 'Réponse vocale activée. J\'ajouterai vos mots au message. Prêt quand vous l\'êtes.',
        welcome_long: 'Bienvenue dans la Composition Vocale Telegram. Je vais vous aider à composer en toute sécurité. En commençant par le nom du contact. Il y a {count} contacts sur votre écran. Vous pouvez dire leur nom ou leur numéro.',
        speak_now: 'Vous parlez de {field}. Dites le {field} maintenant.',
        who_message: 'À qui voulez-vous envoyer un message? Vous pouvez dire un nom de contact, ou dire numéro un, numéro deux, etc.',
        did_not_catch: "Désolé, je n'ai pas compris. Veuillez réessayer.",
        say_contact_name: 'Dites le nom du contact.',
        say_message: 'Dites le message.',
        contact_not_exist: "Le numéro de contact {num} n'existe pas. Veuillez plutôt dire le nom.",
        cleared: '{field} effacé. Veuillez redire le {field}.',
        contact_updated: 'Contact mis à jour à {name}. Dites "envoyer le message" pour envoyer ou "réviser" pour entendre le message complet.',
        got_it_messaging: 'Compris. Message à {name}. Maintenant, veuillez me dicter votre message.',
        message_recorded: 'Message enregistré. Dites "envoyer le message" pour envoyer ou "réviser" pour entendre le message complet.',
        cancel_compose: 'Composition du message annulée.',
        which_edit: 'Quel champ souhaitez-vous modifier? Dites contact ou message.',
        help_cmd: 'Veuillez dire "envoyer le message", "réviser" ou "modifier".',
        say_new_contact: 'Veuillez dire le nouveau contact.',
        say_new_message: 'Veuillez dire le nouveau message.',
        cancel_edit: 'Modification annulée. Dites envoyer le message ou réviser.',
        help_edit: 'Veuillez dire contact ou message.',
        review_msg: 'Message à {to}. Message: {body}. Dites "envoyer le message" pour envoyer ou "modifier" pour faire des changements.',
        closing: 'Fermeture de la fenêtre.',
        help_error: 'Veuillez dire réessayer, ou fermer la fenêtre.',
        missing_fields: 'Tous les champs sont obligatoires. Veuillez remplir les champs manquants.',
        sending: 'Envoi de votre message en cours.',
        sent_success: 'Votre message a été envoyé avec succès!',
        send_error: 'Échec de l\'envoi du message: {error}'
    },
    'bn-IN': {
        labels: { to: 'যোগাযোগের নাম', body: 'টেলিগ্রাম বার্তা' },
        welcome_new: 'টেলিগ্রাম ভয়েস কম্পোজে স্বাগতম। আমাকে একটি বার্তা লিখতে সাহায্য করতে দিন।',
        welcome_reply: 'ভয়েস উত্তর সক্রিয় করা হয়েছে। আমাকে উত্তরটি লিখতে সাহায্য করতে দিন।',
        reply_activated: 'ভয়েস উত্তর সক্রিয় করা হয়েছে। আমি আপনার কথাগুলো বার্তায় যোগ করব। আপনি প্রস্তুত হলে বলুন।',
        welcome_long: 'টেলিগ্রাম ভয়েস কম্পোজে স্বাগতম। আমি আপনাকে নিরাপদে বার্তা লিখতে সাহায্য করব। যোগাযোগের নাম দিয়ে শুরু করছি। আপনার স্ক্রিনে {count}টি যোগাযোগ আছে। আপনি তাদের নাম বা তাদের নম্বর বলতে পারেন।',
        speak_now: 'এখন {field} বলছেন। এখন {field} বলুন।',
        who_message: 'আপনি কাকে বার্তা পাঠাতে চান? আপনি একটি যোগাযোগের নাম বলতে পারেন, অথবা বলতে পারেন নম্বর এক, নম্বর দুই ইত্যাদি।',
        did_not_catch: "দুঃখিত, আমি বুঝতে পারিনি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        say_contact_name: 'যোগাযোগের নামটি বলুন।',
        say_message: 'বার্তাটি বলুন।',
        contact_not_exist: "যোগাযোগ নম্বর {num} বিদ্যমান নেই। অনুগ্রহ করে এর পরিবর্তে নামটি বলুন।",
        cleared: '{field} মুছে ফেলা হয়েছে। অনুগ্রহ করে আবার {field} বলুন।',
        contact_updated: 'যোগাযোগ {name} এ আপডেট করা হয়েছে। পাঠাতে "বার্তা পাঠান" বলুন বা সম্পূর্ণ বার্তাটি শুনতে "পর্যালোচনা" বলুন।',
        got_it_messaging: 'বুঝেছি। {name} কে বার্তা পাঠানো হচ্ছে। এখন অনুগ্রহ করে আমাকে আপনার বার্তাটি বলুন।',
        message_recorded: 'বার্তা রেকর্ড করা হয়েছে। পাঠাতে "বার্তা পাঠান" বলুন বা সম্পূর্ণ বার্তাটি শুনতে "পর্যালোচনা" বলুন।',
        cancel_compose: 'বার্তা লেখা বাতিল করা হয়েছে।',
        which_edit: 'আপনি কোন ক্ষেত্রটি সম্পাদনা করতে চান? যোগাযোগ বা বার্তা বলুন।',
        help_cmd: 'অনুগ্রহ করে "বার্তা পাঠান", "পর্যালোচনা" বা "সম্পাদনা" বলুন।',
        say_new_contact: 'অনুগ্রহ করে নতুন যোগাযোগটি বলুন।',
        say_new_message: 'অনুগ্রহ করে নতুন বার্তাটি বলুন।',
        cancel_edit: 'সম্পাদনা বাতিল করা হয়েছে। বার্তা পাঠান বা পর্যালোচনা বলুন।',
        help_edit: 'অনুগ্রহ করে যোগাযোগ বা বার্তা বলুন।',
        review_msg: '{to} কে বার্তা। বার্তা: {body}। পাঠাতে "বার্তা পাঠান" বলুন বা পরিবর্তন করতে "সম্পাদনা" বলুন।',
        closing: 'উইন্ডো বন্ধ করা হচ্ছে।',
        help_error: 'অনুগ্রহ করে আবার চেষ্টা করুন, বা উইন্ডো বন্ধ করুন বলুন।',
        missing_fields: 'সমস্ত ক্ষেত্র আবশ্যক। অনুগ্রহ করে অনুপস্থিত ক্ষেত্রগুলো পূরণ করুন।',
        sending: 'আপনার বার্তাটি এখন পাঠানো হচ্ছে।',
        sent_success: 'আপনার বার্তাটি সফলভাবে পাঠানো হয়েছে!',
        send_error: 'বার্তা পাঠাতে ব্যর্থ হয়েছে: {error}'
    },
    'ta-IN': {
        labels: { to: 'தொடர்பு பெயர்', body: 'டெலிகிராம் செய்தி' },
        welcome_new: 'டெலிகிராம் குரல் மூலம் செய்தியமைக்க வரவேற்கிறோம். ஒரு செய்தியை எழுத நான் உங்களுக்கு உதவுகிறேன்.',
        welcome_reply: 'குரல் பதில் இயக்கப்பட்டது. பதிலை எழுத நான் உங்களுக்கு உதவுகிறேன்.',
        reply_activated: 'குரல் பதில் இயக்கப்பட்டது. உங்கள் வார்த்தைகளை செய்தியில் சேர்ப்பேன். நீங்கள் தயாரானதும் கூறவும்.',
        welcome_long: 'டெலிகிராம் குரல் மூலம் செய்தியமைக்க வரவேற்கிறோம். நான் உங்களுக்குப் பாதுகாப்பாக செய்தியெழுத உதவுவேன். தொடர்பு பெயரில் இருந்து தொடங்கலாம். உங்கள் திரையில் {count} தொடர்புகள் உள்ளன. நீங்கள் அவர்களின் பெயரை அல்லது அவர்களின் எண்ணைக் கூறலாம்.',
        speak_now: 'இப்போது {field} சொல்லப்படுகிறது. இப்போது {field}-ஐக் கூறவும்.',
        who_message: 'நீங்கள் யாருக்குச் செய்தி அனுப்ப விரும்புகிறீர்கள்? நீங்கள் ஒரு தொடர்புப் பெயரைக் கூறலாம் அல்லது எண் ஒன்று, எண் இரண்டு போன்றவற்றைக் கூறலாம்.',
        did_not_catch: "மன்னிக்கவும், எனக்குப் புரியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        say_contact_name: 'தொடர்புப் பெயரைக் கூறவும்.',
        say_message: 'செய்தியைக் கூறவும்.',
        contact_not_exist: "தொடர்பு எண் {num} இல்லை. அதற்குப் பதிலாகப் பெயரைக் கூறவும்.",
        cleared: '{field} அழிக்கப்பட்டது. மீண்டும் {field}-ஐக் கூறவும்.',
        contact_updated: 'தொடர்பு {name}-க்கு புதுப்பிக்கப்பட்டது. அனுப்ப "செய்தியை அனுப்பு" என்று கூறவும் அல்லது முழுச் செய்தியையும் கேட்க "மதிப்பாய்வு" என்று கூறவும்.',
        got_it_messaging: 'புரிந்தது. {name}-க்கு செய்தி அனுப்பப்படுகிறது. இப்போது உங்கள் செய்தியைக் கூறவும்.',
        message_recorded: 'செய்தி பதிவு செய்யப்பட்டது. அனுப்ப "செய்தியை அனுப்பு" என்று கூறவும் அல்லது முழுச் செய்தியையும் கேட்க "மதிப்பாய்வு" என்று கூறவும்.',
        cancel_compose: 'செய்தி எழுதுவது ரத்து செய்யப்பட்டது.',
        which_edit: 'எந்தப் புலத்தை நீங்கள் திருத்த விரும்புகிறீர்கள்? தொடர்பு அல்லது செய்தி என்று கூறவும்.',
        help_cmd: 'தயவுசெய்து "செய்தியை அனுப்பு", "மதிப்பாய்வு" அல்லது "திருத்து" என்று கூறவும்.',
        say_new_contact: 'தயவுசெய்து புதிய தொடர்பைக் கூறவும்.',
        say_new_message: 'தயவுசெய்து புதிய செய்தியைக் கூறவும்.',
        cancel_edit: 'திருத்தம் ரத்து செய்யப்பட்டது. செய்தியை அனுப்பு அல்லது மதிப்பாய்வு என்று கூறவும்.',
        help_edit: 'தயவுசெய்து தொடர்பு அல்லது செய்தி என்று கூறவும்.',
        review_msg: '{to}-க்குச் செய்தி. செய்தி: {body}. அனுப்ப "செய்தியை அனுப்பு" என்று கூறவும் அல்லது மாற்றங்களைச் செய்ய "திருத்து" என்று கூறவும்.',
        closing: 'சாளரத்தை மூடுகிறது.',
        help_error: 'மீண்டும் முயற்சிக்கவும் அல்லது சாளரத்தை மூடவும் என்று கூறவும்.',
        missing_fields: 'அனைத்துப் புலங்களும் கட்டாயம். விடுபட்ட புலங்களை நிரப்பவும்.',
        sending: 'உங்கள் செய்தி இப்போது அனுப்பப்படுகிறது.',
        sent_success: 'உங்கள் செய்தி வெற்றிகரமாக அனுப்பப்பட்டது!',
        send_error: 'செய்தியை அனுப்புவதில் தோல்வி: {error}'
    },
    'te-IN': {
        labels: { to: 'కొత్త పరిచయం', body: 'టెలిగ్రామ్ సందేశం' },
        welcome_new: 'టెలిగ్రామ్ వాయిస్ కంపోజ్‌కి స్వాగతం. సందేశం వ్రాయడంలో నేను మీకు సహాయం చేస్తాను.',
        welcome_reply: 'వాయిస్ ప్రత్యుత్తరం సక్రియం చేయబడింది. ప్రత్యుత్తరం వ్రాయడంలో నేను మీకు సహాయం చేస్తాను.',
        reply_activated: 'వాయిస్ ప్రత్యుత్తరం సక్రియం చేయబడింది. నేను మీ పదాలను సందేశానికి జోడిస్తాను. మీరు సిద్ధంగా ఉన్నప్పుడు చెప్పండి.',
        welcome_long: 'వాయిస్ కంపోజ్‌కి స్వాగతం. సురక్షితంగా సందేశం వ్రాయడంలో నేను మీకు సహాయం చేస్తాను. పరిచయం పేరుతో ప్రారంభిద్దాం. మీ స్క్రీన్‌పై {count} పరిచయాలు ఉన్నాయి. మీరు వారి పేరు లేదా వారి సంఖ్యను చెప్పవచ్చు.',
        speak_now: 'ఇప్పుడు {field} మాట్లాడుతున్నారు. ఇప్పుడు {field} చెప్పండి.',
        who_message: 'మీరు ఎవరికి సందేశం పంపాలనుకుంటున్నారు? మీరు పరిచయం పేరును చెప్పవచ్చు, లేదా నంబర్ వన్, నంబర్ టూ అని చెప్పవచ్చు.',
        did_not_catch: "క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
        say_contact_name: 'పరిచయం పేరును చెప్పండి.',
        say_message: 'సందేశాన్ని చెప్పండి.',
        contact_not_exist: "పరిచయం సంఖ్య {num} లేదు. దయచేసి దానికి బదులుగా పేరు చెప్పండి.",
        cleared: '{field} క్లియర్ చేయబడింది. దయచేసి {field}ని మళ్లీ చెప్పండి.',
        contact_updated: 'పరిచయం {name}కి నవీకరించబడింది. పంపడానికి "సందేశాన్ని పంపు" అని చెప్పండి లేదా పూర్తి సందేశాన్ని వినడానికి "పరిశీలించు" అని చెప్పండి.',
        got_it_messaging: 'అర్థమైంది. {name}కి సందేశం పంపుతున్నాను. ఇప్పుడు దయచేసి మీ సందేశాన్ని నాకు చెప్పండి.',
        message_recorded: 'సందేశం రికార్డ్ చేయబడింది. పంపడానికి "సందేశాన్ని పంపు" అని చెప్పండి లేదా పూర్తి సందేశాన్ని వినడానికి "పరిశీలించు" అని చెప్పండి.',
        cancel_compose: 'సందేశం కూర్పు రద్దు చేయబడింది.',
        which_edit: 'మీరు ఏ ఫీల్డ్‌ని సవరించాలనుకుంటున్నారు? పరిచయం లేదా సందేశం అని చెప్పండి.',
        help_cmd: 'దయచేసి "సందేశాన్ని పంపు", "పరిశీలించు" లేదా "సవరించు" అని చెప్పండి.',
        say_new_contact: 'దయచేసి కొత్త పరిచయాన్ని చెప్పండి.',
        say_new_message: 'దయచేసి కొత్త సందేశాన్ని చెప్పండి.',
        cancel_edit: 'సవరణ రద్దు చేయబడింది. సందేశాన్ని పంపు లేదా పరిశీలించు అని చెప్పండి.',
        help_edit: 'దయచేసి పరిచయం లేదా సందేశం అని చెప్పండి.',
        review_msg: '{to} కి సందేశం. సందేశం: {body}. పంపడానికి "సందేశాన్ని పంపు" అని చెప్పండి లేదా మార్పులు చేయడానికి "సవరించు" అని చెప్పండి.',
        closing: 'విండోను మూసివేస్తున్నాను.',
        help_error: 'దయచేసి మళ్లీ ప్రయత్నించండి లేదా విండోను మూసివేయండి అని చెప్పండి.',
        missing_fields: 'అన్ని ఫీల్డ్‌లు అవసరం. దయచేసి తప్పిపోయిన ఫీల్డ్‌లను పూరించండి.',
        sending: 'మీ సందేశాన్ని ఇప్పుడు పంపుతున్నాను.',
        sent_success: 'మీ సందేశం విజయవంతంగా పంపబడింది!',
        send_error: 'సందేశాన్ని పంపడంలో విఫలమైంది: {error}'
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

const VoiceTelegramCompose = ({ user, onClose, onSent, prefill, contacts = [], isMuted = false }) => {
    const { lang } = useLang();
    const userLang = lang || 'en-US';
    const t = getT(userLang);

    const defaultForm = prefill || { to: '', body: '' };
    const [form, setForm] = useState(defaultForm);
    const [status, setStatus] = useState({ type: '', msg: '' });

    const startField = prefill && prefill.to ? 'body' : 'to';
    const [currentField, setCurrentField] = useState(startField);

    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [guidance, setGuidance] = useState(prefill && prefill.to ? t.welcome_reply : t.welcome_new);

    const recognitionRef = useRef(null);
    const formRef = useRef(form);
    const fieldLabels = t.labels;

    const isSystemSpeaking = useCallback(() => {
        return 'speechSynthesis' in window && window.speechSynthesis.speaking;
    }, []);

    useEffect(() => {
        if (prefill && prefill.to) {
            speakGuidance(t.reply_activated, () => {
                setTimeout(() => startFieldListening('body'), 1500);
            });
        } else {
            speakGuidance(replaceT(t.welcome_long, { count: contacts.length }), () => {
                setTimeout(() => startFieldListening('to'), 1500);
            });
        }
    }, [contacts.length]);

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
            utter.onerror = (error) => { setIsSpeaking(false); if (callback) setTimeout(callback, 1200); };
            window.speechSynthesis.speak(utter);
        } else if (callback) {
            setTimeout(callback, 1500);
        }
    }, [isMuted]);

    const startFieldListening = useCallback((field) => {
        if (!SpeechRecognition) return;
        setCurrentField(field);

        let introSpeech = replaceT(t.speak_now, { field: fieldLabels[field] });
        if (field === 'to') {
            introSpeech = t.who_message;
        }
        setGuidance(introSpeech);

        const rec = new SpeechRecognition();
        rec.lang = userLang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;

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
    }, [isSystemSpeaking, contacts]);

    const handleFieldInput = (field, transcript) => {
        let processedText = transcript;
        const lowerTrans = transcript.toLowerCase();

        if (lowerTrans === 'cancel' || lowerTrans === 'stop') {
            speakGuidance(t.cancel_compose, () => {
                onClose();
            });
            return;
        }

        if (lowerTrans.includes('go to contact') || lowerTrans.includes('edit contact') || lowerTrans.includes('change contact') || lowerTrans.includes('go to name') || lowerTrans.includes('edit name')) {
            speakGuidance(t.say_contact_name, () => setTimeout(() => startFieldListening('to'), 1000));
            return;
        }

        if (lowerTrans.includes('go to message') || lowerTrans.includes('edit message') || lowerTrans.includes('change message')) {
            speakGuidance(t.say_message, () => setTimeout(() => startFieldListening('body'), 1000));
            return;
        }

        if (field === 'to') {
            const numMap = { 'first': 1, '1st': 1, 'one': 1, 'number one': 1, '1': 1, 'second': 2, '2nd': 2, 'two': 2, 'number two': 2, '2': 2, 'third': 3, '3rd': 3, 'three': 3, 'number three': 3, '3': 3, 'fourth': 4, '4th': 4, 'four': 4, 'number four': 4, '4': 4, 'fifth': 5, '5th': 5, 'five': 5, 'number five': 5, '5': 5 };
            const match = Object.keys(numMap).find(k => lowerTrans.includes(k));

            if (match) {
                const index = numMap[match] - 1;
                if (contacts[index]) {
                    processedText = contacts[index].name;
                } else {
                    speakGuidance(replaceT(t.contact_not_exist, { num: numMap[match] }), () => startFieldListening('to'));
                    return;
                }
            } else {
                const found = contacts.find(c => lowerTrans.includes(c.name.toLowerCase()));
                if (found) processedText = found.name;
                else processedText = processedText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }

        if (transcript.toLowerCase().includes('clear')) {
            setForm(prev => ({ ...prev, [field]: '' }));
            speakGuidance(replaceT(t.cleared, { field: fieldLabels[field] }), () => {
                setTimeout(() => startFieldListening(field), 2000);
            });
            return;
        }

        setForm(prev => ({ ...prev, [field]: processedText }));

        if (field === 'to') {
            if (formRef.current.body) {
                speakGuidance(replaceT(t.contact_updated, { name: processedText }), () => {
                    setTimeout(() => startCommandListening(), 1000);
                });
            } else {
                speakGuidance(replaceT(t.got_it_messaging, { name: processedText }), () => {
                    setTimeout(() => startFieldListening('body'), 1000);
                });
            }
        } else if (field === 'body') {
            speakGuidance(t.message_recorded, () => {
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
            const isSendCommand = transcript.includes('send') || transcript.includes('send message') || transcript === 'send' || transcript.includes('sending');
            const isReviewCommand = transcript.includes('review') || transcript === 'review';
            const isEditCommand = transcript.includes('edit') || transcript === 'edit';
            const isCancelCommand = transcript.includes('cancel') || transcript.includes('stop');

            if (isCancelCommand) {
                speakGuidance(t.cancel_compose);
                onClose();
            } else if (isSendCommand) {
                sendTelegram();
            } else if (isReviewCommand) {
                reviewMessage();
            } else if (isEditCommand) {
                speakGuidance(t.which_edit, () => {
                    startEditListening();
                });
            } else {
                speakGuidance(t.help_cmd, () => startCommandListening());
            }
            rec.stop();
        };
        rec.onerror = (error) => {
            setIsListening(false);
            if (error.error === 'aborted' || error.error === 'not-allowed') {
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

    const startEditListening = () => {
        if (!SpeechRecognition) return;
        const rec = new SpeechRecognition();
        rec.lang = userLang; rec.interimResults = false; rec.continuous = false;
        let isStopped = false;
        rec.onstart = () => setIsListening(true);
        rec.onresult = (e) => {
            isStopped = true;
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            if (transcript.includes('contact') || transcript.includes('to') || transcript.includes('name')) {
                speakGuidance(t.say_new_contact, () => startFieldListening('to'));
            } else if (transcript.includes('message') || transcript.includes('body')) {
                speakGuidance(t.say_new_message, () => startFieldListening('body'));
            } else if (transcript.includes('cancel')) {
                speakGuidance(t.cancel_edit, () => startCommandListening());
            } else {
                speakGuidance(t.help_edit, () => startEditListening());
            }
            rec.stop();
        };
        rec.onerror = (error) => {
            setIsListening(false);
            if (error.error === 'aborted' || error.error === 'not-allowed') {
                isStopped = true;
            } else {
                isStopped = true;
                setTimeout(() => startEditListening(), 2000);
            }
        };
        rec.onend = () => {
            setIsListening(false);
            if (!isStopped && !isSystemSpeaking()) {
                setTimeout(() => startEditListening(), 500);
            }
        };
        rec.start();
        recognitionRef.current = rec;
    };

    const reviewMessage = () => {
        const review = replaceT(t.review_msg, { to: formRef.current.to, body: formRef.current.body });
        setGuidance(review);
        speakGuidance(review, () => startCommandListening());
    };

    const startErrorListening = () => {
        if (!SpeechRecognition) return;
        if (isSystemSpeaking()) { setTimeout(() => startErrorListening(), 1000); return; }

        const rec = new SpeechRecognition();
        rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false;
        let isStopped = false;

        rec.onstart = () => setIsListening(true);
        rec.onresult = (e) => {
            isStopped = true;
            const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
            if (transcript.includes('try again') || transcript.includes('retry') || transcript.includes('yes')) {
                sendTelegram();
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

    const sendTelegram = async () => {
        const currentForm = formRef.current;
        if (!currentForm.to || !currentForm.body) {
            speakGuidance(t.missing_fields);
            return;
        }

        setStatus({ type: 'loading', msg: t.sending });
        speakGuidance(t.sending);

        try {
            await telegramApi.sendMessage(currentForm.to, currentForm.body);
            setStatus({ type: 'success', msg: `✓ ${t.sent_success}` });
            speakGuidance(t.sent_success);
            await new Promise(resolve => setTimeout(resolve, 2000));
            onSent?.();
            onClose();
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
            speakGuidance(replaceT(t.send_error, { error: err.message }), () => {
                startErrorListening();
            });
        }
    };

    const handleManualSend = async () => {
        if (!form.to || !form.body) {
            setStatus({ type: 'error', msg: 'All fields are required.' });
            return;
        }
        await sendTelegram();
    };

    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <div className="voice-compose-overlay" style={{ zIndex: 99999 }}>
            <div className="voice-compose-modal glass-panel" style={{ borderTop: '4px solid #2AABEE' }}>
                <div className="voice-compose-header">
                    <span className="modal-title" style={{ color: '#2AABEE' }}>
                        <MessageCircle size={18} /> Telegram Voice Compose
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
                            {currentField && (
                                <p className="guidance-field">
                                    Current field: <strong style={{ color: '#2AABEE' }}>{fieldLabels[currentField]}</strong>
                                </p>
                            )}
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
                        <label>Contact:</label>
                        <div className="field-content">
                            <input
                                type="text"
                                value={form.to}
                                onChange={(e) => setForm(prev => ({ ...prev, to: e.target.value }))}
                                placeholder="E.g., Rahul"
                                className={currentField === 'to' ? 'active-field' : ''}
                                style={currentField === 'to' ? { borderColor: '#2AABEE' } : {}}
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

                    {currentField === 'to' && contacts.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ width: '100%', fontSize: '12px', color: '#999', marginBottom: '4px' }}><Users size={12} /> Contacts List</div>
                            {contacts.map((c, i) => (
                                <div key={c.id}
                                    onClick={() => setForm(prev => ({ ...prev, to: c.name }))}
                                    style={{ background: 'rgba(42, 171, 238, 0.1)', border: '1px solid rgba(42, 171, 238, 0.3)', borderRadius: '16px', padding: '4px 12px', fontSize: '14px', cursor: 'pointer' }}>
                                    <strong style={{ color: '#2AABEE' }}>{i + 1}.</strong> {c.name}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="form-field">
                        <label>Message:</label>
                        <div className="field-content">
                            <textarea
                                value={form.body}
                                onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                                placeholder="Your Telegram message..."
                                rows={4}
                                className={currentField === 'body' ? 'active-field' : ''}
                                style={currentField === 'body' ? { borderColor: '#2AABEE' } : {}}
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

                    <div className="compose-actions">
                        <button className="review-btn" onClick={reviewMessage} disabled={isListening}>Review Message</button>
                        <button className="send-btn" style={{ background: '#2AABEE', color: '#fff' }} onClick={handleManualSend} disabled={status.type === 'loading' || isListening}>
                            {status.type === 'loading' ? <><Loader size={16} className="spin" /> {t.sending}</> : <><Send size={16} /> Send</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceTelegramCompose;
