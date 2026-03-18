import React, { useState, useEffect, useCallback } from 'react';
import AuthScreen from './components/Auth/AuthScreen';
import Dashboard from './components/Dashboard/Dashboard';
import AppSelector from './components/AppSelector/AppSelector';
import WhatsAppDashboard from './components/WhatsAppDashboard/WhatsAppDashboard';
import TelegramDashboard from './components/TelegramDashboard/TelegramDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import { LanguageProvider } from './lib/LanguageContext';
import { authApi } from './api';
import './App.css';

const LANG_STORAGE_KEY = 'app_language_preference';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentApp, setCurrentApp] = useState(null);
  // Separate language state — initialized from localStorage so it persists across reloads
  // and updates instantly when user changes language in Settings.
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_STORAGE_KEY) || 'en-US');

  // When a user logs in, sync lang from their server preference (if not overridden locally)
  const handleAuthenticated = useCallback((userData) => {
    setUser(userData);
    if (userData?.language_preference) {
      const serverLang = userData.language_preference;
      // Only use server lang if localStorage has no preference saved yet
      const localLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (!localLang) {
        setLang(serverLang);
        localStorage.setItem(LANG_STORAGE_KEY, serverLang);
      }
    }
  }, []);

  // Called by any SettingsModal when language changes — updates both state and localStorage
  const handleLanguageChanged = useCallback((updatedUser) => {
    if (updatedUser?.language_preference) {
      setLang(updatedUser.language_preference);
      localStorage.setItem(LANG_STORAGE_KEY, updatedUser.language_preference);
    }
    if (updatedUser) setUser(updatedUser);
  }, []);

  useEffect(() => {
    authApi.me()
      .then(data => {
        if (data?.user) handleAuthenticated(data.user);
      })
      .catch(() => { })
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success' || params.get('auth') === 'relinked') {
      const isRelink = params.get('auth') === 'relinked';
      authApi.me()
        .then(data => {
          if (data.user) {
            handleAuthenticated(data.user);
            if (isRelink) setCurrentApp('email');
          }
        })
        .catch(() => { })
        .finally(() => {
          window.history.replaceState({}, '', '/');
          setLoading(false);
        });
    } else if (params.get('auth') === 'error') {
      window.history.replaceState({}, '', '/');
      const reason = params.get('reason');
      if (reason === 'google_not_configured') {
        setTimeout(() => alert(
          '⚠️ Google OAuth is not set up yet.\n\n' +
          'To enable "Continue with Google":\n' +
          '1. Go to console.cloud.google.com\n' +
          '2. Create OAuth credentials for a Web Application\n' +
          '3. Add redirect URI: http://localhost:3001/api/auth/google/callback\n' +
          '4. Paste GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET into server/.env\n' +
          '5. Restart the backend server\n\n' +
          'You can still sign in using Email + Passcode below.'
        ), 300);
      }
      setLoading(false);
    }
  }, [handleAuthenticated]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { }
    setUser(null);
    setCurrentApp(null);
    // Clear saved language on logout so next user starts fresh
    localStorage.removeItem(LANG_STORAGE_KEY);
    setLang('en-US');
  };

  if (loading) {
    return (
      <div className="app-root app-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  let mainContent;
  if (!user) {
    mainContent = <AuthScreen onAuthenticated={handleAuthenticated} />;
  } else if (!currentApp) {
    mainContent = <AppSelector user={user} onAppSelect={setCurrentApp} onLogout={handleLogout} />;
  } else if (currentApp === 'email') {
    mainContent = <Dashboard user={user} onLogout={handleLogout} onBack={() => setCurrentApp(null)} onSwitchApp={setCurrentApp} onLanguageChanged={handleLanguageChanged} />;
  } else if (currentApp === 'whatsapp') {
    mainContent = <WhatsAppDashboard user={user} onLogout={handleLogout} onBack={() => setCurrentApp(null)} onSwitchApp={setCurrentApp} onLanguageChanged={handleLanguageChanged} />;
  } else if (currentApp === 'telegram') {
    mainContent = <TelegramDashboard user={user} onLogout={handleLogout} onBack={() => setCurrentApp(null)} onLanguageChanged={handleLanguageChanged} />;
  } else if (currentApp === 'admin') {
    mainContent = <AdminDashboard user={user} onBack={() => setCurrentApp(null)} />;
  }

  return (
    <LanguageProvider lang={lang}>
      <div className="app-root">
        {mainContent}
      </div>
    </LanguageProvider>
  );
}

export default App;


