// /src/app/(main)/layout.tsx
'use client';
import { useState } from 'react';
import Header from "@/components/main/Header";
import Sidebar from "@/components/main/Sidebar";
import BottomNav from "@/components/main/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Overlay that closes sidebar when clicked */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <main className="content">
        {children}
      </main>
      
      <BottomNav />
    </>
  );
}
