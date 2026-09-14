import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { parseThemePreference, resolveTheme, THEME_STORAGE_KEY, type Theme, type ThemePreference } from '../lib/theme';

const ThemeContext = createContext<{
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setStoredPreference] = useState<ThemePreference>(() => {
    try { return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY)); }
    catch { return 'system'; }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [saveFailed, setSaveFailed] = useState(false);
  const theme = resolveTheme(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(media.matches);
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setStoredPreference(parseThemePreference(event.newValue));
      }
    };
    change();
    media.addEventListener('change', change);
    window.addEventListener('storage', sync);
    return () => {
      media.removeEventListener('change', change);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#19231f' : '#214e40');
  }, [theme]);

  const setPreference = (next: ThemePreference) => {
    setStoredPreference(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
  };

  return <ThemeContext.Provider value={{ theme, preference, setPreference }}>
    {children}
    {saveFailed && <div className="theme-save-notice" role="status">表示は切り替わりましたが、設定を保存できませんでした。
      <button className="text-button" onClick={() => setSaveFailed(false)}>閉じる</button>
    </div>}
  </ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required');
  return context;
}
