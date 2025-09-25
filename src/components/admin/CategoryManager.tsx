// /src/components/admin/CategoryManager.tsx
'use client';
import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Category } from '@/types';

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<{ 
    id?: string; 
    name: string; 
    iconUrl: string;
    m3uPlaylistUrl?: string;
  }>({ name: '', iconUrl: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importingPlaylist, setImportingPlaylist] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name"));
    const unsub = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const slug = createSlug(current.name);
      if (!slug) {
        alert("Category name cannot be empty or invalid.");
        setLoading(false);
        return;
      }

      const dataToSave = {
        name: current.name.trim(),
        iconUrl: current.iconUrl.trim(),
        slug: slug,
        m3uPlaylistUrl: current.m3uPlaylistUrl?.trim() || null
      };

      if (isEditing && current.id) {
        await updateDoc(doc(db, 'categories', current.id), dataToSave);
        alert('Category updated successfully!');
      } else {
        await addDoc(collection(db, 'categories'), dataToSave);
        alert('Category added successfully!');
      }
      resetForm();
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(`Error saving category: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importFromPlaylist = async () => {
    if (!current.m3uPlaylistUrl || !current.id) return;
    
    setImportingPlaylist(true);
    try {
      const response = await fetch(`/api/parse-m3u?url=${encodeURIComponent(current.m3uPlaylistUrl)}`);
      const channels = await response.json();
      
      if (channels.length > 0) {
        // Import channels to this category
        const batch = channels.map((channel: any) => 
          addDoc(collection(db, 'channels'), {
            name: channel.name,
            logoUrl: channel.logo || '/default-logo.png',
            streamUrl: channel.url,
            categoryId: current.id,
            categoryName: current.name
          })
        );
        
        await Promise.all(batch);
        alert(`Imported ${channels.length} channels from playlist!`);
      }
    } catch (error) {
      console.error('Error importing playlist:', error);
      alert('Failed to import playlist');
    } finally {
      setImportingPlaylist(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setIsEditing(true);
    setCurrent(cat);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category and all its channels?')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        alert('Category deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting category:', error);
        alert(`Error deleting category: ${error.message}`);
      }
    }
  };
  
  const resetForm = () => {
    setIsEditing(false);
    setCurrent({ name: '', iconUrl: '' });
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="md:col-span-1 bg-gray-800 p-6 rounded-lg space-y-4">
        <h3 className="text-xl font-semibold">{isEditing ? 'Edit' : 'Add'} Category</h3>
        <input 
          value={current.name} 
          onChange={e => setCurrent({...current, name: e.target.value})} 
          placeholder="Category Name" 
          className="form-input" 
          required
        />
        <input 
          type="url" 
          value={current.iconUrl} 
          onChange={e => setCurrent({...current, iconUrl: e.target.value})} 
          placeholder="Icon URL" 
          className="form-input" 
          required
        />
        <div className="space-y-2">
          <label className="text-sm text-gray-400">M3U Playlist URL (Optional)</label>
          <input 
            type="url" 
            value={current.m3uPlaylistUrl || ''} 
            onChange={e => setCurrent({...current, m3uPlaylistUrl: e.target.value})} 
            placeholder="https://example.com/playlist.m3u" 
            className="form-input" 
          />
          {isEditing && current.m3uPlaylistUrl && (
            <button 
              type="button" 
              onClick={importFromPlaylist}
              disabled={importingPlaylist}
              className="w-full bg-green-600 text-white px-4 py-2 rounded"
            >
              {importingPlaylist ? 'Importing...' : 'Import Channels from Playlist'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="play-btn flex-grow">
            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
          </button>
          {isEditing && <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 rounded">Cancel</button>}
        </div>
      </form>
      <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Existing Categories ({categories.length})</h3>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
              <div className='flex items-center gap-3'>
                <img src={cat.iconUrl} alt={cat.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <div>{cat.name}</div>
                  {cat.m3uPlaylistUrl && (
                    <div className="text-xs text-green-400">Has M3U Playlist</div>
                  )}
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
