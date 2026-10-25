import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Disc3,
  Download,
  FolderSync,
  Heart,
  Headphones,
  Layers,
  Library,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Tags,
  Upload,
  X,
} from 'lucide-react';
import type { Playlist, Song, ViewMode } from '../types/music';
import { matchesGarbaStyleSearch } from '../utils/garbaLibrary';

interface YourLibraryPageProps {
  songs: Song[];
  playlists: Playlist[];
  activeSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  onToggleFavorite?: (songId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSelectView: (view: ViewMode) => void;
  onCreatePlaylist: () => void;
  onImportAudio: () => void;
  onAutoOrganize: () => void;
  onOpenSystemScanner: () => void;
  onOpenMoodTagger?: () => void;
  onBrowseCatalog?: () => void;
}

type LibraryTab = 'all' | 'playlists' | 'liked' | 'downloads' | 'artists' | 'albums';
type Collection = { key: string; name: string; subtitle: string; songs: Song[] };

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'liked', label: 'Liked songs' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
];

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ed760]';
const cardClass = 'group min-w-0 rounded-2xl border border-white/[0.06] bg-[#1a1a1a] p-3 text-left transition hover:border-white/15 hover:bg-[#242424] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ed760]';
const countLabel = (count: number, noun = 'song') => `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;

function matchesSong(song: Song, query: string) {
  return [song.title, song.titleDevanagari, song.artist, song.artistDevanagari, song.album, song.genre, song.language, song.market, song.mood, ...(song.garbaStyles ?? [])]
    .some(value => value?.toLocaleLowerCase().includes(query)) || matchesGarbaStyleSearch(song, query);
}

function formatDuration(duration: number) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(duration) ? duration : 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function CoverArt({ src, alt, round = false }: { src?: string; alt: string; round?: boolean }) {
  return (
    <div className={`relative flex aspect-square w-full items-center justify-center overflow-hidden bg-zinc-800 ${round ? 'rounded-full' : 'rounded-xl'}`}>
      <Music2 size={30} className="absolute text-zinc-500" aria-hidden="true" />
      {src && <img src={src} alt={alt} loading="lazy" className="relative h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}
    </div>
  );
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center">
      <Library size={30} className="mb-4 text-zinc-500" aria-hidden="true" />
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">{description}</p>
      {action && onAction && <button type="button" onClick={onAction} className={`${actionClass} mt-5`}>{action}</button>}
    </div>
  );
}

export const YourLibraryPage: React.FC<YourLibraryPageProps> = ({
  songs, playlists, activeSong, isPlaying, onPlaySong, onPauseSong, onToggleFavorite,
  onSelectPlaylist, onSelectView, onCreatePlaylist, onImportAudio, onAutoOrganize,
  onOpenSystemScanner, onOpenMoodTagger, onBrowseCatalog,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<{ kind: 'artists' | 'albums'; key: string } | null>(null);
  const query = searchQuery.trim().toLocaleLowerCase();

  const likedSongs = useMemo(() => songs.filter(song => song.isFavorite), [songs]);
  const downloadedSongs = useMemo(() => songs.filter(song => song.isSystemMedia || song.playlistIds?.includes('system-downloads')), [songs]);
  const songById = useMemo(() => new Map(songs.map(song => [song.id, song])), [songs]);
  const { artists, albums } = useMemo(() => {
    const artistMap = new Map<string, Collection>();
    const albumMap = new Map<string, Collection>();
    for (const song of songs) {
      const artistName = song.artist.trim() || 'Unknown artist';
      const namedAlbum = song.album.trim().replace(/\s+/g, ' ');
      const albumName = namedAlbum || 'Singles';
      const albumKey = namedAlbum ? `album:${namedAlbum.normalize('NFKC').toLocaleLowerCase()}` : 'unassigned:singles';
      if (!artistMap.has(artistName)) artistMap.set(artistName, { key: artistName, name: artistName, subtitle: 'Artist', songs: [] });
      if (!albumMap.has(albumKey)) albumMap.set(albumKey, { key: albumKey, name: albumName, subtitle: artistName, songs: [] });
      artistMap.get(artistName)!.songs.push(song);
      albumMap.get(albumKey)!.songs.push(song);
    }
    for (const album of albumMap.values()) {
      const creditedArtists = [...new Set(album.songs.map(song => song.artist.trim() || 'Unknown artist'))];
      album.subtitle = creditedArtists.length === 1 ? creditedArtists[0] : countLabel(creditedArtists.length, 'artist');
    }
    const byName = (first: Collection, second: Collection) => first.name.localeCompare(second.name);
    return { artists: [...artistMap.values()].sort(byName), albums: [...albumMap.values()].sort(byName) };
  }, [songs]);

  const searchedSongs = useMemo(() => songs.filter(song => !query || matchesSong(song, query)), [songs, query]);
  const searchedPlaylists = useMemo(() => playlists.filter(playlist => !query ||
    [playlist.name, playlist.description].some(value => value.toLocaleLowerCase().includes(query)) ||
    playlist.songIds.some(id => { const song = songById.get(id); return song && matchesSong(song, query); })), [playlists, query, songById]);
  const recentSongs = useMemo(() => [...songs].sort((first, second) => {
    const firstDate = Date.parse(first.dateAdded) || 0;
    const secondDate = Date.parse(second.dateAdded) || 0;
    return secondDate - firstDate;
  }).slice(0, 8), [songs]);
  const collectionMatches = (collection: Collection) => !query || collection.name.toLocaleLowerCase().includes(query) || collection.subtitle.toLocaleLowerCase().includes(query) || collection.songs.some(song => matchesSong(song, query));
  const selectedGroup = selectedCollection && (selectedCollection.kind === 'artists' ? artists : albums).find(collection => collection.key === selectedCollection.key);
  const tabCounts: Record<LibraryTab, number> = { all: songs.length, playlists: playlists.length, liked: likedSongs.length, downloads: downloadedSongs.length, artists: artists.length, albums: albums.length };

  const selectTab = (tab: LibraryTab) => {
    setActiveTab(tab);
    setSelectedCollection(null);
  };

  const renderSongList = (list: Song[], emptyTitle: string, emptyDescription: string, action?: string, onAction?: () => void) => {
    const filtered = list.filter(song => !query || matchesSong(song, query));
    if (!filtered.length) return <EmptyState title={query ? 'No matching songs' : emptyTitle} description={query ? 'Try another song title, artist, album, or language.' : emptyDescription} action={query ? 'Clear search' : action} onAction={query ? () => setSearchQuery('') : onAction} />;
    return (
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#161616]">
        <div className="hidden items-center gap-3 border-b border-white/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:flex">
          <span className="w-9" aria-hidden="true" />
          <span className="flex-1">Song</span>
          <span className="hidden w-40 lg:block">Album</span>
          <span className="w-12 text-right">Time</span>
          {onToggleFavorite && <span className="w-9" aria-hidden="true" />}
        </div>
        <div className="divide-y divide-white/[0.04]">
          {filtered.map(song => {
            const isActive = song.id === activeSong?.id;
            const playing = isActive && isPlaying;
            return (
              <div key={song.id} className={`group flex min-w-0 items-center gap-2 px-2 py-3 transition sm:gap-3 sm:px-4 ${isActive ? 'bg-[#38bdf8]/[0.08]' : 'hover:bg-white/[0.04]'}`}>
                <button type="button" onClick={() => playing ? onPauseSong() : onPlaySong(song)} aria-label={`${playing ? 'Pause' : 'Play'} ${song.title}`} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8] ${isActive ? 'bg-[#38bdf8] text-slate-950 hover:bg-sky-300' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                  {playing ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}
                </button>
                <div className="h-11 w-11 shrink-0"><CoverArt src={song.coverUrl} alt={`${song.title} artwork`} /></div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isActive ? 'text-[#38bdf8]' : 'text-white'}`}>{song.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{song.artist}{song.language ? ` · ${song.language}` : ''}</p>
                </div>
                <p className="hidden w-40 shrink-0 truncate text-xs text-slate-400 lg:block">{song.album || '—'}</p>
                <span className="hidden w-12 shrink-0 text-right text-xs tabular-nums text-slate-500 sm:block">{formatDuration(song.duration)}</span>
                {onToggleFavorite && <button type="button" onClick={() => onToggleFavorite(song.id)} aria-label={`${song.isFavorite ? 'Unlike' : 'Like'} ${song.title}`} aria-pressed={song.isFavorite} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38bdf8] ${song.isFavorite ? 'text-[#38bdf8]' : 'text-slate-500 hover:text-white'}`}><Heart size={17} fill={song.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPlaylistGrid = (list: Playlist[]) => (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {list.map(playlist => {
        const count = playlist.songIds.filter(id => songById.has(id)).length;
        return (
          <button type="button" key={playlist.id} onClick={() => onSelectPlaylist(playlist.id)} className={cardClass} aria-label={`Open ${playlist.name}, ${countLabel(count)}`}>
            <div className="relative">
              <CoverArt src={playlist.coverUrl} alt={`${playlist.name} playlist artwork`} />
              <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#38bdf8] text-slate-950 shadow-lg transition group-hover:scale-105"><ArrowUpRight size={19} aria-hidden="true" /></span>
            </div>
            <p className="mt-3 truncate text-sm font-bold text-white">{playlist.name}</p>
            <p className="mt-1 truncate text-xs text-zinc-400">Playlist · {countLabel(count)}</p>
          </button>
        );
      })}
    </div>
  );

  const renderCollectionGrid = (list: Collection[], kind: 'artists' | 'albums') => (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {list.map(collection => (
        <button type="button" key={collection.key} onClick={() => { setActiveTab(kind); setSelectedCollection({ kind, key: collection.key }); }} className={cardClass} aria-label={`Open ${collection.name}, ${countLabel(collection.songs.length)}`}>
          <CoverArt src={collection.songs[0]?.coverUrl} alt={`${collection.name} collection artwork`} round={kind === 'artists'} />
          <p className="mt-3 truncate text-sm font-bold text-white">{collection.name}</p>
          <p className="mt-1 truncate text-xs text-zinc-400">{collection.subtitle}</p>
          <p className="mt-1 text-xs text-zinc-500">{countLabel(collection.songs.length)}</p>
        </button>
      ))}
    </div>
  );

  const sectionHeading = (title: string, count?: number, onMore?: () => void) => (
    <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight text-white">{title}{count !== undefined && <span className="ml-2 text-xs font-normal text-zinc-500">{count.toLocaleString()}</span>}</h2>
      {onMore && <button type="button" onClick={onMore} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1ed760]">View all <ChevronRight size={14} aria-hidden="true" /></button>}
    </div>
  );

  const categories = [
    { label: 'Originals', view: 'regular' as ViewMode, icon: Music2, count: songs.filter(song => song.category === 'regular').length, color: 'text-sky-300 bg-sky-400/10' },
    { label: 'Remixes', view: 'remix' as ViewMode, icon: Disc3, count: songs.filter(song => song.category === 'remix').length, color: 'text-orange-300 bg-orange-400/10' },
    { label: 'Lo-Fi', view: 'lofi' as ViewMode, icon: Headphones, count: songs.filter(song => song.category === 'lofi').length, color: 'text-purple-300 bg-purple-400/10' },
    { label: 'Mashups', view: 'mashup' as ViewMode, icon: Layers, count: songs.filter(song => song.category === 'mashup').length, color: 'text-cyan-300 bg-cyan-400/10' },
  ];

  return (
    <section aria-label="Your library" className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#0b1329] text-white">
      <div className="border-b border-sky-500/10 bg-gradient-to-br from-[#0f2847] via-[#0f172a] to-[#0b1329] px-4 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-9 lg:px-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#38bdf8]"><Library size={15} aria-hidden="true" /> Made for your music</div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Your library</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">Your playlists, favorites, and downloaded music. All in one place.</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
              <span><strong className="font-semibold text-white">{songs.length.toLocaleString()}</strong> songs</span>
              <span><strong className="font-semibold text-white">{playlists.length.toLocaleString()}</strong> playlists</span>
              <span><strong className="font-semibold text-white">{artists.length.toLocaleString()}</strong> artists</span>
              <span><strong className="font-semibold text-white">{albums.length.toLocaleString()}</strong> albums</span>
            </div>
          </div>
          <button type="button" onClick={onCreatePlaylist} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#38bdf8] hover:bg-sky-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Plus size={19} aria-hidden="true" /> Create playlist</button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onImportAudio} className={actionClass}><Upload size={15} aria-hidden="true" /> Import audio</button>
          <button type="button" onClick={onOpenSystemScanner} className={actionClass}><Download size={15} aria-hidden="true" /> Scan downloads</button>
          <button type="button" onClick={onAutoOrganize} className={actionClass}><FolderSync size={15} aria-hidden="true" /> Organize library</button>
          {onBrowseCatalog && <button type="button" onClick={onBrowseCatalog} className={actionClass}><Search size={15} aria-hidden="true" /> Browse songs</button>}
          {onOpenMoodTagger && <button type="button" onClick={onOpenMoodTagger} className={actionClass}><Tags size={15} aria-hidden="true" /> Tag moods</button>}
        </div>
      </div>

      <div className="px-4 pb-10 pt-6 sm:px-7 lg:px-9">
        <div className="mb-6 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div role="group" aria-label="Library filters" className="flex min-w-0 gap-2 overflow-x-auto pb-1 xl:flex-1">
            {TABS.map(tab => <button type="button" key={tab.id} onClick={() => selectTab(tab.id)} aria-pressed={activeTab === tab.id} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ed760] ${activeTab === tab.id ? 'bg-white text-black' : 'bg-white/[0.06] text-zinc-300 hover:bg-white/10 hover:text-white'}`}>{tab.label}<span className={activeTab === tab.id ? 'text-zinc-600' : 'text-zinc-500'}>{tabCounts[tab.id]}</span></button>)}
          </div>
          <div className="relative w-full shrink-0 xl:w-64">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} aria-label="Search your library" placeholder="Search your library" className="h-10 w-full rounded-full border border-white/10 bg-[#1a1a1a] pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1ed760]/60 focus:ring-2 focus:ring-[#1ed760]/10" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear library search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"><X size={15} aria-hidden="true" /></button>}
          </div>
        </div>

        <div aria-live="polite" className="sr-only">{query ? `${searchedSongs.length} songs match your search.` : `${TABS.find(tab => tab.id === activeTab)?.label} selected.`}</div>

        {selectedGroup ? (
          <div>
            <button type="button" onClick={() => setSelectedCollection(null)} className="mb-5 inline-flex items-center gap-2 rounded-full py-1 pr-3 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={17} aria-hidden="true" /> Back to {selectedCollection?.kind}</button>
            <div className="mb-6 flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="w-20 shrink-0 sm:w-28"><CoverArt src={selectedGroup.songs[0]?.coverUrl} alt={`${selectedGroup.name} collection artwork`} round={selectedCollection?.kind === 'artists'} /></div>
              <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{selectedCollection?.kind === 'artists' ? 'Artist collection' : 'Album'}</p><h2 className="break-words text-xl font-extrabold sm:text-3xl">{selectedGroup.name}</h2><p className="mt-2 text-sm text-zinc-400">{countLabel(selectedGroup.songs.length)}{selectedCollection?.kind === 'albums' ? ` · ${selectedGroup.subtitle}` : ''}</p></div>
            </div>
            {renderSongList(selectedGroup.songs, 'No songs in this collection', 'Songs from this artist or album will appear here.')}
          </div>
        ) : activeTab === 'all' ? (
          <div className="space-y-8">
            {!query && <>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => selectTab('liked')} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-purple-400/10 bg-gradient-to-r from-[#38235b] to-[#241c36] p-4 text-left transition hover:border-purple-400/30"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-purple-200"><Heart size={27} fill="currentColor" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-base font-bold">Liked songs</span><span className="mt-1 block text-xs text-purple-200/70">{countLabel(likedSongs.length)} saved for later</span></span><ChevronRight size={18} className="shrink-0 text-purple-200/70 transition group-hover:translate-x-1" aria-hidden="true" /></button>
                <button type="button" onClick={() => selectTab('downloads')} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-cyan-400/10 bg-gradient-to-r from-[#19353d] to-[#19262d] p-4 text-left transition hover:border-cyan-400/30"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200"><Download size={27} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-base font-bold">Your downloads</span><span className="mt-1 block text-xs text-cyan-200/70">{countLabel(downloadedSongs.length)} from your device</span></span><ChevronRight size={18} className="shrink-0 text-cyan-200/70 transition group-hover:translate-x-1" aria-hidden="true" /></button>
              </div>
              <section aria-label="Music collections">{sectionHeading('Explore your collections')}<div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">{categories.map(category => <button type="button" key={category.view} onClick={() => onSelectView(category.view)} className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-3 py-4 text-left transition hover:bg-[#242424]"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${category.color}`}><category.icon size={18} aria-hidden="true" /></span><span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{category.label}</span><span className="mt-1 block text-[11px] text-zinc-500">{countLabel(category.count)}</span></span></button>)}</div></section>
            </>}
            {searchedPlaylists.length > 0 && <section aria-label="Your playlists">{sectionHeading(query ? 'Matching playlists' : 'Your playlists', searchedPlaylists.length, () => selectTab('playlists'))}{renderPlaylistGrid(query ? searchedPlaylists : searchedPlaylists.slice(0, 6))}</section>}
            {!playlists.length && !query && <section aria-label="Your playlists">{sectionHeading('Your playlists')}<EmptyState title="A playlist for every moment" description="Bring your favorite songs together and make your first playlist." action="Create playlist" onAction={onCreatePlaylist} /></section>}
            <section aria-label={query ? 'Matching songs' : 'Recently added'}>{sectionHeading(query ? 'Matching songs' : 'Recently added', query ? searchedSongs.length : undefined, query ? undefined : () => onSelectView('all-songs'))}{renderSongList(query ? searchedSongs : recentSongs, 'Your music starts here', 'Import music from your device or browse the song catalog to grow your library.', 'Import audio', onImportAudio)}</section>
            {query && artists.filter(collectionMatches).length > 0 && <section aria-label="Matching artists">{sectionHeading('Matching artists', artists.filter(collectionMatches).length, () => selectTab('artists'))}{renderCollectionGrid(artists.filter(collectionMatches).slice(0, 6), 'artists')}</section>}
            {query && albums.filter(collectionMatches).length > 0 && <section aria-label="Matching albums">{sectionHeading('Matching albums', albums.filter(collectionMatches).length, () => selectTab('albums'))}{renderCollectionGrid(albums.filter(collectionMatches).slice(0, 6), 'albums')}</section>}
          </div>
        ) : activeTab === 'playlists' ? (
          <section aria-label="Your playlists">{sectionHeading('Your playlists', searchedPlaylists.length)}{searchedPlaylists.length ? renderPlaylistGrid(searchedPlaylists) : <EmptyState title={query ? 'No matching playlists' : 'Create your first playlist'} description={query ? 'Try another playlist name, song, or artist.' : 'Collect the songs you love for every mood and occasion.'} action={query ? 'Clear search' : 'Create playlist'} onAction={query ? () => setSearchQuery('') : onCreatePlaylist} />}</section>
        ) : activeTab === 'liked' ? (
          <section aria-label="Liked songs">{sectionHeading('Liked songs', likedSongs.filter(song => !query || matchesSong(song, query)).length)}{renderSongList(likedSongs, 'Keep your favorites close', 'Tap the heart beside any song to save it here.', 'Browse songs', () => onSelectView('all-songs'))}</section>
        ) : activeTab === 'downloads' ? (
          <section aria-label="Your downloads"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Your downloads <span className="ml-2 text-xs font-normal text-zinc-500">{downloadedSongs.filter(song => !query || matchesSong(song, query)).length}</span></h2><button type="button" onClick={onOpenSystemScanner} className={actionClass}><Download size={14} aria-hidden="true" /> Scan for music</button></div>{renderSongList(downloadedSongs, 'Find the music on your device', 'Scan your downloads and choose audio files to add them to your library.', 'Scan downloads', onOpenSystemScanner)}</section>
        ) : (
          <section aria-label={activeTab === 'artists' ? 'Your artists' : 'Your albums'}>{sectionHeading(activeTab === 'artists' ? 'Your artists' : 'Your albums', (activeTab === 'artists' ? artists : albums).filter(collectionMatches).length)}{(activeTab === 'artists' ? artists : albums).filter(collectionMatches).length ? renderCollectionGrid((activeTab === 'artists' ? artists : albums).filter(collectionMatches), activeTab) : <EmptyState title={query ? `No matching ${activeTab}` : `No ${activeTab} yet`} description={query ? 'Try another artist, album, or song title.' : 'Add songs to your library and their artists and albums will appear here.'} action={query ? 'Clear search' : 'Import audio'} onAction={query ? () => setSearchQuery('') : onImportAudio} />}</section>
        )}

        {/* Footer with Copyright */}
        <footer className="mt-12 mb-6 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-zinc-400">
          <p>© 2026 Gaurav Zalavadiya. All rights reserved.</p>
          <p className="text-zinc-500">Sawan Music • Designed & Developed by Gaurav Zalavadiya</p>
        </footer>
      </div>
    </section>
  );
};
