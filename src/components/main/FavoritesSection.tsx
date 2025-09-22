// /src/components/main/FavoritesSection.tsx
'use client';

import { useFavorites } from '@/hooks/useFavorites';
import ChannelCard from './ChannelCard';
import { PublicChannel } from '@/types';

export default function FavoritesSection() {
  const { favorites } = useFavorites();

  if (favorites.length === 0) return null;

  return (
    <div className="mb-8">
      <h2>⭐ Favorite Channels</h2>
      <div className="grid">
        {favorites.map(fav => (
          <ChannelCard 
            key={fav.id} 
            channel={fav as PublicChannel} 
          />
        ))}
      </div>
    </div>
  );
}
