import React, { useEffect, useState } from 'react';
import { DolbyAudioConfig, DolbyEffectPreset, Song } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import {
  Check, Compass, Disc, Flame, Headphones, Layers, Pause, Play,
  Radio, RotateCcw, Sliders, Sparkles, Upload, X, Zap,
} from 'lucide-react';

interface DolbyAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onImportAudio?: () => void;
}

type EffectTab = 'presets' | 'spatial' | 'equalizer' | 'background';
const EQ_LABELS = ['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'];
const PRESETS: { id: DolbyEffectPreset; name: string; description: string; icon: typeof Sparkles }[] = [
  { id: 'dolby_atmos', name: 'Balanced Stereo', description: 'Balanced bass, clear vocals, wider stereo, and a little room reverb.', icon: Sparkles },
  { id: 'bass_boost', name: 'Bass Boost', description: 'Emphasizes low frequencies with compression for a fuller beat.', icon: Flame },
  { id: 'vocal_clarity', name: 'Vocal Clarity', description: 'Lifts vocal presence and adds gentle dynamic compression.', icon: Headphones },
  { id: 'studio_master', name: 'Studio Balance', description: 'Adds treble detail and moderate compression for a balanced mix.', icon: Sliders },
  { id: 'concert_hall', name: 'Concert Reverb', description: 'Adds a generated room reverb and expands the stereo image.', icon: Radio },
  { id: 'lofi_vinyl', name: 'Warm Lo-Fi', description: 'Softens high frequencies and adds bass warmth and subtle reverb.', icon: Disc },
  { id: 'standard', name: 'Flat Bypass', description: 'Resets tone, stereo, reverb, compression, and the five-band EQ to flat.', icon: Layers },
];

interface EffectSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  description?: string;
}

