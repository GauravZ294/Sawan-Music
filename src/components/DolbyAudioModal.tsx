import React, { useState, useEffect } from 'react';
import {
  DolbyAudioConfig,
  DolbyEffectPreset,
  Song,
} from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import {
  Volume2,
  X,
  Sparkles,
  Sliders,
  Check,
  Zap,
  Radio,
  Flame,
  Layers,
  Headphones,
  Compass,
  Play,
  RotateCcw,
  ShieldCheck,
  Disc,
} from 'lucide-react';

interface DolbyAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const DolbyAudioModal: React.FC<DolbyAudioModalProps> = ({
  isOpen,
  onClose,
  activeSong,
  isPlaying,
  onTogglePlay,
}) => {
  const [config, setConfig] = useState<DolbyAudioConfig>(() =>
    audioEngine.getDolbyConfig()
  );
  const [activeTab, setActiveTab] = useState<'presets' | 'spatial' | 'equalizer' | 'background'>('presets');

  useEffect(() => {
    if (isOpen) {
      setConfig(audioEngine.getDolbyConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleDolby = () => {
    const nextState = !config.enabled;
    const nextConfig = { ...config, enabled: nextState };
    setConfig(nextConfig);
    audioEngine.setDolbyConfig(nextConfig);
  };

  const handleSelectPreset = (preset: DolbyEffectPreset) => {
    audioEngine.setDolbyPreset(preset);
    setConfig(audioEngine.getDolbyConfig());
  };

  const handleSliderChange = (key: keyof DolbyAudioConfig, value: any) => {
    const nextConfig = { ...config, [key]: value };
    setConfig(nextConfig);
    audioEngine.setDolbyConfig({ [key]: value });
  };

  const handleResetDefaults = () => {
    audioEngine.setDolbyPreset('dolby_atmos');
    setConfig(audioEngine.getDolbyConfig());
  };

  const presetsList: {
    id: DolbyEffectPreset;
    name: string;
    badge: string;
    desc: string;
    color: string;
    icon: any;
  }[] = [
    {
      id: 'dolby_atmos',
      name: 'Dolby Atmos 3D Spatial',
      badge: 'RECOMMENDED',
      desc: 'Immersive spherical soundstage with expanded psychoacoustic stereo, deep sub-bass, and crystal vocal clarity.',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/50 text-emerald-400',
      icon: Sparkles,
    },
    {
      id: 'bass_boost',
      name: 'Dolby Bass Boost Resonator',
      badge: 'BASS PUNCH',
      desc: 'Maximum low-frequency emphasis (+8.5dB at 80Hz) tuned for dance, remixes, workouts, and subwoofer speakers.',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/50 text-amber-400',
      icon: Flame,
    },
    {
      id: 'vocal_clarity',
      name: 'Vocal Clarity & Lyrics Pro',
      badge: 'SPEECH BOOST',
      desc: 'Lifts singers and lyrics (+7dB presence at 3.2kHz), ideal for ghazals, romantic poetry, and acoustic ballads.',
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/50 text-sky-400',
      icon: Headphones,
    },
    {
      id: 'studio_master',
      name: 'Studio Reference Master',
      badge: 'AUDIOPHILE',
      desc: 'Clean, transparent dynamic range compression with crisp 10kHz air for high-fidelity headphones.',
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/50 text-purple-400',
      icon: Sliders,
    },
    {
      id: 'concert_hall',
      name: 'Live Arena & Stadium 3D',
      badge: 'CONCERT REVERB',
      desc: 'Simulates a 20,000-seat stadium with simulated convolver impulse acoustics and wide stage echoes.',
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/50 text-rose-400',
      icon: Radio,
    },
    {
      id: 'lofi_vinyl',
      name: 'Warm Lo-Fi & Analog Vinyl',
      badge: 'RETRO WARMTH',
      desc: 'Gentle high-frequency roll-off, harmonic analog tape saturation, and cozy midnight bedroom ambiance.',
      color: 'from-yellow-600/20 to-amber-700/10 border-yellow-600/50 text-yellow-500',
      icon: Disc,
    },
    {
      id: 'standard',
      name: 'Standard (Flat Bypass)',
      badge: 'NATURAL',
      desc: 'Bypasses Dolby enhancement DSP and plays original unmodified track audio.',
      color: 'from-zinc-700/20 to-zinc-800/10 border-zinc-700/50 text-zinc-400',
      icon: Layers,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-3xl bg-[#141416] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Dolby Branding */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-[#18181b] to-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-black font-black">
              <Zap size={22} className="fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-1.5">
                  DOLBY AUDIO™ <span className="text-[#1db954] text-xs font-bold uppercase px-2 py-0.5 bg-[#1db954]/10 rounded border border-[#1db954]/30">3D Spatial Suite</span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400">
                Studio mastering, 3D spatial surround virtualizer, and background listening
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Master Toggle */}
            <button
              onClick={handleToggleDolby}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-md ${
                config.enabled
                  ? 'bg-[#1db954] text-black shadow-emerald-500/20 hover:bg-[#1ed760]'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-black animate-ping' : 'bg-zinc-500'}`} />
              <span>{config.enabled ? 'Dolby ON' : 'Dolby OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 pt-3 border-b border-zinc-800/60 bg-[#161619] gap-2 overflow-x-auto">
          {[
            { id: 'presets', label: 'Dolby Presets', icon: Sparkles },
            { id: 'spatial', label: '3D Spatial & Effects', icon: Compass },
            { id: 'equalizer', label: 'Dynamic Compressor & EQ', icon: Sliders },
            { id: 'background', label: 'Background Listening', icon: Radio },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  isCurrent
                    ? 'border-[#1db954] text-white bg-zinc-800/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
                }`}
              >
                <Icon size={14} className={isCurrent ? 'text-[#1db954]' : ''} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Select Dolby Sound Profile</h3>
                  <p className="text-xs text-zinc-400">
                    Custom-tuned digital signal processing (DSP) curves for any mood or listening device
                  </p>
                </div>
                <button
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Reset to Atmos Default</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presetsList.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = config.preset === preset.id && config.enabled;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? `bg-gradient-to-br ${preset.color} shadow-lg shadow-black/40 ring-1 ring-[#1db954]`
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-black/40 text-[#1db954]">
                              <Icon size={16} />
                            </div>
                            <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                          </div>
                          <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-black/40 text-zinc-300 border border-zinc-700/40">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                          {preset.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px]">
                        <span className="text-zinc-500 font-mono">
                          {isSelected ? 'ACTIVE PROFILE' : 'CLICK TO ACTIVATE'}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs font-bold text-[#1db954]">
                            <Check size={14} className="stroke-[3]" />
                            <span>Applied</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL & SOUND EFFECTS */}
          {activeTab === 'spatial' && (
            <div className="space-y-6">
              {/* 3D Spatial Virtualizer Stage Visualizer */}
              <div className="p-5 rounded-xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 block mb-2 font-bold">
                  DOLBY 3D BINAURAL STAGE SIMULATION
                </span>

                {/* Visualizer graphic with speakers */}
                <div className="relative h-28 max-w-sm mx-auto flex items-center justify-between px-6">
                  {/* Left Virtual Speaker */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse">
                      <Volume2 size={18} />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1">Left 3D</span>
                  </div>

                  {/* Center Listener Head / Center Dialogue Channel */}
                  <div className="flex flex-col items-center relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-[#1db954] flex items-center justify-center text-white shadow-xl shadow-[#1db954]/20">
                      <Headphones size={22} className="text-[#1db954]" />
                    </div>
                    <span className="text-[10px] text-white font-bold mt-1">Center Dialogue</span>
                    {/* Concentric soundwaves */}
                    <div className="absolute -inset-2 rounded-full border border-emerald-500/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                  </div>

                  {/* Right Virtual Speaker */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse">
                      <Volume2 size={18} />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1">Right 3D</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400 font-mono mt-3">
                  <span className="text-emerald-400">● Subwoofer Active (80Hz)</span>
                  <span>● 360° Soundstage: {Math.round(config.spatialWidth * 100)}%</span>
                  <span>● Atmos Convolver On</span>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="space-y-4">
                {/* Intensity Slider */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-400" />
                      Dolby Effect Intensity
                    </span>
                    <span className="text-emerald-400 font-mono">{Math.round(config.intensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.intensity}
                    onChange={(e) => handleSliderChange('intensity', parseFloat(e.target.value))}
                    className="w-full accent-[#1db954] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>Subtle (0%)</span>
                    <span>Studio Balanced (70%)</span>
                    <span>Maximum Immersion (100%)</span>
                  </div>
                </div>

                {/* Spatial Width */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Compass size={14} className="text-teal-400" />
                      3D Spatial Soundstage Width
                    </span>
                    <span className="text-teal-400 font-mono">
                      {Math.round(config.spatialWidth * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={config.spatialWidth}
                    onChange={(e) => handleSliderChange('spatialWidth', parseFloat(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>Narrow (50%)</span>
                    <span>Standard Stereo (100%)</span>
                    <span>Wide 360° Field (200%)</span>
                  </div>
                </div>

                {/* Reverb / Hall Room Size */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Radio size={14} className="text-indigo-400" />
                      Acoustic Reverb & Hall Ambience
                    </span>
                    <span className="text-indigo-400 font-mono">
                      {Math.round(config.reverbAmount * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.02"
                    value={config.reverbAmount}
                    onChange={(e) => handleSliderChange('reverbAmount', parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>Dry Studio Room (0%)</span>
                    <span>Acoustic Chamber (30%)</span>
                    <span>Live Arena Reverb (80%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EQUALIZER & COMPRESSION */}
          {activeTab === 'equalizer' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Dolby Dynamic EQ Fine Tuning
                </h4>

                {/* Bass Level */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-200 mb-1">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Flame size={14} /> Sub-Bass Resonator (80Hz)
                    </span>
                    <span className="font-mono text-amber-400">
                      {config.bassLevel > 0 ? `+${config.bassLevel} dB` : `${config.bassLevel} dB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="15"
                    step="0.5"
                    value={config.bassLevel}
                    onChange={(e) => handleSliderChange('bassLevel', parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Vocal Presence */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-200 mb-1">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <Headphones size={14} /> Vocal & Lyric Presence (3.2kHz)
                    </span>
                    <span className="font-mono text-sky-400">
                      {Math.round(config.vocalClarity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.vocalClarity}
                    onChange={(e) => handleSliderChange('vocalClarity', parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Treble Brilliance */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-200 mb-1">
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <Sparkles size={14} /> Treble & Air Brilliance (10kHz)
                    </span>
                    <span className="font-mono text-purple-400">
                      {config.trebleLevel > 0 ? `+${config.trebleLevel} dB` : `${config.trebleLevel} dB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="15"
                    step="0.5"
                    value={config.trebleLevel}
                    onChange={(e) => handleSliderChange('trebleLevel', parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Range Compressor */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Dolby Dynamics Compressor & Loudness Normalizer
                </h4>
                <p className="text-xs text-zinc-400 mb-3">
                  Prevents harsh distortion on loud beats while lifting quiet whispers and subtle instruments.
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'off', label: 'Off', desc: 'Raw dynamic range' },
                    { id: 'soft', label: 'Soft', desc: 'Gentle leveling' },
                    { id: 'studio', label: 'Studio Master', desc: 'Balanced mastering' },
                    { id: 'punchy', label: 'Punchy', desc: 'Maximum punch' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleSliderChange('compression', mode.id)}
                      className={`p-2.5 rounded-lg text-center transition-all border ${
                        config.compression === mode.id
                          ? 'bg-[#1db954]/20 border-[#1db954] text-white font-bold'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <div className="text-xs">{mode.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BACKGROUND LISTENING */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#181820] border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-[#1db954] flex items-center justify-center">
                      <Radio size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Background Listening & System Media Controls
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Keeps audio playing when switching browser tabs or screen is locked
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleSliderChange('backgroundListening', !config.backgroundListening)
                    }
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      config.backgroundListening
                        ? 'bg-[#1db954] text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {config.backgroundListening ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                  <div className="flex items-start gap-2 text-xs text-zinc-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>MediaSession Integration:</strong> Shows track title, artist, and album art in OS notification panel and lock-screen widgets.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-zinc-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Hardware Key Support:</strong> Use physical Play/Pause, Next, and Previous keys on keyboards, headphones, or Bluetooth car stereos.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-zinc-300">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>AudioContext Keep-Alive:</strong> Automatically prevents browser suspension when navigating away to other productivity tabs.
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold">Background Service Active:</span>
                  <span>Audio Engine is running uninterrupted</span>
                </div>
                <span className="font-mono text-zinc-400 text-[11px]">32-BIT DSP READY</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar with Active Track & Audition Play/Pause */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-[#161619] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {activeSong ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={activeSong.coverUrl}
                  alt={activeSong.title}
                  className="w-9 h-9 rounded object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{activeSong.title}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{activeSong.artist}</div>
                </div>
              </div>
            ) : (
              <span className="text-xs text-zinc-400">Select any song to audition Dolby effects live</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeSong && (
              <button
                onClick={onTogglePlay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
              >
                <Play size={12} className={isPlaying ? 'text-[#1db954]' : ''} />
                <span>{isPlaying ? 'Pause Track' : 'Audition Play'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black text-xs font-bold transition-all shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
