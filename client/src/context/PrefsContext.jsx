import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations } from '../i18n/translations';

const KEY = 'mc_prefs';
const DEFAULTS = { lang: 'en', fontScale: 100, contrast: false, reduceMotion: false };

const load = () => {
  try {
    const saved = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!translations[saved.lang]) saved.lang = 'en';
    if (![100, 112, 125].includes(saved.fontScale)) saved.fontScale = 100;
    return saved;
  } catch {
    return DEFAULTS;
  }
};

const PrefsContext = createContext();

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = prefs.lang;
    root.style.fontSize = `${prefs.fontScale}%`;
    root.dataset.contrast = prefs.contrast ? 'high' : 'normal';
    root.dataset.motion = prefs.reduceMotion ? 'reduce' : 'normal';
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // storage band ho to bhi app chale
    }
  }, [prefs]);

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));
  const t = useCallback(
    (key) => translations[prefs.lang]?.[key] ?? translations.en[key] ?? key,
    [prefs.lang]
  );

  return <PrefsContext.Provider value={{ prefs, setPref, t }}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);