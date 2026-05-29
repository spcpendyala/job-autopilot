import { useState, useEffect } from 'react';
import { THEMES, getStoredTheme, applyTheme } from '../lib/theme.js';

const THEME_META = {
  system: { icon: '💻', label: 'System' },
  light:  { icon: '☀️',  label: 'Light' },
  dark:   { icon: '🌙', label: 'Dark' },
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Re-apply when system preference changes and we're in system mode
      if (getStoredTheme() === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme(next);
    setTheme(next);
  }

  const { icon, label } = THEME_META[theme] || THEME_META.system;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${label} — click to cycle`}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        width: '100%', padding: '6px 12px',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-2)',
        fontSize: 12, cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    </button>
  );
}
