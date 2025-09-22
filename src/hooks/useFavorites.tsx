// /src/hooks/useFavorites.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface FavoriteChannel {
  id: string;
  name: string;
  logoUrl: string;
  categoryId: string;
  categoryName: string;
  addedAt: number;
}

interface RecentChannel extends Omit<FavoriteChannel, 'addedAt'> {
  watchedAt: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteChannel[]>([]);
  const [recents, setRecents] = useState<RecentChannel[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteChannels');
    const savedRecents = localStorage.getItem('recentChannels');
    
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error parsing favorites:', e);
      }
    }
    if (savedRecents) {
      try {
        setRecents(JSON.parse(savedRecents));
      } catch (e) {
        console.error('Error parsing recents:', e);
      }
    }
  }, []);

  const addFavorite = useCallback((channel: Omit<FavoriteChannel, 'addedAt'>) => {
    const newFavorite = { ...channel, addedAt: Date.now() };
    setFavorites(prev => {
      const updated = [...prev.filter(f => f.id !== channel.id), newFavorite];
      localStorage.setItem('favoriteChannels', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((channelId: string) => {
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== channelId);
      localStorage.setItem('favoriteChannels', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((channelId: string) => {
    return favorites.some(f => f.id === channelId);
  }, [favorites]);

  const addRecent = useCallback((channel: Omit<RecentChannel, 'watchedAt'>) => {
    const newRecent = { ...channel, watchedAt: Date.now() };
    setRecents(prev => {
      const updated = [newRecent, ...prev.filter(r => r.id !== channel.id)].slice(0, 20);
      localStorage.setItem('recentChannels', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    favorites,
    recents,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecent
  };
}
