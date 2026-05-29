export const THEMES = ['system', 'light', 'dark'];

export function getStoredTheme() {
  return localStorage.getItem('theme') || 'system';
}

export function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    // 'system' — remove attribute, let media query handle it
    html.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);
}

export function getEffectiveTheme(stored) {
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
