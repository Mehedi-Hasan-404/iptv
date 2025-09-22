// /src/app/(main)/[channelId]/page.tsx
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { notFound } from 'next/navigation';
import RecentsTracker from '@/components/main/RecentsTracker';

interface ChannelPageProps {
  params: {
    channelId: string;
  };
}

async function getChannelData(channelId: string) {
  const docRef = doc(db, 'channels', channelId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const channelData = await getChannelData(params.channelId);

  if (!channelData) {
    notFound();
  }

  return (
    <div id="channel-page" className="page" style={{ display: 'block' }}>
      {/* ✅ Recents Tracker */}
      <RecentsTracker
        channel={{
          id: channelData.id,
          name: channelData.name,
          logoUrl: channelData.logoUrl,
          categoryId: channelData.categoryId,
          categoryName: channelData.categoryName,
        }}
      />

      {/* Channel Info */}
      <h1>{channelData.name}</h1>
      {channelData.logoUrl && (
        <img
          src={channelData.logoUrl}
          alt={channelData.name}
          width={120}
          height={120}
        />
      )}

      {/* Example: player section */}
      <div className="player">
        <p>Channel player or stream goes here...</p>
      </div>
    </div>
  );
}
