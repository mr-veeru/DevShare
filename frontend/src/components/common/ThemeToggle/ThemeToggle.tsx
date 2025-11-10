/**
 * Theme Context & Toggle Component
 * 
 * Manages light and dark theme state across the application.
 * Persists theme preference in localStorage.
 * Includes ThemeToggle component for switching themes.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import './ThemeToggle.css';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'devsharee-theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get initial theme from localStorage or default to 'dark'
  // Set theme immediately to prevent flash of unstyled content
  const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      const initialTheme = savedTheme || 'dark';
      // Set theme immediately on document root
      document.documentElement.setAttribute('data-theme', initialTheme);
      return initialTheme;
    }
    return 'dark';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Apply theme to document root and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Theme Toggle Component
 * 
 * Button to switch between light and dark themes.
 * Accessible on both auth pages and authenticated pages.
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <FaMoon className="theme-icon" /> : <FaSun className="theme-icon" />}
    </button>
  );
};


