// /src/app/(main)/[channelId]/page.tsx
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChannelGrid from '@/components/main/ChannelGrid';
import { PublicChannel, AdminChannel } from '@/types';
import RecentsTracker from '@/components/main/RecentsTracker';

const SimpleVideoPlayer = dynamic(() => import('@/components/main/SimpleVideoPlayer'), {
  ssr: false
});

interface ChannelPageProps {
  params: { channelId: string };
}

// Make this a server component for faster initial load
export default async function ChannelPage({ params }: ChannelPageProps) {
  const docRef = doc(db, 'channels', params.channelId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) notFound();
  
  const channelData = { id: docSnap.id, ...docSnap.data() } as AdminChannel;
  
  // Get related channels
  const channelsCol = collection(db, 'channels');
  const q = query(
    channelsCol, 
    where('categoryId', '==', channelData.categoryId),
    orderBy('name'),
    limit(10)
  );
  const snapshot = await getDocs(q);
  const relatedChannels = snapshot.docs
    .map(doc => ({ 
      id: doc.id, 
      name: doc.data().name,
      logoUrl: doc.data().logoUrl,
      categoryId: doc.data().categoryId,
      categoryName: doc.data().categoryName
    }))
    .filter(channel => channel.id !== params.channelId) as PublicChannel[];

  return (
    <div className="page">
      <RecentsTracker 
        channel={{
          id: channelData.id,
          name: channelData.name,
          logoUrl: channelData.logoUrl,
          categoryId: channelData.categoryId,
          categoryName: channelData.categoryName
        }}
      />
      
      <div className="sticky-player-container">
        <SimpleVideoPlayer 
          streamUrl={channelData.streamUrl} 
          channelName={channelData.name}
        />
      </div>
      
      <div className="stream-info">
        <h3>Now Playing</h3>
        <p><strong>{channelData.name}</strong></p>
        <p>Category: {channelData.categoryName}</p>
      </div>

      {relatedChannels.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">More from {channelData.categoryName}</h2>
          <ChannelGrid channels={relatedChannels} />
        </div>
      )}
    </div>
  );
}
