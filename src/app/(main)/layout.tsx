'use client';
import { useState } from 'react';
import Header from "@/components/main/Header";
import Sidebar from "@/components/main/Sidebar";
import BottomNav from "@/components/main/BottomNav";
import SettingsModal from '@/components/main/SettingsModal';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} onSettingsClick={() => setSettingsOpen(true)} />
      <main className="content">
        {children}
      </main>
      <BottomNav onSettingsClick={() => setSettingsOpen(true)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
