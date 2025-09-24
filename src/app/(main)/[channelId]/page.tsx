import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChannelGrid from '@/components/main/ChannelGrid';
import { PublicChannel, AdminChannel } from '@/types';
import RecentsTracker from '@/components/main/RecentsTracker';

// Dynamically import VideoPlayer with no SSR
const VideoPlayer = dynamic(() => import('@/components/main/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="video-player">
      <div className="video-wrapper bg-black flex items-center justify-center">
        <div className="player-loading-indicator show">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading player...</div>
        </div>
      </div>
    </div>
  )
});

interface ChannelPageProps {
  params: { channelId: string };
}

async function getChannelData(id: string): Promise<AdminChannel | null> {
  try {
    const docRef = doc(db, 'channels', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as AdminChannel;
  } catch (error) {
    console.error('Error fetching channel:', error);
    return null;
  }
}

async function getRelatedChannels(categoryId: string, currentChannelId: string): Promise<PublicChannel[]> {
  try {
    const channelsCol = collection(db, 'channels');
    const q = query(
      channelsCol, 
      where('categoryId', '==', categoryId),
      orderBy('name'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ 
        id: doc.id, 
        name: doc.data().name,
        logoUrl: doc.data().logoUrl,
        categoryId: doc.data().categoryId,
        categoryName: doc.data().categoryName
      }))
      .filter(channel => channel.id !== currentChannelId) as PublicChannel[];
  } catch (error) {
    console.error('Error fetching related channels:', error);
    return [];
  }
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const channelData = await getChannelData(params.channelId);
  if (!channelData) notFound();

  const relatedChannels = await getRelatedChannels(channelData.categoryId, params.channelId);

  return (
    <div className="page" style={{ display: 'block' }}>
      <RecentsTracker 
        channel={{
          id: channelData.id,
          name: channelData.name,
          logoUrl: channelData.logoUrl,
          categoryId: channelData.categoryId,
          categoryName: channelData.categoryName
        }}
      />
      
      <div className="sticky-player-container !static md:!sticky">
        <VideoPlayer 
          streamUrl={channelData.streamUrl} 
          streamUrl2={channelData.streamUrl2}
          streamUrl3={channelData.streamUrl3}
          streamUrl4={channelData.streamUrl4}
                    streamUrl5={channelData.streamUrl5}
          channelName={channelData.name}
          authCookie={channelData.authCookie}
          isM3UPlaylist={channelData.isM3UPlaylist}
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
