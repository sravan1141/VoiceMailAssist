import React, { createContext, useContext, useMemo } from 'react';
import translations from './i18n';

// Helper to replace placeholders like {name} in a string
const interpolate = (str, vars = {}) => {
  if (!str) return str;
  let out = str;
  Object.entries(vars).forEach(([k, v]) => { out = out.replace(new RegExp(`{${k}}`, 'g'), v); });
  return out;
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ lang = 'en-US', children }) => {
  const value = useMemo(() => {
    const dict = translations[lang] || translations['en-US'];

    // Build a proxy that works BOTH as:
    //   t('key')           → looks up dict[key]  (function call style)
    //   t('key', {vars})   → looks up dict[key] and interpolates variables
    //   t.key              → dict[key]            (dot notation style)
    const tProxy = new Proxy(
      function tFn(key, vars = {}) {
        const str = dict[key] ?? (translations['en-US']?.[key]) ?? key;
        return interpolate(str, vars);
      },
      {
        get(fn, prop) {
          // Allow accessing properties on the proxy itself (e.g. .call, .apply)
          if (prop in fn) return fn[prop];
          // Otherwise, look up the translation key
          return dict[prop] ?? (translations['en-US']?.[prop]) ?? prop;
        }
      }
    );

    return {
      lang,
      t: tProxy,
      replaceT: interpolate,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback when used outside provider
    const dict = translations['en-US'];
    const tProxy = new Proxy(
      function tFn(key, vars = {}) {
        const str = dict[key] ?? key;
        return interpolate(str, vars);
      },
      {
        get(fn, prop) {
          if (prop in fn) return fn[prop];
          return dict[prop] ?? prop;
        }
      }
    );
    return { lang: 'en-US', t: tProxy, replaceT: interpolate };
  }
  return ctx;
};

export default LanguageContext;
