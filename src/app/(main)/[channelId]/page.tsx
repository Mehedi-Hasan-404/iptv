import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/main/VideoPlayer';
import ChannelGrid from '@/components/main/ChannelGrid';
import { PublicChannel } from '@/types';

interface ChannelPageProps {
  params: { channelId: string };
}

async function getChannelData(id: string) {
  const docRef = doc(db, 'channels', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

async function getRelatedChannels(categoryId: string, currentChannelId: string): Promise<PublicChannel[]> {
  const channelsCol = collection(db, 'channels');
  const q = query(
    channelsCol, 
    where('categoryId', '==', categoryId),
    orderBy('name'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(channel => channel.id !== currentChannelId) as PublicChannel[];
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const channelData = await getChannelData(params.channelId);
  if (!channelData) notFound();

  const relatedChannels = await getRelatedChannels(channelData.categoryId, params.channelId);

  return (
    <div className="page" style={{ display: 'block' }}>
      <div className="sticky-player-container !static md:!sticky">
        <VideoPlayer 
          streamUrl={channelData.streamUrl} 
          channelName={channelData.name}
          authCookie={channelData.authCookie}
        />
      </div>
      
      {/* Stream Info */}
      <div className="stream-info">
        <h3>Now Playing</h3>
        <p><strong>{channelData.name}</strong></p>
        <p>Category: {channelData.categoryName}</p>
      </div>

      {/* Related Channels */}
      {relatedChannels.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">More from {channelData.categoryName}</h2>
          <ChannelGrid channels={relatedChannels} />
        </div>
      )}
    </div>
  );
}
