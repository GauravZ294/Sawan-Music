import { Song } from '../types/music';
import { extractAudioFileMetadata } from './audioMetadataExtractor';

const VALID_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.opus', '.webm'];

/**
 * Calculates audio duration in seconds by probing an audio file
 */
export async function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
      };

      const onLoaded = () => {
        const dur = Math.round(audio.duration || 180);
        cleanup();
        resolve(dur > 0 && !isNaN(dur) ? dur : 180);
      };

      const onError = () => {
        cleanup();
        resolve(180); // sensible fallback
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);

      // Timeout fallback in case metadata doesn't fire
      setTimeout(() => {
        cleanup();
        resolve(180);
      }, 1500);
    } catch {
      resolve(180);
    }
  });
}

/**
 * Parses file name into clean Title and Artist
 */
export function parseFileNameToSongInfo(fileName: string): { title: string; artist: string } {
  // Strip extension
  let clean = fileName.replace(/\.[^/.]+$/, '');

  // Strip common downloader / web prefixes like "yt1s.com - ", "[128kbps]", etc.
  clean = clean.replace(/^(yt1s\.com|y2mate\.com|snaptube|download|audio|track)[\s_-]+/i, '');
  clean = clean.replace(/\[.*?\]|\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();

  // If format is "Artist - Title"
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return {
      artist: artist || 'Local Artist',
      title: title || clean,
    };
  }

  return {
    artist: 'System Media / Downloads',
    title: clean || 'Downloaded Track',
  };
}

/**
 * Converts a batch of File objects into SwarSync Song objects
 */
export async function convertFilesToSongs(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<Song[]> {
  const songs: Song[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { title: fallbackTitle, artist: fallbackArtist } = parseFileNameToSongInfo(file.name);
    
    // Extract real embedded artwork, ID3 title, artist, album, and year
    const meta = await extractAudioFileMetadata(file);
    const duration = await probeAudioDuration(file);
    const audioUrl = URL.createObjectURL(file);

    const title = meta.title || fallbackTitle;
    const artist = meta.artist || fallbackArtist;
    const album = meta.album || 'System Downloads';
    const year = meta.year || new Date().getFullYear();
    const coverUrl = meta.thumbnailUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
    const lyrics = meta.lyrics || `System downloaded media file: ${file.name}\nSize: ${(file.size / (1024 * 1024)).toFixed(2)} MB\nType: ${file.type || 'audio file'}`;

    const newSong: Song = {
      id: `system-file-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      artist,
      album,
      coverUrl,
      duration,
      genre: 'System Media',
      year,
      mood: 'Local Download',
      bpm: 85,
      lyrics,
      audioSrc: audioUrl,
      isFavorite: false,
      playlistIds: ['system-downloads'],
      dateAdded: new Date().toISOString().split('T')[0],
      playCount: 0,
      isSystemMedia: true,
      sourcePath: (file as any).webkitRelativePath || file.name,
      fileSize: file.size,
      themeNotes: `Directly caught from system downloads: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
    };

    songs.push(newSong);

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return songs;
}

// Stored directory handle for fast 1-click re-scanning
let cachedDirectoryHandle: any = null;

export function getCachedDirectoryHandle() {
  return cachedDirectoryHandle;
}

/**
 * Recursively scans directory entries using File System Access API
 */
async function scanDirectoryEntries(
  dirHandle: any,
  depth = 0,
  maxDepth = 2
): Promise<File[]> {
  const files: File[] = [];

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
      if (VALID_AUDIO_EXTENSIONS.includes(ext)) {
        try {
          const file = await entry.getFile();
          files.push(file);
        } catch (e) {
          console.warn('Could not read file:', entry.name, e);
        }
      }
    } else if (entry.kind === 'directory' && depth < maxDepth) {
      // Don't recurse into hidden or system folders
      if (!entry.name.startsWith('.') && !['node_modules', '$Recycle.Bin'].includes(entry.name)) {
        try {
          const subFiles = await scanDirectoryEntries(entry, depth + 1, maxDepth);
          files.push(...subFiles);
        } catch (e) {
          console.warn('Could not read subdir:', entry.name, e);
        }
      }
    }
  }

  return files;
}

/**
 * Catches all media files directly from system downloads folder using File System Access API
 */
export async function catchSystemDownloads(
  existingDirHandle?: any,
  onProgress?: (processed: number, total: number) => void
): Promise<{ songs: Song[]; folderName: string }> {
  let dirHandle = existingDirHandle || cachedDirectoryHandle;

  if (!dirHandle) {
    if ('showDirectoryPicker' in window) {
      dirHandle = await (window as any).showDirectoryPicker({
        id: 'system_downloads_folder',
        mode: 'read',
        startIn: 'downloads', // Prompt system directly to user's Downloads folder
      });
      cachedDirectoryHandle = dirHandle;
    } else {
      throw new Error('FILE_SYSTEM_API_NOT_SUPPORTED');
    }
  }

  const files = await scanDirectoryEntries(dirHandle);
  if (files.length === 0) {
    return { songs: [], folderName: dirHandle.name || 'Downloads' };
  }

  const songs = await convertFilesToSongs(files, onProgress);
  return { songs, folderName: dirHandle.name || 'Downloads' };
}
