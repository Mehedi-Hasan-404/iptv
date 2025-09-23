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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const savedFavorites = localStorage.getItem('favoriteChannels');
    const savedRecents = localStorage.getItem('recentChannels');
    
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error parsing favorites:', e);
        localStorage.removeItem('favoriteChannels');
      }
    }
    if (savedRecents) {
      try {
        setRecents(JSON.parse(savedRecents));
      } catch (e) {
        console.error('Error parsing recents:', e);
        localStorage.removeItem('recentChannels');
      }
    }
  }, [isClient]);

  const addFavorite = useCallback((channel: Omit<FavoriteChannel, 'addedAt'>) => {
    if (!isClient) return;
    
    const newFavorite = { ...channel, addedAt: Date.now() };
    setFavorites(prev => {
      const updated = [...prev.filter(f => f.id !== channel.id), newFavorite];
      localStorage.setItem('favoriteChannels', JSON.stringify(updated));
      return updated;
    });
  }, [isClient]);

  const removeFavorite = useCallback((channelId: string) => {
    if (!isClient) return;
    
    setFavorites(prev => {
      const updated = prev.filter(f => f.id !== channelId);
      localStorage.setItem('favoriteChannels', JSON.stringify(updated));
      return updated;
    });
  }, [isClient]);

  const isFavorite = useCallback((channelId: string) => {
    return favorites.some(f => f.id === channelId);
  }, [favorites]);

  const addRecent = useCallback((channel: Omit<RecentChannel, 'watchedAt'>) => {
    if (!isClient) return;
    
    const newRecent = { ...channel, watchedAt: Date.now() };
    setRecents(prev => {
      const updated = [newRecent, ...prev.filter(r => r.id !== channel.id)].slice(0, 20);
      localStorage.setItem('recentChannels', JSON.stringify(updated));
      return updated;
    });
  }, [isClient]);

  return {
    favorites,
    recents,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecent
  };
}
