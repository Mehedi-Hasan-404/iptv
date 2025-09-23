'use client';
import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Category } from '@/types';

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<Partial<Category>>({ 
    name: '', 
    iconUrl: '', 
    slug: '' 
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });
    
    return () => unsubscribe();
  }, []);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!current.name || !current.iconUrl) return;

    const slug = current.slug || generateSlug(current.name);
    const data = {
      name: current.name,
      iconUrl: current.iconUrl,
      slug
    };

    try {
      if (isEditing && current.id) {
        await updateDoc(doc(db, 'categories', current.id), data);
      } else {
        await addDoc(collection(db, 'categories'), data);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category. Please try again.');
    }
  };

  const handleEdit = (cat: Category) => {
    setIsEditing(true);
    setCurrent(cat);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category? All channels in this category will need to be reassigned.')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category. Please try again.');
      }
    }
  };
  
  const resetForm = () => {
    setIsEditing(false);
    setCurrent({ name: '', iconUrl: '', slug: '' });
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="md:col-span-1 bg-gray-800 p-6 rounded-lg space-y-4">
        <h3 className="text-xl font-semibold">{isEditing ? 'Edit' : 'Add'} Category</h3>
        <input 
          value={current.name || ''} 
          onChange={e => setCurrent({...current, name: e.target.value})} 
          placeholder="Category Name" 
          className="form-input" 
          required 
        />
        <input 
          type="url" 
          value={current.iconUrl || ''} 
          onChange={e => setCurrent({...current, iconUrl: e.target.value})} 
          placeholder="Icon URL" 
          className="form-input" 
          required 
        />
        <input 
          value={current.slug || ''} 
          onChange={e => setCurrent({...current, slug: e.target.value})} 
          placeholder="URL Slug (auto-generated if empty)" 
          className="form-input" 
          pattern="[a-z0-9-]+"
        />
        
        <div className="flex gap-2">
          <button type="submit" className="play-btn flex-grow">{isEditing ? 'Update' : 'Save'}</button>
          {isEditing && <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 rounded">Cancel</button>}
        </div>
      </form>
      
      <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Existing Categories</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
              <div className='flex items-center gap-3'>
                <img src={cat.iconUrl} alt={cat.name} className="w-10 h-10 object-contain" />
                <div>
                  <p>{cat.name}</p>
                  <p className='text-xs text-gray-400'>/{cat.slug}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleEdit(cat)} className="text-sm text-blue-400">Edit</button>
                <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
