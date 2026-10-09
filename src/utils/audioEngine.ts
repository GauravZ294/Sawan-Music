import { Song, DolbyAudioConfig, DolbyEffectPreset } from '../types/music';

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
  private dolbyConfig: DolbyAudioConfig = {
    enabled: true,
    preset: 'dolby_atmos',
    intensity: 0.85,
    spatialWidth: 1.25,
    bassLevel: 4.5,
    trebleLevel: 3.0,
    vocalClarity: 0.75,
    reverbAmount: 0.22,
    compression: 'studio',
    backgroundListening: true,
  };

  private bassBoostFilter: BiquadFilterNode | null = null;
  private vocalClarityFilter: BiquadFilterNode | null = null;
  private trebleEnhanceFilter: BiquadFilterNode | null = null;
  private dynamicsCompressor: DynamicsCompressorNode | null = null;
  private stereoPanner: StereoPannerNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private dolbyOutputGain: GainNode | null = null;

  private currentSong: Song | null = null;
  private isPaused: boolean = false;
  private playbackRate: number = 1.0;
  private volume: number = 0.85;

  private onTimeUpdateCb: ((time: number, duration: number) => void) | null = null;
  private onEndedCb: (() => void) | null = null;

  // Background play callbacks
  private mediaSessionCallbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSeek?: (sec: number) => void;
  } = {};

  constructor() {
    // Setup background listening visibility listener
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (this.dolbyConfig.backgroundListening && this.audioCtx && !this.isPaused) {
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
        }
      });
    }
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

      // Create 5-band EQ
      const frequencies = [60, 250, 1000, 4000, 12000];
      const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      this.eqFilters = frequencies.map((freq, i) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);
        filter.gain.setValueAtTime(this.eqGains[i], this.audioCtx!.currentTime);
        return filter;
      });

      // Chain 5-Band EQ
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }
      const lastEq = this.eqFilters[this.eqFilters.length - 1];

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

      // Stereo Panner (if available)
      if (typeof this.audioCtx.createStereoPanner === 'function') {
        this.stereoPanner = this.audioCtx.createStereoPanner();
        this.stereoPanner.pan.setValueAtTime(0, this.audioCtx.currentTime);
      }

      // Reverb Convolver Path
      this.convolverNode = this.audioCtx.createConvolver();
      const impulseBuffer = this.createImpulseResponse(1.8, 3.0);
      if (impulseBuffer) {
        this.convolverNode.buffer = impulseBuffer;
      }

      this.dryGain = this.audioCtx.createGain();
      this.reverbGain = this.audioCtx.createGain();
      this.dolbyOutputGain = this.audioCtx.createGain();

      // Connect EQ -> Bass -> Vocal -> Treble -> Compressor -> Spatial
      lastEq.connect(this.bassBoostFilter);
      this.bassBoostFilter.connect(this.vocalClarityFilter);
      this.vocalClarityFilter.connect(this.trebleEnhanceFilter);
      this.trebleEnhanceFilter.connect(this.dynamicsCompressor);

      const postCompressorNode: AudioNode = this.stereoPanner
        ? (this.dynamicsCompressor.connect(this.stereoPanner), this.stereoPanner)
        : this.dynamicsCompressor;

      // Split into Dry & Reverb Wet
      postCompressorNode.connect(this.dryGain);
      postCompressorNode.connect(this.convolverNode);
      this.convolverNode.connect(this.reverbGain);

      // Sum Dry + Reverb into dolbyOutputGain
      this.dryGain.connect(this.dolbyOutputGain);
      this.reverbGain.connect(this.dolbyOutputGain);

      // Dolby Output -> Master Gain -> Analyser -> Destination
      this.dolbyOutputGain.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      // Apply initial Dolby parameters
      this.applyDolbyParameters();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public applyDolbyParameters() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const cfg = this.dolbyConfig;

    if (!cfg.enabled) {
      // Bypass Dolby effects to flat sound
      if (this.bassBoostFilter) this.bassBoostFilter.gain.setTargetAtTime(0, now, 0.05);
      if (this.vocalClarityFilter) this.vocalClarityFilter.gain.setTargetAtTime(0, now, 0.05);
      if (this.trebleEnhanceFilter) this.trebleEnhanceFilter.gain.setTargetAtTime(0, now, 0.05);
      if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(0, now, 0.05);
      if (this.dryGain) this.dryGain.gain.setTargetAtTime(1, now, 0.05);
      if (this.dynamicsCompressor) {
        this.dynamicsCompressor.ratio.setTargetAtTime(1, now, 0.05);
      }
      return;
    }

    const intensity = cfg.intensity;

    // Apply EQ filters based on Dolby preset and user sliders
    let bass = cfg.bassLevel * intensity;
    let treble = cfg.trebleLevel * intensity;
    let vocal = (cfg.vocalClarity * 6) * intensity;
    let reverbWet = cfg.reverbAmount * 0.4 * intensity;

    switch (cfg.preset) {
      case 'dolby_atmos':
        bass += 3.5;
        treble += 3.0;
        vocal += 2.5;
        reverbWet = Math.max(reverbWet, 0.16 * intensity);
        break;
      case 'bass_boost':
        bass += 8.0;
        treble += 1.0;
        vocal += 0.5;
        break;
      case 'vocal_clarity':
        bass += 0.5;
        vocal += 7.0;
        treble += 2.5;
        reverbWet = 0.08 * intensity;
        break;
      case 'studio_master':
        bass += 2.5;
        treble += 4.5;
        vocal += 2.0;
        reverbWet = 0.06 * intensity;
        break;
      case 'concert_hall':
        reverbWet = Math.max(reverbWet, 0.42 * intensity);
        bass += 3.0;
        treble += 2.0;
        break;
      case 'lofi_vinyl':
        bass += 3.5;
        treble -= 3.5;
        reverbWet = 0.15 * intensity;
        break;
      default:
        break;
    }

    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.setTargetAtTime(bass, now, 0.05);
    }
    if (this.vocalClarityFilter) {
      this.vocalClarityFilter.gain.setTargetAtTime(vocal, now, 0.05);
    }
    if (this.trebleEnhanceFilter) {
      this.trebleEnhanceFilter.gain.setTargetAtTime(treble, now, 0.05);
    }
    if (this.reverbGain && this.dryGain) {
      this.reverbGain.gain.setTargetAtTime(reverbWet, now, 0.05);
      this.dryGain.gain.setTargetAtTime(1.0 - reverbWet * 0.5, now, 0.05);
    }

    if (this.dynamicsCompressor) {
      if (cfg.compression === 'off') {
        this.dynamicsCompressor.ratio.setTargetAtTime(1, now, 0.05);
      } else if (cfg.compression === 'soft') {
        this.dynamicsCompressor.threshold.setTargetAtTime(-24, now, 0.05);
        this.dynamicsCompressor.ratio.setTargetAtTime(2.5, now, 0.05);
      } else if (cfg.compression === 'punchy') {
        this.dynamicsCompressor.threshold.setTargetAtTime(-14, now, 0.05);
        this.dynamicsCompressor.ratio.setTargetAtTime(6.0, now, 0.05);
      } else {
        // studio
        this.dynamicsCompressor.threshold.setTargetAtTime(-18, now, 0.05);
        this.dynamicsCompressor.ratio.setTargetAtTime(4.0, now, 0.05);
      }
    }
  }

  public setDolbyConfig(newConfig: Partial<DolbyAudioConfig>) {
    this.dolbyConfig = { ...this.dolbyConfig, ...newConfig };
    this.applyDolbyParameters();
  }

  public setDolbyPreset(preset: DolbyEffectPreset) {
    this.dolbyConfig.preset = preset;
    // Set typical preset values
    switch (preset) {
      case 'dolby_atmos':
        this.dolbyConfig.bassLevel = 4.5;
        this.dolbyConfig.trebleLevel = 3.5;
        this.dolbyConfig.spatialWidth = 1.4;
        this.dolbyConfig.vocalClarity = 0.7;
        this.dolbyConfig.reverbAmount = 0.22;
        this.dolbyConfig.compression = 'studio';
        break;
      case 'bass_boost':
        this.dolbyConfig.bassLevel = 8.5;
        this.dolbyConfig.trebleLevel = 1.0;
        this.dolbyConfig.vocalClarity = 0.4;
        this.dolbyConfig.reverbAmount = 0.08;
        this.dolbyConfig.compression = 'punchy';
        break;
      case 'vocal_clarity':
        this.dolbyConfig.bassLevel = 1.0;
        this.dolbyConfig.trebleLevel = 3.0;
        this.dolbyConfig.vocalClarity = 0.95;
        this.dolbyConfig.reverbAmount = 0.1;
        this.dolbyConfig.compression = 'soft';
        break;
      case 'studio_master':
        this.dolbyConfig.bassLevel = 3.0;
        this.dolbyConfig.trebleLevel = 4.5;
        this.dolbyConfig.vocalClarity = 0.6;
        this.dolbyConfig.reverbAmount = 0.08;
        this.dolbyConfig.compression = 'studio';
        break;
      case 'concert_hall':
        this.dolbyConfig.bassLevel = 3.5;
        this.dolbyConfig.trebleLevel = 2.5;
        this.dolbyConfig.vocalClarity = 0.5;
        this.dolbyConfig.reverbAmount = 0.5;
        this.dolbyConfig.compression = 'soft';
        break;
      case 'lofi_vinyl':
        this.dolbyConfig.bassLevel = 4.0;
        this.dolbyConfig.trebleLevel = -2.5;
        this.dolbyConfig.vocalClarity = 0.4;
        this.dolbyConfig.reverbAmount = 0.2;
        this.dolbyConfig.compression = 'soft';
        break;
      case 'standard':
        this.dolbyConfig.bassLevel = 0;
        this.dolbyConfig.trebleLevel = 0;
        this.dolbyConfig.vocalClarity = 0.5;
        this.dolbyConfig.reverbAmount = 0;
        this.dolbyConfig.compression = 'off';
        break;
    }
    this.applyDolbyParameters();
  }

  public getDolbyConfig(): DolbyAudioConfig {
    return { ...this.dolbyConfig };
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
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album || 'SwarSync Music',
          artwork: [
            { src: song.coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: song.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' },
          ],
        });

        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => {
          this.mediaSessionCallbacks.onPlay?.();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.mediaSessionCallbacks.onPause?.();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.mediaSessionCallbacks.onPrev?.();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.mediaSessionCallbacks.onNext?.();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            this.mediaSessionCallbacks.onSeek?.(details.seekTime);
          }
        });
      } catch (e) {
        console.warn('MediaSession setup warning:', e);
      }
    }
  }

  public setEqGain(bandIndex: number, gainValue: number) {
    this.eqGains[bandIndex] = gainValue;
    if (this.eqFilters[bandIndex] && this.audioCtx) {
      this.eqFilters[bandIndex].gain.setTargetAtTime(gainValue, this.audioCtx.currentTime, 0.05);
    }
  }

  public playSong(
    song: Song,
    onTimeUpdate: (time: number, duration: number) => void,
    onEnded: () => void,
    startFromSecond: number = 0
  ) {
    this.stop();
    this.initContext();
    this.currentSong = song;
    this.onTimeUpdateCb = onTimeUpdate;
    this.onEndedCb = onEnded;
    this.isPaused = false;
    this.updateMediaSession(song);

    // If song has a direct audioSrc (data url, blob, or remote mp3)
    if (song.audioSrc) {
      this.playAudioSource(song.audioSrc, startFromSecond);
    } else if (song.youtubeId) {
      // YouTube-backed songs are played by the YouTube embed, never by the synth fallback.
    } else {
      // Missing media is silent: never substitute generated tones for a recording.
      this.isPaused = true;
      this.onTimeUpdateCb?.(startFromSecond, song.duration || 0);
    }
  }

  private playAudioSource(src: string, startFromSecond: number) {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';

      if (this.audioCtx && !this.mediaSourceNode) {
        this.mediaSourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
        this.mediaSourceNode.connect(this.eqFilters[0]);
      }
    }

    this.audioElement.src = src;
    this.audioElement.playbackRate = this.playbackRate;
    this.audioElement.currentTime = startFromSecond;

    this.audioElement.ontimeupdate = () => {
      if (this.audioElement && this.onTimeUpdateCb) {
        this.onTimeUpdateCb(this.audioElement.currentTime, this.audioElement.duration || this.currentSong?.duration || 0);
      }
    };

    this.audioElement.onended = () => {
      if (this.onEndedCb) this.onEndedCb();
    };

    this.audioElement.play().catch((err) => {
      console.warn('Audio play was prevented or failed:', err);
    });
  }

  public pause() {
    this.isPaused = true;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  public resume() {
    this.isPaused = false;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (this.audioElement && this.currentSong?.audioSrc) {
      this.audioElement.play().catch(() => {});
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }

  public seek(seconds: number) {
    if (this.currentSong?.youtubeId && !this.currentSong.audioSrc) return;
    if (this.audioElement && this.currentSong?.audioSrc) {
      this.audioElement.currentTime = seconds;
    }
  }

  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPaused = true;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.02);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as any);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
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
      return !this.audioElement.paused && !this.audioElement.ended;
    }
    return false;
  }
}

export const audioEngine = new AudioEngine();
