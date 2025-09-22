// /src/app/(main)/page.tsx
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Category } from '@/types';
import CategoryCard from '@/components/main/CategoryCard';
import FavoritesSection from '@/components/main/FavoritesSection';
import RecentSection from '@/components/main/RecentSection';

export const dynamic = 'force-dynamic';

async function getCategories(): Promise<Category[]> {
  const categoriesCol = collection(db, 'categories');
  const q = query(categoriesCol, orderBy('name', 'asc'));
  const categorySnapshot = await getDocs(q);

  if (categorySnapshot.empty) return [];

  return categorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];
}

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div id="homepage" className="page" style={{ display: 'block' }}>
      {/* Favorites Section */}
      <FavoritesSection />
      
      {/* Recent Channels Section */}
      <RecentSection />
      
      {/* Categories */}
      <h2>📺 Categories</h2>
      {categories.length > 0 ? (
        <div id="categoryGrid" className="grid">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No Categories Found</h3>
          <p>The administrator has not added any categories yet.</p>
        </div>
      )}
    </div>
  );
}
