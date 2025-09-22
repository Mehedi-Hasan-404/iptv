// /src/app/(main)/favorites/page.tsx
'use client';

import { useFavorites } from '@/hooks/useFavorites';
import ChannelCard from '@/components/main/ChannelCard';
import { PublicChannel } from '@/types';

export default function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <div className="page" style={{ display: 'block' }}>
      <h2 className="text-2xl font-bold mb-4">⭐ Favorite Channels</h2>
      
      {favorites.length === 0 ? (
        <div className="empty-state">
          <h3>No Favorite Channels</h3>
          <p>Add channels to your favorites to see them here</p>
        </div>
      ) : (
        <div className="grid">
          {favorites.map(fav => (
            <ChannelCard 
              key={fav.id} 
              channel={fav as PublicChannel} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
