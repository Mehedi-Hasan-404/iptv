import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types';

const CategoryCard = ({ category }: { category: Category }) => (
  <Link href={`/category/${category.slug}`} className="category-card">
    <Image 
      src={category.iconUrl} 
      alt={category.name} 
      width={64} 
      height={64}
      unoptimized={category.iconUrl.includes('http://') || category.iconUrl.includes('https://')}
    />
    <span>{category.name}</span>
  </Link>
);
export default CategoryCard;
