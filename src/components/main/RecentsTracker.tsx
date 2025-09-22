// /src/components/main/RecentsTracker.tsx
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
    addRecent(channel);
  }, [channel.id]);

  return null;
}
