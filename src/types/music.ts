export interface TimedLyric {
  time: number; // in seconds
  devanagari: string;
  romanized?: string;
  english?: string;
}

export interface Song {
  id: string;
  title: string;
  titleDevanagari?: string;
  artist: string;
  artistDevanagari?: string;
  album: string;
  coverUrl: string;
  duration: number; // in seconds
  genre: string;
  year: number;
  mood: string;
  bpm: number;
  lyrics: string;
  timedLyrics?: TimedLyric[];
  audioSrc?: string; // Blob URL, base64 data URI, or audio file
  audioPreset?: 'chahun_main_acoustic' | 'tum_hi_ho_ballad' | 'kesariya_sufi' | 'ambient_sitar' | 'lofi_chill' | 'synth_wave' | 'custom';
  isFavorite: boolean;
  playlistIds: string[];
  dateAdded: string;
  playCount: number;
  aiGenerated?: boolean;
  modelUsed?: string;
  themeNotes?: string;
  isSystemMedia?: boolean;
  sourcePath?: string;
  fileSize?: number;
  category?: 'regular' | 'remix' | 'lofi' | 'mashup' | 'acoustic';
  language?: string; // e.g. 'Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Malayalam', 'Bengali', 'English', etc.
  youtubeId?: string;
  youtubeUrl?: string;
  isYoutubeSource?: boolean;
  channelTitle?: string;
  moodLabels?: string[]; // e.g. ['Workout', 'Party', 'Relaxing']
  energyLevel?: 'Low' | 'Medium' | 'High' | 'Extreme';
  aiMoodAnalysis?: {
    primaryMood: string;
    vibes?: string;
    confidence?: number;
    suggestedPlaylists?: string[];
  };
}

export type DolbyEffectPreset =
  | 'standard'
  | 'dolby_atmos'
  | 'bass_boost'
  | 'vocal_clarity'
  | 'studio_master'
  | 'concert_hall'
  | 'lofi_vinyl';

export interface DolbyAudioConfig {
  enabled: boolean;
  preset: DolbyEffectPreset;
  intensity: number; // 0.0 - 1.0
  spatialWidth: number; // 0.0 - 2.0 (stereo expansion)
  bassLevel: number; // dB (-12 to +15)
  trebleLevel: number; // dB (-12 to +15)
  vocalClarity: number; // 0.0 - 1.0
  reverbAmount: number; // 0.0 - 1.0
  compression: 'off' | 'soft' | 'studio' | 'punchy';
  backgroundListening: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  color: string;
  songIds: string[];
  createdAt: string;
}

export type ViewMode =
  | 'all-songs'
  | 'regular'
  | 'remix'
  | 'lofi'
  | 'mashup'
  | 'system-downloads'
  | 'playlists'
  | 'playlist-detail'
  | 'artists'
  | 'albums'
  | 'favorites'
  | 'ai-studio'
  | 'youtube-explore'
  | 'lyrics-view';
