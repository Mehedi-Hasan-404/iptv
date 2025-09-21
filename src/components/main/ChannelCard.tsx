import Link from 'next/link';
import Image from 'next/image';
import { PublicChannel } from '@/types';
import { PlayIcon } from './Icons';

const ChannelCard = ({ channel }: { channel: PublicChannel }) => (
  <Link href={`/${channel.id}`} className="card">
    <div className="thumbnail-container">
      <Image
        src={channel.logoUrl}
        alt={`${channel.name} Logo`}
        className="thumbnail"
        width={180}
        height={101}
        unoptimized // Use if you have many external, non-standard logos
      />
      <div className="play-overlay">
        <div className="play-overlay-btn"><PlayIcon /></div>
      </div>
    </div>
    <div className="card-content">
      <div className="channel-name">{channel.name}</div>
      <div className="channel-category">{channel.categoryName}</div>
    </div>
  </Link>
);
export default ChannelCard;
