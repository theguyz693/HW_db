// ──────────────────────────────────────────────
// Theme Provider: Dark / Light, plus a small set of accent colours.
// ──────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';

export type AccentName = 'racing' | 'indigo' | 'emerald' | 'amber';

export const ALL_THEMES: { id: Theme; name: string; tag: string; description: string; colors: string[] }[] = [
  { id: 'dark', name: 'Dark', tag: 'Default', description: 'Low-glare dark interface; lets the cars stand out.', colors: ['#07070d', '#161625', '#e3262f'] },
  { id: 'light', name: 'Light', tag: 'Daylight', description: 'Bright, high-contrast layout for daytime use.', colors: ['#f8fafc', '#ffffff', '#e3262f'] },
];

export const ACCENT_COLORS: Record<AccentName, { val: string; hover: string; muted: string }> = {
  // Hot Wheels red is the default, shared with the showcase.
  racing: { val: '227, 38, 47', hover: '239, 68, 68', muted: '185, 28, 28' },
  indigo: { val: '99, 102, 241', hover: '129, 140, 248', muted: '79, 70, 229' },
  emerald: { val: '16, 185, 129', hover: '52, 211, 153', muted: '5, 150, 105' },
  amber: { val: '245, 158, 11', hover: '251, 191, 36', muted: '217, 119, 6' },
};

const VALID_THEMES: Theme[] = ['dark', 'light'];
// Older builds offered more themes; anything else falls back to dark.
const LEGACY_THEMES = ['industrial', 'punk', 'windowsxp', 'brutal', 'max'];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: AccentName;
  setAccentColor: (accent: AccentName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('collectorhub_theme') as Theme | null;
    return stored && VALID_THEMES.includes(stored) ? stored : 'dark';
  });

  const [accentColor, setAccentColorState] = useState<AccentName>(() => {
    const stored = localStorage.getItem('collectorhub_accent') as AccentName | null;
    return stored && stored in ACCENT_COLORS ? stored : 'racing';
  });

  useEffect(() => {
    localStorage.setItem('collectorhub_theme', theme);

    // Remove all previous theme classes
    const validThemes = [...VALID_THEMES, ...LEGACY_THEMES];
    validThemes.forEach(t => {
      document.documentElement.classList.remove(t);
      document.documentElement.classList.remove(`theme-${t}`);
    });

    // Add current theme classes
    document.documentElement.classList.add(theme);
    document.documentElement.classList.add(`theme-${theme}`);

    const config = ACCENT_COLORS[accentColor] || ACCENT_COLORS.racing;
    document.documentElement.style.setProperty('--color-accent-val', config.val);
    document.documentElement.style.setProperty('--color-accent-hover-val', config.hover);
    document.documentElement.style.setProperty('--color-accent-muted-val', config.muted);
  }, [theme, accentColor]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccentColor = (accent: AccentName) => {
    setAccentColorState(accent);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
