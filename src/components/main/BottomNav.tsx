// /src/components/main/BottomNav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Star } from 'lucide-react';

const BottomNav = () => {
  const pathname = usePathname();
  
  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <HomeIcon className="nav-icon" />
        <span>Home</span>
      </Link>
      <Link href="/favorites" className={`nav-item ${pathname === '/favorites' ? 'active' : ''}`}>
        <Star className="nav-icon" />
        <span>Favorites</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
