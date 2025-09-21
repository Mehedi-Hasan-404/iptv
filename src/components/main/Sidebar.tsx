import Link from 'next/link';
import { HomeIcon, SettingsIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
}

const Sidebar = ({ isOpen, onClose, onSettingsClick }: SidebarProps) => (
    <div id="sidebar" className="sidebar" style={{ width: isOpen ? '250px' : '0' }}>
      <span className="closebtn" onClick={onClose}>×</span>
      <Link href="/" onClick={onClose}><HomeIcon /><span>Home</span></Link>
      <a href="#" onClick={(e) => { e.preventDefault(); onSettingsClick(); onClose(); }}>
        <SettingsIcon /><span>Settings</span>
      </a>
    </div>
);
export default Sidebar;
