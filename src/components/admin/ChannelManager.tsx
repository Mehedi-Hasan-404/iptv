'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AdminChannel, Category } from '@/types';

export default function ChannelManager() {
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<Partial<AdminChannel>>({
    name: '',
    logoUrl: '',
    streamUrl: '',
    streamUrl2: '',
    streamUrl3: '',
    streamUrl4: '',
    streamUrl5: '',
    categoryId: '',
    authCookie: '',
    isM3UPlaylist: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // fetch categories and channels in real-time
  useEffect(() => {
    const catQuery = query(collection(db, 'categories'), orderBy('name'));
    const unsubCats = onSnapshot(catQuery, (snap) => {
      setCategories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      );
    });

    const chanQuery = query(collection(db, 'channels'), orderBy('name'));
    const unsubChans = onSnapshot(chanQuery, (snap) => {
      setChannels(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminChannel))
      );
    });

    return () => {
      unsubCats();
      unsubChans();
    };
  }, []);

  // save or update channel
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const category = categories.find((c) => c.id === current.categoryId);
      if (!category) {
        alert('Please select a category.');
        setLoading(false);
        return;
      }

      // Prepare the data object with all optional stream URLs
      const data: any = {
        name: current.name?.trim() ?? '',
        logoUrl: current.logoUrl?.trim() ?? '',
        streamUrl: current.streamUrl?.trim() ?? '',
        categoryId: current.categoryId ?? '',
        categoryName: category.name,
        authCookie: current.authCookie?.trim() || null,
        isM3UPlaylist: current.isM3UPlaylist || false,
      };

      // Add optional stream URLs only if they have values
      if (current.streamUrl2?.trim()) {
        data.streamUrl2 = current.streamUrl2.trim();
      }
      if (current.streamUrl3?.trim()) {
        data.streamUrl3 = current.streamUrl3.trim();
      }
      if (current.streamUrl4?.trim()) {
        data.streamUrl4 = current.streamUrl4.trim();
      }
      if (current.streamUrl5?.trim()) {
        data.streamUrl5 = current.streamUrl5.trim();
      }

      if (isEditing && current.id) {
        await updateDoc(doc(db, 'channels', current.id), data);
        alert('Channel updated successfully!');
      } else {
        await addDoc(collection(db, 'channels'), data);
        alert('Channel added successfully!');
      }
      resetForm();
    } catch (error: any) {
      console.error('Error saving channel:', error);
      alert(`Error saving channel: ${error.message}`);
    } finally {
      setLoading(false);
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
        alert('Channel deleted successfully!');
      } catch (error: any) {
        console.error('Error deleting channel:', error);
        alert(`Error deleting channel: ${error.message}`);
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrent({
      name: '',
      logoUrl: '',
      streamUrl: '',
      streamUrl2: '',
      streamUrl3: '',
      streamUrl4: '',
      streamUrl5: '',
      categoryId: '',
      authCookie: '',
      isM3UPlaylist: false,
    });
  };

  const countStreamUrls = (channel: AdminChannel): number => {
    let count = channel.streamUrl ? 1 : 0;
    if (channel.streamUrl2) count++;
    if (channel.streamUrl3) count++;
    if (channel.streamUrl4) count++;
    if (channel.streamUrl5) count++;
    return count;
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Channel Form */}
      <form
        onSubmit={handleSubmit}
        className="md:col-span-1 bg-gray-800 p-6 rounded-lg space-y-4"
      >
        <h3 className="text-xl font-semibold">
          {isEditing ? 'Edit' : 'Add'} Channel
        </h3>

        <input
          value={current.name ?? ''}
          onChange={(e) => setCurrent({ ...current, name: e.target.value })}
          placeholder="Channel Name"
          className="form-input"
          required
        />

        <input
          type="url"
          value={current.logoUrl ?? ''}
          onChange={(e) => setCurrent({ ...current, logoUrl: e.target.value })}
          placeholder="Logo URL"
          className="form-input"
          required
        />

        {/* Primary Stream URL */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Primary Stream URL (Required)</label>
          <input
            type="url"
            value={current.streamUrl ?? ''}
            onChange={(e) => setCurrent({ ...current, streamUrl: e.target.value })}
            placeholder="Primary Stream URL (m3u8)"
            className="form-input"
            required
          />
        </div>

        {/* Secondary Stream URLs */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Secondary Stream URLs (Optional)</label>
          
          <input
            type="url"
            value={current.streamUrl2 ?? ''}
            onChange={(e) => setCurrent({ ...current, streamUrl2: e.target.value })}
            placeholder="Server 2 Stream URL (m3u8)"
            className="form-input"
          />
          
          <input
            type="url"
            value={current.streamUrl3 ?? ''}
            onChange={(e) => setCurrent({ ...current, streamUrl3: e.target.value })}
            placeholder="Server 3 Stream URL (m3u8)"
            className="form-input"
          />
          
          <input
            type="url"
            value={current.streamUrl4 ?? ''}
            onChange={(e) => setCurrent({ ...current, streamUrl4: e.target.value })}
            placeholder="Server 4 Stream URL (m3u8)"
            className="form-input"
          />
          
          <input
            type="url"
            value={current.streamUrl5 ?? ''}
            onChange={(e) => setCurrent({ ...current, streamUrl5: e.target.value })}
            placeholder="Server 5 Stream URL (m3u8)"
            className="form-input"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">
            Authentication Cookie (Optional)
          </label>
          <textarea
            value={current.authCookie ?? ''}
            onChange={(e) =>
              setCurrent({ ...current, authCookie: e.target.value })
            }
            placeholder="Edge-Cache-Cookie=URLPrefix=..."
            className="form-input min-h-[80px] font-mono text-xs"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={current.isM3UPlaylist || false}
              onChange={(e) =>
                setCurrent({ ...current, isM3UPlaylist: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm text-gray-400">M3U Playlist</span>
          </label>
          <p className="text-xs text-gray-500">
            Check this if the stream URL is an M3U playlist file
          </p>
        </div>

        <select
          value={current.categoryId ?? ''}
          onChange={(e) => setCurrent({ ...current, categoryId: e.target.value })}
          className="form-input"
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="play-btn flex-grow">
            {loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Channel List */}
      <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">
          Existing Channels ({channels.length})
        </h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {channels.map((chan) => (
            <div
              key={chan.id}
              className="flex justify-between items-center bg-gray-700 p-3 rounded"
            >
              <div className="flex items-center gap-3">
                <img
                  src={chan.logoUrl}
                  alt={chan.name}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <p className="font-medium">{chan.name}</p>
                  <p className="text-xs text-gray-400">{chan.categoryName}</p>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <span className="text-blue-400">
                      {countStreamUrls(chan)} Server{countStreamUrls(chan) !== 1 ? 's' : ''}
                    </span>
                    {chan.authCookie && (
                      <span className="text-green-400">🔐 Auth</span>
                    )}
                    {chan.isM3UPlaylist && (
                      <span className="text-yellow-200">📋 M3U</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(chan)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(chan.id)}
                  className="text-sm text-red-500 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
