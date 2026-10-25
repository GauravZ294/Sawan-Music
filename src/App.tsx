/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, Playlist, ViewMode } from './types/music';
import { INITIAL_SONGS, INITIAL_PLAYLISTS } from './data/initialLibrary';
import importedCatalog from './data/youtubeCatalog.json';
import { buildSiteCatalog, restoreLibrary } from './utils/siteCatalog';
import { audioEngine } from './utils/audioEngine';
import { convertFilesToSongs } from './utils/systemMediaScanner';
import { Sidebar } from './components/Sidebar';
import { LibraryView } from './components/LibraryView';
import { AppNavbar } from './components/AppNavbar';
import { YourLibraryPage } from './components/YourLibraryPage';
import { NowPlayingBar } from './components/NowPlayingBar';
import { LyricsKaraoke } from './components/LyricsKaraoke';
// Temporarily disabled; keep the original AI implementation for re-enabling.
import { AiMusicStudio } from './components/AiMusicStudio';
import { AiMoodTaggerPage } from './components/AiMoodTaggerPage';
import { AiComingSoonPage } from './components/AiComingSoonPage';
import { ImmersivePlayerModal } from './components/ImmersivePlayerModal';
import { SongEditorModal } from './components/SongEditorModal';
import { AutoOrganizeModal } from './components/AutoOrganizeModal';
import { AudioImportModal } from './components/AudioImportModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { SystemMediaScannerModal } from './components/SystemMediaScannerModal';
import { YouTubeAudioPlayer } from './components/YouTubeAudioPlayer';
import { DolbyAudioModal } from './components/DolbyAudioModal';
import { AppLoader } from './components/AppLoader';
import { AccountModal, type MusicProfile } from './components/AccountModal';
import { Download, Sparkles, Home, Library, WandSparkles, Music2 } from 'lucide-react';

const STORAGE_KEY_SONGS = 'sawan_music_spotify_songs_v4';
const STORAGE_KEY_PLAYLISTS = 'sawan_music_spotify_playlists_v4';
const STORAGE_KEY_PROFILE = 'sawan_music_profile_v1';
// Read legacy storage without surfacing the retired brand in UI or exports.
const LEGACY_STORAGE_KEY_SONGS = ['swar', 'sync_spotify_songs_v4'].join('');
const LEGACY_STORAGE_KEY_PLAYLISTS = ['swar', 'sync_spotify_playlists_v4'].join('');
const MusicCatalogExplorer = React.lazy(() => import('./components/MusicCatalogExplorer')
  .then((module) => ({ default: module.MusicCatalogExplorer })));

// Imported metadata is refreshed by the owner; visitors search this local snapshot.
const catalogAge = importedCatalog.updatedAt ? Date.now() - Date.parse(importedCatalog.updatedAt) : Infinity;
const catalogIsFresh = catalogAge < 30 * 24 * 60 * 60 * 1000;
const DISALLOWED_SONG_IDS = new Set(['chahun-main-ya-naa', 'chahun-main-lofi', 'chahun-main-ya-naa-yt', 'chahun-main-lofi-yt']);
const excludedVideoIds = [...importedCatalog.excludedVideoIds,
  'jazrixVDB3o', 'VYE6IVoYeKM',
  ...(!catalogIsFresh ? (importedCatalog.songs as Song[]).map((song) => song.youtubeId!) : [])];
const SITE_SONGS = buildSiteCatalog(INITIAL_SONGS.filter((s) => !DISALLOWED_SONG_IDS.has(s.id)),
  catalogIsFresh ? importedCatalog.songs as Song[] : [], excludedVideoIds);

