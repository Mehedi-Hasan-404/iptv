// /src/components/main/RecentSection.tsx
'use client';

import { useFavorites } from '@/hooks/useFavorites';
import ChannelCard from './ChannelCard';
import { PublicChannel } from '@/types';

export default function RecentSection() {
  const { recents } = useFavorites();

  if (recents.length === 0) return null;

  return (
    <div className="mb-8">
      <h2>🕒 Recently Watched</h2>
      <div className="grid">
        {recents.slice(0, 8).map(recent => (
          <ChannelCard 
            key={recent.id} 
            channel={recent as PublicChannel} 
          />
        ))}
      </div>
    </div>
  );
}
