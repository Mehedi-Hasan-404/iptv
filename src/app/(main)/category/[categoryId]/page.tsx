// src/app/(main)/category/[categoryId]/page.tsx

import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicChannel, Category } from '@/types';
import ChannelGrid from '@/components/main/ChannelGrid';
import { notFound } from 'next/navigation';

// ADD THIS LINE
export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: { categoryId: string };
}

async function getCategoryDetails(categoryId: string): Promise<Category | null> {
    const docRef = doc(db, 'categories', categoryId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Category : null;
}

async function getChannelsForCategory(categoryId: string): Promise<PublicChannel[]> {
  const channelsCol = collection(db, 'channels');
  // This query is now safe because the page is dynamic
  const q = query(channelsCol, where('categoryId', '==', categoryId), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PublicChannel[];
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await getCategoryDetails(params.categoryId);
  if (!category) notFound();

  const channels = await getChannelsForCategory(params.categoryId);
  
  return (
    <div className="page playlist-page" style={{ display: 'block' }}>
        <h2 className='text-2xl font-bold mb-4'>{category.name} Channels</h2>
        <ChannelGrid channels={channels} />
    </div>
  );
}
