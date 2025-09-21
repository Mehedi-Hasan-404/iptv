import { LogoIcon } from './Icons';

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header>
    <span className="menu-btn" onClick={onMenuClick}>☰</span>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span className="logo-icon"><LogoIcon /></span>
      <span className="title">Live TV Pro</span>
    </div>
  </header>
);
export default Header;
