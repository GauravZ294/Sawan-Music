import React, { useEffect, useState } from 'react';
import { Song } from '../types/music';
import { LyricsKaraoke } from './LyricsKaraoke';
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
    <div role="dialog" aria-modal="true" aria-labelledby="immersive-song-title" data-immersive-player className="immersive-player fixed inset-0 z-50 flex min-h-0 min-w-0 flex-col overflow-hidden bg-zinc-950 text-white animate-in fade-in duration-300">
      {/* Ambient background bloom from album art */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${song.coverUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60 pointer-events-none" />

      {/* Top Bar */}
      <div className="immersive-header relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/60 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="hidden shrink-0 rounded-xl bg-rose-500/20 p-2 text-rose-400 sm:block">
            <Disc size={20} className={isPlaying ? 'animate-spin-slow' : ''} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] tracking-wider uppercase font-bold text-rose-400">
              <span className="sm:hidden">Vinyl player</span>
              <span className="hidden sm:inline">Immersive Vinyl Experience</span>
            </span>
            <h2 id="immersive-song-title" className="truncate text-sm font-semibold text-zinc-200" title={song.title}>
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
            className={`flex h-11 w-11 items-center justify-center rounded-xl sm:hidden ${song.isFavorite ? 'bg-rose-500/10 text-rose-400' : 'text-zinc-400 hover:text-white'}`}
          >
            <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
          </button>
          {/* EQ toggle */}
          <button
            onClick={() => setShowEq(!showEq)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
              showEq
                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
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
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content: Split Vinyl disc + Synced Lyrics */}
      <div data-immersive-content className="immersive-content relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-1 content-start items-start gap-5 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:gap-6 sm:p-6 lg:grid-cols-12 lg:content-stretch">
        {/* Left column: Vinyl Disc + Metadata */}
        <div className="immersive-artwork-column flex min-w-0 flex-col items-center gap-4 lg:col-span-5 lg:my-auto lg:gap-5">
          {/* Vinyl Disc Container */}
          <div className="relative flex items-center justify-center">
            {/* Vinyl record disc body */}
            <div
              className={`immersive-disc aspect-square shrink-0 rounded-full bg-zinc-950 border-[8px] border-zinc-900 shadow-2xl relative flex items-center justify-center transition-transform duration-700 sm:border-[10px] ${
                isPlaying ? 'animate-spin-slow' : 'animate-spin-slow-paused'
              }`}
              style={{
                boxShadow:
                  '0 0 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.05), inset 0 0 0 20px #18181b, inset 0 0 0 45px #09090b, inset 0 0 0 70px #18181b',
              }}
            >
              {/* Center label with song cover */}
              <div className="relative aspect-square w-[45%] overflow-hidden rounded-full border-4 border-zinc-900 shadow-inner">
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
          <div className="w-full min-w-0 max-w-sm space-y-1.5 text-center">
            <h1 className="break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
              {song.title}
            </h1>
            {song.titleDevanagari && (
              <p className="font-devanagari text-lg text-rose-400 font-semibold">
                {song.titleDevanagari}
              </p>
            )}
            <p className="break-words text-xs font-medium leading-5 text-zinc-400 sm:text-sm">
              {song.artist} • {song.album} ({song.year})
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
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
            <div id="immersive-equalizer" className="w-full min-w-0 max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs leading-5 text-zinc-400">{effectsStatus.status !== 'ready' ? effectsStatus.message : !enhancementsEnabled ? 'Turn on audio enhancements in the sound profile panel before adjusting EQ.' : effectsStatus.message}</span>
                {effectsStatus.status === 'native' && <button type="button" onClick={() => audioEngine.setDolbyConfig({ backgroundListening: false, enabled: true })} className="min-h-10 rounded-lg bg-rose-500/15 px-3 text-xs font-semibold text-rose-300">Enable sound effects</button>}
                {onOpenAudioEnhancements && <button type="button" onClick={onOpenAudioEnhancements} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-rose-300 hover:bg-zinc-800">Enhancement settings</button>}
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  5-Band Master Graphic EQ
                </span>
                <button
                  onClick={() => {
                    audioEngine.resetEqGains();
                  }}
                  className="min-h-10 px-2 text-xs text-rose-400 hover:underline"
                >
                  Reset Flat
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'].map((label, idx) => (
                  <div key={idx} className="flex min-w-0 flex-col items-center gap-2">
                    <span className="text-[10px] text-zinc-400">
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
                      className="h-28 w-6 cursor-pointer accent-rose-500 [writing-mode:vertical-lr] [direction:rtl]"
                    />
                    <span className="text-[10px] font-mono text-zinc-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Synced Lyrics Karaoke */}
        <div className="immersive-lyrics flex min-w-0 flex-col overflow-hidden lg:col-span-7">
          <LyricsKaraoke
            song={song}
            currentTime={currentTime}
            onSeek={onSeek}
            accentColor="#f43f5e"
          />
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div data-immersive-transport className="immersive-transport relative z-10 shrink-0 border-t border-zinc-800/80 bg-zinc-900/90 px-3 py-2 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto w-full min-w-0 max-w-5xl space-y-2">
          {/* Scrubber slider */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="w-9 shrink-0 text-right font-mono text-[11px] text-zinc-400 sm:w-10 sm:text-xs">
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
              className="h-5 min-w-0 flex-1 cursor-pointer rounded-lg accent-rose-500"
            />
            <span className="w-9 shrink-0 font-mono text-[11px] text-zinc-400 sm:w-10 sm:text-xs">
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
                className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors sm:inline-flex ${
                  song.isFavorite
                    ? 'text-rose-500 bg-rose-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
              </button>

              <div aria-label="Playback speed" className="flex min-w-0 items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-[11px] sm:text-xs">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onPlaybackRateChange(rate)}
                    aria-label={`Playback speed ${rate}x`}
                    aria-pressed={playbackRate === rate}
                    className={`min-h-10 rounded px-1 transition-colors sm:px-2 ${
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
            <div className="col-span-2 row-start-1 flex min-w-0 items-center justify-center gap-1 sm:gap-3 lg:col-span-1 lg:col-start-2 lg:gap-2">
              <button
                onClick={onToggleShuffle}
                aria-pressed={isShuffle}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isShuffle ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle size={18} />
              </button>

              <button
                onClick={onPrev}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-300 hover:text-white hover:scale-110 transition-transform"
                title="Previous Track"
              >
                <SkipBack size={22} />
              </button>

              <button
                onClick={onPlayPause}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/40 hover:scale-105 transition-all"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
              </button>

              <button
                onClick={onNext}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-300 hover:text-white hover:scale-110 transition-transform"
                title="Next Track"
              >
                <SkipForward size={22} />
              </button>

              <button
                onClick={onToggleRepeat}
                aria-label={`Repeat: ${repeatMode}`}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
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
            <div className="col-start-2 row-start-2 flex min-w-0 items-center justify-end gap-1 sm:gap-2 lg:col-start-3 lg:row-start-1">
              <button
                onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                className="flex h-11 w-10 shrink-0 items-center justify-center text-zinc-400 hover:text-white"
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
                className="h-5 w-14 min-w-0 cursor-pointer rounded-lg accent-rose-500 sm:w-20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
