import React, { useState, useEffect } from 'react';
import { Song, Playlist } from '../types/music';
import {
  Sparkles,
  X,
  Flame,
  Coffee,
  Heart,
  Headphones,
  Compass,
  Check,
  Loader2,
  Tag,
  Music2,
  FolderSync,
  Plus,
  Sliders,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  MOOD_DEFINITIONS,
  MoodTagResult,
  analyzeSongMoodWithAI,
  batchAnalyzeSongsWithAI,
  analyzeSongMoodLocally,
} from '../utils/aiMoodTagger';

interface AiMoodTaggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  targetSong?: Song | null;
  onUpdateSong: (updatedSong: Song) => void;
  onBatchUpdateSongs: (updatedSongs: Song[]) => void;
  onCreateMoodPlaylist?: (moodName: string, songIds: string[]) => void;
}

export const AiMoodTaggerModal: React.FC<AiMoodTaggerModalProps> = ({
  isOpen,
  onClose,
  songs,
  targetSong,
  onUpdateSong,
  onBatchUpdateSongs,
  onCreateMoodPlaylist,
}) => {
  const [selectedSong, setSelectedSong] = useState<Song | null>(targetSong || songs[0] || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<MoodTagResult | null>(null);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Batch analysis state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [batchCompleted, setBatchCompleted] = useState(false);

  // Sync selectedSong when targetSong prop changes
  useEffect(() => {
    if (targetSong) {
      setSelectedSong(targetSong);
    } else if (!selectedSong && songs.length > 0) {
      setSelectedSong(songs[0]);
    }
  }, [targetSong, songs]);

  // When selectedSong changes, trigger AI analysis if needed
  useEffect(() => {
    if (!selectedSong) return;

    if (selectedSong.aiMoodAnalysis?.primaryMood && selectedSong.moodLabels) {
      setActiveAnalysis({
        songId: selectedSong.id,
        primaryMood: (selectedSong.aiMoodAnalysis.primaryMood as any) || 'Relaxing',
        moodLabels: selectedSong.moodLabels,
        energyLevel: selectedSong.energyLevel || 'Medium',
        vibes: selectedSong.aiMoodAnalysis.vibes || 'Tagged via intelligent audio analysis.',
        confidence: selectedSong.aiMoodAnalysis.confidence || 0.95,
      });
      setCustomTags(selectedSong.moodLabels || []);
    } else {
      // Analyze current song
      runSingleAnalysis(selectedSong);
    }
  }, [selectedSong]);

  const runSingleAnalysis = async (song: Song) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSongMoodWithAI(song);
      setActiveAnalysis(result);
      setCustomTags(result.moodLabels || [result.primaryMood]);
    } catch {
      const localResult = analyzeSongMoodLocally(song);
      setActiveAnalysis(localResult);
      setCustomTags(localResult.moodLabels || [localResult.primaryMood]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    setCustomTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (trimmed && !customTags.includes(trimmed)) {
      setCustomTags((prev) => [...prev, trimmed]);
      setNewTagInput('');
    }
  };

  const handleSaveCurrentSongTags = () => {
    if (!selectedSong || !activeAnalysis) return;

    const updated: Song = {
      ...selectedSong,
      moodLabels: customTags,
      energyLevel: activeAnalysis.energyLevel,
      aiMoodAnalysis: {
        primaryMood: activeAnalysis.primaryMood,
        vibes: activeAnalysis.vibes,
        confidence: activeAnalysis.confidence,
        suggestedPlaylists: activeAnalysis.suggestedPlaylists,
      },
    };

    onUpdateSong(updated);
    setSelectedSong(updated);
  };

  // Run Batch Analysis for All Songs
  const handleRunBatchAutoTag = async () => {
    setIsBatchProcessing(true);
    setBatchCompleted(false);
    setBatchProgress({ current: 0, total: songs.length });

    try {
      const resultsMap = await batchAnalyzeSongsWithAI(songs, (current, total) => {
        setBatchProgress({ current, total });
      });

      const updatedList: Song[] = songs.map((s) => {
        const analysis = resultsMap.get(s.id) || analyzeSongMoodLocally(s);
        return {
          ...s,
          moodLabels: analysis.moodLabels,
          energyLevel: analysis.energyLevel,
          aiMoodAnalysis: {
            primaryMood: analysis.primaryMood,
            vibes: analysis.vibes,
            confidence: analysis.confidence,
            suggestedPlaylists: analysis.suggestedPlaylists,
          },
        };
      });

      onBatchUpdateSongs(updatedList);
      setBatchCompleted(true);

      if (selectedSong) {
        const updatedSelected = updatedList.find((s) => s.id === selectedSong.id);
        if (updatedSelected) {
          setSelectedSong(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Batch mood tagging error:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Mood counts in the library
  const moodStats = React.useMemo(() => {
    const stats: Record<string, number> = {
      Workout: 0,
      Relaxing: 0,
      Party: 0,
      Romantic: 0,
      Focus: 0,
      'Road Trip': 0,
    };

    for (const s of songs) {
      const labels = s.moodLabels || [];
      const primary = s.aiMoodAnalysis?.primaryMood;
      if (primary && stats[primary] !== undefined) {
        stats[primary]++;
      } else {
        // Check labels
        for (const [key] of Object.entries(stats)) {
          if (labels.includes(key)) {
            stats[key]++;
          }
        }
      }
    }

    return stats;
  }, [songs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-sky-500/20 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-sky-500/10 flex items-center justify-between bg-[#0b1329]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#38bdf8] flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
              <Sparkles size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  AI Song Mood Tagger
                </h2>
                <span className="text-[10px] uppercase font-bold bg-sky-500/20 text-[#38bdf8] px-2 py-0.5 rounded-full border border-sky-500/30">
                  Gemini Audio Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Analyzes song metadata, genre, tempo (BPM), and vibe to assign smart mood labels:
                Workout, Relaxing, Party, etc.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Two Column Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Quick Mood Categories & Batch Tagger */}
          <div className="md:col-span-5 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-slate-800 md:pr-6">
            {/* Batch Auto-Tagger Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-sky-500/10 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[#38bdf8]" />
                  Library Auto-Tagger
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {songs.length} Tracks
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scan your entire Bollywood library. AI will analyze genres, rhythms, and tags across
                all songs simultaneously.
              </p>

              {isBatchProcessing ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-[#38bdf8]">
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing songs...
                    </span>
                    <span className="text-slate-300">
                      {batchProgress.current} / {batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#3b82f6] to-[#38bdf8] transition-all duration-300"
                      style={{
                        width: `${
                          batchProgress.total
                            ? Math.round((batchProgress.current / batchProgress.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRunBatchAutoTag}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all hover:scale-101"
                >
                  <Sparkles size={16} />
                  <span>Analyze & Tag All {songs.length} Songs with AI</span>
                </button>
              )}

              {batchCompleted && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>All songs successfully tagged with mood labels!</span>
                </div>
              )}
            </div>

            {/* Mood Category Presets & Quick Stats */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Mood Labels & Library Stats
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MOOD_DEFINITIONS).map(([key, def]) => {
                  const count = moodStats[key] || 0;
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-[#202020] border border-zinc-800/80 hover:border-zinc-700 flex flex-col justify-between transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${def.bgBadge} ${def.textBadge} ${def.borderBadge}`}
                        >
                          {def.name}
                        </span>
                        <span className="text-xs font-bold text-zinc-300">{count}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2">
                        {def.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Song Picker Dropdown / Selector */}
            <div className="space-y-1.5 mt-auto">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Select Song to Inspect & Tag
              </label>
              <select
                value={selectedSong?.id || ''}
                onChange={(e) => {
                  const song = songs.find((s) => s.id === e.target.value);
                  if (song) setSelectedSong(song);
                }}
                className="w-full px-3 py-2 bg-[#222] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#1db954]"
              >
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {s.artist} ({s.category?.toUpperCase() || 'REGULAR'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Song Inspector & Interactive Mood Labels */}
          <div className="md:col-span-7 flex flex-col gap-5">
            {selectedSong ? (
              <>
                {/* Song Meta Header Card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#202020] border border-zinc-800">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg bg-black shrink-0 relative group">
                    <img
                      src={selectedSong.coverUrl}
                      alt={selectedSong.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-white truncate">
                        {selectedSong.title}
                      </span>
                      {selectedSong.category && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {selectedSong.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{selectedSong.artist}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                      <span>Genre: <b className="text-zinc-200">{selectedSong.genre}</b></span>
                      <span>•</span>
                      <span>Tempo: <b className="text-[#38bdf8]">{selectedSong.bpm} BPM</b></span>
                      <span>•</span>
                      <span>Year: <b className="text-slate-200">{selectedSong.year}</b></span>
                    </div>
                  </div>
                  <button
                    onClick={() => runSingleAnalysis(selectedSong)}
                    disabled={isAnalyzing}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Re-run AI Analysis"
                  >
                    <Sparkles size={16} className={isAnalyzing ? 'animate-spin text-[#38bdf8]' : ''} />
                  </button>
                </div>

                {/* AI Analysis Result Card */}
                {isAnalyzing ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-[#38bdf8]" />
                    <p className="text-xs font-semibold">
                      Analyzing metadata, tempo, and genre with Gemini...
                    </p>
                  </div>
                ) : activeAnalysis ? (
                  <>
                    {/* Primary Mood & Energy Level */}
                    <div className="p-4 rounded-2xl bg-[#222] border border-zinc-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            Suggested Primary Mood
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-sm font-black px-3 py-1 rounded-full border ${
                                MOOD_DEFINITIONS[activeAnalysis.primaryMood]?.bgBadge || 'bg-emerald-500/20'
                              } ${
                                MOOD_DEFINITIONS[activeAnalysis.primaryMood]?.textBadge || 'text-emerald-400'
                              } ${
                                MOOD_DEFINITIONS[activeAnalysis.primaryMood]?.borderBadge || 'border-emerald-500/30'
                              }`}
                            >
                              {activeAnalysis.primaryMood}
                            </span>
                            <span className="text-xs text-zinc-400">
                              Confidence: {Math.round((activeAnalysis.confidence || 0.95) * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            Energy Level
                          </span>
                          <div className="mt-0.5">
                            <span
                              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                                activeAnalysis.energyLevel === 'Extreme' ||
                                activeAnalysis.energyLevel === 'High'
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  : activeAnalysis.energyLevel === 'Medium'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              ⚡ {activeAnalysis.energyLevel} Energy
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-xs text-zinc-300 leading-relaxed italic">
                        &ldquo;{activeAnalysis.vibes}&rdquo;
                      </div>
                    </div>

                    {/* Interactive Mood Labels Pill Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Tag size={14} className="text-[#38bdf8]" />
                          Active Mood Labels (Click to toggle)
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {customTags.length} labels selected
                        </span>
                      </div>

                      {/* Common Preset Mood Pills */}
                      <div className="flex flex-wrap gap-2">
                        {['Workout', 'Relaxing', 'Party', 'Romantic', 'Focus', 'Road Trip', 'High Energy', 'Club Remix', 'Lo-Fi Chill'].map(
                          (mood) => {
                            const isSelected = customTags.includes(mood);
                            return (
                              <button
                                key={mood}
                                type="button"
                                onClick={() => handleToggleTag(mood)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#38bdf8] text-slate-950 shadow-md shadow-sky-500/20 scale-102'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {isSelected && <Check size={13} className="stroke-[3]" />}
                                <span>{mood}</span>
                              </button>
                            );
                          }
                        )}
                      </div>

                      {/* Add Custom Mood Tag Input */}
                      <form onSubmit={handleAddCustomTag} className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Add custom mood tag (e.g. Cardio Fuel, Midnight Melancholy)..."
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                        />
                        <button
                          type="submit"
                          disabled={!newTagInput.trim()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </form>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                      <button
                        onClick={handleSaveCurrentSongTags}
                        className="px-5 py-2.5 bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-extrabold text-xs rounded-full shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all hover:scale-102"
                      >
                        <Check size={16} />
                        <span>Save & Apply Mood Tags to Song</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <div className="py-20 text-center text-slate-500 text-xs">
                Select a song to inspect its mood analysis.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
