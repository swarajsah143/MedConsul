import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

/**
 * Theme management. The app ships thousands of `dark:` Tailwind variants but previously
 * had no way to turn them on — this provider wires `.dark` onto <html> and persists the
 * choice. First-paint theme is set by the inline bootstrap in index.html (same storage
 * key + logic); this provider takes over once React mounts and keeps them in sync.
 */

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'medcounsel-theme';

interface ThemeContextValue {
  /** The user's stored preference. */
  theme: Theme;
  /** The theme actually applied right now (system resolved to light/dark). */
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  /** Cycle light → dark → system for a single toggle control. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* localStorage unavailable */ }
  return 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    theme === 'dark' || (theme === 'system' && systemPrefersDark()) ? 'dark' : 'light'
  );

  // Apply the class + persist whenever the preference changes.
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
    document.documentElement.classList.toggle('dark', isDark);
    setResolvedTheme(isDark ? 'dark' : 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  // Follow the OS when the preference is 'system'.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      document.documentElement.classList.toggle('dark', mq.matches);
      setResolvedTheme(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
