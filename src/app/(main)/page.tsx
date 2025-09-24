import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Category } from '@/types';
import CategoryCard from '@/components/main/CategoryCard';

export const dynamic = 'force-dynamic';

async function getCategories(): Promise<Category[]> {
  const categoriesCol = collection(db, 'categories');
  const q = query(categoriesCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="page" style={{ display: 'block' }}>
      <h2 className="text-2xl font-bold mb-4">📺 Select a Category</h2>
      {categories.length > 0 ? (
        <div className="category-grid">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No Categories Available</h3>
          <p>Please add categories from the admin panel</p>
        </div>
      )}
    </div>
  );
}