export default function App() {
  const [profile, setProfile] = useState<MusicProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      return stored ? JSON.parse(stored) as MusicProfile : null;
    } catch {
      return null;
    }
  });
  const [accountModalMode, setAccountModalMode] = useState<'signup' | 'login' | null>(null);
  // Library State (persisted in localStorage, initialized with full Bollywood catalog)
  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SONGS) ?? localStorage.getItem(LEGACY_STORAGE_KEY_SONGS);
      if (saved) {
        const parsed: Song[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter((s) => !DISALLOWED_SONG_IDS.has(s.id) && s.youtubeId !== 'jazrixVDB3o' && s.youtubeId !== 'VYE6IVoYeKM');
          return restoreLibrary(SITE_SONGS, sanitized, excludedVideoIds);
        }
      }
    } catch {}
    return SITE_SONGS;
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLISTS) ?? localStorage.getItem(LEGACY_STORAGE_KEY_PLAYLISTS);
      if (saved) {
        const parsed: Playlist[] = JSON.parse(saved);
        const seenIds = new Set(INITIAL_PLAYLISTS.map((p) => p.id));
        const customPlaylists = parsed.filter((p) => !seenIds.has(p.id));
        return [...INITIAL_PLAYLISTS, ...customPlaylists];
      }
    } catch {}
    return INITIAL_PLAYLISTS;
  });

  // Navigation State
  const [currentView, setCurrentView] = useState<ViewMode>('all-songs');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');

  // Playback State: Do not default to any song on site open
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seekVersion, setSeekVersion] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');

  // UI Modals & Drawers
  const [showLyricsDrawer, setShowLyricsDrawer] = useState<boolean>(false);
  const [showImmersiveModal, setShowImmersiveModal] = useState<boolean>(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showAutoOrganizeModal, setShowAutoOrganizeModal] = useState<boolean>(false);
  const [showAudioImportModal, setShowAudioImportModal] = useState<boolean>(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState<boolean>(false);
  const [showSystemScannerModal, setShowSystemScannerModal] = useState<boolean>(false);
  const [youtubePlayRequest, setYoutubePlayRequest] = useState(0);
  const [youtubePlaybackStarted, setYoutubePlaybackStarted] = useState<boolean>(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);
  const dragCounter = useRef(0);

  // Left panel collapse / expand state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Dolby Audio Modal & Animated Intro Loader state
  const [showDolbyModal, setShowDolbyModal] = useState<boolean>(false);
  const [showIntroLoader, setShowIntroLoader] = useState<boolean>(true);

  // AI Mood Tagger state
  const [showMoodTaggerModal, setShowMoodTaggerModal] = useState<boolean>(false);
  const [moodTaggerTargetSong, setMoodTaggerTargetSong] = useState<Song | null>(null);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle left panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenMoodTagger = (target?: Song) => {
    setMoodTaggerTargetSong(target || null);
    handleSelectView('ai-mood');
  };

  const handleBatchUpdateSongs = (updatedList: Song[]) => {
    setSongs(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY_SONGS, JSON.stringify(updatedList));
    } catch {}
    if (activeSong) {
      const match = updatedList.find((s) => s.id === activeSong.id);
      if (match) setActiveSong(match);
    }
  };

  // Global Drag and Drop Listener for System Downloaded Media
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingFiles(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        setIsDraggingFiles(false);
        dragCounter.current = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingFiles(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const validFiles: File[] = [];
        const validExts = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.opus', '.webm'];
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
          if (validExts.includes(ext)) {
            validFiles.push(file);
          }
        }

        if (validFiles.length > 0) {
          const newSongs = await convertFilesToSongs(validFiles);
          handleSongsCaught(newSongs);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SONGS, JSON.stringify(songs));
    } catch {}
  }, [songs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
    } catch {}
  }, [playlists]);

  // Audio Playback Handlers
  const nextSongRef = useRef<() => void>(() => {});
  const handlePlaySong = useCallback(
    (song: Song) => {
      if (!profile && !song.youtubeId) {
        setPlaybackError('Log in to your Sawan - music profile to play songs.');
        setAccountModalMode('login');
        return;
      }

      setActiveSong(song);
      setCurrentTime(0);
      setDuration(song.duration || 180);
      setYoutubePlaybackStarted(Boolean(song.youtubeId && !song.audioSrc));
      setYoutubePlayRequest((request) => request + 1);

      if (!song.audioSrc && !song.youtubeId) {
        audioEngine.stop();
        setIsPlaying(false);
        setPlaybackError('No original audio is available for this track. Import an audio file or choose a YouTube track.');
        return;
      }

      setPlaybackError(null);
      setIsPlaying(true);

      // Increment play count
      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, playCount: s.playCount + 1 } : s))
      );

      // Play imported audio directly, or let the YouTube controller own playback.
      audioEngine.playSong(
        song,
        (time, dur) => {
          setCurrentTime(time);
          if (dur) setDuration(dur);
        },
        () => {
          // Song ended callback
          nextSongRef.current();
        }
      );
    },
    [songs, profile]
  );

  const handlePauseSong = useCallback(() => {
    setIsPlaying(false);
    audioEngine.pause();
  }, []);

  const handleResumeSong = useCallback(() => {
    if (!activeSong) return;
    if (!profile && !activeSong.youtubeId) {
      setAccountModalMode('login');
      return;
    }
    if (activeSong.youtubeId && !activeSong.audioSrc && currentTime === 0) {
      setYoutubePlayRequest((request) => request + 1);
    }
    setIsPlaying(true);
    audioEngine.resume();
  }, [activeSong, profile, currentTime]);

  const handleSignOut = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setYoutubePlaybackStarted(false);
    setProfile(null);
    setPlaybackError(null);
    try { localStorage.removeItem(STORAGE_KEY_PROFILE); } catch {}
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePauseSong();
    } else {
      if (activeSong) {
        if (currentTime > 0) {
          handleResumeSong();
        } else {
          handlePlaySong(activeSong);
        }
      }
    }
  }, [isPlaying, activeSong, currentTime, handlePauseSong, handleResumeSong, handlePlaySong]);

  const handleSeek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    setSeekVersion((version) => version + 1);
    audioEngine.seek(seconds);
  }, []);

  // Determine active queue based on playlist, garba, favorites, system downloads, or full song catalog
  const getActiveQueue = useCallback(() => {
    if (selectedPlaylistId) {
      const targetPl = playlists.find((p) => p.id === selectedPlaylistId);
      if (targetPl && targetPl.songIds.length > 0) {
        const plSongs = targetPl.songIds
          .map((id) => songs.find((s) => s.id === id))
          .filter((s): s is Song => Boolean(s));
        if (plSongs.length > 0) return plSongs;
      }
    }
    if (currentView === 'garba') {
      const garbaSongs = songs.filter((s) => s.garbaStyles?.length || s.genre?.toLowerCase().includes('garba'));
      if (garbaSongs.length > 0) return garbaSongs;
    }
    if (currentView === 'favorites') {
      const favs = songs.filter((s) => s.isFavorite);
      if (favs.length > 0) return favs;
    }
    if (currentView === 'system-downloads') {
      const downloads = songs.filter((s) => s.isSystemMedia || s.playlistIds?.includes('system-downloads'));
      if (downloads.length > 0) return downloads;
    }
    return songs;
  }, [selectedPlaylistId, playlists, currentView, songs]);

  const handleNextSong = useCallback(() => {
    const queue = getActiveQueue();
    if (queue.length === 0) return;
    if (!activeSong) {
      handlePlaySong(queue[0]);
      return;
    }

    if (repeatMode === 'one') {
      handlePlaySong(activeSong);
      return;
    }

    if (isShuffle) {
      const candidates = queue.length > 1 ? queue.filter((s) => s.id !== activeSong.id) : queue;
      const randomIndex = Math.floor(Math.random() * candidates.length);
      handlePlaySong(candidates[randomIndex]);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === activeSong.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % queue.length;
    handlePlaySong(queue[nextIndex]);
  }, [activeSong, getActiveQueue, repeatMode, isShuffle, handlePlaySong]);

  // In the foreground, keep the normal mixed queue. While backgrounded, only
  // direct audio files can advance; never start an embedded YouTube video hidden.
  const handleMediaSessionNext = useCallback(() => {
    if (!activeSong || songs.length === 0) return;
    if (repeatMode === 'one' && activeSong.audioSrc) {
      handlePlaySong(activeSong);
      return;
    }
    if (isShuffle) {
      const playable = songs.filter((song) => song.audioSrc && song.id !== activeSong.id);
      if (playable.length) handlePlaySong(playable[Math.floor(Math.random() * playable.length)]);
      return;
    }
    const currentIndex = songs.findIndex((song) => song.id === activeSong.id);
    for (let step = 1; step <= songs.length; step++) {
      const candidate = songs[(currentIndex + step + songs.length) % songs.length];
      if (candidate.audioSrc) {
        handlePlaySong(candidate);
        return;
      }
    }
  }, [activeSong, songs, repeatMode, isShuffle, handlePlaySong]);

  const handleMediaSessionPrev = useCallback(() => {
    if (!activeSong || songs.length === 0) return;
    if (currentTime > 3 && activeSong.audioSrc) {
      handleSeek(0);
      return;
    }
    const currentIndex = songs.findIndex((song) => song.id === activeSong.id);
    for (let step = 1; step <= songs.length; step++) {
      const candidate = songs[(currentIndex - step + songs.length * 2) % songs.length];
      if (candidate.audioSrc) {
        handlePlaySong(candidate);
        return;
      }
    }
  }, [activeSong, songs, currentTime, handleSeek, handlePlaySong]);

  // In the foreground, keep the normal mixed queue. While backgrounded, only
  // direct audio files can advance; never start an embedded YouTube video hidden.
  useEffect(() => {
    nextSongRef.current = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        if (activeSong?.audioSrc) handleMediaSessionNext();
        else setPlaybackError('Return to Sawan Music to continue YouTube playback. Background listening is available for imported audio files.');
        return;
      }
      handleNextSong();
    };
  }, [activeSong, handleNextSong, handleMediaSessionNext]);

  const handlePrevSong = useCallback(() => {
    const queue = getActiveQueue();
    if (queue.length === 0) return;
    if (!activeSong) {
      handlePlaySong(queue[0]);
      return;
    }

    if (currentTime > 3) {
      handleSeek(0);
      return;
    }

    if (isShuffle) {
      const candidates = queue.length > 1 ? queue.filter((s) => s.id !== activeSong.id) : queue;
      const randomIndex = Math.floor(Math.random() * candidates.length);
      handlePlaySong(candidates[randomIndex]);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === activeSong.id);
    const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + queue.length) % queue.length;
    handlePlaySong(queue[prevIndex]);
  }, [activeSong, getActiveQueue, currentTime, handleSeek, isShuffle, handlePlaySong]);

  // Synchronize system media session for background listening and hardware media keys
  useEffect(() => {
    audioEngine.setPlaybackCallbacks({
      onPlaybackChange: setIsPlaying,
      onError: setPlaybackError,
    });
    return () => audioEngine.setPlaybackCallbacks({});
  }, []);

  useEffect(() => {
    audioEngine.setMediaSessionCallbacks({
      onPlay: () => {
        if (!audioEngine.getIsPlaying()) {
          handleResumeSong();
        }
      },
      onPause: () => {
        handlePauseSong();
      },
      onNext: () => {
        handleMediaSessionNext();
      },
      onPrev: () => {
        handleMediaSessionPrev();
      },
      onSeek: (seconds: number) => {
        handleSeek(seconds);
      },
    });
  }, [handleResumeSong, handlePauseSong, handleMediaSessionNext, handleMediaSessionPrev, handleSeek]);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    audioEngine.setPlaybackRate(rate);
  }, []);

  const handleToggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const handleToggleFavorite = useCallback((songId: string) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  }, []);

  // Song Library Operations
  const handleSongCreated = useCallback((newSong: Song) => {
    setSongs((prev) => {
      if (prev.some((s) => s.id === newSong.id)) return prev;
      return [newSong, ...prev];
    });

    if (newSong.playlistIds && newSong.playlistIds.length > 0) {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (newSong.playlistIds.includes(pl.id) && !pl.songIds.includes(newSong.id)) {
            return { ...pl, songIds: [newSong.id, ...pl.songIds] };
          }
          return pl;
        })
      );
    }
  }, []);

  const handleSaveSongEdit = useCallback((updatedSong: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
    if (activeSong?.id === updatedSong.id) {
      setActiveSong(updatedSong);
    }
  }, [activeSong]);

  const handleDeleteSong = useCallback((songId: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    setPlaylists((prev) =>
      prev.map((pl) => ({ ...pl, songIds: pl.songIds.filter((id) => id !== songId) }))
    );
    if (activeSong?.id === songId) {
      audioEngine.stop();
      setIsPlaying(false);
      setActiveSong(null);
    }
  }, [activeSong]);

  // Playlist Operations
  const handleCreatePlaylist = useCallback((newPlaylist: Playlist) => {
    setLibrarySearch('');
    setPlaylists((prev) => [...prev, newPlaylist]);
    setSelectedPlaylistId(newPlaylist.id);
    setCurrentView('playlist-detail');
  }, []);

  const handleSelectPlaylist = useCallback((playlistId: string) => {
    setLibrarySearch('');
    setSelectedPlaylistId(playlistId);
    setCurrentView('playlist-detail');
  }, []);

  // Smart Auto-Organizer
  const handleAutoCreateMoodPlaylists = useCallback(() => {
    const moodGroups: Record<string, string[]> = {};
    songs.forEach((s) => {
      const moodKey = s.mood || 'Eclectic';
      if (!moodGroups[moodKey]) moodGroups[moodKey] = [];
      moodGroups[moodKey].push(s.id);
    });

    const newGeneratedPlaylists: Playlist[] = Object.entries(moodGroups).map(([mood, sIds]) => ({
      id: `smart-mood-${mood.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      name: `Mood: ${mood}`,
      description: `Smart playlist automatically clustered for ${mood} vibes.`,
      coverUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
      color: '#38bdf8',
      songIds: sIds,
      createdAt: new Date().toISOString().split('T')[0],
    }));

    setPlaylists((prev) => [...prev, ...newGeneratedPlaylists]);
  }, [songs]);

  // Export Library JSON
  const handleExportLibrary = useCallback(() => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify({ songs, playlists, exportedAt: new Date().toISOString() }, null, 2)
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `sawan-music-library-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [songs, playlists]);

  // Handle batch system caught songs
  const handleSongsCaught = useCallback(
    (newSongs: Song[]) => {
      setSongs((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const filtered = newSongs.filter((s) => !existingIds.has(s.id));
        return [...filtered, ...prev];
      });

      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === 'system-downloads') {
            const newIds = newSongs.map((s) => s.id);
            const unique = Array.from(new Set([...newIds, ...pl.songIds]));
            return { ...pl, songIds: unique };
          }
          return pl;
        })
      );

      setCurrentView('system-downloads');

      if (!isPlaying && newSongs.length > 0) {
        handlePlaySong(newSongs[0]);
      }
    },
    [isPlaying, handlePlaySong]
  );

  const handleBrowseCatalog = () => {
    setLibrarySearch('');
    setCurrentView('youtube-explore');
    setSelectedPlaylistId(null);
  };

  const handleOpenLibrary = () => {
    setLibrarySearch('');
    setSelectedPlaylistId(null);
    setCurrentView('library');
  };

  const handleSelectView = (view: ViewMode) => {
    setCurrentView(view);
    setLibrarySearch('');
    if (view !== 'playlist-detail') setSelectedPlaylistId(null);
  };

  const handleLibrarySearch = (value: string) => {
    setLibrarySearch(value);
    if (currentView === 'library' || currentView === 'youtube-explore' || currentView === 'ai-studio' || currentView === 'ai-mood') {
      setSelectedPlaylistId(null);
      setCurrentView('all-songs');
    }
  };

  const systemMediaCount = songs.filter(
    (s) => s.isSystemMedia || s.playlistIds?.includes('system-downloads')
  ).length;

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-[#070d1e] text-[#94a3b8] select-none relative font-sans">
      {/* Full-screen Drag and Drop Overlay for System Downloads */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-[#38bdf8]/90 backdrop-blur-md border-4 border-dashed border-white flex flex-col items-center justify-center gap-4 text-center p-6 animate-in fade-in duration-150 pointer-events-none text-slate-950">
          <div className="w-20 h-20 rounded-3xl bg-slate-950/20 border border-slate-950/30 flex items-center justify-center text-slate-950 shadow-2xl animate-pulse">
            <Download size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-950">
              Drop System Downloaded Media Here
            </h2>
            <p className="text-sm font-semibold text-slate-900">
              Files will be automatically caught with original thumbnails and added to your library.
            </p>
          </div>
        </div>
      )}

      {/* Spotify Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        onOpenSystemScanner={() => setShowSystemScannerModal(true)}
        onBrowseCatalog={handleBrowseCatalog}
        onOpenAiStudio={() => handleSelectView('ai-studio')}
        onOpenMoodTagger={() => handleOpenMoodTagger()}
        onOpenDolbyModal={() => setShowDolbyModal(true)}
        systemMediaCount={systemMediaCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Music Area */}
      <main
        className={`relative m-2 ml-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-[#0f172a] border border-sky-500/10 ${activeSong ? 'pb-20' : 'pb-0'}`}
        data-has-active-song={Boolean(activeSong)}
      >
        <AppNavbar
          profile={profile}
          currentView={currentView}
          searchQuery={librarySearch}
          onSearchChange={handleLibrarySearch}
          onOpenLibrary={handleOpenLibrary}
          onHome={() => handleSelectView('all-songs')}
          onOpenAccount={(mode) => setAccountModalMode(mode)}
          onSignOut={handleSignOut}
        />
        {/* View Switcher */}
        {currentView === 'library' ? (
          <YourLibraryPage
            songs={songs}
            playlists={playlists}
            activeSong={activeSong}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onPauseSong={handlePauseSong}
            onToggleFavorite={handleToggleFavorite}
            onSelectPlaylist={handleSelectPlaylist}
            onSelectView={handleSelectView}
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            onImportAudio={() => setShowAudioImportModal(true)}
            onAutoOrganize={() => setShowAutoOrganizeModal(true)}
            onOpenSystemScanner={() => setShowSystemScannerModal(true)}
            onOpenMoodTagger={() => handleOpenMoodTagger()}
            onBrowseCatalog={handleBrowseCatalog}
          />
        ) : currentView === 'youtube-explore' ? (
          <div className="flex min-h-0 flex-1">
            <React.Suspense fallback={<div role="status" className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading music catalog…</div>}>
              <MusicCatalogExplorer
                songs={songs}
                onPlaySong={handlePlaySong}
              onBack={() => handleSelectView('all-songs')}
              />
            </React.Suspense>
          </div>
        ) : currentView === 'ai-studio' ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <AiMusicStudio
              songs={songs}
              onSongCreated={handleSongCreated}
              onPlaySong={handlePlaySong}
            />
          </div>
        ) : currentView === 'ai-mood' ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <AiMoodTaggerPage
              songs={songs}
              targetSong={moodTaggerTargetSong}
              onUpdateSong={handleSaveSongEdit}
              onBatchUpdateSongs={handleBatchUpdateSongs}
              onGoHome={() => handleSelectView('all-songs')}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Library Table / Grids */}
            <LibraryView
              currentView={currentView}
              onSelectView={handleSelectView}
              songs={songs}
              playlists={playlists}
              selectedPlaylistId={selectedPlaylistId}
              activeSong={activeSong}
              isPlaying={isPlaying}
              onPlaySong={handlePlaySong}
              onPauseSong={handlePauseSong}
              onToggleFavorite={handleToggleFavorite}
              onEditSong={(song) => setEditingSong(song)}
              onDeleteSong={handleDeleteSong}
              onSelectPlaylist={handleSelectPlaylist}
              onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
              onOpenAiStudio={() => handleSelectView('ai-studio')}
              onOpenImmersiveMode={() => setShowImmersiveModal(true)}
              onOpenSystemScanner={() => setShowSystemScannerModal(true)}
              onBrowseCatalog={handleBrowseCatalog}
              onOpenMoodTagger={() => handleOpenMoodTagger()}
              onTagSongMood={(song) => handleOpenMoodTagger(song)}
              onOpenDolbyModal={() => setShowDolbyModal(true)}
              searchQuery={librarySearch}
              onSearchQueryChange={setLibrarySearch}
            />

            {/* Split Synced Lyrics Side Drawer (Spotify Karaoke) */}
            {showLyricsDrawer && activeSong && (
              <div className="w-96 h-full p-4 border-l border-zinc-800 bg-[#121212] hidden md:block shrink-0 pb-28 animate-in slide-in-from-right-4 duration-300">
                <LyricsKaraoke
                  song={activeSong}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  isCompact={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Audio playback controller has no visible video UI. */}
        <YouTubeAudioPlayer
          song={activeSong}
          isActive={youtubePlaybackStarted}
          isPlaying={isPlaying}
          playRequest={youtubePlayRequest}
          currentTime={currentTime}
          seekVersion={seekVersion}
          volume={volume}
          playbackRate={playbackRate}
          onTimeUpdate={(time, dur) => {
            setCurrentTime(time);
            if (dur > 0) setDuration(dur);
          }}
          onPlaybackChange={(playing) => {
            setIsPlaying(playing);
            if (playing) audioEngine.resume();
            else audioEngine.pause();
          }}
          onEnded={handleNextSong}
          onError={setPlaybackError}
        />

        {/* Bottom Spotify Now Playing Bar */}
        <NowPlayingBar
          song={activeSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          showLyricsDrawer={showLyricsDrawer}
          onPlayPause={handlePlayPause}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleLyricsDrawer={() => setShowLyricsDrawer((prev) => !prev)}
          onToggleFavorite={handleToggleFavorite}
          onOpenImmersiveMode={() => setShowImmersiveModal(true)}
          onOpenDolbyModal={() => setShowDolbyModal(true)}
        />
      </main>
      <nav className="mobile-nav" aria-label="Primary navigation">
        <button onClick={() => handleSelectView('all-songs')} aria-current={currentView === 'all-songs' ? 'page' : undefined}><Home size={19} /><span>Home</span></button>
        <button onClick={handleOpenLibrary} aria-current={['library', 'playlists', 'playlist-detail', 'favorites', 'system-downloads', 'artists', 'albums'].includes(currentView) ? 'page' : undefined}><Library size={19} /><span>Library</span></button>
        <button onClick={() => handleSelectView('ai-studio')} aria-current={currentView === 'ai-studio' ? 'page' : undefined}><WandSparkles size={19} /><span>AI Lyrics</span></button>
        <button onClick={handleBrowseCatalog}><Sparkles size={19} /><span>Explore</span></button>
      </nav>
      {accountModalMode && (
        <AccountModal
          mode={accountModalMode}
          savedProfile={profile}
          onClose={() => setAccountModalMode(null)}
          onChangeMode={setAccountModalMode}
          onComplete={(nextProfile) => {
            setProfile(nextProfile);
            try { localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(nextProfile)); } catch {}
            setAccountModalMode(null);
          }}
        />
      )}
      {playbackError && (
        <div role="alert" className="fixed bottom-24 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-500/30 bg-zinc-900 px-4 py-3 text-xs text-amber-100 shadow-2xl">
          <span>{playbackError}</span>
          <button onClick={() => setPlaybackError(null)} aria-label="Dismiss" className="text-zinc-400 hover:text-white">×</button>
        </div>
      )}

      {/* Fullscreen Vinyl Immersive Modal */}
      {showImmersiveModal && activeSong && (
        <ImmersivePlayerModal
          song={activeSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onPlayPause={handlePlayPause}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleFavorite={handleToggleFavorite}
          onOpenAudioEnhancements={() => setShowDolbyModal(true)}
          onClose={() => setShowImmersiveModal(false)}
        />
      )}

      {/* Song Tag / Metadata Editor Modal */}
      {editingSong && (
        <SongEditorModal
          song={editingSong}
          playlists={playlists}
          onSave={handleSaveSongEdit}
          onClose={() => setEditingSong(null)}
        />
      )}

      {/* Auto-Organize Modal */}
      {showAutoOrganizeModal && (
        <AutoOrganizeModal
          songs={songs}
          playlists={playlists}
          onAutoCreateMoodPlaylists={handleAutoCreateMoodPlaylists}
          onExportLibrary={handleExportLibrary}
          onClose={() => setShowAutoOrganizeModal(false)}
        />
      )}

      {/* Audio Import Modal */}
      {showAudioImportModal && (
        <AudioImportModal
          playlists={playlists}
          onImport={(newSong) => {
            handleSongCreated(newSong);
            handlePlaySong(newSong);
          }}
          onClose={() => setShowAudioImportModal(false)}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <CreatePlaylistModal
          onCreate={handleCreatePlaylist}
          onClose={() => setShowCreatePlaylistModal(false)}
        />
      )}

      {/* System Media Scanner Modal */}
      {showSystemScannerModal && (
        <SystemMediaScannerModal
          onSongsCaught={handleSongsCaught}
          onClose={() => setShowSystemScannerModal(false)}
        />
      )}

      {/* Dolby Audio Enhancer & Sound Effects Suite Modal */}
      <DolbyAudioModal
        isOpen={showDolbyModal}
        onClose={() => setShowDolbyModal(false)}
        activeSong={activeSong}
        isPlaying={isPlaying}
        onTogglePlay={handlePlayPause}
        onImportAudio={() => {
          setShowDolbyModal(false);
          setShowSystemScannerModal(true);
        }}
      />

      {/* Animated Splash Loader with Logo on Initial Refresh & Trigger */}
      {showIntroLoader && (
        <AppLoader onFinish={() => setShowIntroLoader(false)} />
      )}
    </div>
  );
}
