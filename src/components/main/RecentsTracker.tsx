'use client';

import { useEffect } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

interface RecentsTrackerProps {
  channel: {
    id: string;
    name: string;
    logoUrl: string;
    categoryId: string;
    categoryName: string;
  };
}

export default function RecentsTracker({ channel }: RecentsTrackerProps) {
  const { addRecent } = useFavorites();

  useEffect(() => {
    // Only add to recents if we have a valid channel
    if (channel && channel.id) {
      addRecent(channel);
    }
  }, [channel, addRecent]);

  return null;
}
