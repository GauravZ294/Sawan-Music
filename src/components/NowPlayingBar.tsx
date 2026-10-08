import React, { useState } from 'react';
import { Song } from '../types/music';
import { AudioVisualizer } from './AudioVisualizer';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Heart,
  Mic2,
  ListMusic,
  Tv,
  Youtube,
  Radio,
  Zap,
} from 'lucide-react';

interface NowPlayingBarProps {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  showLyricsDrawer: boolean;
  isVideoCanvasOpen: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLyricsDrawer: () => void;
  onToggleVideoCanvas: () => void;
  onToggleFavorite: (songId: string) => void;
  onOpenImmersiveMode: () => void;
  onOpenDolbyModal?: () => void;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  showLyricsDrawer,
  isVideoCanvasOpen,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLyricsDrawer,
  onToggleVideoCanvas,
  onToggleFavorite,
  onOpenImmersiveMode,
  onOpenDolbyModal,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);

  if (!song) return null;

  const effectiveTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (effectiveTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-20 bg-[#181818] border-t border-zinc-800/80 px-4 select-none flex items-center justify-between text-zinc-300 shadow-2xl">
      {/* LEFT: Track Info & Artwork */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[180px] max-w-[300px]">
        {/* Cover Art with Pop-out Hover */}
        <div
          onClick={onOpenImmersiveMode}
          className="relative group w-14 h-14 rounded-md overflow-hidden shrink-0 bg-black cursor-pointer shadow-md"
        >
          <img
            src={song.coverUrl}
            alt={song.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
            <Maximize2 size={16} />
          </div>
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4
              onClick={onOpenImmersiveMode}
              className="text-xs font-bold text-white truncate hover:underline cursor-pointer"
            >
              {song.title}
            </h4>
            {song.category && (
              <span className="text-[9px] uppercase font-bold px-1 rounded bg-zinc-800 text-zinc-400">
                {song.category}
              </span>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 truncate hover:text-white hover:underline cursor-pointer">
            {song.artist}
          </p>

          {song.titleDevanagari && (
            <p className="text-[10px] text-zinc-500 font-devanagari truncate">
              {song.titleDevanagari}
            </p>
          )}
        </div>

        {/* Like Heart Button */}
        <button
          onClick={() => onToggleFavorite(song.id)}
          className={`p-1.5 transition-colors ${
            song.isFavorite
              ? 'text-[#1db954]'
              : 'text-zinc-400 hover:text-white'
          }`}
          title={song.isFavorite ? 'Remove from your Library' : 'Save to your Library'}
        >
          <Heart size={16} fill={song.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Video Canvas shortcut if YouTube track */}
        {song.youtubeId && (
          <button
            onClick={onToggleVideoCanvas}
            className={`p-1.5 rounded transition-colors ${
              isVideoCanvasOpen
                ? 'text-[#1db954]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Now playing video canvas"
          >
            <Tv size={16} />
          </button>
        )}
      </div>

      {/* CENTER: Player Controls & Spotify Scrubber */}
      <div className="flex flex-col items-center max-w-xl w-2/4 px-4">
        {/* Buttons Row */}
        <div className="flex items-center gap-5 mb-1.5">
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`relative p-1 transition-colors ${
              isShuffle ? 'text-[#1db954]' : 'text-zinc-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle size={16} />
            {isShuffle && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1db954]" />
            )}
          </button>

          {/* Previous */}
          <button
            onClick={onPrev}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Previous track"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          {/* Big Circular Spotify Play/Pause */}
          <button
            onClick={onPlayPause}
            className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Next track"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            className={`relative p-1 transition-colors ${
              repeatMode !== 'off'
                ? 'text-[#1db954]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            <Repeat size={16} />
            {repeatMode !== 'off' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1db954]" />
            )}
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold text-[#1db954]">
                1
              </span>
            )}
          </button>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full flex items-center gap-2.5 text-[11px] font-mono text-zinc-400">
          <span className="w-9 text-right">{formatTime(effectiveTime)}</span>

          <div
            className="relative flex-1 h-3 flex items-center cursor-pointer group"
            onMouseEnter={() => setIsHoveringScrubber(true)}
            onMouseLeave={() => setIsHoveringScrubber(false)}
          >
            {/* Background Track */}
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden">
              {/* Filled Progress */}
              <div
                className={`h-full transition-all rounded-full ${
                  isHoveringScrubber ? 'bg-[#1db954]' : 'bg-white'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Slider Knob Thumb on Hover */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-opacity pointer-events-none ${
                isHoveringScrubber ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />

            {/* Hidden native input for smooth seeking */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={effectiveTime}
              onMouseDown={() => setIsScrubbing(true)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setScrubValue(val);
              }}
              onMouseUp={() => {
                setIsScrubbing(false);
                onSeek(scrubValue);
              }}
              onTouchEnd={() => {
                setIsScrubbing(false);
                onSeek(scrubValue);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="w-9 text-left">{formatTime(duration)}</span>
        </div>
      </div>

      {/* RIGHT: Spotify Utilities (Lyrics, Video, Volume, Fullscreen) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        {/* Synced Lyrics Karaoke Button */}
        <button
          onClick={onToggleLyricsDrawer}
          className={`p-1.5 rounded transition-colors ${
            showLyricsDrawer
              ? 'text-[#1db954]'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Lyrics (Karaoke view)"
        >
          <Mic2 size={17} />
        </button>

        {/* Dolby Sound & 3D Spatial Audio Suite */}
        {onOpenDolbyModal && (
          <button
            onClick={onOpenDolbyModal}
            className="px-2 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 shadow-sm"
            title="Dolby Audio & 3D Spatial Suite"
          >
            <Zap size={13} className="fill-emerald-400" />
            <span className="hidden lg:inline tracking-wider">DOLBY</span>
          </button>
        )}

        {/* YouTube Video Canvas Drawer Button */}
        {song.youtubeId && (
          <button
            onClick={onToggleVideoCanvas}
            className={`p-1.5 rounded transition-colors ${
              isVideoCanvasOpen
                ? 'text-[#1db954]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Toggle YouTube Video player"
          >
            <Youtube size={18} className={isVideoCanvasOpen ? 'text-[#1db954]' : 'text-red-400'} />
          </button>
        )}

        {/* Volume Controls */}
        <div
          className="flex items-center gap-2 group"
          onMouseEnter={() => setIsHoveringVolume(true)}
          onMouseLeave={() => setIsHoveringVolume(false)}
        >
          <button
            onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
            className="text-zinc-400 hover:text-white transition-colors"
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          {/* Spotify Volume Slider */}
          <div className="relative w-20 h-3 flex items-center cursor-pointer">
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isHoveringVolume ? 'bg-[#1db954]' : 'bg-white'
                }`}
                style={{ width: `${volume * 100}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Fullscreen Expand */}
        <button
          onClick={onOpenImmersiveMode}
          className="text-zinc-400 hover:text-white transition-colors p-1"
          title="Fullscreen vinyl player"
        >
          <Maximize2 size={17} />
        </button>
      </div>
    </footer>
  );
};
