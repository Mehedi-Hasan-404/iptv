import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicChannel, Category } from '@/types';
import ChannelGrid from '@/components/main/ChannelGrid';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  // The parameter is now 'slug'
  params: { slug: string };
}

// This function now finds the category by its slug
async function getCategoryDetails(slug: string): Promise<Category | null> {
    const categoriesCol = collection(db, 'categories');
    const q = query(categoriesCol, where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Category;
}

async function getChannelsForCategory(categoryId: string): Promise<PublicChannel[]> {
  const channelsCol = collection(db, 'channels');
  const q = query(channelsCol, where('categoryId', '==', categoryId), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PublicChannel[];
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  // We use params.slug to find the category
  const category = await getCategoryDetails(params.slug);
  if (!category) {
    notFound();
  }

  // Once we have the category, we use its unique ID to find the channels
  const channels = await getChannelsForCategory(category.id);
  
  return (
    <div className="page playlist-page" style={{ display: 'block' }}>
        <h2 className='text-2xl font-bold mb-4'>{category.name} Channels</h2>
        <ChannelGrid channels={channels} />
    </div>
  );
}
