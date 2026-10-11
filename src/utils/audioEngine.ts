import { Song, DolbyAudioConfig, DolbyEffectPreset } from '../types/music';

export interface AudioEffectsStatus {
  status: 'ready' | 'native' | 'youtube' | 'no-source' | 'unavailable';
  message: string;
  processing?: boolean;
}

const DEFAULT_DOLBY_CONFIG: DolbyAudioConfig = {
  enabled: true, preset: 'dolby_atmos', intensity: 0.85, spatialWidth: 1.25,
  bassLevel: 4.5, trebleLevel: 3, vocalClarity: 0.75, reverbAmount: 0.22,
  compression: 'studio', backgroundListening: true,
};

// Presets set every effect, so choosing one cannot retain another preset's width
// or compression. Sliders are the actual processing values, without hidden boosts.
const DOLBY_PRESETS: Record<DolbyEffectPreset, Omit<DolbyAudioConfig, 'enabled' | 'backgroundListening'>> = {
  standard: { preset: 'standard', intensity: 1, spatialWidth: 1, bassLevel: 0, trebleLevel: 0, vocalClarity: 0, reverbAmount: 0, compression: 'off' },
  dolby_atmos: { preset: 'dolby_atmos', intensity: 0.85, spatialWidth: 1.25, bassLevel: 4.5, trebleLevel: 3, vocalClarity: 0.75, reverbAmount: 0.22, compression: 'studio' },
  bass_boost: { preset: 'bass_boost', intensity: 0.85, spatialWidth: 1, bassLevel: 8.5, trebleLevel: 1, vocalClarity: 0.1, reverbAmount: 0.08, compression: 'punchy' },
  vocal_clarity: { preset: 'vocal_clarity', intensity: 0.85, spatialWidth: 1, bassLevel: 1, trebleLevel: 3, vocalClarity: 0.95, reverbAmount: 0.06, compression: 'soft' },
  studio_master: { preset: 'studio_master', intensity: 0.85, spatialWidth: 1.1, bassLevel: 3, trebleLevel: 4.5, vocalClarity: 0.6, reverbAmount: 0.08, compression: 'studio' },
  concert_hall: { preset: 'concert_hall', intensity: 0.85, spatialWidth: 1.6, bassLevel: 3.5, trebleLevel: 2.5, vocalClarity: 0.5, reverbAmount: 0.5, compression: 'soft' },
  lofi_vinyl: { preset: 'lofi_vinyl', intensity: 0.85, spatialWidth: 0.65, bassLevel: 4, trebleLevel: -6, vocalClarity: 0.15, reverbAmount: 0.2, compression: 'soft' },
};

