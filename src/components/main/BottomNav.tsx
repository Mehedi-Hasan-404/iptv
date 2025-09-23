'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, SettingsIcon } from './Icons';

interface BottomNavProps {
  onSettingsClick: () => void;
}

const BottomNav = ({ onSettingsClick }: BottomNavProps) => {
  const pathname = usePathname();
  
  const handleSettingsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onSettingsClick();
  };
  
  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <HomeIcon className="nav-icon" />
        <span>Home</span>
      </Link>
      <a href="#" className="nav-item" onClick={handleSettingsClick}>
        <SettingsIcon className="nav-icon" />
        <span>Settings</span>
      </a>
    </nav>
  );
};

export default BottomNav;
