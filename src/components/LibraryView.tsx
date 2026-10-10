import React, { useState, useMemo, useEffect } from 'react';
import { Song, Playlist, ViewMode } from '../types/music';
import {
  Search,
  Play,
  Pause,
  Heart,
  MoreVertical,
  Clock,
  Sparkles,
  Edit,
  Trash2,
  Plus,
  Filter,
  ArrowUpDown,
  Music,
  Disc,
  Mic2,
  FolderPlus,
  Share2,
  Download,
  HardDrive,
  Youtube,
  Tv,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Radio,
  ExternalLink,
  Tags,
  Tag,
  Coffee,
  Headphones,
  Sliders,
  Zap,
  Sun,
  Moon,
  Sunrise,
} from 'lucide-react';
import { MOOD_DEFINITIONS } from '../utils/aiMoodTagger';
import type { MusicProfile } from './AccountModal';

interface LibraryViewProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  songs: Song[];
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  activeSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  onToggleFavorite: (songId: string) => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (songId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onOpenAiStudio: () => void;
  onOpenImmersiveMode: () => void;
  onOpenSystemScanner: () => void;
  onBrowseCatalog: () => void;
  onToggleVideoCanvas: () => void;
  isVideoCanvasOpen: boolean;
  // AI Mood Tagger props
  onOpenMoodTagger?: () => void;
  onTagSongMood?: (song: Song) => void;
  // Dolby Audio Enhancer & Loader props
  onOpenDolbyModal?: () => void;
  profile?: MusicProfile | null;
  onOpenAccount?: (mode: 'signup' | 'login') => void;
  onSignOut?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  currentView,
  onSelectView,
  songs,
  playlists,
  selectedPlaylistId,
  activeSong,
  isPlaying,
  onPlaySong,
  onPauseSong,
  onToggleFavorite,
  onEditSong,
  onDeleteSong,
  onSelectPlaylist,
  onCreatePlaylist,
  onOpenImmersiveMode,
  onBrowseCatalog,
  onToggleVideoCanvas,
  isVideoCanvasOpen,
  onOpenMoodTagger,
  onTagSongMood,
  onOpenDolbyModal,
  profile = null,
  onOpenAccount,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'regular' | 'remix' | 'lofi' | 'mashup'>('all');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [activeMenuSongId, setActiveMenuSongId] = useState<string | null>(null);

  // Dynamic system time ticker updating every 15 seconds
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic system time-based greeting & subtitle
  const greetingInfo = useMemo(() => {
    const hour = currentTime.getHours();
    const timeStr = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (hour >= 4 && hour < 12) {
      return {
        title: 'Good morning',
        icon: '☀️',
        subtitle: 'Start your morning with peaceful melodies, morning devotional ragas & fresh chai vibes.',
        period: 'morning',
        timeStr,
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        title: 'Good afternoon',
        icon: '🌤️',
        subtitle: 'Power through your day with high-energy Bollywood, Punjabi beats & Pan-India chartbusters.',
        period: 'afternoon',
        timeStr,
      };
    }
    if (hour >= 17 && hour < 22) {
      return {
        title: 'Good evening',
        icon: '🌆',
        subtitle: 'Unwind with dance remixes, romantic acoustic medleys & golden-hour sunset rhythms.',
        period: 'evening',
        timeStr,
      };
    }
    return {
      title: 'Late Night Vibes',
      icon: '🌙',
      subtitle: 'Midnight lo-fi, slowed + reverb, and peaceful acoustic unplugged soundtracks for deep relaxation.',
      period: 'night',
      timeStr,
    };
  }, [currentTime]);

  // Filter songs based on current view, category filter, mood filter, and search query
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Filter by view
    if (currentView === 'favorites') {
      result = result.filter((s) => s.isFavorite);
    } else if (currentView === 'system-downloads') {
      result = result.filter((s) => s.isSystemMedia || s.playlistIds?.includes('system-downloads'));
    } else if (currentView === 'regular') {
      result = result.filter((s) => s.category === 'regular');
    } else if (currentView === 'remix') {
      result = result.filter((s) => s.category === 'remix');
    } else if (currentView === 'lofi') {
      result = result.filter((s) => s.category === 'lofi');
    } else if (currentView === 'mashup') {
      result = result.filter((s) => s.category === 'mashup');
    } else if (currentView === 'playlist-detail' && selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId);
      if (pl) {
        result = result.filter((s) => pl.songIds.includes(s.id));
      }
    }

    // Filter by in-page category filter
    if (categoryFilter !== 'all') {
      result = result.filter((s) => s.category === categoryFilter);
    }

    // Filter by Genre
    if (genreFilter !== 'all') {
      result = result.filter((s) => (s.genre || '').toLowerCase().includes(genreFilter.toLowerCase()));
    }

    // Filter by AI Mood Tag
    if (moodFilter !== 'all') {
      result = result.filter((s) => {
        const hasTag = s.moodLabels && s.moodLabels.includes(moodFilter);
        const hasPrimary = s.aiMoodAnalysis?.primaryMood?.toLowerCase() === moodFilter.toLowerCase();
        const hasMoodText = s.mood?.toLowerCase().includes(moodFilter.toLowerCase());
        return hasTag || hasPrimary || hasMoodText;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.titleDevanagari && s.titleDevanagari.includes(q)) ||
          s.artist.toLowerCase().includes(q) ||
          (s.artistDevanagari && s.artistDevanagari.includes(q)) ||
          s.album.toLowerCase().includes(q) ||
          (s.genre && s.genre.toLowerCase().includes(q)) ||
          (s.language && s.language.toLowerCase().includes(q)) ||
          (s.mood && s.mood.toLowerCase().includes(q)) ||
          (s.moodLabels && s.moodLabels.some((l) => l.toLowerCase().includes(q))) ||
          (s.lyrics && s.lyrics.toLowerCase().includes(q))
      );
    }

    return result;
  }, [songs, playlists, currentView, selectedPlaylistId, categoryFilter, moodFilter, genreFilter, searchQuery]);

  // Specific categories for home shelf rows
  const regularHits = useMemo(() => songs.filter((s) => s.category === 'regular'), [songs]);
  const lofiHits = useMemo(() => songs.filter((s) => s.category === 'lofi'), [songs]);
  const remixHits = useMemo(() => songs.filter((s) => s.category === 'remix'), [songs]);
  const mashupHits = useMemo(() => songs.filter((s) => s.category === 'mashup'), [songs]);

  const currentPlaylist = useMemo(() => {
    if (currentView === 'playlist-detail' && selectedPlaylistId) {
      return playlists.find((p) => p.id === selectedPlaylistId) || null;
    }
    return null;
  }, [playlists, currentView, selectedPlaylistId]);

  const formatDuration = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRowClick = (song: Song) => {
    if (activeSong?.id === song.id && isPlaying) {
      onPauseSong();
    } else {
      onPlaySong(song);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#121212] flex flex-col min-w-0 overflow-hidden text-zinc-100 select-none">
      {/* Spotify Top Bar */}
      <header className="sticky top-0 z-30 h-16 px-6 bg-[#121212]/95 backdrop-blur-md flex items-center justify-between border-b border-zinc-800/40 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          {/* Back & Forward Circles */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Spotify Pill Search Bar */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              id="library-search"
              name="librarySearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-catalog-search aria-label="Search available songs" placeholder="Search available songs, artists, albums, or mood..."
              className="w-full pl-10 pr-4 py-2 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] border border-transparent focus:border-zinc-600 rounded-full text-xs text-white placeholder-zinc-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="relative flex items-center gap-2.5 shrink-0 ml-4">
          {profile ? (
            <div className="relative">
              <button onClick={() => setIsAccountMenuOpen((open) => !open)} aria-label="Open account menu" aria-expanded={isAccountMenuOpen} className="flex items-center gap-2 rounded-full bg-zinc-800 p-1 pr-2 text-white hover:bg-zinc-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#1db954] to-emerald-300 text-xs font-extrabold text-black">{profile.name.trim().slice(0, 1).toUpperCase() || 'S'}</span>
                <span className="hidden max-w-24 truncate text-xs font-semibold sm:inline">{profile.name}</span>
              </button>
              {isAccountMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-zinc-700 bg-[#282828] p-2 text-sm text-zinc-100 shadow-2xl">
                  <div className="border-b border-zinc-700 px-3 py-2">
                    <p className="font-bold text-white">{profile.name}</p>
                    <p className="truncate text-xs text-zinc-400">{profile.email}</p>
                  </div>
                  <button onClick={() => { setIsAccountMenuOpen(false); onSelectView('all-songs'); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-700">Recently played</button>
                  <button onClick={() => { setIsAccountMenuOpen(false); onSignOut?.(); }} className="mt-1 block w-full border-t border-zinc-700 px-3 pt-3 pb-2 text-left hover:text-[#1ed760]">Log out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => onOpenAccount?.('signup')} className="rounded-full px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white">Sign up</button>
              <button onClick={() => onOpenAccount?.('login')} className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-black transition hover:scale-[1.03]">Log in</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Scrollable View */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 scroll-smooth">
        {/* Dynamic Header Banner */}
        {currentPlaylist ? (
          // Playlist Header Banner
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 p-6 rounded-2xl bg-gradient-to-b from-zinc-800 to-[#181818] border border-zinc-700/40 shadow-xl">
            <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0 bg-black">
              <img
                src={currentPlaylist.coverUrl}
                alt={currentPlaylist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider">
                Public Playlist
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                {currentPlaylist.name}
              </h1>
              <p className="text-sm text-zinc-300 max-w-2xl">{currentPlaylist.description}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400 pt-2 font-medium">
                <span className="text-white font-bold">SwarSync Curators</span>
                <span>•</span>
                <span>{filteredSongs.length} tracks</span>
                <span>•</span>
                <span>Bollywood Special</span>
              </div>
            </div>
          </div>
        ) : (
          // Home Banner
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-2xl">{greetingInfo.icon}</span>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {greetingInfo.title}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-800 text-emerald-400 border border-zinc-700/60 shadow-inner flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{greetingInfo.timeStr}</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {greetingInfo.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenDolbyModal && (
                  <button
                    onClick={onOpenDolbyModal}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30 transition-colors shadow-sm"
                  >
                    <Zap size={13} className="fill-emerald-400" />
                    <span>Dolby 3D Active</span>
                  </button>
                )}
                {onOpenMoodTagger && (
                  <button
                    onClick={onOpenMoodTagger}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30 transition-colors"
                  >
                    <Tags size={13} />
                    <span>AI Mood Classifier</span>
                  </button>
                )}
              </div>
            </div>

            {/* Spotify 6-Grid Quick Access Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  id: 'chahun-main-ya-naa',
                  title: 'Chahun Main Ya Naa',
                  subtitle: 'Arijit Singh & Palak Muchhal',
                  cover:
                    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
                  songId: 'chahun-main-ya-naa',
                },
                {
                  id: 'tum-hi-ho',
                  title: 'Tum Hi Ho',
                  subtitle: 'Aashiqui 2 Anthem',
                  cover:
                    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
                  songId: 'tum-hi-ho',
                },
                {
                  id: 'workout-shelf',
                  title: 'Bollywood Workout & Cardio',
                  subtitle: 'High BPM Gym & Fitness Beats',
                  cover:
                    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
                  mood: 'Workout',
                },
                {
                  id: 'remix-shelf',
                  title: 'Club & Dance Party Remixes',
                  subtitle: 'Party Bangers & DJ Chetas',
                  cover:
                    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
                  mood: 'Party',
                },
                {
                  id: 'lofi-shelf',
                  title: 'Bollywood Relaxing Lo-Fi',
                  subtitle: 'Midnight Chill & De-stress',
                  cover:
                    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
                  mood: 'Relaxing',
                },
                {
                  id: 'youtube-shelf',
                  title: 'Browse song catalog',
                  subtitle: 'Search songs available on Sawan',
                  cover:
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
                  action: onBrowseCatalog,
                },
              ].map((tile) => {
                const targetSong = tile.songId ? songs.find((s) => s.id === tile.songId) : null;
                const isThisPlaying = targetSong && activeSong?.id === targetSong.id && isPlaying;

                return (
                  <div
                    key={tile.id}
                    onClick={() => {
                      if (tile.action) {
                        tile.action();
                      } else if (targetSong) {
                        if (isThisPlaying) onPauseSong();
                        else onPlaySong(targetSong);
                      } else if (tile.mood) {
                        setMoodFilter(tile.mood);
                      }
                    }}
                    className="group relative flex items-center bg-[#282828]/60 hover:bg-[#282828] rounded-md overflow-hidden cursor-pointer transition-all shadow-md"
                  >
                    <div className="w-16 h-16 shrink-0 bg-black">
                      <img src={tile.cover} alt={tile.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="px-4 py-2 min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">{tile.title}</h4>
                      <p className="text-xs text-zinc-400 truncate">{tile.subtitle}</p>
                    </div>

                    <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-xl translate-y-1 group-hover:translate-y-0 duration-200">
                      <div className="w-10 h-10 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 flex items-center justify-center text-black shadow-lg">
                        {isThisPlaying ? (
                          <Pause size={18} fill="currentColor" />
                        ) : (
                          <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Format Categories & AI Mood Labels */}
        <div className="space-y-2.5 bg-[#18181b]/50 p-3 rounded-2xl border border-zinc-800/60 shadow-md">
          {/* Format Categories Filter (Originals, Lo-Fi, Remix, Mashup) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 pr-1">
              Format:
            </span>
            {[
              { id: 'all', label: 'All Formats' },
              { id: 'regular', label: '🔥 Originals & Film Hits' },
              { id: 'lofi', label: '🎧 Lo-Fi & Slowed' },
              { id: 'remix', label: '⚡ Club Remixes' },
              { id: 'mashup', label: '🪕 Acoustic Mashups' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`text-xs px-3.5 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#242424] text-zinc-300 hover:bg-[#303030] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* AI Mood Labels Filter Bar (Workout, Relaxing, Party, Romantic, etc.) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-zinc-800/40 pt-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 shrink-0 pr-1">
              <Tags size={13} />
              AI Mood:
            </span>

            {[
              { id: 'all', label: 'All Moods', icon: null },
              { id: 'Workout', label: 'Workout', icon: Flame, color: 'text-orange-400' },
              { id: 'Relaxing', label: 'Relaxing', icon: Coffee, color: 'text-emerald-400' },
              { id: 'Party', label: 'Party', icon: Sparkles, color: 'text-fuchsia-400' },
              { id: 'Romantic', label: 'Romantic', icon: Heart, color: 'text-rose-400' },
              { id: 'Focus', label: 'Focus', icon: Headphones, color: 'text-blue-400' },
            ].map((mood) => {
              const Icon = mood.icon;
              const isSelected = moodFilter === mood.id;
              return (
                <button
                  key={mood.id}
                  onClick={() => setMoodFilter(mood.id)}
                  className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1db954] text-black shadow-md shadow-[#1db954]/20 scale-102 font-extrabold'
                      : 'bg-[#1e1e1e] text-zinc-300 hover:bg-[#282828] border border-zinc-800'
                  }`}
                >
                  {Icon && <Icon size={13} className={isSelected ? 'text-black' : mood.color} />}
                  <span>{mood.label}</span>
                </button>
              );
            })}

            {onOpenMoodTagger && (
              <button
                onClick={onOpenMoodTagger}
                className="text-[11px] px-2.5 py-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-full font-bold flex items-center gap-1 ml-auto shrink-0 transition-colors"
              >
                <Sparkles size={12} />
                <span>Auto-Tag with AI</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Rows when 'all' is selected: Show curated Spotify rows */}
        {categoryFilter === 'all' && moodFilter === 'all' && !searchQuery && currentView === 'all-songs' && (
          <div className="space-y-8">
            {/* Shelf 1: Bollywood Originals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    🔥 Bollywood Originals & Chartbusters
                  </h3>
                  <p className="text-xs text-zinc-400">
                    The authentic studio masterpieces: Aashiqui 2, Brahmāstra, Shershaah
                  </p>
                </div>
                <button
                  onClick={() => setCategoryFilter('regular')}
                  className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors"
                >
                  Show all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {regularHits.slice(0, 5).map((song) => {
                  const isThisPlaying = activeSong?.id === song.id && isPlaying;
                  return (
                    <div
                      key={song.id}
                      onClick={() => handleRowClick(song)}
                      className="group p-3.5 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer transition-all duration-200 flex flex-col shadow-md"
                    >
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-black mb-3 shadow-lg">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                          <div className="w-11 h-11 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 flex items-center justify-center text-black shadow-xl">
                            {isThisPlaying ? (
                              <Pause size={20} fill="currentColor" />
                            ) : (
                              <Play size={20} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                      <h4
                        className={`text-sm font-bold truncate ${
                          activeSong?.id === song.id ? 'text-[#1db954]' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-1">{song.artist}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shelf 2: Lo-Fi Chill & Relaxing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    🌿 Bollywood Relaxing & Lo-Fi Chill
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Acoustic calm, slowed & reverb aesthetics for late-night relaxation
                  </p>
                </div>
                <button
                  onClick={() => setMoodFilter('Relaxing')}
                  className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors"
                >
                  Show all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {lofiHits.slice(0, 5).map((song) => {
                  const isThisPlaying = activeSong?.id === song.id && isPlaying;
                  return (
                    <div
                      key={song.id}
                      onClick={() => handleRowClick(song)}
                      className="group p-3.5 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer transition-all duration-200 flex flex-col shadow-md"
                    >
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-black mb-3 shadow-lg">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                          <div className="w-11 h-11 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 flex items-center justify-center text-black shadow-xl">
                            {isThisPlaying ? (
                              <Pause size={20} fill="currentColor" />
                            ) : (
                              <Play size={20} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                      <h4
                        className={`text-sm font-bold truncate ${
                          activeSong?.id === song.id ? 'text-[#1db954]' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-1">{song.artist}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shelf 3: Club Remixes & Workout Fuel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    ⚡ Workout Fuel & Party Bangers
                  </h3>
                  <p className="text-xs text-zinc-400">
                    High BPM workout music, club remixes, and bass-boosted fitness anthems
                  </p>
                </div>
                <button
                  onClick={() => setMoodFilter('Workout')}
                  className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors"
                >
                  Show all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {remixHits.slice(0, 5).map((song) => {
                  const isThisPlaying = activeSong?.id === song.id && isPlaying;
                  return (
                    <div
                      key={song.id}
                      onClick={() => handleRowClick(song)}
                      className="group p-3.5 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer transition-all duration-200 flex flex-col shadow-md"
                    >
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-black mb-3 shadow-lg">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                          <div className="w-11 h-11 rounded-full bg-[#1db954] hover:bg-[#1ed760] hover:scale-105 flex items-center justify-center text-black shadow-xl">
                            {isThisPlaying ? (
                              <Pause size={20} fill="currentColor" />
                            ) : (
                              <Play size={20} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                      <h4
                        className={`text-sm font-bold truncate ${
                          activeSong?.id === song.id ? 'text-[#1db954]' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-1">{song.artist}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Complete Spotify Track Table */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>All Tracks in View</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {filteredSongs.length}
              </span>
              {moodFilter !== 'all' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Mood: {moodFilter}
                </span>
              )}
            </h3>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {activeSong?.youtubeId && (
                <button
                  onClick={onToggleVideoCanvas}
                  className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors ${
                    isVideoCanvasOpen
                      ? 'bg-red-600 text-white'
                      : 'bg-[#242424] hover:bg-[#303030] text-zinc-300'
                  }`}
                >
                  <Tv size={13} />
                  <span>{isVideoCanvasOpen ? 'Minimize Video' : 'YouTube Video'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[3rem_1fr_10rem_9rem_6rem_4rem] px-4 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block">Album / Movie</span>
            <span className="hidden sm:block">Mood / Genre</span>
            <span className="hidden lg:block">Source</span>
            <div className="flex justify-end pr-2">
              <Clock size={14} />
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-zinc-900/60">
            {filteredSongs.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <Music size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No tracks match your current filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setMoodFilter('all');
                  }}
                  className="mt-3 px-4 py-1.5 bg-[#1db954] text-black font-bold text-xs rounded-full"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredSongs.map((song, idx) => {
                const isCurrentActive = activeSong?.id === song.id;
                const isCurrentlyPlaying = isCurrentActive && isPlaying;

                // Determine display mood label
                const primaryMood =
                  song.aiMoodAnalysis?.primaryMood ||
                  (song.moodLabels && song.moodLabels[0]) ||
                  (song.category === 'remix' ? 'Party' : song.category === 'lofi' ? 'Relaxing' : 'Romantic');

                return (
                  <div
                    key={song.id}
                    onDoubleClick={() => handleRowClick(song)}
                    className={`group grid grid-cols-[3rem_1fr_10rem_9rem_6rem_4rem] items-center px-4 py-2.5 rounded-md hover:bg-[#282828] cursor-pointer transition-colors relative ${
                      isCurrentActive ? 'bg-[#242424]' : ''
                    }`}
                  >
                    {/* Column 1: Index or Play icon */}
                    <div className="flex items-center justify-center text-xs">
                      <span className="group-hover:hidden text-zinc-400 font-mono">
                        {isCurrentlyPlaying ? (
                          <span className="text-[#1db954] animate-pulse">▶</span>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(song);
                        }}
                        className="hidden group-hover:flex text-white hover:text-[#1db954] transition-colors"
                      >
                        {isCurrentlyPlaying ? (
                          <Pause size={15} fill="currentColor" />
                        ) : (
                          <Play size={15} fill="currentColor" />
                        )}
                      </button>
                    </div>

                    {/* Column 2: Title & Artist with Artwork + Quick AI Tag Action */}
                    <div className="flex items-center gap-3.5 min-w-0 pr-4">
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-black">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-bold truncate ${
                              isCurrentActive ? 'text-[#1db954]' : 'text-white'
                            }`}
                          >
                            {song.title}
                          </h4>

                          {/* Quick AI Tag Button on Row Hover */}
                          {onTagSongMood && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTagSongMood(song);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-amber-300 transition-all"
                              title="Inspect & Edit AI Mood Tags"
                            >
                              <Sparkles size={12} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 truncate mt-0.5">
                          <span className="truncate">{song.artist}</span>
                          {song.titleDevanagari && (
                            <span className="text-[11px] text-zinc-500 font-devanagari truncate">
                              • {song.titleDevanagari}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Album */}
                    <div className="hidden md:block text-xs text-zinc-400 truncate pr-4">
                      {song.album || 'Single'}
                    </div>

                    {/* Column 4: Mood Label, Language & Category Pill */}
                    <div className="hidden sm:flex items-center gap-1.5 flex-wrap pr-3">
                      {/* Language Badge */}
                      {song.language && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/50">
                          {song.language}
                        </span>
                      )}

                      {/* Primary Mood Badge */}
                      <span
                        className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                          primaryMood === 'Workout'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : primaryMood === 'Relaxing'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : primaryMood === 'Party'
                            ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30'
                            : primaryMood === 'Romantic'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                        title={`AI Mood: ${primaryMood}`}
                      >
                        {primaryMood}
                      </span>

                      {/* Category Pill */}
                      {song.category && song.category !== 'regular' && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {song.category}
                        </span>
                      )}
                    </div>

                    {/* Column 5: Source */}
                    <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-400">
                      {song.youtubeId ? (
                        <span className="flex items-center gap-1 text-red-400 text-[11px] font-medium">
                          <Youtube size={13} />
                          <span className="truncate">YouTube</span>
                        </span>
                      ) : song.isSystemMedia ? (
                        <span className="flex items-center gap-1 text-cyan-400 text-[11px] font-medium">
                          <Download size={13} />
                          <span>System</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-purple-400 font-medium">SwarSync</span>
                      )}
                    </div>

                    {/* Column 6: Duration, AI Tag & Like Heart */}
                    <div className="flex items-center justify-end gap-2.5 text-xs text-zinc-400 font-mono">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(song.id);
                        }}
                        className={`transition-colors ${
                          song.isFavorite
                            ? 'text-[#1db954]'
                            : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'
                        }`}
                        title="Like song"
                      >
                        <Heart size={15} fill={song.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <span>{formatDuration(song.duration)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
