import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types';

const CategoryCard = ({ category }: { category: Category }) => (
  <Link href={`/category/${category.id}`} className="category-card">
    <Image src={category.iconUrl} alt={category.name} width={64} height={64} />
    <span>{category.name}</span>
  </Link>
);
export default CategoryCard;
