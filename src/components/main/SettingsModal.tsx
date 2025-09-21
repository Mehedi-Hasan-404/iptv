'use client';
import { useSettings } from "@/contexts/SettingsContext";

const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { theme, setTheme } = useSettings();

  if (!isOpen) return null;

  return (
    <div id="settingsModal" className="modal" style={{ display: 'flex' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="settingsModalTitle">Settings</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label htmlFor="themeSelect">Theme:</label>
          <select id="themeSelect" className="form-input" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
          </select>
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