const clampFinite = (value: number, minimum: number, maximum: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  // EQ BiquadFilterNodes
  private eqFilters: BiquadFilterNode[] = [];
  public eqGains: number[] = [0, 0, 0, 0, 0]; // 60Hz, 250Hz, 1kHz, 4kHz, 12kHz

  // Dolby Audio Enhancer & Sound Effects Nodes
  private dolbyConfig: DolbyAudioConfig = { ...DEFAULT_DOLBY_CONFIG };

  private bassBoostFilter: BiquadFilterNode | null = null;
  private vocalClarityFilter: BiquadFilterNode | null = null;
  private trebleEnhanceFilter: BiquadFilterNode | null = null;
  private dynamicsCompressor: DynamicsCompressorNode | null = null;
  private effectsInput: GainNode | null = null;
  private bypassGain: GainNode | null = null;
  private processedGain: GainNode | null = null;
  private compressorDryGain: GainNode | null = null;
  private compressorWetGain: GainNode | null = null;
  private spatialInput: GainNode | null = null;
  private spatialMerger: ChannelMergerNode | null = null;
  private spatialGains: GainNode[] = [];
  private convolverNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private dolbyOutputGain: GainNode | null = null;

  private currentSong: Song | null = null;
  private isPaused: boolean = true;
  private nativeAudio: boolean = false;
  private sourceVersion: number = 0;
  private playVersion: number = 0;
  private pendingSeek: number | null = null;
  private previousAudioSessionType: string | null = null;
  private playbackRate: number = 1.0;
  private volume: number = 0.85;
  private processingError: string | null = null;
  private effectsListeners = new Set<() => void>();

  private onTimeUpdateCb: ((time: number, duration: number) => void) | null = null;
  private onEndedCb: (() => void) | null = null;
  private playbackCallbacks: {
    onPlaybackChange?: (playing: boolean) => void;
    onError?: (message: string | null) => void;
  } = {};

  // Background play callbacks
  private mediaSessionCallbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSeek?: (sec: number) => void;
  } = {};

  constructor() {
    // Returning to the foreground can restore a suspended DSP graph. Hiding the
    // page never pauses media, retries playback, or overrides a system/user pause.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.restoreForegroundContext());
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', () => this.restoreForegroundContext());
    }
  }

  private shouldUseNativeAudio(): boolean {
    if (typeof navigator === 'undefined' || !this.dolbyConfig.backgroundListening) return false;
    const device = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
    const mobile = device.userAgentData?.mobile === true
      || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return mobile;
  }

  public usesNativeAudio(): boolean {
    return Boolean(this.currentSong?.audioSrc && this.nativeAudio);
  }

  public setPlaybackCallbacks(callbacks: {
    onPlaybackChange?: (playing: boolean) => void;
    onError?: (message: string | null) => void;
  }) {
    this.playbackCallbacks = callbacks;
  }

  private restoreForegroundContext() {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!this.currentSong?.audioSrc || this.nativeAudio || this.isPaused
      || !this.audioElement || this.audioElement.paused || this.audioElement.ended || !this.audioCtx) return;
    if (['suspended', 'interrupted'].includes(this.audioCtx.state as string)) {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private setSystemPlaybackState(state: MediaSessionPlaybackState) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    // An embedded YouTube player cannot be promoted to a background media source.
    // Keep the OS from showing it as actively playing after the embed is hidden.
    if (this.currentSong?.youtubeId && !this.currentSong.audioSrc && state !== 'none') state = 'none';
    try { navigator.mediaSession.playbackState = state; } catch {}
  }

  private clearMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    try { session.metadata = null; } catch {}
    for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as MediaSessionAction[]) {
      try { session.setActionHandler(action, null); } catch {}
    }
    try { session.setPositionState?.(); } catch {}
    try { session.playbackState = 'none'; } catch {}
  }

  private reportPlayback(playing: boolean) {
    this.setSystemPlaybackState(playing ? 'playing' : 'paused');
    this.playbackCallbacks.onPlaybackChange?.(playing);
    this.notifyEffects();
  }

  private claimAudioSession() {
    // This optional API describes real direct media. It is not a keepalive and
    // cannot grant background permission to an embedded YouTube player.
    if (typeof navigator === 'undefined') return;
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (!session) return;
    try {
      if (this.previousAudioSessionType === null) this.previousAudioSessionType = session.type;
      session.type = 'playback';
    } catch {}
  }

  private releaseAudioSession() {
    if (this.previousAudioSessionType === null || typeof navigator === 'undefined') return;
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    try { if (session) session.type = this.previousAudioSessionType; } catch {}
    this.previousAudioSessionType = null;
  }

  private createImpulseResponse(durationSec: number = 2.0, decay: number = 2.5): AudioBuffer | null {
    if (!this.audioCtx) return null;
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const envelope = Math.exp(-n * decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      // Keep the unprocessed recording on its own path. Zero intensity or the
      // master Off switch bypasses EQ, compressor latency, spatial mix and reverb.
      this.effectsInput = this.audioCtx.createGain();
      this.effectsInput.channelCount = 2;
      this.effectsInput.channelCountMode = 'explicit';
      this.effectsInput.channelInterpretation = 'speakers';
      this.bypassGain = this.audioCtx.createGain();
      this.processedGain = this.audioCtx.createGain();
      this.bypassGain.gain.setValueAtTime(1, this.audioCtx.currentTime);
      this.bypassGain.connect(this.gainNode);

      // Create 5-band EQ
      const frequencies = [60, 250, 1000, 4000, 12000];
      const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      this.eqFilters = frequencies.map((freq, i) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);
        filter.Q.setValueAtTime(1, this.audioCtx!.currentTime);
        filter.gain.setValueAtTime(this.eqGains[i], this.audioCtx!.currentTime);
        return filter;
      });

      // Chain 5-Band EQ
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }
      const lastEq = this.eqFilters[this.eqFilters.length - 1];
      this.effectsInput.connect(this.eqFilters[0]);

      // Dolby Audio Enhancing DSP Chain
      this.bassBoostFilter = this.audioCtx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.setValueAtTime(80, this.audioCtx.currentTime);

      this.vocalClarityFilter = this.audioCtx.createBiquadFilter();
      this.vocalClarityFilter.type = 'peaking';
      this.vocalClarityFilter.frequency.setValueAtTime(3200, this.audioCtx.currentTime);
      this.vocalClarityFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

      this.trebleEnhanceFilter = this.audioCtx.createBiquadFilter();
      this.trebleEnhanceFilter.type = 'highshelf';
      this.trebleEnhanceFilter.frequency.setValueAtTime(10000, this.audioCtx.currentTime);

      this.dynamicsCompressor = this.audioCtx.createDynamicsCompressor();
      this.dynamicsCompressor.threshold.setValueAtTime(-18, this.audioCtx.currentTime);
      this.dynamicsCompressor.knee.setValueAtTime(12, this.audioCtx.currentTime);
      this.dynamicsCompressor.ratio.setValueAtTime(4, this.audioCtx.currentTime);
      this.dynamicsCompressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime);
      this.dynamicsCompressor.release.setValueAtTime(0.2, this.audioCtx.currentTime);

      // Mid/side width: L' = aL + bR, R' = bL + aR. A panner only changes
      // balance; it cannot widen stereo. Normalize the matrix for width > 1
      // to bound peak amplitude, and explicitly duplicate mono into both inputs.
      this.spatialInput = this.audioCtx.createGain();
      this.spatialInput.channelCount = 2;
      this.spatialInput.channelCountMode = 'explicit';
      this.spatialInput.channelInterpretation = 'speakers';
      const splitter = this.audioCtx.createChannelSplitter(2);
      this.spatialMerger = this.audioCtx.createChannelMerger(2);
      this.spatialInput.connect(splitter);
      this.spatialGains = Array.from({ length: 4 }, () => this.audioCtx!.createGain());
      for (const [index, [sourceChannel, destinationChannel]] of [[0, 0], [1, 0], [1, 1], [0, 1]].entries()) {
        splitter.connect(this.spatialGains[index], sourceChannel);
        this.spatialGains[index].connect(this.spatialMerger, 0, destinationChannel);
      }
      this.compressorDryGain = this.audioCtx.createGain();
      this.compressorWetGain = this.audioCtx.createGain();

      // Reverb Convolver Path
      this.convolverNode = this.audioCtx.createConvolver();
      const impulseBuffer = this.createImpulseResponse(1.8, 3.0);
      if (impulseBuffer) {
        this.convolverNode.buffer = impulseBuffer;
      }

      this.dryGain = this.audioCtx.createGain();
      this.reverbGain = this.audioCtx.createGain();
      this.dolbyOutputGain = this.audioCtx.createGain();

      // A single source cannot fan out into bypass and processed paths while
      // also using gains for a crossfade, so the input fan-out stays implicit.
      this.effectsInput.connect(this.bypassGain);

      // Compression Off takes a separate path, bypassing the compressor's
      // lookahead delay as well as its gain reduction.
      lastEq.connect(this.bassBoostFilter);
      this.bassBoostFilter.connect(this.vocalClarityFilter);
      this.vocalClarityFilter.connect(this.trebleEnhanceFilter);
      this.trebleEnhanceFilter.connect(this.dynamicsCompressor);
      this.trebleEnhanceFilter.connect(this.compressorDryGain);
      this.dynamicsCompressor.connect(this.compressorWetGain);
      this.compressorDryGain.connect(this.spatialInput);
      this.compressorWetGain.connect(this.spatialInput);

      // Split into Dry & Reverb Wet
      this.spatialMerger.connect(this.dryGain);
      this.spatialMerger.connect(this.convolverNode);
      this.convolverNode.connect(this.reverbGain);

      // Sum Dry + Reverb into dolbyOutputGain
      this.dryGain.connect(this.dolbyOutputGain);
      this.reverbGain.connect(this.dolbyOutputGain);

      // Dolby Output -> Master Gain -> Analyser -> Destination
      this.dolbyOutputGain.connect(this.processedGain);
      this.processedGain.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      // Apply initial Dolby parameters
      this.applyDolbyParameters(true);
    }

    this.audioCtx.onstatechange = () => {
      if (this.currentSong?.audioSrc && !this.nativeAudio && this.audioElement && !this.audioElement.paused) {
        this.reportPlayback(!this.isPaused && this.audioCtx?.state === 'running');
      }
      this.notifyEffects();
    };
  }

  public applyDolbyParameters(immediate = false) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const cfg = this.dolbyConfig;
    const intensity = cfg.intensity;
    const active = cfg.enabled && intensity > 0;
    const set = (parameter: AudioParam | undefined, value: number) => {
      if (!parameter) return;
      if (immediate) parameter.setValueAtTime(value, now);
      else parameter.setTargetAtTime(value, now, 0.025);
    };
    set(this.bypassGain?.gain, active ? 0 : 1);
    set(this.processedGain?.gain, active ? 1 : 0);
    this.eqFilters.forEach((filter, index) => set(filter.gain, this.eqGains[index] * intensity));
    set(this.bassBoostFilter?.gain, active ? cfg.bassLevel * intensity : 0);
    set(this.vocalClarityFilter?.gain, active ? cfg.vocalClarity * 9 * intensity : 0);
    set(this.trebleEnhanceFilter?.gain, active ? cfg.trebleLevel * intensity : 0);

    const width = active ? 1 + (cfg.spatialWidth - 1) * intensity : 1;
    const normalization = Math.max(1, width);
    const same = (1 + width) / (2 * normalization);
    const cross = (1 - width) / (2 * normalization);
    this.spatialGains.forEach((node, index) => set(node.gain, index % 2 === 0 ? same : cross));

    const reverb = active ? cfg.reverbAmount * intensity : 0;
    set(this.reverbGain?.gain, reverb);
    set(this.dryGain?.gain, 1 - reverb * 0.35);
    set(this.dolbyOutputGain?.gain, 1);

    const compression = {
      off: { threshold: 0, knee: 0, ratio: 1, attack: 0.003, release: 0.25 },
      soft: { threshold: -24, knee: 24, ratio: 2.5, attack: 0.015, release: 0.3 },
      studio: { threshold: -18, knee: 12, ratio: 4, attack: 0.005, release: 0.2 },
      punchy: { threshold: -14, knee: 6, ratio: 6, attack: 0.025, release: 0.1 },
    }[cfg.compression];
    if (this.dynamicsCompressor) {
      set(this.dynamicsCompressor.threshold, compression.threshold);
      set(this.dynamicsCompressor.knee, compression.knee);
      set(this.dynamicsCompressor.ratio, active ? 1 + (compression.ratio - 1) * intensity : 1);
      set(this.dynamicsCompressor.attack, compression.attack);
      set(this.dynamicsCompressor.release, compression.release);
    }
    set(this.compressorDryGain?.gain, !active || cfg.compression === 'off' ? 1 : 0);
    set(this.compressorWetGain?.gain, active && cfg.compression !== 'off' ? 1 : 0);
  }

  public setDolbyConfig(newConfig: Partial<DolbyAudioConfig>) {
    const previous = this.dolbyConfig;
    const requestedPreset = newConfig.preset && Object.hasOwn(DOLBY_PRESETS, newConfig.preset)
      ? newConfig.preset : previous.preset;
    if (requestedPreset === 'standard' && requestedPreset !== previous.preset) {
      this.eqGains = [0, 0, 0, 0, 0];
    }
    this.dolbyConfig = {
      enabled: typeof newConfig.enabled === 'boolean' ? newConfig.enabled : previous.enabled,
      backgroundListening: typeof newConfig.backgroundListening === 'boolean' ? newConfig.backgroundListening : previous.backgroundListening,
      preset: requestedPreset,
      compression: newConfig.compression && ['off', 'soft', 'studio', 'punchy'].includes(newConfig.compression) ? newConfig.compression : previous.compression,
      intensity: clampFinite(newConfig.intensity ?? previous.intensity, 0, 1, previous.intensity),
      spatialWidth: clampFinite(newConfig.spatialWidth ?? previous.spatialWidth, 0, 2, previous.spatialWidth),
      bassLevel: clampFinite(newConfig.bassLevel ?? previous.bassLevel, -12, 15, previous.bassLevel),
      trebleLevel: clampFinite(newConfig.trebleLevel ?? previous.trebleLevel, -12, 15, previous.trebleLevel),
      vocalClarity: clampFinite(newConfig.vocalClarity ?? previous.vocalClarity, 0, 1, previous.vocalClarity),
      reverbAmount: clampFinite(newConfig.reverbAmount ?? previous.reverbAmount, 0, 1, previous.reverbAmount),
    };
    this.applyDolbyParameters();
    if (this.currentSong?.audioSrc && this.audioElement && this.nativeAudio !== this.shouldUseNativeAudio()) {
      // A MediaElementAudioSourceNode permanently reroutes its element into the
      // graph. Moving between native playback and DSP needs a fresh element.
      const position = this.pendingSeek ?? this.audioElement.currentTime;
      const wanted = !this.isPaused;
      this.sourceVersion++;
      this.playVersion++;
      this.releaseAudioElement();
      this.prepareAudioSource(this.currentSong.audioSrc, position);
      if (wanted) this.startAudioPlayback();
      else this.reportPlayback(false);
    }
    this.notifyEffects();
  }

  public setDolbyPreset(preset: DolbyEffectPreset) {
    if (!Object.hasOwn(DOLBY_PRESETS, preset)) return;
    this.setDolbyConfig({ ...DOLBY_PRESETS[preset], enabled: true, backgroundListening: this.dolbyConfig.backgroundListening });
  }

  public getDolbyConfig(): DolbyAudioConfig {
    return { ...this.dolbyConfig };
  }

  public resetDolbyConfig() {
    this.eqGains = [0, 0, 0, 0, 0];
    this.setDolbyConfig({ ...DEFAULT_DOLBY_CONFIG, backgroundListening: this.dolbyConfig.backgroundListening });
  }

  public getEqGains(): number[] {
    return [...this.eqGains];
  }

  public resetEqGains() {
    this.eqGains = [0, 0, 0, 0, 0];
    this.applyDolbyParameters();
    this.notifyEffects();
  }

  public subscribeEffects(listener: () => void): () => void {
    this.effectsListeners.add(listener);
    return () => { this.effectsListeners.delete(listener); };
  }

  private notifyEffects() {
    this.effectsListeners.forEach(listener => listener());
  }

  public getAudioEffectsStatus(song: Song | null = this.currentSong): AudioEffectsStatus {
    if (!song) return { status: 'no-source', message: 'Play an imported audio file to hear sound effects.' };
    if (!song.audioSrc && song.youtubeId) return { status: 'youtube', message: 'YouTube songs cannot use these sound effects. Import an audio file to enhance its sound.' };
    if (!song.audioSrc) return { status: 'no-source', message: 'This track has no playable audio file.' };
    if (this.processingError) return { status: 'unavailable', message: this.processingError };
    if ((this.nativeAudio && this.currentSong?.id === song.id) || this.shouldUseNativeAudio()) {
      return { status: 'native', message: 'Mobile background listening uses the native player. Enable sound effects to process this audio while the page is open.' };
    }
    if (typeof window === 'undefined' || !(window.AudioContext || (window as any).webkitAudioContext)) {
      return { status: 'unavailable', message: 'Sound effects are unavailable in this browser.' };
    }
    if (this.audioCtx?.state === 'closed') return { status: 'unavailable', message: 'Audio processing has stopped. Play this file again to reconnect sound effects.' };
    return {
      status: 'ready', message: 'Sound effects are available for this audio file.',
      processing: Boolean(this.currentSong?.id === song.id && this.mediaSourceNode
        && this.getIsPlaying() && this.dolbyConfig.enabled && this.dolbyConfig.intensity > 0),
    };
  }

  public setMediaSessionCallbacks(callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSeek?: (sec: number) => void;
  }) {
    this.mediaSessionCallbacks = callbacks;
  }

  private updateMediaSession(song: Song) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    // YouTube-backed catalog entries are embedded videos, not background audio.
    // Notification playback/track actions are reserved for direct audio sources.
    if (!song.audioSrc) {
      this.clearMediaSession();
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Sawan Music',
        artwork: [
          { src: song.coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (e) {
      console.warn('MediaSession setup warning:', e);
    }
    // Unsupported actions must not prevent the remaining controls registering.
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => this.mediaSessionCallbacks.onPlay?.()],
      ['pause', () => this.mediaSessionCallbacks.onPause?.()],
      ['previoustrack', () => this.mediaSessionCallbacks.onPrev?.()],
      ['nexttrack', () => this.mediaSessionCallbacks.onNext?.()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) this.mediaSessionCallbacks.onSeek?.(details.seekTime);
      }],
    ];
    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    }
    try { navigator.mediaSession.setPositionState?.(); } catch {}
  }

  private updatePositionState() {
    if (!this.currentSong?.audioSrc || !this.audioElement
      || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const duration = Number.isFinite(this.audioElement.duration) && this.audioElement.duration > 0
      ? this.audioElement.duration : this.currentSong.duration;
    const position = this.audioElement.currentTime;
    const rate = this.audioElement.playbackRate;
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)
      || !Number.isFinite(rate) || rate <= 0) return;
    try {
      navigator.mediaSession.setPositionState?.({
        duration, position: Math.min(duration, Math.max(0, position)), playbackRate: rate,
      });
    } catch {}
  }

  public setEqGain(bandIndex: number, gainValue: number) {
    if (!Number.isInteger(bandIndex) || bandIndex < 0 || bandIndex >= 5 || !Number.isFinite(gainValue)) return;
    this.eqGains[bandIndex] = clampFinite(gainValue, -12, 12, this.eqGains[bandIndex]);
    this.applyDolbyParameters();
    this.notifyEffects();
  }

  public playSong(
    song: Song,
    onTimeUpdate: (time: number, duration: number) => void,
    onEnded: () => void,
    startFromSecond: number = 0
  ) {
    this.stopPlayback(false);
    this.currentSong = song;
    this.onTimeUpdateCb = onTimeUpdate;
    this.onEndedCb = onEnded;
    this.isPaused = false;
    this.updateMediaSession(song);

    // If song has a direct audioSrc (data url, blob, or remote mp3)
    if (song.audioSrc) {
      this.prepareAudioSource(song.audioSrc, startFromSecond);
      this.setSystemPlaybackState('paused');
      this.startAudioPlayback();
    } else if (song.youtubeId) {
      // YouTube-backed songs are played by the YouTube embed, never by the synth fallback.
      this.setSystemPlaybackState('playing');
    } else {
      // Missing media is silent: never substitute generated tones for a recording.
      this.isPaused = true;
      this.setSystemPlaybackState('paused');
      this.onTimeUpdateCb?.(startFromSecond, song.duration || 0);
    }
    this.notifyEffects();
  }

  private clearAudioHandlers(element: HTMLAudioElement) {
    element.onplay = null;
    element.onplaying = null;
    element.onpause = null;
    element.onended = null;
    element.onerror = null;
    element.ontimeupdate = null;
    element.onloadedmetadata = null;
  }

  private releaseAudioElement() {
    if (this.audioElement) {
      this.clearAudioHandlers(this.audioElement);
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
    }
    this.mediaSourceNode?.disconnect();
    this.mediaSourceNode = null;
    this.audioElement = null;
  }

  private prepareAudioSource(src: string, startFromSecond: number) {
    const native = this.shouldUseNativeAudio();
    if (this.audioElement && native !== this.nativeAudio) this.releaseAudioElement();
    this.nativeAudio = native;
    // Keep actual mobile media outside Web Audio: mobile browsers can suspend
    // a processing graph even while its media element continues advancing.
    this.processingError = null;
    if (!native) {
      try { this.initContext(); }
      catch {
        this.processingError = 'Sound effects could not start in this browser. Try native background listening or another browser.';
        this.discardProcessingGraph();
        this.failDirectPlayback(this.processingError);
        this.notifyEffects();
        return;
      }
    }
    else if (this.audioCtx?.state === 'running') this.audioCtx.suspend().catch(() => {});

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      if (!native) this.audioElement.crossOrigin = 'anonymous';

      if (!native && this.audioCtx && !this.mediaSourceNode) {
        try {
          this.mediaSourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
          this.mediaSourceNode.connect(this.effectsInput!);
        } catch {
          this.processingError = 'This audio file could not connect to sound effects. Try native background listening or play another file.';
          this.releaseAudioElement();
          this.failDirectPlayback(this.processingError);
          this.notifyEffects();
          return;
        }
      }
    }

    const element = this.audioElement;
    const version = this.sourceVersion;
    const isCurrent = () => this.audioElement === element && this.sourceVersion === version
      && this.currentSong?.audioSrc === src;
    element.src = src;
    element.playbackRate = this.playbackRate;
    element.volume = native ? this.volume : 1;
    this.pendingSeek = Math.max(0, Number.isFinite(startFromSecond) ? startFromSecond : 0);
    try { element.currentTime = this.pendingSeek; } catch {}

    const publishTime = () => {
      if (!isCurrent()) return;
      const duration = Number.isFinite(element.duration) && element.duration > 0
        ? element.duration : this.currentSong?.duration || 0;
      this.onTimeUpdateCb?.(element.currentTime, duration);
      this.updatePositionState();
    };
    element.ontimeupdate = publishTime;
    element.onloadedmetadata = () => {
      if (!isCurrent()) return;
      if (this.pendingSeek !== null) {
        try { element.currentTime = this.pendingSeek; } catch {}
        this.pendingSeek = null;
      }
      publishTime();
    };
    const onPlay = () => {
      if (!isCurrent() || element.paused) return;
      // A delayed event cannot undo an explicit or system pause.
      if (this.isPaused) { element.pause(); return; }
      this.playbackCallbacks.onError?.(null);
      this.reportPlayback(native || this.audioCtx?.state === 'running');
      this.updatePositionState();
    };
    element.onplay = onPlay;
    element.onplaying = onPlay;
    element.onpause = () => {
      if (!isCurrent() || !element.paused || element.ended) return;
      this.isPaused = true;
      this.playVersion++;
      this.reportPlayback(false);
    };
    element.onended = () => {
      if (!isCurrent() || !element.ended) return;
      this.isPaused = true;
      this.playVersion++;
      this.reportPlayback(false);
      this.onEndedCb?.();
    };
    element.onerror = () => {
      if (!isCurrent()) return;
      this.failDirectPlayback('Could not play this audio. Check the file or connection and press Play to try again.');
    };
    this.notifyEffects();
  }

  private discardProcessingGraph() {
    this.releaseAudioElement();
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
    this.gainNode = null;
    this.eqFilters = [];
    this.effectsInput = null;
    this.bypassGain = null;
    this.processedGain = null;
    this.bassBoostFilter = null;
    this.vocalClarityFilter = null;
    this.trebleEnhanceFilter = null;
    this.dynamicsCompressor = null;
    this.compressorDryGain = null;
    this.compressorWetGain = null;
    this.spatialInput = null;
    this.spatialMerger = null;
    this.spatialGains = [];
    this.convolverNode = null;
    this.dryGain = null;
    this.reverbGain = null;
    this.dolbyOutputGain = null;
  }

  private failDirectPlayback(message: string) {
    this.isPaused = true;
    this.playVersion++;
    this.audioElement?.pause();
    this.reportPlayback(false);
    this.playbackCallbacks.onError?.(message);
    this.notifyEffects();
  }

  private startAudioPlayback() {
    const element = this.audioElement;
    const source = this.currentSong?.audioSrc;
    if (!element || !source || this.isPaused) return;
    const version = ++this.playVersion;
    const sourceVersion = this.sourceVersion;
    const isCurrent = () => version === this.playVersion && sourceVersion === this.sourceVersion
      && this.audioElement === element && this.currentSong?.audioSrc === source && !this.isPaused;
    this.claimAudioSession();
    if (!this.nativeAudio && this.audioCtx
      && ['suspended', 'interrupted'].includes(this.audioCtx.state as string)) {
      this.audioCtx.resume().catch(() => {
        if (isCurrent()) this.failDirectPlayback('Audio processing could not resume. Press Play to try again.');
      });
    }
    let playResult: Promise<void>;
    try { playResult = element.play(); }
    catch { this.failDirectPlayback('Could not start this audio. Press Play to try again.'); return; }
    Promise.resolve(playResult).then(() => {
      if (!isCurrent() || element.paused) return;
      this.playbackCallbacks.onError?.(null);
      this.reportPlayback(this.nativeAudio || this.audioCtx?.state === 'running');
      this.updatePositionState();
    }).catch((error: unknown) => {
      if (!isCurrent()) return;
      const blocked = typeof error === 'object' && error !== null && 'name' in error && error.name === 'NotAllowedError';
      this.failDirectPlayback(blocked
        ? 'Playback was blocked. Press Play to try again.'
        : 'Could not play this audio. Check the file or connection and press Play to try again.');
    });
  }

  public pause() {
    this.isPaused = true;
    this.playVersion++;
    if (this.currentSong?.audioSrc) {
      this.audioElement?.pause();
      this.reportPlayback(false);
    } else this.setSystemPlaybackState('paused');
  }

  public resume() {
    if (!this.currentSong) return;
    this.isPaused = false;
    if (this.currentSong.audioSrc) this.startAudioPlayback();
    else if (this.currentSong.youtubeId) this.setSystemPlaybackState('playing');
    else { this.isPaused = true; this.setSystemPlaybackState('paused'); }
  }

  public seek(seconds: number) {
    if (this.currentSong?.youtubeId && !this.currentSong.audioSrc) return;
    if (this.audioElement && this.currentSong?.audioSrc) {
      const position = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
      this.pendingSeek = this.audioElement.readyState < 1 ? position : null;
      try { this.audioElement.currentTime = position; } catch { this.pendingSeek = position; }
      this.updatePositionState();
    }
  }

  private stopPlayback(notify: boolean) {
    const wasDirect = Boolean(this.currentSong?.audioSrc);
    this.sourceVersion++;
    this.playVersion++;
    this.isPaused = true;
    this.currentSong = null;
    this.pendingSeek = null;
    if (this.audioElement) {
      this.clearAudioHandlers(this.audioElement);
      this.audioElement.pause();
      try { this.audioElement.currentTime = 0; } catch {}
    }
    this.releaseAudioSession();
    if (notify && wasDirect) this.reportPlayback(false);
    this.setSystemPlaybackState('none');
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { navigator.mediaSession.setPositionState?.(); } catch {}
    }
    this.notifyEffects();
  }

  public stop() {
    this.stopPlayback(true);
  }

  public setVolume(vol: number) {
    this.volume = clampFinite(vol, 0, 1, this.volume);
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.02);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.nativeAudio ? this.volume : 1;
    }
  }

  public setPlaybackRate(rate: number) {
    if (!Number.isFinite(rate) || rate <= 0) return;
    this.playbackRate = rate;
    if (this.audioElement && this.currentSong?.audioSrc) {
      this.audioElement.playbackRate = rate;
      this.updatePositionState();
    }
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser && this.currentSong?.audioSrc && !this.nativeAudio) {
      this.analyser.getByteFrequencyData(array as any);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser && this.currentSong?.audioSrc && !this.nativeAudio) {
      this.analyser.getByteTimeDomainData(array as any);
    } else {
      array.fill(128);
    }
  }

  public getIsPlaying(): boolean {
    if (this.currentSong?.youtubeId && !this.currentSong.audioSrc) {
      return !this.isPaused;
    }
    if (this.audioElement && this.currentSong?.audioSrc) {
      return !this.isPaused && !this.audioElement.paused && !this.audioElement.ended
        && (this.nativeAudio || this.audioCtx?.state === 'running');
    }
    return false;
  }
}

export const audioEngine = new AudioEngine();
