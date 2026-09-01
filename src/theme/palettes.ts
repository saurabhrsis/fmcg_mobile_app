export interface ThemePalette {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
}

export const PALETTES: Record<string, ThemePalette> = {
  teal: {
    id: 'teal',
    name: 'Teal (Classic)',
    primary: '#0f766e',
    primaryDark: '#115e59',
    primaryLight: '#ccfbf1',
    secondary: '#0284c7',
    secondaryLight: '#e0f2fe',
    accent: '#0d9488',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo (Modern)',
    primary: '#4338ca',
    primaryDark: '#3730a3',
    primaryLight: '#e0e7ff',
    secondary: '#6366f1',
    secondaryLight: '#eef2ff',
    accent: '#6366f1',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald (Nature)',
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#d1fae5',
    secondary: '#10b981',
    secondaryLight: '#ecfdf5',
    accent: '#10b981',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
  amber: {
    id: 'amber',
    name: 'Amber (Warm)',
    primary: '#d97706',
    primaryDark: '#b45309',
    primaryLight: '#fef3c7',
    secondary: '#f59e0b',
    secondaryLight: '#fffbeb',
    accent: '#f59e0b',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#e11d48',
  },
  rose: {
    id: 'rose',
    name: 'Rose (Vibrant)',
    primary: '#e11d48',
    primaryDark: '#be123c',
    primaryLight: '#ffe4e6',
    secondary: '#f43f5e',
    secondaryLight: '#fff1f2',
    accent: '#f43f5e',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
  violet: {
    id: 'violet',
    name: 'Violet (Premium)',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    primaryLight: '#ede9fe',
    secondary: '#8b5cf6',
    secondaryLight: '#f5f3ff',
    accent: '#8b5cf6',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan (Fresh)',
    primary: '#0891b2',
    primaryDark: '#0e7490',
    primaryLight: '#cffafe',
    secondary: '#06b6d4',
    secondaryLight: '#ecfeff',
    accent: '#06b6d4',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
  slate: {
    id: 'slate',
    name: 'Slate (Monochrome)',
    primary: '#334155',
    primaryDark: '#1e293b',
    primaryLight: '#f1f5f9',
    secondary: '#475569',
    secondaryLight: '#f8fafc',
    accent: '#475569',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#e11d48',
  },
};
