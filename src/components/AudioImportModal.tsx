import React, { useState } from 'react';
import { Song, Playlist } from '../types/music';
import { extractAudioFileMetadata } from '../utils/audioMetadataExtractor';
import { X, Upload, Music, CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';

interface AudioImportModalProps {
  playlists: Playlist[];
  onImport: (newSong: Song) => void;
  onClose: () => void;
}

export const AudioImportModal: React.FC<AudioImportModalProps> = ({
  playlists,
  onImport,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('Imported Audio');
  const [genre, setGenre] = useState('Custom Audio');
  const [lyrics, setLyrics] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [hasOriginalThumbnail, setHasOriginalThumbnail] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingMeta, setIsExtractingMeta] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsExtractingMeta(true);

      // Default fallback from filename
      let detectedTitle = selectedFile.name.replace(/\.[^/.]+$/, '');
      let detectedArtist = 'Local Artist';

      try {
        // Extract real embedded ID3 thumbnail and metadata
        const meta = await extractAudioFileMetadata(selectedFile);
        if (meta.title) detectedTitle = meta.title;
        if (meta.artist) detectedArtist = meta.artist;
        if (meta.album) setAlbum(meta.album);
        if (meta.lyrics) setLyrics(meta.lyrics);
        if (meta.thumbnailUrl) {
          setCoverUrl(meta.thumbnailUrl);
          setHasOriginalThumbnail(true);
        }
      } catch (err) {
        console.warn('Metadata probe failed:', err);
      } finally {
        setIsExtractingMeta(false);
      }

      setTitle(detectedTitle);
      setArtist(detectedArtist);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const audioDataUrl = event.target?.result as string;

      // Create new song object with original thumbnail
      const newSong: Song = {
        id: `local-${Date.now()}`,
        title: title || file.name,
        artist: artist || 'Local Artist',
        album: album || 'Imported Audio',
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: 180, // Default approximate until played
        genre: genre || 'Audio File',
        year: new Date().getFullYear(),
        mood: 'Custom',
        bpm: 90,
        lyrics: lyrics || `Imported local audio file: ${file.name}`,
        audioSrc: audioDataUrl,
        isFavorite: false,
        playlistIds: selectedPlaylistIds,
        dateAdded: new Date().toISOString().split('T')[0],
        playCount: 0,
        isSystemMedia: true,
        sourcePath: file.name,
        fileSize: file.size,
      };

      onImport(newSong);
      setIsProcessing(false);
      onClose();
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Local Audio File</h2>
              <p className="text-xs text-zinc-400">Add MP3, WAV, or AAC files from your device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* File Picker & Thumbnail Preview */}
          <div>
            <label className="text-zinc-300 font-semibold block mb-1.5">Select Audio File</label>
            <div className="flex items-center gap-3">
              {coverUrl && (
                <div className="relative group w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-zinc-700 bg-zinc-950 shadow-md">
                  <img src={coverUrl} alt="Original thumbnail" className="w-full h-full object-cover" />
                  {hasOriginalThumbnail && (
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[8px] font-bold text-center py-0.5">
                      ORIGINAL
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  required
                  className="w-full text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-600 file:text-white hover:file:bg-rose-500 file:cursor-pointer"
                />
                {isExtractingMeta && (
                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 animate-pulse">
                    <Sparkles size={11} /> Extracting original album thumbnail and ID3 tags...
                  </p>
                )}
                {hasOriginalThumbnail && !isExtractingMeta && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Original embedded album artwork extracted!
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-zinc-300 font-semibold block mb-1">Track Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
              placeholder="e.g. My Acoustic Melody"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Artist</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
                placeholder="Artist name"
              />
            </div>
            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
                placeholder="Album name"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-300 font-semibold block mb-1">Lyrics (Optional)</label>
            <textarea
              rows={3}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
              placeholder="Paste song lyrics..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isProcessing}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Importing...' : 'Add to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
