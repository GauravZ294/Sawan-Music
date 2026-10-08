import React, { useState } from 'react';
import { ViewMode, Playlist } from '../types/music';
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Youtube,
  Sparkles,
  Download,
  FolderSync,
  Upload,
  Radio,
  Flame,
  Music2,
  Disc3,
  Layers,
  SlidersHorizontal,
  Volume2,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Tags,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onImportAudio: () => void;
  onAutoOrganize: () => void;
  onOpenSystemScanner: () => void;
  onOpenYouTubeExplore: () => void;
  onOpenAiStudio: () => void;
  onOpenMoodTagger?: () => void;
  onOpenDolbyModal?: () => void;
  totalSongCount: number;
  systemMediaCount: number;
  activePlaylistId?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onImportAudio,
  onAutoOrganize,
  onOpenSystemScanner,
  onOpenYouTubeExplore,
  onOpenAiStudio,
  onOpenMoodTagger,
  onOpenDolbyModal,
  totalSongCount,
  systemMediaCount,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [libraryFilter, setLibraryFilter] = useState<
    'all' | 'playlists' | 'regular' | 'remix' | 'lofi' | 'mashup' | 'downloads'
  >('all');
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // If collapsed: render compact vertical icon rail
  if (isCollapsed) {
    return (
      <aside className="w-[72px] h-full flex flex-col gap-2 p-2 select-none shrink-0 bg-black text-[#b3b3b3] transition-all duration-300">
        {/* Top Rail Card */}
        <div className="bg-[#121212] rounded-xl p-2.5 flex flex-col items-center gap-3">
          {/* Bar Icon to Expand Panel */}
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-[#1db954] hover:text-[#1ed760] flex items-center justify-center transition-all shadow-md group relative"
            title="Expand left panel (Ctrl+B)"
          >
            <PanelLeftOpen size={20} className="group-hover:scale-110 transition-transform" />
          </button>

          {/* Logo Icon */}
          <div
            onClick={() => onSelectView('all-songs')}
            className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center text-black font-extrabold cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-[#1db954]/20"
            title="SwarSync Home"
          >
            <Music2 size={18} strokeWidth={2.5} />
          </div>

          <div className="w-8 h-[1px] bg-zinc-800 my-0.5" />

          {/* Navigation Icons */}
          <button
            onClick={() => onSelectView('all-songs')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentView === 'all-songs'
                ? 'bg-zinc-800 text-white font-bold'
                : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-white'
            }`}
            title="Home"
          >
            <Home size={20} />
          </button>

          <button
            onClick={onOpenYouTubeExplore}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentView === 'youtube-explore'
                ? 'bg-red-950/60 text-red-400'
                : 'hover:bg-zinc-800/60 text-red-500 hover:text-red-400'
            }`}
            title="YouTube Explore & Fetch"
          >
            <Youtube size={20} />
          </button>

          {onOpenMoodTagger && (
            <button
              onClick={onOpenMoodTagger}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-800/60 text-amber-400 hover:text-amber-300 transition-all"
              title="AI Mood Tagger (Workout, Relaxing, Party)"
            >
              <Tags size={20} />
            </button>
          )}

          <button
            onClick={onOpenSystemScanner}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentView === 'system-downloads'
                ? 'bg-cyan-950/60 text-cyan-400'
                : 'hover:bg-zinc-800/60 text-cyan-400 hover:text-cyan-300'
            }`}
            title={`System Media Scanner (${systemMediaCount})`}
          >
            <Download size={20} />
          </button>

          {onOpenAiStudio && (
            <button
              onClick={onOpenAiStudio}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                currentView === 'ai-studio'
                  ? 'bg-purple-950/60 text-purple-300'
                  : 'hover:bg-zinc-800/60 text-purple-400 hover:text-purple-300'
              }`}
              title="AI Music Studio (Lyria)"
            >
              <Sparkles size={20} />
            </button>
          )}

          {onOpenDolbyModal && (
            <button
              onClick={onOpenDolbyModal}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-800/60 text-emerald-400 hover:text-emerald-300 transition-all"
              title="Dolby Audio & 3D Spatial Effects"
            >
              <Zap size={20} className="fill-emerald-400" />
            </button>
          )}
        </div>

        {/* Bottom Rail Card: Playlists / Library */}
        <div className="flex-1 bg-[#121212] rounded-xl p-2 flex flex-col items-center gap-2 overflow-y-auto">
          <button
            onClick={() => onSelectView('playlists')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentView === 'playlists'
                ? 'bg-zinc-800 text-white'
                : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-white'
            }`}
            title="Your Playlists"
          >
            <Library size={20} />
          </button>

          <button
            onClick={() => onSelectView('favorites')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              currentView === 'favorites'
                ? 'bg-rose-950/60 text-rose-400'
                : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-rose-400'
            }`}
            title="Liked Songs"
          >
            <Heart size={20} />
          </button>

          <div className="w-8 h-[1px] bg-zinc-800 my-1" />

          {/* Quick playlist covers */}
          {playlists.slice(0, 4).map((pl) => (
            <button
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all hover:scale-105 shrink-0"
              title={pl.name}
            >
              <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 h-full flex flex-col gap-2 p-2 select-none shrink-0 bg-black text-[#b3b3b3] transition-all duration-300">
      {/* Top Spotify Card: Navigation */}
      <div className="bg-[#121212] rounded-xl p-4 flex flex-col gap-4">
        {/* Logo Branding + Bar Icon to Close Left Panel */}
        <div className="flex items-center justify-between px-1">
          <div
            onClick={() => onSelectView('all-songs')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center text-black font-extrabold shadow-lg shadow-[#1db954]/20 group-hover:scale-105 transition-transform">
              <Music2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                SwarSync
                <span className="text-[10px] bg-[#1db954]/20 text-[#1db954] font-bold px-1.5 py-0.2 rounded-full border border-[#1db954]/30">
                  Spotify
                </span>
              </span>
              <p className="text-[10px] text-zinc-400 font-devanagari">बॉलीवुड म्यूजिक प्लेयर</p>
            </div>
          </div>

          {/* Bar Icon Button to Close/Collapse Left Panel */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close left panel (Ctrl+B)"
            >
              <PanelLeftClose size={19} />
            </button>
          )}
        </div>

        {/* Primary Links */}
        <nav className="flex flex-col gap-1 text-sm font-bold">
          <button
            onClick={() => onSelectView('all-songs')}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors ${
              currentView === 'all-songs' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <Home size={22} className={currentView === 'all-songs' ? 'text-white' : ''} />
            <span>Home</span>
          </button>

          <button
            onClick={onOpenYouTubeExplore}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              currentView === 'youtube-explore' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <Youtube size={22} className="text-red-500" />
              <span>YouTube Explore</span>
            </div>
            <span className="text-[10px] bg-red-950 text-red-400 font-bold px-1.5 py-0.5 rounded-full border border-red-800/40">
              Fetch
            </span>
          </button>

          {/* AI Mood Tagger Quick Access */}
          {onOpenMoodTagger && (
            <button
              onClick={onOpenMoodTagger}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-[#b3b3b3] hover:text-white group"
            >
              <div className="flex items-center gap-4">
                <Tags size={22} className="text-amber-400 group-hover:scale-105 transition-transform" />
                <span>AI Mood Tagger</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30">
                AI Tag
              </span>
            </button>
          )}

          <button
            onClick={onOpenSystemScanner}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              currentView === 'system-downloads' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <Download size={22} className="text-cyan-400" />
              <span>Catch Downloads</span>
            </div>
            {systemMediaCount > 0 && (
              <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-1.5 py-0.5 rounded-full border border-cyan-800/40">
                {systemMediaCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAiStudio}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              currentView === 'ai-studio' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <Sparkles size={22} className="text-purple-400" />
              <span>AI Music & Lyria</span>
            </div>
            <span className="text-[10px] bg-purple-950 text-purple-300 font-bold px-1.5 py-0.5 rounded-full border border-purple-800/40">
              Lyria
            </span>
          </button>

          {onOpenDolbyModal && (
            <button
              onClick={onOpenDolbyModal}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800/40 group"
            >
              <div className="flex items-center gap-4">
                <Zap size={22} className="fill-emerald-400 group-hover:scale-105 transition-transform" />
                <span className="text-white">Dolby Sound & 3D</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                DOLBY
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Spotify Card: Your Library */}
      <div className="flex-1 bg-[#121212] rounded-xl flex flex-col min-h-0 overflow-hidden">
        {/* Library Header */}
        <div className="p-4 pb-2 flex items-center justify-between text-[#b3b3b3]">
          <div
            onClick={() => onSelectView('all-songs')}
            className="flex items-center gap-3 font-bold text-sm text-[#b3b3b3] hover:text-white cursor-pointer transition-colors"
          >
            <Library size={22} />
            <span>Your Library</span>
          </div>

          <div className="relative flex items-center gap-1">
            <button
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className="p-1.5 hover:bg-[#242424] text-[#b3b3b3] hover:text-white rounded-full transition-colors"
              title="Add playlist or media"
            >
              <Plus size={20} />
            </button>

            {/* Quick dropdown menu */}
            {showPlusMenu && (
              <div className="absolute right-0 top-8 z-50 w-56 bg-[#282828] border border-zinc-700/60 rounded-xl shadow-2xl py-1.5 text-xs text-white">
                <button
                  onClick={() => {
                    onCreatePlaylist();
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#383838] flex items-center gap-2.5"
                >
                  <Plus size={15} className="text-[#1db954]" />
                  <span>Create a new playlist</span>
                </button>
                {onOpenMoodTagger && (
                  <button
                    onClick={() => {
                      onOpenMoodTagger();
                      setShowPlusMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#383838] flex items-center gap-2.5"
                  >
                    <Tags size={15} className="text-amber-400" />
                    <span>Auto-tag songs with AI</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onOpenYouTubeExplore();
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#383838] flex items-center gap-2.5"
                >
                  <Youtube size={15} className="text-red-500" />
                  <span>Fetch songs from YouTube</span>
                </button>
                <button
                  onClick={() => {
                    onOpenSystemScanner();
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#383838] flex items-center gap-2.5"
                >
                  <Download size={15} className="text-cyan-400" />
                  <span>Catch system downloads</span>
                </button>
                <button
                  onClick={() => {
                    onImportAudio();
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#383838] flex items-center gap-2.5"
                >
                  <Upload size={15} className="text-amber-400" />
                  <span>Upload local media file</span>
                </button>
                <button
                  onClick={() => {
                    onAutoOrganize();
                    setShowPlusMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#383838] flex items-center gap-2.5"
                >
                  <FolderSync size={15} className="text-purple-400" />
                  <span>Organize library by mood</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Badges in Library */}
        <div className="px-4 py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs font-semibold">
          <button
            onClick={() => setLibraryFilter('all')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
              libraryFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setLibraryFilter('playlists')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
              libraryFilter === 'playlists'
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setLibraryFilter('remix')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
              libraryFilter === 'remix'
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            Remix
          </button>
          <button
            onClick={() => setLibraryFilter('lofi')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
              libraryFilter === 'lofi'
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            Lo-Fi
          </button>
          <button
            onClick={() => setLibraryFilter('mashup')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap ${
              libraryFilter === 'mashup'
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            Mashup
          </button>
        </div>

        {/* Playlists & Sections List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {/* Liked Songs Special Row */}
          <div
            onClick={() => onSelectView('favorites')}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              currentView === 'favorites' ? 'bg-[#242424]' : 'hover:bg-[#1a1a1a]'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-400 flex items-center justify-center text-white shrink-0 shadow">
              <Heart size={20} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-bold truncate ${
                  currentView === 'favorites' ? 'text-[#1db954]' : 'text-white'
                }`}
              >
                Liked Songs
              </p>
              <p className="text-xs text-[#b3b3b3]">Playlist • Favorites</p>
            </div>
          </div>

          {/* System Media Scanner Special Row */}
          <div
            onClick={onOpenSystemScanner}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              currentView === 'system-downloads' ? 'bg-[#242424]' : 'hover:bg-[#1a1a1a]'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shrink-0 shadow">
              <Download size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">Catch System Media</p>
              <p className="text-xs text-cyan-400">
                {systemMediaCount} downloaded files auto-caught
              </p>
            </div>
          </div>

          {/* Custom & Curated Playlists */}
          {playlists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id && currentView === 'playlist-detail';
            return (
              <div
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#242424]' : 'hover:bg-[#1a1a1a]'
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold truncate ${
                      isSelected ? 'text-[#1db954]' : 'text-white'
                    }`}
                  >
                    {playlist.name}
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate">
                    Playlist • {playlist.songIds.length} songs
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
