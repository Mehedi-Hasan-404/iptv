// /src/hooks/useFavorites.tsx
'use client';

import { useState, useEffect } from 'react';

interface FavoriteChannel {
  id: string;
  name: string;
  logoUrl: string;
  categoryId: string;
  categoryName: string;
  addedAt: number;
}

interface RecentChannel extends FavoriteChannel {
  watchedAt: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteChannel[]>([]);
  const [recents, setRecents] = useState<RecentChannel[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteChannels');
    const savedRecents = localStorage.getItem('recentChannels');
    
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    if (savedRecents) {
      setRecents(JSON.parse(savedRecents));
    }
  }, []);

  const addFavorite = (channel: Omit<FavoriteChannel, 'addedAt'>) => {
    const newFavorite = { ...channel, addedAt: Date.now() };
    const updated = [...favorites.filter(f => f.id !== channel.id), newFavorite];
    setFavorites(updated);
    localStorage.setItem('favoriteChannels', JSON.stringify(updated));
  };

  const removeFavorite = (channelId: string) => {
    const updated = favorites.filter(f => f.id !== channelId);
    setFavorites(updated);
    localStorage.setItem('favoriteChannels', JSON.stringify(updated));
  };

  const isFavorite = (channelId: string) => {
    return favorites.some(f => f.id === channelId);
  };

  const addRecent = (channel: Omit<RecentChannel, 'watchedAt'>) => {
    const newRecent = { ...channel, watchedAt: Date.now() };
    const updated = [newRecent, ...recents.filter(r => r.id !== channel.id)].slice(0, 20);
    setRecents(updated);
    localStorage.setItem('recentChannels', JSON.stringify(updated));
  };

  return {
    favorites,
    recents,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecent
  };
}
