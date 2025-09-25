// /src/contexts/SettingsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    // This effect runs only on the client
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme class to body whenever theme changes
    const body = document.body;
    body.classList.add('changing-theme');
    body.classList.remove('light-theme', 'blue-theme', 'green-theme');
    
    if (theme === 'light') {
      body.classList.add('light-theme');
    }
    
    // Remove transition class after animation
    setTimeout(() => {
      body.classList.remove('changing-theme');
    }, 300);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  };

  return (
    <SettingsContext.Provider value={{ theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
