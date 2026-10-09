import React, { useState, useEffect } from 'react';
import { Song } from '../types/music';
import {
  Search,
  Youtube,
  Play,
  Plus,
  Check,
  Loader2,
  Sparkles,
  X,
  Music2,
  Radio,
  Flame,
  Disc3,
  Layers,
  HeartHandshake,
} from 'lucide-react';

interface YouTubeExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySong: (song: Song) => void;
  onAddSongToLibrary: (song: Song) => void;
  existingSongIds: string[];
}

const POPULAR_QUERIES = [
  { label: '🔥 Bollywood 2024 Hits', query: 'Latest Bollywood Songs 2024', category: 'regular' },
  { label: '🎧 Bollywood Lo-Fi Slowed', query: 'Bollywood Lo-Fi Slowed Reverb Songs', category: 'lofi' },
  { label: '⚡ Bollywood DJ Club Remix', query: 'Bollywood Party Club Remix DJ Chetas', category: 'remix' },
  { label: '🪕 Romantic Bollywood Mashup', query: 'Best Bollywood Romantic Mashup Medley', category: 'mashup' },
  { label: '💖 Arijit Singh Melodies', query: 'Arijit Singh Best Songs Jukebox', category: 'regular' },
  { label: '🌙 Midnight Hindi Chill', query: 'Hindi Chill Lo-Fi Midnight Vibes', category: 'lofi' },
  { label: '✨ 90s Evergreen Retro', query: '90s Evergreen Bollywood Hits', category: 'regular' },
];

export const YouTubeExploreModal: React.FC<YouTubeExploreModalProps> = ({
  isOpen,
  onClose,
  onPlaySong,
  onAddSongToLibrary,
  existingSongIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('Bollywood Trending Songs 2024');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'regular' | 'remix' | 'lofi' | 'mashup'>('all');
  const [results, setResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set(existingSongIds));

  useEffect(() => {
    setAddedIds(new Set(existingSongIds));
  }, [existingSongIds]);

  const handleFetchYouTube = async (queryToSearch = searchQuery, cat = categoryFilter) => {
    if (!queryToSearch.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(queryToSearch)}&category=${cat}`
      );
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          res.status === 404
            ? 'YouTube search API is unavailable on this deployment. Please redeploy the latest version.'
            : 'The server returned an unexpected response. Please try again shortly.'
        );
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `YouTube search failed (${res.status}).`);
      if (data.success && Array.isArray(data.songs)) {
        setResults(data.songs);
      } else {
        setError(data.error || 'No songs found on YouTube.');
      }
    } catch (err: any) {
      console.error('Fetch YouTube error:', err);
      setError(err?.message || 'Failed to fetch songs from YouTube.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial search on first open
  useEffect(() => {
    if (isOpen && results.length === 0) {
      handleFetchYouTube('Bollywood Trending Songs 2024', 'all');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = (song: Song) => {
    onAddSongToLibrary(song);
    setAddedIds((prev) => new Set(prev).add(song.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#181818] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-800/80 bg-[#121212]/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-md">
              <Youtube size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Fetch from YouTube & Online Hub
                <span className="text-xs bg-red-950 text-red-400 border border-red-800/60 font-semibold px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Explore, stream, and save Bollywood Regular songs, Remixes, Lo-Fi, and Mashups directly to Spotify
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-6 pb-3 space-y-4 bg-[#181818]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchYouTube();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Bollywood songs, artists, remixes, lofi, or mashups (e.g. Arijit Singh, Chahun Main Ya Naa, Jawan Remix)..."
                className="w-full pl-11 pr-4 py-3 bg-[#242424] border border-zinc-700/80 rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-sm rounded-full transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Fetch YouTube</span>
                </>
              )}
            </button>
          </form>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-zinc-400 font-semibold mr-1">Category:</span>
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'regular', label: 'Original Tracks' },
              { id: 'remix', label: 'Club & DJ Remix' },
              { id: 'lofi', label: 'Lo-Fi Chill & Slowed' },
              { id: 'mashup', label: 'Acoustic Mashup' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  const newCat = cat.id as any;
                  setCategoryFilter(newCat);
                  handleFetchYouTube(searchQuery, newCat);
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-[#1db954] text-black font-bold shadow-md'
                    : 'bg-[#282828] text-zinc-300 hover:bg-[#333333]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Search Preset Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs text-zinc-500 shrink-0 mr-1">Trending:</span>
            {POPULAR_QUERIES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setSearchQuery(preset.query);
                  setCategoryFilter(preset.category as any);
                  handleFetchYouTube(preset.query, preset.category as any);
                }}
                className="text-xs px-3 py-1 rounded-full bg-[#242424] hover:bg-[#303030] border border-zinc-800 text-zinc-300 hover:text-white shrink-0 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2.5">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 size={36} className="text-[#1db954] animate-spin mb-3" />
              <p className="text-sm font-semibold text-zinc-200">
                Fetching Bollywood catalog from YouTube...
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Searching official channels (T-Series, Sony Music, Zee Music) with original thumbnails
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-center text-sm text-red-300">
              {error}
            </div>
          )}

          {!isLoading && !error && results.length === 0 && (
            <div className="py-20 text-center text-zinc-500">
              <Music2 size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No songs found. Try a different query above!</p>
            </div>
          )}

          {!isLoading &&
            results.map((song, idx) => {
              const isAdded = addedIds.has(song.id);
              return (
                <div
                  key={song.id || idx}
                  className="group flex items-center justify-between p-3 rounded-xl bg-[#202020] hover:bg-[#2a2a2a] border border-zinc-800/60 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as any).src =
                            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <button
                        onClick={() => onPlaySong(song)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[#1db954]"
                        title="Play now"
                      >
                        <Play size={22} fill="currentColor" />
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-[#1db954] transition-colors">
                          {song.title}
                        </h4>
                        {song.category && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              song.category === 'lofi'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
                                : song.category === 'remix'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                                : song.category === 'mashup'
                                ? 'bg-pink-950 text-pink-300 border border-pink-800/50'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                            }`}
                          >
                            {song.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 truncate">
                        <span className="truncate">{song.artist}</span>
                        {song.album && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-500 truncate">{song.album}</span>
                          </>
                        )}
                        {song.channelTitle && (
                          <>
                            <span>•</span>
                            <span className="text-red-400 font-medium truncate flex items-center gap-1">
                              <Youtube size={11} /> {song.channelTitle}
                            </span>
                          </>
                        )}
                      </div>

                      {song.titleDevanagari && (
                        <p className="text-[11px] text-zinc-500 font-devanagari mt-0.5">
                          {song.titleDevanagari}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => onPlaySong(song)}
                      className="px-3 py-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full flex items-center gap-1.5 shadow transition-transform active:scale-95"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play</span>
                    </button>

                    <button
                      onClick={() => handleAdd(song)}
                      disabled={isAdded}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all ${
                        isAdded
                          ? 'bg-zinc-800 text-zinc-400 cursor-default'
                          : 'bg-[#282828] hover:bg-[#333333] text-white border border-zinc-700'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} className="text-[#1db954]" />
                          <span>In Library</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Add to Spotify</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-[#121212] border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1db954]" />
            <span>High quality original YouTube audio & cover art streaming</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#282828] hover:bg-[#383838] text-white font-medium transition-colors"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
