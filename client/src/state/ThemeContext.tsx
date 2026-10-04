import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { analytics } from '../analytics/events';

interface ThemeContextType {
  isLight: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isLight: false, toggleTheme: () => { } });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isLight, setIsLight] = useState(false);

  // Apply the persisted theme on first mount.
  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark';
    if (stored === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      setIsLight(true);
    } else {
      document.documentElement.removeAttribute('data-theme');
      setIsLight(false);
    }
  }, []);

  const toggleTheme = () => {
    setIsLight((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
      }
      // Only user toggles are reported; the mount-time restore above is not a change.
      analytics.themeChanged(next ? 'light' : 'dark');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isLight, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
