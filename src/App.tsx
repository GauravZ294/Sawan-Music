/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, Playlist, ViewMode } from './types/music';
import { INITIAL_SONGS, INITIAL_PLAYLISTS } from './data/initialLibrary';
import { audioEngine } from './utils/audioEngine';
import { convertFilesToSongs } from './utils/systemMediaScanner';
import { Sidebar } from './components/Sidebar';
import { LibraryView } from './components/LibraryView';
import { NowPlayingBar } from './components/NowPlayingBar';
import { LyricsKaraoke } from './components/LyricsKaraoke';
import { AiMusicStudio } from './components/AiMusicStudio';
import { ImmersivePlayerModal } from './components/ImmersivePlayerModal';
import { SongEditorModal } from './components/SongEditorModal';
import { AutoOrganizeModal } from './components/AutoOrganizeModal';
import { AudioImportModal } from './components/AudioImportModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { SystemMediaScannerModal } from './components/SystemMediaScannerModal';
import { YouTubeExploreModal } from './components/YouTubeExploreModal';
import { YouTubeVideoCanvas } from './components/YouTubeVideoCanvas';
import { AiMoodTaggerModal } from './components/AiMoodTaggerModal';
import { DolbyAudioModal } from './components/DolbyAudioModal';
import { AppLoader } from './components/AppLoader';
import { Download, Sparkles } from 'lucide-react';

const STORAGE_KEY_SONGS = 'swarsync_spotify_songs_v4';
const STORAGE_KEY_PLAYLISTS = 'swarsync_spotify_playlists_v4';

