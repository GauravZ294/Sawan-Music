import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Disc3, ExternalLink, Globe2, Loader2, Mic2, Music2, Play, RefreshCw, Search, Tags, TrendingUp } from 'lucide-react';
import type { Song } from '../types/music';
import type { CatalogGenre, CatalogResults, CatalogStatus, CatalogTrack } from '../types/catalog';

interface MusicCatalogExplorerProps {
  songs: Song[];
  onPlaySong: (song: Song) => void;
  onBack: () => void;
}

type CatalogMode = 'search' | 'genres' | 'artist' | 'charts';
interface CatalogRequest {
  mode: CatalogMode;
  value: string;
  offset: number;
  previousOffsets?: number[];
  chartType?: 'most-played' | 'new-music';
}

const PAGE_SIZE = 100;
const MODES = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'genres', label: 'Genres', icon: Tags },
  { id: 'artist', label: 'Artist', icon: Mic2 },
  { id: 'charts', label: 'Charts', icon: TrendingUp },
] as const;
const COUNTRIES = [
  ['IN', 'India'], ['US', 'United States'], ['GB', 'United Kingdom'],
  ['CA', 'Canada'], ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'], ['BR', 'Brazil'],
] as const;

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function artistNames(artist: string): Set<string> {
  return new Set(artist.split(/(?:,|&|;|\/|\+|\s+(?:and|feat\.?|ft\.?|featuring|with)\s+)/i)
    .map(normalize).filter(Boolean));
}

function matchesArtist(left: string, right: string): boolean {
  const leftNames = artistNames(left);
  return [...artistNames(right)].some((name) => leftNames.has(name));
}

function youtubeSearch(track: CatalogTrack): string {
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', `${track.title} ${track.artist} official audio`);
  return url.toString();
}

function safeArtwork(value?: string): string | undefined {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const rounded = Math.floor(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

function hasServerCatalog(): boolean {
  return typeof window === 'undefined' || !window.location.hostname.endsWith('.github.io');
}

function localYouTubeResults(songs: Song[], request: CatalogRequest): CatalogResults {
  const query = normalize(request.value);
  const matching = songs.filter((song) => {
    if (!song.youtubeId || song.audioSrc) return false;
    if (request.mode === 'search') {
      return normalize(`${song.title} ${song.artist} ${song.album || ''} ${song.language || ''}`).includes(query);
    }
    if (request.mode === 'artist') return normalize(song.artist).includes(query);
    if (request.mode === 'genres') return normalize(`${song.genre || ''} ${song.language || ''}`).includes(query);
    return true;
  }).sort((left, right) => (right.year || 0) - (left.year || 0) || left.title.localeCompare(right.title));
  const tracks: CatalogTrack[] = matching.map((song) => ({
    id: song.youtubeId!, title: song.title, artist: song.artist,
    album: song.album || '', genre: song.genre || song.language || '',
    releaseDate: song.publishedAt || (song.year ? `${song.year}-01-01` : null),
    duration: song.duration || 0, explicit: null, isrc: null,
    ...(safeArtwork(song.coverUrl) ? { artworkUrl: safeArtwork(song.coverUrl) } : {}),
  }));
  const offset = request.mode === 'charts' ? 0 : request.offset;
  const pageSize = hasServerCatalog() ? PAGE_SIZE : 50;
  const page = tracks.slice(offset, offset + pageSize);
  return {
    tracks: page, total: tracks.length, count: page.length,
    hasMore: offset + page.length < tracks.length,
    nextOffset: offset + page.length,
  };
}

async function readJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: 'no-store' });
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error('The music catalog returned an unexpected response. Try again.');
  }
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'The music catalog is unavailable. Try again.');
  }
  return body as T;
}

function requestPath(request: CatalogRequest): string {
  const params = new URLSearchParams();
  if (request.mode === 'search') {
    params.set('q', request.value);
    params.set('limit', '50');
    return `/api/freqblog/search?${params}`;
  }
  if (request.mode === 'charts') {
    params.set('country', request.value);
    params.set('type', request.chartType || 'most-played');
    params.set('limit', String(PAGE_SIZE));
    return `/api/freqblog/charts?${params}`;
  }
  params.set(request.mode === 'artist' ? 'artist' : 'genre', request.value);
  params.set('offset', String(request.offset));
  params.set('limit', String(PAGE_SIZE));
  return `/api/freqblog/${request.mode === 'artist' ? 'artist' : 'browse'}?${params}`;
}

