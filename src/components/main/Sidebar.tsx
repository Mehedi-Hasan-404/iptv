// /src/components/main/Sidebar.tsx
'use client';
import Link from 'next/link';
import { HomeIcon, Star, Sun, Moon } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
}

const Sidebar = ({ isOpen, onClose, onSettingsClick }: SidebarProps) => {
  const { theme, setTheme } = useSettings();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div 
      id="sidebar" 
      className="sidebar" 
      style={{ 
        width: isOpen ? '250px' : '0',
        right: 0,
        left: 'auto'
      }}
    >
      <span className="closebtn" style={{ left: '20px', right: 'auto' }} onClick={onClose}>×</span>
      
      <Link href="/" onClick={onClose}>
        <HomeIcon />
        <span>Home</span>
      </Link>
      
      <Link href="/favorites" onClick={onClose}>
        <Star />
        <span>Favorites</span>
      </Link>
      
      {/* Theme Toggle with Animation */}
      <a href="#" onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
        <div className="theme-toggle-icon">
          {theme === 'dark' ? (
            <Sun className="theme-icon sun-icon" />
          ) : (
            <Moon className="theme-icon moon-icon" />
          )}
        </div>
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </a>
    </div>
  );
};

export default Sidebar;
