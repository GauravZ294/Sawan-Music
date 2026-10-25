import React, { useEffect, useState } from 'react';
import { Song } from '../types/music';
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
  Heart,
  Music2,
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
  onOpenAudioEnhancements?: () => void;
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
  onOpenAudioEnhancements,
  onClose,
}) => {
  const [showEq, setShowEq] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>(() => audioEngine.getEqGains());
  const [enhancementsEnabled, setEnhancementsEnabled] = useState(() => audioEngine.getDolbyConfig().enabled);
  const [effectsStatus, setEffectsStatus] = useState(() => audioEngine.getAudioEffectsStatus(song));

  useEffect(() => {
    const refreshEffects = () => {
      setEqGains(audioEngine.getEqGains());
      setEnhancementsEnabled(audioEngine.getDolbyConfig().enabled);
      setEffectsStatus(audioEngine.getAudioEffectsStatus(song));
    };
    refreshEffects();
    return audioEngine.subscribeEffects(refreshEffects);
  }, [song]);

  const handleEqChange = (index: number, val: number) => {
    audioEngine.setEqGain(index, val);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="immersive-song-title" data-immersive-player className="immersive-player fixed inset-0 z-50 flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#070d1e] text-white animate-in fade-in duration-300">
      {/* Ambient background bloom from album art */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 scale-125 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${song.coverUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070d1e] via-[#070d1e]/85 to-[#070d1e]/70 pointer-events-none" />

      {/* Top Bar */}
      <div className="immersive-header relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-sky-500/10 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="hidden shrink-0 rounded-xl bg-sky-500/20 p-2 text-sky-400 sm:block">
            <Disc size={20} className={isPlaying ? 'animate-spin-slow' : ''} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] tracking-wider uppercase font-bold text-sky-400">
              <span className="sm:hidden">Vinyl player</span>
              <span className="hidden sm:inline">Immersive Vinyl Experience</span>
            </span>
            <h2 id="immersive-song-title" className="truncate text-sm font-semibold text-slate-200" title={song.title}>
              {song.title} {song.titleDevanagari ? `(${song.titleDevanagari})` : ''}
            </h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onToggleFavorite(song.id)}
            aria-label={song.isFavorite ? 'Remove from liked songs' : 'Like song'}
            aria-pressed={Boolean(song.isFavorite)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl sm:hidden ${song.isFavorite ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
          </button>
          {/* EQ toggle */}
          <button
            onClick={() => setShowEq(!showEq)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
              showEq
                ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Equalizer"
            aria-label="Equalizer"
            aria-expanded={showEq}
            aria-controls="immersive-equalizer"
          >
            <Sliders size={18} />
          </button>

          {/* Close modal */}
          <button
            onClick={onClose}
            aria-label="Close vinyl player"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Centered Spacious Content Layout (Lyrics Removed) */}
      <div className="relative z-10 flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-6 sm:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
          {/* Vinyl Disc Container */}
          <div className="relative flex items-center justify-center my-3">
            {/* Spinning Vinyl Disc */}
            <div
              className={`relative aspect-square shrink-0 rounded-full bg-[#070b16] border-[6px] sm:border-[8px] border-[#11192e] shadow-[0_0_50px_rgba(56,189,248,0.3)] flex items-center justify-center transition-transform duration-700 w-56 h-56 sm:w-72 sm:h-72 md:w-84 md:h-84 ${
                isPlaying ? 'animate-spin-slow' : 'animate-spin-slow-paused'
              }`}
            >
              {/* Concentric Vector Vinyl Grooves */}
              <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-7 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-12 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-20 rounded-full border border-white/10 pointer-events-none" />

              {/* Center Record Label with Artwork */}
              <div className="relative aspect-square w-[42%] overflow-hidden rounded-full border-4 border-slate-900 shadow-2xl">
                <img
                  src={song.coverUrl}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
                {/* Spindle hole */}
                <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-slate-950 border-2 border-slate-400 shadow-inner" />
              </div>
            </div>

            {/* Glowing audio aura around disc */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-3xl -z-10 animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Song info and details */}
          <div className="w-full max-w-xl space-y-2 text-center">
            <h1 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
              {song.title}
            </h1>
            {song.titleDevanagari && (
              <p className="font-devanagari text-xl text-[#38bdf8] font-bold">
                {song.titleDevanagari}
              </p>
            )}
            <p className="break-words text-sm font-semibold text-slate-300">
              {song.artist} • {song.album || 'Single'} ({song.year || 2026})
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              {song.language && (
                <span className="text-xs px-3 py-1 rounded-full bg-sky-950 text-sky-300 font-bold border border-sky-800/50">
                  {song.language}
                </span>
              )}
              {song.genre && (
                <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                  {song.genre}
                </span>
              )}
              {song.mood && (
                <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                  {song.mood}
                </span>
              )}
              {song.bpm && (
                <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                  {song.bpm} BPM
                </span>
              )}
            </div>
          </div>

          {/* Equalizer Panel if toggled */}
          {showEq && (
            <div id="immersive-equalizer" className="w-full max-w-lg bg-slate-900/90 border border-sky-500/20 rounded-2xl p-4 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs leading-5 text-slate-400">{effectsStatus.status !== 'ready' ? effectsStatus.message : !enhancementsEnabled ? 'Turn on audio enhancements in the sound profile panel before adjusting EQ.' : effectsStatus.message}</span>
                {effectsStatus.status === 'native' && <button type="button" onClick={() => audioEngine.setDolbyConfig({ backgroundListening: false, enabled: true })} className="min-h-10 rounded-lg bg-sky-500/15 px-3 text-xs font-semibold text-sky-300">Enable sound effects</button>}
                {onOpenAudioEnhancements && <button type="button" onClick={onOpenAudioEnhancements} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-sky-300 hover:bg-slate-800">Enhancement settings</button>}
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  5-Band Master Graphic EQ
                </span>
                <button
                  onClick={() => {
                    audioEngine.resetEqGains();
                  }}
                  className="min-h-10 px-2 text-xs text-[#38bdf8] hover:underline"
                >
                  Reset Flat
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'].map((label, idx) => (
                  <div key={idx} className="flex min-w-0 flex-col items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {eqGains[idx] > 0 ? `+${eqGains[idx]}` : eqGains[idx]}dB
                    </span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={eqGains[idx]}
                      disabled={effectsStatus.status !== 'ready'}
                      aria-label={`${label} equalizer gain`}
                      onChange={(e) => handleEqChange(idx, Number(e.target.value))}
                      className="h-28 w-6 cursor-pointer accent-[#38bdf8] [writing-mode:vertical-lr] [direction:rtl]"
                    />
                    <span className="text-[10px] font-mono text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div data-immersive-transport className="immersive-transport relative z-10 shrink-0 border-t border-sky-500/10 bg-[#0b1329]/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto w-full min-w-0 max-w-4xl space-y-3">
          {/* Scrubber slider */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-10 shrink-0 text-right font-mono text-xs text-slate-400">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              aria-label="Seek song"
              onChange={(e) => onSeek(Number(e.target.value))}
              className="h-2 min-w-0 flex-1 cursor-pointer rounded-lg accent-[#38bdf8]"
            />
            <span className="w-10 shrink-0 font-mono text-xs text-slate-400">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons row */}
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-4">
            {/* Speed & Favorite */}
            <div className="row-start-2 flex min-w-0 items-center gap-2 lg:col-start-1 lg:row-start-1">
              <button
                onClick={() => onToggleFavorite(song.id)}
                aria-label={song.isFavorite ? 'Remove from liked songs' : 'Like song'}
                aria-pressed={Boolean(song.isFavorite)}
                className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors sm:inline-flex ${
                  song.isFavorite
                    ? 'text-[#38bdf8] bg-sky-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
              </button>

              {/* Speed Play Options (0.75x, 1x, 1.25x, 1.5x) */}
              <div aria-label="Playback speed" className="flex min-w-0 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      onPlaybackRateChange(rate);
                      audioEngine.setPlaybackRate(rate);
                    }}
                    aria-label={`Playback speed ${rate}x`}
                    aria-pressed={playbackRate === rate}
                    className={`min-h-8 rounded-lg px-2.5 font-bold transition-all ${
                      playbackRate === rate
                        ? 'bg-[#38bdf8] text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Play, Prev, Next, Shuffle, Repeat */}
            <div className="col-span-2 row-start-1 flex min-w-0 items-center justify-center gap-2 sm:gap-4 lg:col-span-1 lg:col-start-2">
              <button
                onClick={onToggleShuffle}
                aria-pressed={isShuffle}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isShuffle ? 'text-[#38bdf8] bg-sky-500/10' : 'text-slate-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle size={18} />
              </button>

              <button
                onClick={onPrev}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-300 hover:text-white hover:scale-110 transition-transform"
                title="Previous Track"
              >
                <SkipBack size={22} />
              </button>

              <button
                onClick={onPlayPause}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#38bdf8] hover:scale-105 active:scale-95 text-slate-950 shadow-xl shadow-sky-500/20 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
              </button>

              <button
                onClick={onNext}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-300 hover:text-white hover:scale-110 transition-transform"
                title="Next Track"
              >
                <SkipForward size={22} />
              </button>

              <button
                onClick={onToggleRepeat}
                aria-label={`Repeat: ${repeatMode}`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-[#38bdf8] bg-sky-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <Repeat size={18} />
              </button>
            </div>

            {/* Volume */}
            <div className="col-start-2 row-start-2 flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 lg:col-start-3 lg:row-start-1">
              <button
                onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                className="flex h-10 w-9 shrink-0 items-center justify-center text-slate-400 hover:text-white"
              >
                {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={volume}
                aria-label="Volume"
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="h-2 w-16 min-w-0 cursor-pointer rounded-lg accent-[#38bdf8] sm:w-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
