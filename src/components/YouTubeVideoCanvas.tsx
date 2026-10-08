import React from 'react';
import { Song } from '../types/music';
import { X, ExternalLink, Maximize2, Tv, Sparkles, Youtube } from 'lucide-react';

interface YouTubeVideoCanvasProps {
  song: Song | null;
  isPlaying: boolean;
  isOpen: boolean;
  onClose: () => void;
  isMiniPlayer?: boolean;
}

export const YouTubeVideoCanvas: React.FC<YouTubeVideoCanvasProps> = ({
  song,
  isPlaying,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !song || !song.youtubeId) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-96 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300">
      {/* Header bar */}
      <div className="px-3.5 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white">
            <Youtube size={12} />
          </div>
          <span className="text-xs font-bold text-zinc-200 truncate">
            {song.title}
          </span>
          {song.category && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {song.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={song.youtubeUrl || `https://www.youtube.com/watch?v=${song.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in YouTube"
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Embedded YouTube Player */}
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${song.youtubeId}?autoplay=${isPlaying ? '1' : '0'}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
          title={song.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>

      {/* Track & Channel Info */}
      <div className="p-3 bg-zinc-950/90 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-900">
        <div className="truncate mr-2">
          <span className="text-white font-medium">{song.artist}</span>
          {song.channelTitle && (
            <span className="text-zinc-500 ml-1.5">via {song.channelTitle}</span>
          )}
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
          YouTube Sync
        </span>
      </div>
    </div>
  );
};
