import React, { useState } from 'react';
import { Playlist } from '../types/music';
import { X, ListMusic, Plus } from 'lucide-react';

interface CreatePlaylistModalProps {
  onCreate: (newPlaylist: Playlist) => void;
  onClose: () => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  onCreate,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
  );
  const [color, setColor] = useState('#e11d48');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom collection of favorite melodies.',
      coverUrl: coverUrl.trim(),
      color,
      songIds: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    onCreate(newPl);
    onClose();
  };

  const colorPresets = ['#e11d48', '#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <ListMusic size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Playlist</h2>
              <p className="text-xs text-zinc-400">Organize your songs into a dedicated playlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-zinc-300 font-semibold block mb-1">Playlist Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Dil Ki Dhun (Acoustic Romances)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-zinc-300 font-semibold block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this playlist special..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-zinc-300 font-semibold block mb-1.5">Theme Accent Color</label>
            <div className="flex items-center gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors shadow-lg shadow-rose-950/40"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
