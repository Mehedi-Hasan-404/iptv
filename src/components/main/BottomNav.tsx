'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, SettingsIcon } from './Icons';

const BottomNav = ({ onSettingsClick }: { onSettingsClick: () => void }) => {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <HomeIcon className="nav-icon" /><span>Home</span>
      </Link>
      <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onSettingsClick(); }}>
        <SettingsIcon className="nav-icon" /><span>Settings</span>
      </a>
    </nav>
  );
};
export default BottomNav;
