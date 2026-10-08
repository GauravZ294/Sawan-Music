import React, { useState } from 'react';
import { Song, Playlist } from '../types/music';
import { X, Save, Music, Image as ImageIcon, Sparkles } from 'lucide-react';

interface SongEditorModalProps {
  song: Song;
  playlists: Playlist[];
  onSave: (updatedSong: Song) => void;
  onClose: () => void;
}

export const SongEditorModal: React.FC<SongEditorModalProps> = ({
  song,
  playlists,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [album, setAlbum] = useState(song.album);
  const [genre, setGenre] = useState(song.genre);
  const [year, setYear] = useState(song.year);
  const [mood, setMood] = useState(song.mood);
  const [coverUrl, setCoverUrl] = useState(song.coverUrl);
  const [lyrics, setLyrics] = useState(song.lyrics);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>(song.playlistIds || []);

  const togglePlaylist = (id: string) => {
    setSelectedPlaylists((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...song,
      title,
      artist,
      album,
      genre,
      year: Number(year) || 2026,
      mood,
      coverUrl,
      lyrics,
      playlistIds: selectedPlaylists,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Music size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Track Metadata & Organization</h2>
              <p className="text-xs text-zinc-400">Update song tags, artwork, lyrics, and playlists</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Song Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Artist / Singers</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Album / Movie</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Release Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Mood Tag</label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Cover Art URL with live thumbnail and custom upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-300">Cover Artwork Thumbnail</label>
              <label className="text-[11px] text-rose-400 hover:underline cursor-pointer flex items-center gap-1">
                <ImageIcon size={12} />
                Upload New Image File
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setCoverUrl(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={coverUrl}
                alt="preview"
                className="w-14 h-14 rounded-xl object-cover border border-zinc-800 shrink-0 bg-zinc-950 shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200';
                }}
              />
              <input
                type="text"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                placeholder="Image URL or Base64 data..."
              />
            </div>
          </div>

          {/* Add to Playlists */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">Assign to Playlists</label>
            <div className="flex flex-wrap gap-2">
              {playlists.map((pl) => {
                const isSelected = selectedPlaylists.includes(pl.id);
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => togglePlaylist(pl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: pl.color || '#rose-500' }}
                    />
                    {pl.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lyrics */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Lyrics (Full text / Devanagari)</label>
            <textarea
              rows={5}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 font-devanagari text-sm text-zinc-200 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/40"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
