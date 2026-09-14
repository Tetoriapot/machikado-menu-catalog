import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const dark = theme === 'dark';
  return <button className="theme-toggle" aria-label="ダークモード" aria-pressed={dark}
    title={dark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
    onClick={() => setPreference(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={18} /> : <Moon size={18} />}
    <span>{dark ? 'ライトに切替' : 'ダークに切替'}</span>
  </button>;
}
