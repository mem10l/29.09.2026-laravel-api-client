import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

// The <html> element's data-theme attribute is already set once, inline in
// index.html (before React mounts), to avoid a flash of the wrong theme.
// This hook just reads that starting value and lets components toggle it.
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.getAttribute('data-theme') as Theme | null) || 'light',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return [theme, toggle];
}
