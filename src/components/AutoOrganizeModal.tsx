import React from 'react';
import { Song, Playlist } from '../types/music';
import { X, Sparkles, FolderSync, Download, Upload, Check } from 'lucide-react';

interface AutoOrganizeModalProps {
  songs: Song[];
  playlists: Playlist[];
  onAutoCreateMoodPlaylists: () => void;
  onExportLibrary: () => void;
  onClose: () => void;
}

export const AutoOrganizeModal: React.FC<AutoOrganizeModalProps> = ({
  songs,
  playlists,
  onAutoCreateMoodPlaylists,
  onExportLibrary,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <FolderSync size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Smart Library Organizer</h2>
              <p className="text-xs text-zinc-400">Automated classification & playlist management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Smart Action 1 */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-2">
                <Sparkles size={14} className="text-rose-400" />
                Auto-Generate Mood Playlists
              </span>
              <button
                onClick={() => {
                  onAutoCreateMoodPlaylists();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow"
              >
                Organize Now
              </button>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Analyzes all {songs.length} tracks and automatically clusters them into distinct smart playlists based on mood tags (e.g. &ldquo;Soulful & Passionate&rdquo;, &ldquo;Mellow & Chill&rdquo;).
            </p>
          </div>

          {/* Smart Action 2 */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-2">
                <Download size={14} className="text-purple-400" />
                Backup & Export Library Data
              </span>
              <button
                onClick={onExportLibrary}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors"
              >
                Export JSON
              </button>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Downloads a complete JSON package of your tracks, lyrics, custom playlists, and AI generated song tags.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
