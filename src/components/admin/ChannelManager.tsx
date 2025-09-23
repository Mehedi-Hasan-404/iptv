'use client';
import { useState, useEffect, FormEvent } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AdminChannel, Category } from '@/types';

export default function ChannelManager() {
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<Partial<AdminChannel>>({ 
    name: '', 
    logoUrl: '', 
    streamUrl: '', 
    categoryId: '',
    authCookie: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);

  useEffect(() => {
    const catQuery = query(collection(db, "categories"), orderBy("name"));
    const unsubCats = onSnapshot(catQuery, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });

    const chanQuery = query(collection(db, "channels"), orderBy("name"));
    const unsubChans = onSnapshot(chanQuery, (snap) => {
      setChannels(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminChannel)));
    });
    
    return () => { 
      unsubCats(); 
      unsubChans(); 
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const category = categories.find(c => c.id === current.categoryId);
    if (!category) {
      alert("Please select a category.");
      return;
    }

    const data = {
      name: current.name!,
      logoUrl: current.logoUrl!,
      streamUrl: current.streamUrl!,
      categoryId: current.categoryId!,
      categoryName: category.name,
      authCookie: current.authCookie || undefined
    };

    try {
      if (isEditing && current.id) {
        await updateDoc(doc(db, 'channels', current.id), data);
      } else {
        await addDoc(collection(db, 'channels'), data);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving channel:', error);
      alert('Error saving channel. Please try again.');
    }
  };

  const handleEdit = (chan: AdminChannel) => {
    setIsEditing(true);
    setCurrent(chan);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this channel?')) {
      try {
        await deleteDoc(doc(db, 'channels', id));
      } catch (error) {
        console.error('Error deleting channel:', error);
        alert('Error deleting channel. Please try again.');
      }
    }
  };
  
  const resetForm = () => {
    setIsEditing(false);
    setCurrent({ name: '', logoUrl: '', streamUrl: '', categoryId: '', authCookie: '' });
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="md:col-span-1 bg-gray-800 p-6 rounded-lg space-y-4">
        <h3 className="text-xl font-semibold">{isEditing ? 'Edit' : 'Add'} Channel</h3>
        <input 
          value={current.name || ''} 
          onChange={e => setCurrent({...current, name: e.target.value})} 
          placeholder="Channel Name" 
          className="form-input" 
          required 
        />
        <input 
          type="url" 
          value={current.logoUrl || ''} 
          onChange={e => setCurrent({...current, logoUrl: e.target.value})} 
          placeholder="Logo URL" 
          className="form-input" 
          required 
        />
        <input 
          type="url" 
          value={current.streamUrl || ''} 
          onChange={e => setCurrent({...current, streamUrl: e.target.value})} 
          placeholder="Stream URL (m3u8)" 
          className="form-input" 
          required 
        />
        
        {/* Auth Cookie Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Authentication Cookie (Optional)</label>
            <button 
              type="button" 
              onClick={() => setShowCookieHelp(!showCookieHelp)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showCookieHelp ? 'Hide' : 'Show'} Help
            </button>
          </div>
          <textarea 
            value={current.authCookie || ''} 
            onChange={e => setCurrent({...current, authCookie: e.target.value})} 
            placeholder="Edge-Cache-Cookie=URLPrefix=..." 
            className="form-input min-h-[80px] font-mono text-xs"
            rows={3}
          />
          {showCookieHelp && (
            <div className="text-xs text-gray-400 bg-gray-900 p-3 rounded">
              <p className="mb-2">For streams requiring authentication cookies (like Toffee Live), paste the full cookie string here.</p>
              <p className="mb-2">Example format:</p>
              <code className="block bg-gray-800 p-2 rounded text-xs break-all">
                Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1758353121:KeyName=prod_linear:Signature=QLRLzc92w3bxDiRSjEpzqqXETKXc6W4Jy0Qrrs-zj_1BHc4_2fxDdU1EOnYIIkoDh8BSNK_0j5aQn9dilTI5Dg
              </code>
            </div>
          )}
        </div>
        
        <select 
          value={current.categoryId || ''} 
          onChange={e => setCurrent({...current, categoryId: e.target.value})} 
          className="form-input" 
          required
        >
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        
        <div className="flex gap-2">
          <button type="submit" className="play-btn flex-grow">{isEditing ? 'Update' : 'Save'}</button>
          {isEditing && (
            <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 rounded">
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Existing Channels</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {channels.map(chan => (
            <div key={chan.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
              <div className='flex items-center gap-3'>
                <img src={chan.logoUrl} alt={chan.name} className="w-10 h-10 object-contain" />
                <div>
                  <p>{chan.name}</p>
                  <p className='text-xs text-gray-400'>{chan.categoryName}</p>
                  {chan.authCookie && <p className='text-xs text-green-400'>🔐 Auth Required</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleEdit(chan)} className="text-sm text-blue-400">Edit</button>
                <button onClick={() => handleDelete(chan.id)} className="text-sm text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