export const MusicCatalogExplorer: React.FC<MusicCatalogExplorerProps> = ({ songs, onPlaySong, onBack }) => {
  const [mode, setMode] = useState<CatalogMode>('charts');
  const [query, setQuery] = useState('');
  const [artist, setArtist] = useState('');
  const [country, setCountry] = useState('IN');
  const [chartType, setChartType] = useState<'most-played' | 'new-music'>('most-played');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState<CatalogGenre[]>([]);
  const [results, setResults] = useState<CatalogResults | null>(null);
  const [request, setRequest] = useState<CatalogRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genresError, setGenresError] = useState<string | null>(null);
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const resultsController = useRef<AbortController | null>(null);
  const genresController = useRef<AbortController | null>(null);
  const statusController = useRef<AbortController | null>(null);
  const songsRef = useRef(songs);
  songsRef.current = songs;

  const loadStatus = useCallback(async () => {
    if (!hasServerCatalog()) {
      setStatus({ configured: false, connected: false });
      setStatusError('This static site shows Sawan’s bundled YouTube catalog. Online discovery requires the server-hosted app.');
      return;
    }
    statusController.current?.abort();
    const controller = new AbortController();
    statusController.current = controller;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const next = await readJson<CatalogStatus>('/api/freqblog/status', controller.signal);
      if (!controller.signal.aborted) setStatus(next);
    } catch (failure) {
      if (!controller.signal.aborted) setStatusError(failure instanceof Error ? failure.message : 'Could not check the catalog connection.');
    } finally {
      if (!controller.signal.aborted) setStatusLoading(false);
    }
  }, []);

  const loadResults = useCallback(async (nextRequest: CatalogRequest) => {
    resultsController.current?.abort();
    const controller = new AbortController();
    resultsController.current = controller;
    setLoading(true);
    setError(null);
    setResults(null);
    setRequest(nextRequest);

    if (nextRequest.mode === 'search' || nextRequest.mode === 'artist') {
      try {
        const response = await fetch('/api/youtube/search-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: nextRequest.value }),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.songs && Array.isArray(data.songs) && data.songs.length > 0) {
            const tracks: CatalogTrack[] = data.songs.map((s: any) => ({
              id: s.youtubeId,
              title: s.title,
              artist: s.artist,
              album: s.album || 'YouTube Search',
              genre: s.genre || 'Music',
              releaseDate: '2026-01-01',
              duration: s.duration || 210,
              explicit: null,
              isrc: null,
              artworkUrl: s.coverUrl,
            }));

            if (!controller.signal.aborted) {
              setResults({
                tracks,
                total: tracks.length,
                count: tracks.length,
                hasMore: false,
                nextOffset: tracks.length,
              });
              setLoading(false);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Live YouTube search fallback:', err);
      }
    }

    if (!controller.signal.aborted) {
      setResults(localYouTubeResults(songsRef.current, nextRequest));
      setLoading(false);
    }
  }, []);

  const loadGenres = useCallback(async () => {
    genresController.current?.abort();
    if (!hasServerCatalog()) {
      const currentSongs = songsRef.current;
      const localGenres = [...new Set(currentSongs
        .filter((song) => song.youtubeId && !song.audioSrc)
        .flatMap((song) => [song.genre, song.language])
        .filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
      setGenres(localGenres.map((name) => ({ name, count: currentSongs.filter((song) => song.youtubeId && !song.audioSrc && (song.genre === name || song.language === name)).length })));
      setGenresError(null);
      setGenresLoading(false);
      return;
    }
    const controller = new AbortController();
    genresController.current = controller;
    setGenresLoading(true);
    setGenresError(null);
    try {
      const next = await readJson<{ genres: CatalogGenre[] }>('/api/freqblog/genres', controller.signal);
      if (!Array.isArray(next.genres)) throw new Error('Could not load genres. Try again.');
      if (!controller.signal.aborted) setGenres(next.genres);
    } catch (failure) {
      if (!controller.signal.aborted) setGenresError(failure instanceof Error ? failure.message : 'Could not load genres. Try again.');
    } finally {
      if (!controller.signal.aborted) setGenresLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadResults({ mode: 'search', value: 'Bollywood Top Songs 2026', offset: 0 });
    setMode('search');
    return () => {
      resultsController.current?.abort();
      genresController.current?.abort();
      statusController.current?.abort();
    };
  }, [loadResults, loadStatus]);

  // Instant Live Search on Query or Artist input
  useEffect(() => {
    if (mode === 'search' && query.trim()) {
      const timer = setTimeout(() => {
        void loadResults({ mode: 'search', value: query.trim(), offset: 0 });
      }, 350);
      return () => clearTimeout(timer);
    }
    if (mode === 'artist' && artist.trim()) {
      const timer = setTimeout(() => {
        void loadResults({ mode: 'artist', value: artist.trim(), offset: 0 });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [query, artist, mode, loadResults]);

  const localSongsByTitle = useMemo(() => {
    const indexed = new Map<string, Song[]>();
    for (const song of songs) {
      if (!song.audioSrc && !song.youtubeId) continue;
      const title = normalize(song.title);
      indexed.set(title, [...(indexed.get(title) || []), song]);
    }
    return indexed;
  }, [songs]);

  const selectMode = (nextMode: CatalogMode) => {
    if (nextMode === mode) return;
    resultsController.current?.abort();
    genresController.current?.abort();
    setLoading(false);
    setGenresLoading(false);
    setError(null);
    setGenresError(null);
    setResults(null);
    setRequest(null);
    setMode(nextMode);
    if (nextMode === 'genres' && genres.length === 0) void loadGenres();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = mode === 'search' ? query.trim() : mode === 'artist' ? artist.trim() : mode === 'genres' ? genre : country;
    if (value) void loadResults({ mode, value, offset: 0, ...(mode === 'charts' ? { chartType } : {}) });
  };

  const resultLabel = !hasServerCatalog() && request
    ? request.mode === 'search' ? `Sawan songs matching “${request.value}”` : request.mode === 'artist' ? `YouTube songs by ${request.value}` : request.mode === 'genres' ? `YouTube songs · ${request.value}` : 'YouTube songs in Sawan'
    : request?.mode === 'charts'
    ? `${COUNTRIES.find(([code]) => code === request.value)?.[1] || request.value} ${request.chartType === 'new-music' ? 'new music' : 'charts'}`
    : request?.mode === 'artist' ? `Songs by ${request.value}`
      : request?.mode === 'genres' ? request.value
        : request ? `Results for “${request.value}”` : 'Discover your next favorite';
  const canSubmit = mode === 'search' ? !!query.trim() : mode === 'artist' ? !!artist.trim() : mode === 'genres' ? !!genre : true;
  const isPageable = request?.mode === 'genres' || request?.mode === 'artist' || Boolean(error && results && request);
  const inputClass = 'min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20';

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#0b1329] text-slate-100" aria-label="Music catalog">
      <div className="border-b border-sky-500/10 bg-gradient-to-br from-sky-950/80 via-[#0f172a] to-[#0b1329] px-5 py-7 sm:px-8">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white">
          <ArrowLeft size={14} /> Back to your library
        </button>
        <div className="flex items-start gap-4">
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-300 sm:flex"><Disc3 size={33} /></div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-400">{hasServerCatalog() ? 'FreqBlog music discovery' : 'Sawan YouTube music library'}</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">A world of music.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{hasServerCatalog() ? 'Explore song titles and artists. Play linked songs here or find an official recording on YouTube.' : 'Browse and play the YouTube songs already included in Sawan. Search by title, artist, language, or album.'}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400" aria-live="polite">
          <span className={`inline-flex items-center gap-1.5 ${status?.connected ? 'text-sky-400' : 'text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${status?.connected ? 'bg-sky-400' : 'bg-slate-500'}`} />{!hasServerCatalog() ? 'Sawan YouTube catalog' : statusLoading ? 'Checking connection…' : status?.connected ? 'Catalog connected' : status?.configured ? 'Catalog temporarily unavailable' : status ? 'Catalog is not configured' : 'Connection unavailable'}</span>
          {status?.tier && <span className="capitalize">{status.tier} plan</span>}
          {status?.quota && <span>{status.quota.remaining.toLocaleString()} of {status.quota.limit.toLocaleString()} requests remaining</span>}
          {hasServerCatalog() && <button onClick={() => void loadStatus()} disabled={statusLoading} className="inline-flex items-center gap-1 text-slate-400 hover:text-white disabled:opacity-50" aria-label="Refresh catalog connection and quota"><RefreshCw size={12} className={statusLoading ? 'animate-spin' : ''} /> Refresh status</button>}
          {statusError && <span className="text-amber-300">{statusError}</span>}
        </div>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Catalog discovery mode">
          {MODES.map(({ id, label, icon: Icon }, index) => <button key={id} id={`catalog-tab-${id}`} type="button" role="tab" tabIndex={mode === id ? 0 : -1} aria-selected={mode === id} aria-controls="catalog-panel" onClick={() => selectMode(id)} onKeyDown={(event) => {
            const nextIndex = event.key === 'ArrowRight' ? (index + 1) % MODES.length : event.key === 'ArrowLeft' ? (index - 1 + MODES.length) % MODES.length : event.key === 'Home' ? 0 : event.key === 'End' ? MODES.length - 1 : null;
            if (nextIndex === null) return;
            event.preventDefault();
            selectMode(MODES[nextIndex].id);
            document.getElementById(`catalog-tab-${MODES[nextIndex].id}`)?.focus();
          }} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${mode === id ? 'bg-[#38bdf8] text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}><Icon size={16} />{label}</button>)}
        </div>

        <div id="catalog-panel" role="tabpanel" aria-labelledby={`catalog-tab-${mode}`}>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            {mode === 'search' && <><label className="sr-only" htmlFor="catalog-query">Song title, artist, or album</label><input id="catalog-query" name="catalogQuery" type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder="Try Gujarati garba, Arijit Singh, or your favorite song…" className={inputClass} /></>}
            {mode === 'artist' && <><label className="sr-only" htmlFor="catalog-artist">Artist name</label><input id="catalog-artist" name="catalogArtist" value={artist} onChange={(event) => setArtist(event.target.value)} maxLength={200} placeholder="Enter an artist, such as Geeta Rabari or Taylor Swift" className={inputClass} /></>}
            {mode === 'charts' && hasServerCatalog() && <><label className="sr-only" htmlFor="catalog-country">Chart country</label><div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 pl-4"><Globe2 size={18} className="shrink-0 text-sky-400" /><select id="catalog-country" name="catalogCountry" value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-xl bg-slate-900 px-2 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400/40">{COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></div><label className="sr-only" htmlFor="catalog-chart-type">Chart type</label><select id="catalog-chart-type" name="catalogChartType" value={chartType} onChange={(event) => setChartType(event.target.value as 'most-played' | 'new-music')} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"><option value="most-played">Most played</option><option value="new-music">New music</option></select></>}
            {mode === 'genres' && <><label className="sr-only" htmlFor="catalog-genre">Music genre</label><select id="catalog-genre" name="catalogGenre" value={genre} onChange={(event) => setGenre(event.target.value)} disabled={genresLoading || genres.length === 0} className={inputClass}><option value="">{genresLoading ? 'Loading genres…' : 'Choose a music genre'}</option>{genres.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.count.toLocaleString()} tracks)</option>)}</select></>}
            {mode === 'charts' && !hasServerCatalog() && <p className="flex flex-1 items-center text-sm text-slate-400">Browse the official YouTube songs included in Sawan Music.</p>}
            <button type="submit" disabled={!canSubmit || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#38bdf8] hover:bg-sky-300 px-6 py-3 text-sm font-bold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-45">{loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}{mode === 'search' ? 'Search songs' : mode === 'artist' ? 'Find artist' : mode === 'genres' ? 'Browse genre' : hasServerCatalog() ? 'Show charts' : 'Show YouTube songs'}</button>
          </form>
          {mode === 'genres' && genresError && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-amber-300" role="alert"><span>{genresError}</span><button onClick={() => void loadGenres()} className="font-bold underline">Retry genres</button></div>}
          {mode === 'genres' && !genresLoading && !genresError && genres.length === 0 && <p className="mt-3 text-sm text-slate-400">No genres are available right now.</p>}
          {mode === 'search' && <p className="mt-3 text-xs text-slate-500">Search runs when you press Enter or Search songs.</p>}
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">{resultLabel}</h2>
            {results && <span className="text-xs text-slate-400">{results.total !== null && Number.isFinite(results.total) ? `${results.total.toLocaleString()} tracks · ` : ''}{results.tracks.length} shown</span>}
          </div>

          {error && results && <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200" role="status">{error}</p>}

          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-sky-500/10 bg-slate-900/40 text-sm text-slate-400" role="status"><Loader2 size={26} className="animate-spin text-sky-400" />Finding music…</div>
          ) : error && !results ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6" role="alert"><p className="text-sm text-amber-200">{error}</p>{request && <button onClick={() => void loadResults(request)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"><RefreshCw size={14} />Try again</button>}</div>
          ) : results?.tracks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 p-10 text-center"><Music2 size={30} className="mx-auto mb-3 text-slate-600" /><p className="text-sm font-semibold text-slate-300">No songs found.</p><p className="mt-2 text-xs text-slate-500">Try another song title, artist, genre, or country.</p></div>
          ) : results ? (
            <div className="overflow-hidden rounded-2xl border border-sky-500/10 bg-slate-900/25">
              {results.tracks.map((track, index) => {
                const linkedSong = localSongsByTitle.get(normalize(track.title))?.find((song) => matchesArtist(song.artist, track.artist));
                const artwork = safeArtwork(track.artworkUrl);
                return (
                  <article key={`${track.id}-${index}`} className="flex flex-col gap-3 border-b border-slate-800/70 px-4 py-4 transition last:border-b-0 hover:bg-slate-800/35 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="hidden w-6 shrink-0 text-center font-mono text-xs text-slate-500 lg:block">{(request?.offset || 0) + index + 1}</span>
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sky-500/20 bg-gradient-to-br from-sky-950/50 to-slate-900 text-sky-300/50"><Music2 size={23} />{artwork && <img src={artwork} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" />}</div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-white" title={track.title}>{track.title}{track.explicit && <span className="ml-2 inline-block rounded bg-slate-700 px-1 text-[9px] font-bold text-slate-200" aria-label="Explicit">E</span>}</h3>
                        <p className="mt-0.5 truncate text-xs text-slate-400" title={track.artist}>{track.artist}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">{track.genre && <span className="rounded bg-sky-950/70 px-1.5 py-0.5 text-sky-300">{track.genre}</span>}{track.album && <span className="max-w-48 truncate" title={track.album}>{track.album}</span>}{track.releaseDate && <span>{track.releaseDate.slice(0, 4)}</span>}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 pl-15 sm:justify-end sm:pl-0">
                      <span className="font-mono text-xs text-slate-500">{formatDuration(track.duration)}</span>
                      <button
                        onClick={() => {
                          if (linkedSong) {
                            onPlaySong(linkedSong);
                          } else {
                            onPlaySong({
                              id: `yt-live-${track.id}`,
                              youtubeId: track.id,
                              title: track.title,
                              artist: track.artist || 'YouTube Artist',
                              album: track.album || 'YouTube Search',
                              coverUrl: track.artworkUrl || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`,
                              duration: track.duration || 210,
                              genre: track.genre || 'Music',
                              year: track.releaseDate ? Number(track.releaseDate.slice(0, 4)) : 2026,
                              mood: 'Pop',
                              bpm: 80,
                              lyrics: '',
                              isFavorite: false,
                              playlistIds: [],
                              dateAdded: new Date().toISOString().split('T')[0],
                              playCount: 1,
                              isYoutubeSource: true,
                              isCatalogSong: true
                            });
                          }
                        }}
                        aria-label={`Play ${track.title} in Sawan`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#38bdf8] text-slate-950 px-4 py-2 text-xs font-extrabold hover:bg-sky-300 transition-all shadow-md shadow-sky-500/20"
                      >
                        <Play size={13} fill="currentColor" /> Play in Sawan
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500"><Music2 size={30} className="mx-auto mb-3 text-emerald-500/50" />{mode === 'genres' ? 'Choose a genre to explore its songs.' : mode === 'artist' ? 'Enter an artist to explore their music.' : mode === 'charts' ? 'Choose a country and show its charts.' : 'Search a song title, artist, or album to begin.'}</div>
          )}

          {results && isPageable && request && (request.offset > 0 || results.hasMore) && <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Catalog result pages"><button disabled={loading || !request.previousOffsets?.length} onClick={() => void loadResults({ ...request, offset: request.previousOffsets?.at(-1) || 0, previousOffsets: request.previousOffsets?.slice(0, -1) })} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={15} />Previous</button><span className="text-xs text-zinc-500">Page {(request.previousOffsets?.length || 0) + 1}</span><button disabled={loading || !results.hasMore || !Number.isFinite(results.nextOffset) || results.nextOffset <= request.offset} onClick={() => void loadResults({ ...request, offset: results.nextOffset, previousOffsets: [...(request.previousOffsets || []), request.offset] })} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35">Next<ChevronRight size={15} /></button></nav>}
          {results && request?.mode === 'search' && results.tracks.length >= 50 && hasServerCatalog() && !error && <p className="mt-4 text-xs text-zinc-500">Showing up to 50 matches. Add an artist or a more specific title to narrow your search.</p>}
        </div>
        <p className="pb-5 text-[11px] leading-relaxed text-zinc-500">{hasServerCatalog() ? 'Song information provided by FreqBlog. YouTube search opens a new tab; recording availability depends on the uploader and your region.' : 'These songs link to original YouTube recordings. Playback and availability depend on the uploader and your region.'}</p>
      </div>
    </section>
  );
};
