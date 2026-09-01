import React, { createContext, useContext, useState, useEffect } from 'react';
import { PALETTES, ThemePalette } from '../theme/palettes';

export interface ThemeColors {
  palette: ThemePalette;
  isDark: boolean;
  bg: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceSecondary: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  border: string;
  borderSubtle: string;
  card: string;
  inputBg: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  paletteKey: string;
  isDark: boolean;
  setPaletteKey: (key: string) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paletteKey, setPaletteKey] = useState<string>('teal');
  const [isDark, setIsDark] = useState<boolean>(false);

  const palette = PALETTES[paletteKey] || PALETTES.teal;

  const bg = isDark ? '#090d16' : '#f8fafc';
  const surfaceSubtle = isDark ? '#1f2937' : '#f1f5f9';
  const textMuted = isDark ? '#9ca3af' : '#64748b';

  const colors: ThemeColors = {
    palette,
    isDark,
    bg,
    background: bg,
    surface: isDark ? '#111827' : '#ffffff',
    surfaceSubtle,
    surfaceSecondary: surfaceSubtle,
    text: isDark ? '#f9fafb' : '#0f172a',
    textMuted,
    textSecondary: textMuted,
    border: isDark ? '#374151' : '#e2e8f0',
    borderSubtle: isDark ? '#1f2937' : '#f1f5f9',
    card: isDark ? '#111827' : '#ffffff',
    inputBg: isDark ? '#1e293b' : '#ffffff',
  };

  const toggleDarkMode = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ colors, paletteKey, isDark, setPaletteKey, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