const EffectSlider = ({ label, value, min, max, step, display, onChange, description }: EffectSliderProps) => (
  <label className="block min-w-0 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold text-zinc-200">
      <span>{label}</span>
      <span className="font-mono text-emerald-400">{display}</span>
    </span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-7 w-full min-w-0 cursor-pointer accent-[#1db954] disabled:cursor-not-allowed" />
    {description && <span className="block text-[11px] leading-5 text-zinc-500">{description}</span>}
  </label>
);

const decibels = (value: number) => `${value > 0 ? '+' : ''}${value} dB`;

export const DolbyAudioModal: React.FC<DolbyAudioModalProps> = ({
  isOpen, onClose, activeSong, isPlaying, onTogglePlay, onImportAudio,
}) => {
  const [config, setConfig] = useState<DolbyAudioConfig>(() => audioEngine.getDolbyConfig());
  const [eqGains, setEqGains] = useState<number[]>(() => audioEngine.getEqGains());
  const [activeTab, setActiveTab] = useState<EffectTab>('presets');

  useEffect(() => {
    const refresh = () => {
      setConfig(audioEngine.getDolbyConfig());
      setEqGains(audioEngine.getEqGains());
    };
    refresh();
    return audioEngine.subscribeEffects(refresh);
  }, [isOpen, activeSong]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const status = audioEngine.getAudioEffectsStatus(activeSong);
  const isYouTubeTrack = Boolean(activeSong?.youtubeId && !activeSong.audioSrc);
  const hasAudioFile = Boolean(activeSong?.audioSrc);
  const nativeAudio = status.status === 'native';
  const controlsAvailable = status.status === 'ready';
  const processing = controlsAvailable && config.enabled && config.intensity > 0;
  const applied = Boolean(status.processing);
  const processingLabel = !controlsAvailable ? 'Unavailable' : !processing ? 'Bypassed' : isPlaying ? 'Applied' : 'Ready';
  const sourceMessage = status.status === 'unavailable' || (status.status === 'no-source' && hasAudioFile)
    ? status.message
    : isYouTubeTrack
    ? 'YouTube playback runs in a separate player, so this site cannot apply audio effects to it. Import an audio file to use these controls.'
    : !hasAudioFile
      ? 'Choose and play an imported audio file to use audio enhancements.'
      : nativeAudio
        ? 'Background listening is using your device\'s native media player. Enable sound effects to switch this track to audio processing.'
        : config.enabled
          ? 'Adjust these controls to change the audio file live. The equalizer, tone, stereo width, reverb, and compression update as you adjust them.'
          : 'Enhancements are bypassed. Choose a preset, turn them on, or adjust a control to apply sound effects.';

  const changeEffect = <K extends keyof DolbyAudioConfig>(key: K, value: DolbyAudioConfig[K]) => {
    audioEngine.setDolbyConfig({
      [key]: value,
      ...(key !== 'backgroundListening' ? { enabled: true, ...(key !== 'intensity' ? { intensity: config.intensity || 0.85 } : {}) } : {}),
    });
  };

  const resetEffects = () => audioEngine.resetDolbyConfig();
  const enableEffects = () => audioEngine.setDolbyConfig({ backgroundListening: false, enabled: true, intensity: config.intensity || 0.85 });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="audio-enhancements-title" data-audio-enhancements
      className="fixed inset-0 z-50 flex min-h-0 items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4">
      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#141416] shadow-2xl sm:max-h-[90dvh]">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/70 p-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400"><Zap size={21} /></div>
            <div className="min-w-0">
              <h2 id="audio-enhancements-title" className="text-base font-bold text-white sm:text-lg">Audio Enhancements</h2>
              <p className="mt-0.5 text-[11px] leading-4 text-zinc-400">Stereo effects, equalizer, and background listening</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close audio enhancements"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"><X size={21} /></button>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <span className={`text-xs font-semibold ${applied ? 'text-emerald-400' : 'text-zinc-400'}`} role="status">{processingLabel}</span>
            <button type="button" aria-label="Enable audio enhancements" aria-pressed={config.enabled} disabled={!controlsAvailable}
              onClick={() => audioEngine.setDolbyConfig({ enabled: !config.enabled })}
              className={`min-h-10 rounded-full px-4 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${config.enabled ? 'bg-[#1db954] text-black hover:bg-[#1ed760]' : 'border border-zinc-700 bg-zinc-800 text-zinc-300'}`}>
              {!controlsAvailable ? 'Effects unavailable' : config.enabled ? 'Effects On' : 'Effects Off'}
            </button>
          </div>
        </header>

        <nav aria-label="Audio enhancement sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-800 bg-[#161619] px-3 pt-2 sm:px-5">
          {([
            { id: 'presets', label: 'Presets', icon: Sparkles },
            { id: 'spatial', label: 'Stereo & Reverb', icon: Compass },
            { id: 'equalizer', label: 'Equalizer & Dynamics', icon: Sliders },
            { id: 'background', label: 'Background', icon: Radio },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 text-xs font-semibold ${activeTab === tab.id ? 'border-[#1db954] bg-zinc-800/50 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}>
              <Icon size={14} /><span>{tab.label}</span>
            </button>;
          })}
        </nav>

        <main className="min-h-0 min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className={`rounded-xl border p-4 text-xs leading-6 ${controlsAvailable ? 'border-emerald-500/20 bg-emerald-500/5 text-zinc-300' : 'border-amber-500/25 bg-amber-500/5 text-zinc-300'}`}>
            <p className="font-semibold text-white">{status.status === 'unavailable' ? 'Audio processing unavailable' : isYouTubeTrack ? 'YouTube track' : nativeAudio ? 'Background playback mode' : hasAudioFile ? 'Audio file' : 'No playable audio file selected'}</p>
            <p>{sourceMessage}</p>
            {nativeAudio && <div className="mt-3 space-y-2">
              <button type="button" onClick={enableEffects} className="min-h-11 rounded-lg bg-[#1db954] px-4 text-xs font-bold text-black hover:bg-[#1ed760]">Enable sound effects</button>
              <p className="text-[11px] text-zinc-400">On phones, audio processing can be interrupted when the browser goes into the background.</p>
            </div>}
            {(!hasAudioFile || isYouTubeTrack) && onImportAudio && <button type="button" onClick={onImportAudio}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1db954] px-4 text-xs font-bold text-black hover:bg-[#1ed760]"><Upload size={15} />Import audio file</button>}
          </div>

          {activeTab !== 'background' && <fieldset disabled={!controlsAvailable} className="min-w-0 space-y-5 disabled:opacity-45">
            <legend className="sr-only">Audio processing controls</legend>
            {activeTab === 'presets' && <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold text-white">Sound profiles</h3><p className="mt-1 text-xs leading-5 text-zinc-400">Choose a profile, then fine-tune its settings.</p></div>
                <button type="button" onClick={resetEffects} className="inline-flex min-h-10 items-center gap-1.5 text-xs text-zinc-400 hover:text-white"><RotateCcw size={14} />Reset all effects</button>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const selected = config.preset === preset.id;
                  return <button key={preset.id} type="button" onClick={() => audioEngine.setDolbyPreset(preset.id)} aria-pressed={selected}
                    className={`flex min-w-0 flex-col rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${selected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'}`}>
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white"><Icon size={17} className="shrink-0 text-emerald-400" /><span>{preset.name}</span></span>
                    <span className="mt-2 flex-1 text-xs leading-5 text-zinc-400">{preset.description}</span>
                    <span className="mt-3 flex items-center gap-1.5 border-t border-zinc-800/70 pt-2 text-[11px] font-semibold text-emerald-400">
                      {selected ? <><Check size={13} />{processingLabel}</> : 'Choose profile'}
                    </span>
                  </button>;
                })}
              </div>
            </>}

            {activeTab === 'spatial' && <>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="text-sm font-semibold text-white">Stereo image & room ambience</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-400">Stereo width adjusts the side signal in a stereo recording. Mono recordings have no side signal to expand. Reverb adds a generated room response.</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-zinc-400">
                  <span>Width: {Math.round(config.spatialWidth * 100)}%</span>
                  <span>Reverb: {processing && config.intensity > 0 && config.reverbAmount > 0 ? 'Enabled' : 'Off'}</span>
                  <span>Effects: {processingLabel.toLowerCase()}</span>
                </div>
              </div>
              <EffectSlider label="Effect intensity" value={config.intensity} min={0} max={1} step={0.05} display={`${Math.round(config.intensity * 100)}%`}
                onChange={(value) => changeEffect('intensity', value)} description="0% bypasses all processing, including the equalizer; 100% uses the full chosen settings." />
              <EffectSlider label="Stereo width" value={config.spatialWidth} min={0.5} max={2} step={0.1} display={`${Math.round(config.spatialWidth * 100)}%`}
                onChange={(value) => changeEffect('spatialWidth', value)} description="50% narrows stereo, 100% preserves it, and 200% expands it." />
              <EffectSlider label="Reverb amount" value={config.reverbAmount} min={0} max={0.8} step={0.02} display={`${Math.round(config.reverbAmount * 100)}%`}
                onChange={(value) => changeEffect('reverbAmount', value)} description="Move toward zero for a dry recording or increase it for more room ambience." />
            </>}

            {activeTab === 'equalizer' && <>
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">Five-band equalizer</h3>
                  <button type="button" onClick={() => audioEngine.resetEqGains()} className="min-h-10 text-xs text-emerald-400 hover:text-emerald-300">Reset EQ to flat</button></div>
                <p className="mb-3 text-xs leading-5 text-zinc-400">These bands work with effects enabled and intensity above 0%.</p>
                <div className="space-y-3">
                  {EQ_LABELS.map((label, index) => <label key={label} className="block">
                    <span className="flex justify-between gap-3 text-xs text-zinc-300"><span>{label}</span><span className="font-mono text-emerald-400">{decibels(eqGains[index])}</span></span>
                    <input type="range" min={-12} max={12} step={1} value={eqGains[index]} aria-label={`${label} equalizer gain`}
                      onChange={(event) => { audioEngine.setDolbyConfig({ enabled: true, intensity: config.intensity || 0.85 }); audioEngine.setEqGain(index, Number(event.target.value)); }} className="h-7 w-full cursor-pointer accent-[#1db954] disabled:cursor-not-allowed" />
                  </label>)}
                </div>
              </section>
              <EffectSlider label="Bass (80Hz)" value={config.bassLevel} min={-10} max={15} step={0.5} display={decibels(config.bassLevel)} onChange={(value) => changeEffect('bassLevel', value)} />
              <EffectSlider label="Vocal presence (3.2kHz)" value={config.vocalClarity} min={0} max={1} step={0.05} display={`${Math.round(config.vocalClarity * 100)}%`} onChange={(value) => changeEffect('vocalClarity', value)} />
              <EffectSlider label="Treble (10kHz)" value={config.trebleLevel} min={-10} max={15} step={0.5} display={decibels(config.trebleLevel)} onChange={(value) => changeEffect('trebleLevel', value)} />
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="text-sm font-semibold text-white">Dynamic compression</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-400">Reduces the difference between loud and quiet parts. This does not analyze or normalize an entire recording.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['off', 'soft', 'studio', 'punchy'] as const).map((mode) => <button key={mode} type="button" aria-pressed={config.compression === mode}
                    onClick={() => changeEffect('compression', mode)} className={`min-h-11 rounded-lg border px-2 text-xs font-semibold capitalize disabled:cursor-not-allowed ${config.compression === mode ? 'border-[#1db954] bg-emerald-500/15 text-white' : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:text-white'}`}>{mode}</button>)}
                </div>
              </section>
            </>}
          </fieldset>}

          {activeTab === 'background' && <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-white">Background listening</h3><p className="mt-2 text-xs leading-5 text-zinc-400">On phones and tablets, imported audio uses the native media player when this preference is enabled. Audio effects are bypassed in that mode.</p></div>
              <button type="button" aria-label="Enable background listening" aria-pressed={config.backgroundListening}
                onClick={() => changeEffect('backgroundListening', !config.backgroundListening)}
                className={`min-h-11 rounded-full px-4 text-xs font-bold ${config.backgroundListening ? 'bg-[#1db954] text-black' : 'border border-zinc-700 bg-zinc-800 text-zinc-300'}`}>{config.backgroundListening ? 'Enabled' : 'Disabled'}</button>
            </div>
            <ul className="space-y-3 border-t border-zinc-800 pt-4 text-xs leading-6 text-zinc-400">
              <li><strong className="text-zinc-200">Lock-screen and headphone controls:</strong> Track details, Play, Pause, Next, Previous, and seeking are available where your browser supports them.</li>
              <li><strong className="text-zinc-200">YouTube tracks:</strong> This preference cannot provide reliable background playback for an embedded YouTube player.</li>
              <li><strong className="text-zinc-200">Device interruptions:</strong> Calls, other media, and power settings can interrupt playback. This setting respects pause controls.</li>
            </ul>
          </section>}
        </main>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-[#161619] p-4 sm:px-6">
          <div className="flex w-full min-w-0 items-center gap-2.5 sm:w-auto sm:flex-1">
            {activeSong ? <><img src={activeSong.coverUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{activeSong.title}</p><p className="truncate text-[11px] text-zinc-400">{activeSong.artist}</p></div></> : <p className="text-xs text-zinc-400">Import an audio file to hear your changes.</p>}
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            {activeSong && <button type="button" onClick={onTogglePlay} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-zinc-800 px-4 text-xs font-semibold text-white hover:bg-zinc-700">{isPlaying ? <Pause size={14} /> : <Play size={14} />}{isPlaying ? 'Pause track' : 'Play track'}</button>}
            <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-[#1db954] px-5 text-xs font-bold text-black hover:bg-[#1ed760]">Done</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
