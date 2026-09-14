export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
export const THEME_STORAGE_KEY = 'machikado.theme.v1';

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}
