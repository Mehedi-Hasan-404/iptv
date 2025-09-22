// /src/components/main/ChannelCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PublicChannel } from '@/types';
import { PlayIcon } from './Icons';
import { useFavorites } from '@/hooks/useFavorites';
import { Star } from 'lucide-react';

const ChannelCard = ({ channel }: { channel: PublicChannel }) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const isFav = isFavorite(channel.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFav) {
      removeFavorite(channel.id);
    } else {
      addFavorite({
        id: channel.id,
        name: channel.name,
        logoUrl: channel.logoUrl,
        categoryId: channel.categoryId,
        categoryName: channel.categoryName
      });
    }
  };

  return (
    <Link href={`/${channel.id}`} className="card">
      <div className="thumbnail-container">
        <Image
          src={channel.logoUrl}
          alt={`${channel.name} Logo`}
          className="thumbnail"
          width={180}
          height={101}
          unoptimized
        />
        <div className="play-overlay">
          <div className="play-overlay-btn"><PlayIcon /></div>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all ${
            isFav 
              ? 'bg-yellow-500 text-white' 
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          <Star size={16} fill={isFav ? 'white' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <div className="channel-name">{channel.name}</div>
        <div className="channel-category">{channel.categoryName}</div>
      </div>
    </Link>
  );
};

export default ChannelCard;
