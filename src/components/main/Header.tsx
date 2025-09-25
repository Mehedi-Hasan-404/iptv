// /src/components/main/Header.tsx
import { LogoIcon } from './Icons';

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span className="logo-icon"><LogoIcon /></span>
      <span className="title">Live TV Pro</span>
    </div>
    <span className="menu-btn" onClick={onMenuClick}>☰</span>
  </header>
);
export default Header;
