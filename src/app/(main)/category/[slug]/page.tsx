import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PublicChannel, Category } from '@/types';
import ChannelGrid from '@/components/main/ChannelGrid';
import RecentSection from '@/components/main/RecentSection';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: { slug: string };
}

async function getCategoryDetails(slug: string): Promise<Category | null> {
  try {
    const categoriesCol = collection(db, 'categories');
    const q = query(categoriesCol, where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Category;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

async function getChannelsForCategory(categoryId: string): Promise<PublicChannel[]> {
  try {
    const channelsCol = collection(db, 'channels');
    const q = query(channelsCol, where('categoryId', '==', categoryId), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      name: doc.data().name,
      logoUrl: doc.data().logoUrl,
      categoryId: doc.data().categoryId,
      categoryName: doc.data().categoryName
    })) as PublicChannel[];
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await getCategoryDetails(params.slug);
  if (!category) {
    notFound();
  }

  const channels = await getChannelsForCategory(category.id);
  
  return (
    <div className="page playlist-page" style={{ display: 'block' }}>
      {/* Recent Section for this category */}
      <RecentSection categoryId={category.id} />
      
      <h2 className='text-2xl font-bold mb-4'>{category.name} Channels</h2>
      <ChannelGrid channels={channels} />
    </div>
  );
}
