import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types';

const CategoryCard = ({ category }: { category: Category }) => (
  <Link href={`/category/${category.slug}`} className="category-card">
    <div className="category-icon-wrapper">
      <Image 
        src={category.iconUrl} 
        alt={category.name} 
        width={48} 
        height={48}
        className="category-icon"
        unoptimized
      />
    </div>
    <span className="category-name">{category.name}</span>
  </Link>
);
export default CategoryCard;