export default function App() {
  // Library State (persisted in localStorage, initialized with full Bollywood catalog)
  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SONGS);
      if (saved) {
        const parsed: Song[] = JSON.parse(saved);
        // Ensure all INITIAL_SONGS are present
        const initialMap = new Map(INITIAL_SONGS.map((s) => [s.id, s]));
        const merged: Song[] = [];
        const seenIds = new Set<string>();

        // First keep initial catalog
        for (const s of INITIAL_SONGS) {
          seenIds.add(s.id);
          merged.push(s);
        }

        // Then append any user imported/caught tracks
        for (const s of parsed) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            merged.push(s);
          }
        }
        return merged;
      }
    } catch {}
    return INITIAL_SONGS;
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
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

  // Playback State
  const [activeSong, setActiveSong] = useState<Song | null>(() => {
    // Default to the user's requested song "Chahun Main Ya Naa"
    return songs.find((s) => s.id === 'chahun-main-ya-naa') || songs[0] || null;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(() => activeSong?.duration || 202);
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
  const [showYouTubeExploreModal, setShowYouTubeExploreModal] = useState<boolean>(false);
  const [isVideoCanvasOpen, setIsVideoCanvasOpen] = useState<boolean>(false);
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
    setShowMoodTaggerModal(true);
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
  const handlePlaySong = useCallback(
    (song: Song) => {
      setActiveSong(song);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(song.duration || 180);

      // Increment play count
      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, playCount: s.playCount + 1 } : s))
      );

      // Play audio via procedural or custom audio engine
      audioEngine.playSong(
        song,
        (time, dur) => {
          setCurrentTime(time);
          if (dur) setDuration(dur);
        },
        () => {
          // Song ended callback
          handleNextSong();
        }
      );
    },
    [songs]
  );

  const handlePauseSong = useCallback(() => {
    setIsPlaying(false);
    audioEngine.pause();
  }, []);

  const handleResumeSong = useCallback(() => {
    if (!activeSong) return;
    setIsPlaying(true);
    audioEngine.resume();
  }, [activeSong]);

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
    audioEngine.seek(seconds);
  }, []);

  const handleNextSong = useCallback(() => {
    if (!activeSong || songs.length === 0) return;

    if (repeatMode === 'one') {
      handlePlaySong(activeSong);
      return;
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      handlePlaySong(songs[randomIndex]);
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === activeSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    handlePlaySong(songs[nextIndex]);
  }, [activeSong, songs, repeatMode, isShuffle, handlePlaySong]);

  const handlePrevSong = useCallback(() => {
    if (!activeSong || songs.length === 0) return;

    if (currentTime > 3) {
      handleSeek(0);
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === activeSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    handlePlaySong(songs[prevIndex]);
  }, [activeSong, songs, currentTime, handleSeek, handlePlaySong]);

  // Synchronize system media session for background listening and hardware media keys
  useEffect(() => {
    audioEngine.setMediaSessionCallbacks({
      onPlay: () => {
        if (!audioEngine.getIsPlaying()) {
          handlePlayPause();
        }
      },
      onPause: () => {
        handlePauseSong();
      },
      onNext: () => {
        handleNextSong();
      },
      onPrev: () => {
        handlePrevSong();
      },
      onSeek: (seconds: number) => {
        handleSeek(seconds);
      },
    });
  }, [handlePlayPause, handlePauseSong, handleNextSong, handlePrevSong, handleSeek]);

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
    setPlaylists((prev) => [...prev, newPlaylist]);
    setSelectedPlaylistId(newPlaylist.id);
    setCurrentView('playlist-detail');
  }, []);

  const handleSelectPlaylist = useCallback((playlistId: string) => {
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
      color: '#1db954',
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
      `swarsync-spotify-library-${new Date().toISOString().split('T')[0]}.json`
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

  const systemMediaCount = songs.filter(
    (s) => s.isSystemMedia || s.playlistIds?.includes('system-downloads')
  ).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-[#b3b3b3] select-none relative font-sans">
      {/* Full-screen Drag and Drop Overlay for System Downloads */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-[#1db954]/90 backdrop-blur-md border-4 border-dashed border-white flex flex-col items-center justify-center gap-4 text-center p-6 animate-in fade-in duration-150 pointer-events-none text-black">
          <div className="w-20 h-20 rounded-3xl bg-black/20 border border-black/30 flex items-center justify-center text-black shadow-2xl animate-pulse">
            <Download size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-black">
              Drop System Downloaded Media Here
            </h2>
            <p className="text-sm font-semibold text-zinc-900">
              Files will be automatically caught with original thumbnails and added to your Spotify library.
            </p>
          </div>
        </div>
      )}

      {/* Spotify Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          if (view !== 'playlist-detail') {
            setSelectedPlaylistId(null);
          }
        }}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        onSelectPlaylist={handleSelectPlaylist}
        onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
        onImportAudio={() => setShowAudioImportModal(true)}
        onAutoOrganize={() => setShowAutoOrganizeModal(true)}
        onOpenSystemScanner={() => setShowSystemScannerModal(true)}
        onOpenYouTubeExplore={() => setShowYouTubeExploreModal(true)}
        onOpenAiStudio={() => setCurrentView('ai-studio')}
        onOpenMoodTagger={() => handleOpenMoodTagger()}
        onOpenDolbyModal={() => setShowDolbyModal(true)}
        totalSongCount={songs.length}
        systemMediaCount={systemMediaCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Spotify Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#121212] m-2 ml-0 rounded-xl">
        {/* View Switcher */}
        {currentView === 'ai-studio' ? (
          <div className="flex-1 overflow-y-auto px-8 py-6 pb-28">
            <AiMusicStudio
              onSongCreated={handleSongCreated}
              onPlaySong={handlePlaySong}
            />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden pb-20">
            {/* Library Table / Grids */}
            <LibraryView
              currentView={currentView}
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
              onOpenAiStudio={() => setCurrentView('ai-studio')}
              onOpenImmersiveMode={() => setShowImmersiveModal(true)}
              onOpenSystemScanner={() => setShowSystemScannerModal(true)}
              onOpenYouTubeExplore={() => setShowYouTubeExploreModal(true)}
              onToggleVideoCanvas={() => setIsVideoCanvasOpen((prev) => !prev)}
              isVideoCanvasOpen={isVideoCanvasOpen}
              isLeftPanelCollapsed={isSidebarCollapsed}
              onToggleLeftPanel={() => setIsSidebarCollapsed((prev) => !prev)}
              onOpenMoodTagger={() => handleOpenMoodTagger()}
              onTagSongMood={(song) => handleOpenMoodTagger(song)}
              onOpenDolbyModal={() => setShowDolbyModal(true)}
              onTriggerIntroLoader={() => setShowIntroLoader(true)}
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

        {/* Floating YouTube Video Canvas (Now Playing View) */}
        <YouTubeVideoCanvas
          song={activeSong}
          isPlaying={isPlaying}
          isOpen={isVideoCanvasOpen}
          onClose={() => setIsVideoCanvasOpen(false)}
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
          isVideoCanvasOpen={isVideoCanvasOpen}
          onPlayPause={handlePlayPause}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleLyricsDrawer={() => setShowLyricsDrawer((prev) => !prev)}
          onToggleVideoCanvas={() => setIsVideoCanvasOpen((prev) => !prev)}
          onToggleFavorite={handleToggleFavorite}
          onOpenImmersiveMode={() => setShowImmersiveModal(true)}
          onOpenDolbyModal={() => setShowDolbyModal(true)}
        />
      </main>

      {/* YouTube Explore & Live Fetch Modal */}
      <YouTubeExploreModal
        isOpen={showYouTubeExploreModal}
        onClose={() => setShowYouTubeExploreModal(false)}
        onPlaySong={(song) => {
          handleSongCreated(song);
          handlePlaySong(song);
        }}
        onAddSongToLibrary={handleSongCreated}
        existingSongIds={songs.map((s) => s.id)}
      />

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

      {/* AI Mood Tagger Modal */}
      <AiMoodTaggerModal
        isOpen={showMoodTaggerModal}
        onClose={() => setShowMoodTaggerModal(false)}
        songs={songs}
        targetSong={moodTaggerTargetSong}
        onUpdateSong={handleSaveSongEdit}
        onBatchUpdateSongs={handleBatchUpdateSongs}
      />

      {/* Dolby Audio Enhancer & Sound Effects Suite Modal */}
      <DolbyAudioModal
        isOpen={showDolbyModal}
        onClose={() => setShowDolbyModal(false)}
        activeSong={activeSong}
        isPlaying={isPlaying}
        onTogglePlay={handlePlayPause}
      />

      {/* Animated Splash Loader with Logo on Initial Refresh & Trigger */}
      {showIntroLoader && (
        <AppLoader onFinish={() => setShowIntroLoader(false)} />
      )}
    </div>
  );
}
