import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { notFound } from 'next/navigation';
import VideoPlayer from '@/components/main/VideoPlayer';

interface ChannelPageProps {
  params: { channelId: string };
}

async function getChannelStream(id: string): Promise<{ name: string, streamUrl: string } | null> {
  const docRef = doc(db, 'channels', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return { name: data.name, streamUrl: data.streamUrl };
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const channelData = await getChannelStream(params.channelId);
  if (!channelData) notFound();

  return (
    <div className="page" style={{ display: 'block' }}>
      <div className="sticky-player-container !static md:!sticky">
        <VideoPlayer streamUrl={channelData.streamUrl} channelName={channelData.name} />
      </div>
      {/* You could fetch and show related channels here */}
    </div>
  );
}
