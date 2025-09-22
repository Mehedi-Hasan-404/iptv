import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Category, PublicChannel } from '@/types';
import CategoryCard from '@/components/main/CategoryCard';
import ChannelGrid from '@/components/main/ChannelGrid';

async function getCategories(): Promise<Category[]> {
  const categoriesCol = collection(db, 'categories');
  const q = query(categoriesCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

async function getAllChannels(): Promise<PublicChannel[]> {
  const channelsCol = collection(db, 'channels');
  const q = query(channelsCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    name: doc.data().name,
    logoUrl: doc.data().logoUrl,
    categoryId: doc.data().categoryId,
    categoryName: doc.data().categoryName
  } as PublicChannel));
}

export default async function HomePage() {
  const [categories, channels] = await Promise.all([
    getCategories(),
    getAllChannels()
  ]);

  return (
    <div className="page" style={{ display: 'block' }}>
      {/* Categories Section */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📺 Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map(category => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}
      
      {/* All Channels Section */}
      {channels.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">All Channels</h2>
          <ChannelGrid channels={channels} />
        </div>
      )}
    </div>
  );
      }
