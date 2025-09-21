'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { auth } from '@/lib/firebase/client';
import { LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/admin/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading Admin...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 p-4 flex justify-between items-center shadow-lg">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <button onClick={() => auth.signOut()} className="flex items-center gap-2 px-3 py-2 bg-red-600 rounded">
                <LogOut size={18} /> Logout
            </button>
        </header>
        <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
