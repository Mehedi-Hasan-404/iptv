// /src/components/main/RecentSection.tsx
'use client';

import { useFavorites } from '@/hooks/useFavorites';
import ChannelCard from './ChannelCard';
import { PublicChannel } from '@/types';

interface RecentSectionProps {
  categoryId?: string;
}

export default function RecentSection({ categoryId }: RecentSectionProps) {
  const { recents } = useFavorites();

  // Filter recents by category if categoryId is provided
  const filteredRecents = categoryId 
    ? recents.filter(r => r.categoryId === categoryId)
    : recents;

  if (filteredRecents.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">🕒 Recently Watched</h2>
      <div className="grid">
        {filteredRecents.slice(0, 8).map(recent => (
          <ChannelCard 
            key={recent.id} 
            channel={recent as PublicChannel} 
          />
        ))}
      </div>
    </div>
  );
}
