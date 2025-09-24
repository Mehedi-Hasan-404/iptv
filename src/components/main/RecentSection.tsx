'use client';

import { useFavorites } from '@/hooks/useFavorites';
import ChannelCard from './ChannelCard';
import { PublicChannel } from '@/types';
import { Trash2 } from 'lucide-react';

interface RecentSectionProps {
  categoryId?: string;
}

export default function RecentSection({ categoryId }: RecentSectionProps) {
  const { recents, clearRecents, removeRecent } = useFavorites();

    const filteredRecents = categoryId 
    ? recents.filter(r => r.categoryId === categoryId)
    : recents;

  if (filteredRecents.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">🕒 Recently Watched</h2>
        <button 
          onClick={clearRecents}
          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
        >
          <Trash2 size={16} /> Clear All
        </button>
      </div>
      <div className="grid">
        {filteredRecents.slice(0, 8).map(recent => (
          <div key={recent.id} className="relative">
            <ChannelCard 
              channel={recent as PublicChannel} 
            />
            <button
              onClick={() => removeRecent(recent.id)}
              className="absolute top-2 left-2 z-20 p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 transition-colors"
              title="Remove from recents"
            >
              <Trash2 size={14} className="text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
