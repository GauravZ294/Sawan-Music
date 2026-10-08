import React, { useState, useRef } from 'react';
import { Song } from '../types/music';
import {
  catchSystemDownloads,
  convertFilesToSongs,
  getCachedDirectoryHandle,
} from '../utils/systemMediaScanner';
import {
  Download,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  HardDrive,
  RefreshCw,
  Sparkles,
  Music,
  FileCheck,
} from 'lucide-react';

interface SystemMediaScannerModalProps {
  onSongsCaught: (newSongs: Song[]) => void;
  onClose: () => void;
}

export const SystemMediaScannerModal: React.FC<SystemMediaScannerModalProps> = ({
  onSongsCaught,
  onClose,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [lastImportCount, setLastImportCount] = useState<number | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fallbackFolderInputRef = useRef<HTMLInputElement | null>(null);
  const fallbackFilesInputRef = useRef<HTMLInputElement | null>(null);

  const hasCachedFolder = !!getCachedDirectoryHandle();

  // Primary Method: File System Access API
  const handleScanSystemDownloads = async (useExisting = false) => {
    setIsScanning(true);
    setErrorMsg(null);
    setProgress(null);
    setLastImportCount(null);

    try {
      const result = await catchSystemDownloads(
        useExisting ? getCachedDirectoryHandle() : undefined,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      setFolderName(result.folderName);
      setLastImportCount(result.songs.length);

      if (result.songs.length > 0) {
        onSongsCaught(result.songs);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled picker
        setIsScanning(false);
        return;
      }

      if (err.message === 'FILE_SYSTEM_API_NOT_SUPPORTED') {
        // Fallback to directory input
        fallbackFolderInputRef.current?.click();
        return;
      }

      console.error('System media scan error:', err);
      setErrorMsg(err.message || 'Could not scan system folder. You can use the folder picker below.');
    } finally {
      setIsScanning(false);
    }
  };

  // Fallback Method: Standard HTML5 input directory / multiple files
  const handleFallbackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsScanning(true);
    setErrorMsg(null);
    setProgress(null);

    try {
      const audioFiles: File[] = [];
      const validExts = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.opus', '.webm'];

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (validExts.includes(ext)) {
          audioFiles.push(file);
        }
      }

      if (audioFiles.length === 0) {
        setErrorMsg('No audio files (.mp3, .wav, .m4a, etc.) were found in the selected folder.');
        setIsScanning(false);
        return;
      }

      const songs = await convertFilesToSongs(audioFiles, (current, total) => {
        setProgress({ current, total });
      });

      setFolderName('Selected System Media');
      setLastImportCount(songs.length);
      onSongsCaught(songs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process selected media files.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400">
              <Download size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Catch System Downloaded Media
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                  AUTO-SYNC
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Directly connect to your device&apos;s Downloads folder to ingest all media files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status / Success Box */}
        {lastImportCount !== null && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-200">
                Successfully Caught {lastImportCount} Media Files!
              </p>
              <p className="text-emerald-300/80 mt-0.5">
                Imported from folder &ldquo;{folderName}&rdquo; into your SwarSync library under &ldquo;System Downloads&rdquo;.
              </p>
            </div>
          </div>
        )}

        {/* Scanning in progress */}
        {isScanning && (
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-rose-500 mx-auto" />
            <p className="text-xs font-semibold text-zinc-200">
              Scanning System Downloads for Audio Media...
            </p>
            {progress && (
              <div className="space-y-1.5 max-w-xs mx-auto">
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Processing file {progress.current} of {progress.total}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <div>
              <p className="font-semibold">Scan Notice</p>
              <p className="mt-0.5 text-rose-200/80">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 text-xs">
          {/* Main Direct Button */}
          <button
            onClick={() => handleScanSystemDownloads(false)}
            disabled={isScanning}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-rose-950/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            <FolderOpen size={18} />
            <span>Select & Catch System Downloads Folder</span>
          </button>

          {/* Quick Rescan if folder was previously picked */}
          {hasCachedFolder && (
            <button
              onClick={() => handleScanSystemDownloads(true)}
              disabled={isScanning}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
              <span>Rescan Connected Downloads Folder</span>
            </button>
          )}

          {/* Fallback Folder Input */}
          <div className="pt-2 flex items-center justify-between text-zinc-400 text-[11px] border-t border-zinc-800">
            <span>Alternative import method:</span>
            <div className="flex gap-2">
              <button
                onClick={() => fallbackFolderInputRef.current?.click()}
                className="text-rose-400 hover:underline"
              >
                Browse Directory
              </button>
              <span>•</span>
              <button
                onClick={() => fallbackFilesInputRef.current?.click()}
                className="text-rose-400 hover:underline"
              >
                Choose Media Files
              </button>
            </div>
          </div>
        </div>

        {/* Hidden Fallback Inputs */}
        <input
          ref={fallbackFolderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFallbackFileSelect}
        />
        <input
          ref={fallbackFilesInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
          multiple
          className="hidden"
          onChange={handleFallbackFileSelect}
        />

        {/* Info Explainer */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            Automatic Media Detection
          </p>
          <p className="leading-relaxed">
            The application detects <strong>MP3, WAV, M4A, FLAC, AAC, OGG, and OPUS</strong> files directly from your system. File titles and artist tags are automatically formatted, song durations are calculated, and audio is ready to play immediately.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
