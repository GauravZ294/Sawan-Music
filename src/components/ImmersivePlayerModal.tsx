import React, { useState } from 'react';
import { Song } from '../types/music';
import { LyricsKaraoke } from './LyricsKaraoke';
import { AudioVisualizer } from './AudioVisualizer';
import { audioEngine } from '../utils/audioEngine';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Sliders,
  Disc,
  Mic2,
  Heart,
  Share2,
} from 'lucide-react';

interface ImmersivePlayerModalProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleFavorite: (songId: string) => void;
  onClose: () => void;
}

export const ImmersivePlayerModal: React.FC<ImmersivePlayerModalProps> = ({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  isShuffle,
  repeatMode,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFavorite,
  onClose,
}) => {
  const [showEq, setShowEq] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0]);

  const handleEqChange = (index: number, val: number) => {
    const updated = [...eqGains];
    updated[index] = val;
    setEqGains(updated);
    audioEngine.setEqGain(index, val);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-hidden animate-in fade-in duration-300">
      {/* Ambient background bloom from album art */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${song.coverUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60 pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
            <Disc size={20} className={isPlaying ? 'animate-spin-slow' : ''} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider uppercase font-bold text-rose-400">
              Immersive Vinyl Experience
            </span>
            <h2 className="text-sm font-semibold text-zinc-200">
              {song.title} {song.titleDevanagari ? `(${song.titleDevanagari})` : ''}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* EQ toggle */}
          <button
            onClick={() => setShowEq(!showEq)}
            className={`p-2 rounded-xl border transition-colors ${
              showEq
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Equalizer"
          >
            <Sliders size={18} />
          </button>

          {/* Close modal */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content: Split Vinyl disc + Synced Lyrics */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-10 overflow-hidden">
        {/* Left column: Vinyl Disc + Metadata */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6">
          {/* Vinyl Disc Container */}
          <div className="relative flex items-center justify-center">
            {/* Vinyl record disc body */}
            <div
              className={`w-64 h-64 md:w-80 md:h-80 rounded-full bg-zinc-950 border-[10px] border-zinc-900 shadow-2xl relative flex items-center justify-center transition-transform duration-700 ${
                isPlaying ? 'animate-spin-slow' : 'animate-spin-slow-paused'
              }`}
              style={{
                boxShadow:
                  '0 0 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.05), inset 0 0 0 20px #18181b, inset 0 0 0 45px #09090b, inset 0 0 0 70px #18181b',
              }}
            >
              {/* Center label with song cover */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-zinc-900 shadow-inner relative">
                <img
                  src={song.coverUrl}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
                {/* Spindle hole */}
                <div className="absolute inset-0 m-auto w-5 h-5 rounded-full bg-zinc-950 border-2 border-zinc-600 shadow-inner" />
              </div>
            </div>

            {/* Glowing audio aura around disc */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-2xl -z-10 animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Song info and tag */}
          <div className="text-center space-y-1.5 max-w-sm">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {song.title}
            </h1>
            {song.titleDevanagari && (
              <p className="font-devanagari text-lg text-rose-400 font-semibold">
                {song.titleDevanagari}
              </p>
            )}
            <p className="text-sm text-zinc-400 font-medium">
              {song.artist} • {song.album} ({song.year})
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                {song.genre}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                {song.mood}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                {song.bpm} BPM
              </span>
            </div>
          </div>

          {/* Equalizer Panel if toggled */}
          {showEq && (
            <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  5-Band Master Graphic EQ
                </span>
                <button
                  onClick={() => {
                    setEqGains([0, 0, 0, 0, 0]);
                    [0, 1, 2, 3, 4].forEach((i) => audioEngine.setEqGain(i, 0));
                  }}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Reset Flat
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'].map((label, idx) => (
                  <div key={idx} className="space-y-1.5 flex flex-col items-center">
                    <span className="text-[10px] text-zinc-400">
                      {eqGains[idx] > 0 ? `+${eqGains[idx]}` : eqGains[idx]}dB
                    </span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={eqGains[idx]}
                      onChange={(e) => handleEqChange(idx, Number(e.target.value))}
                      className="h-20 -rotate-90 w-20 my-6 accent-rose-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-zinc-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Synced Lyrics Karaoke */}
        <div className="lg:col-span-7 h-full flex flex-col overflow-hidden">
          <LyricsKaraoke
            song={song}
            currentTime={currentTime}
            onSeek={onSeek}
            accentColor="#f43f5e"
          />
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="relative z-10 px-6 py-4 bg-zinc-900/90 border-t border-zinc-800/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Scrubber slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="text-xs font-mono text-zinc-400 w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between pt-1">
            {/* Speed & Favorite */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggleFavorite(song.id)}
                className={`p-2 rounded-xl transition-colors ${
                  song.isFavorite
                    ? 'text-rose-500 bg-rose-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onPlaybackRateChange(rate)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      playbackRate === rate
                        ? 'bg-zinc-800 text-rose-400 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Play, Prev, Next, Shuffle, Repeat */}
            <div className="flex items-center gap-4">
              <button
                onClick={onToggleShuffle}
                className={`p-2 rounded-xl transition-colors ${
                  isShuffle ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle size={18} />
              </button>

              <button
                onClick={onPrev}
                className="p-2 text-zinc-300 hover:text-white hover:scale-110 transition-transform"
                title="Previous Track"
              >
                <SkipBack size={22} />
              </button>

              <button
                onClick={onPlayPause}
                className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/40 hover:scale-105 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
              </button>

              <button
                onClick={onNext}
                className="p-2 text-zinc-300 hover:text-white hover:scale-110 transition-transform"
                title="Next Track"
              >
                <SkipForward size={22} />
              </button>

              <button
                onClick={onToggleRepeat}
                className={`p-2 rounded-xl transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-rose-400 bg-rose-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <Repeat size={18} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
                className="text-zinc-400 hover:text-white"
              >
                {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-20 h-1.5 bg-zinc-800 rounded-lg accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
