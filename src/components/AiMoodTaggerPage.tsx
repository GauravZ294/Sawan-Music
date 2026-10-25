import React, { useState, useEffect } from 'react';
import { Song } from '../types/music';
import {
  Sparkles,
  Flame,
  Coffee,
  Heart,
  Headphones,
  Compass,
  Check,
  Loader2,
  Tag,
  TrendingUp,
  Plus,
  ArrowLeft,
  Search,
} from 'lucide-react';
import {
  MOOD_DEFINITIONS,
  MoodTagResult,
  analyzeSongMoodWithAI,
  batchAnalyzeSongsWithAI,
  analyzeSongMoodLocally,
} from '../utils/aiMoodTagger';

interface AiMoodTaggerPageProps {
  songs: Song[];
  targetSong?: Song | null;
  onUpdateSong: (updatedSong: Song) => void;
  onBatchUpdateSongs: (updatedSongs: Song[]) => void;
  onGoHome: () => void;
}

export const AiMoodTaggerPage: React.FC<AiMoodTaggerPageProps> = ({
  songs,
  targetSong,
  onUpdateSong,
  onBatchUpdateSongs,
  onGoHome,
}) => {
  const [selectedSong, setSelectedSong] = useState<Song | null>(targetSong || songs[0] || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<MoodTagResult | null>(null);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [songSearch, setSongSearch] = useState('');

  // Batch analysis state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [batchCompleted, setBatchCompleted] = useState(false);

  useEffect(() => {
    if (targetSong) {
      setSelectedSong(targetSong);
    } else if (!selectedSong && songs.length > 0) {
      setSelectedSong(songs[0]);
    }
  }, [targetSong, songs]);

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
        for (const [key] of Object.entries(stats)) {
          if (labels.includes(key)) {
            stats[key]++;
          }
        }
      }
    }

    return stats;
  }, [songs]);

  const filteredSongsList = React.useMemo(() => {
    if (!songSearch.trim()) return songs;
    const query = songSearch.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        (s.album || '').toLowerCase().includes(query)
    );
  }, [songs, songSearch]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Back Button & Header Banner */}
      <button
        type="button"
        onClick={onGoHome}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Home
      </button>

      {/* Hero Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-sky-950/70 via-slate-900 to-[#0b1329] border border-sky-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold tracking-wide border border-sky-500/30">
              <Sparkles size={14} />
              AI Musicology & Audio Intelligence
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              AI Song Mood Tagger
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Analyzes song metadata, genre, tempo BPM, and musical vibe using Google Gemma 4 31B AI model to assign intelligent mood tags across your library.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-lg font-black text-sky-400">{songs.length}</div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Total Songs</div>
            </div>
            <div className="text-center px-3">
              <div className="text-lg font-black text-amber-400">
                {songs.filter((s) => s.moodLabels && s.moodLabels.length > 0).length}
              </div>
              <div className="text-slate-400 text-[10px] uppercase font-bold">Tagged Songs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Page Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Batch Auto-Tagger & Library Mood Stats */}
        <div className="lg:col-span-5 space-y-6">
          {/* Batch Auto-Tagger Card */}
          <div className="p-5 rounded-2xl bg-[#0f172a] border border-sky-500/20 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={16} className="text-[#38bdf8]" />
                Library Auto-Tagger
              </span>
              <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                {songs.length} Tracks
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Scan your entire song catalog simultaneously. AI analyzes genres, rhythms, and tempo to auto-assign primary moods and tags.
            </p>

            {isBatchProcessing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-[#38bdf8]">
                    <Loader2 size={14} className="animate-spin" />
                    Analyzing songs with Gemma AI...
                  </span>
                  <span className="text-slate-300 font-mono">
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
                type="button"
                onClick={handleRunBatchAutoTag}
                className="w-full py-3 px-4 rounded-xl bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.01]"
              >
                <Sparkles size={16} />
                <span>Analyze & Auto-Tag All {songs.length} Songs with AI</span>
              </button>
            )}

            {batchCompleted && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>All songs successfully tagged with mood labels!</span>
              </div>
            )}
          </div>

          {/* Library Mood Stats Grid */}
          <div className="p-5 rounded-2xl bg-[#0f172a] border border-sky-500/10 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Library Mood Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(MOOD_DEFINITIONS).map(([key, def]) => {
                const count = moodStats[key] || 0;
                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${def.bgBadge} ${def.textBadge} ${def.borderBadge}`}
                      >
                        {def.name}
                      </span>
                      <span className="text-xs font-black text-white font-mono">{count}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                      {def.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Song Selector List with Search */}
          <div className="p-5 rounded-2xl bg-[#0f172a] border border-sky-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Select Song to Inspect
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{filteredSongsList.length} shown</span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                placeholder="Search song or artist..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#38bdf8]"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-900/50">
              {filteredSongsList.map((s) => {
                const isSelected = selectedSong?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSong(s)}
                    className={`w-full p-2.5 text-left flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-sky-500/15 text-white' : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <img src={s.coverUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#38bdf8]' : 'text-white'}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{s.artist}</p>
                    </div>
                    {s.aiMoodAnalysis?.primaryMood && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 shrink-0">
                        {s.aiMoodAnalysis.primaryMood}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Song Inspector & Interactive Mood Tagger */}
        <div className="lg:col-span-7 space-y-6">
          {selectedSong ? (
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-sky-500/20 shadow-xl space-y-6">
              {/* Song Meta Header Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg bg-slate-950 shrink-0 relative group">
                  <img
                    src={selectedSong.coverUrl}
                    alt={selectedSong.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white truncate">
                      {selectedSong.title}
                    </span>
                    {selectedSong.category && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {selectedSong.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{selectedSong.artist}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span>Genre: <b className="text-slate-200">{selectedSong.genre}</b></span>
                    <span>•</span>
                    <span>Tempo: <b className="text-[#38bdf8]">{selectedSong.bpm} BPM</b></span>
                    <span>•</span>
                    <span>Year: <b className="text-slate-200">{selectedSong.year}</b></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => runSingleAnalysis(selectedSong)}
                  disabled={isAnalyzing}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Re-run AI Analysis"
                >
                  <Sparkles size={18} className={isAnalyzing ? 'animate-spin text-[#38bdf8]' : ''} />
                </button>
              </div>

              {/* AI Analysis Result Card */}
              {isAnalyzing ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <Loader2 size={32} className="animate-spin text-[#38bdf8]" />
                  <p className="text-xs font-semibold">
                    Analyzing musical tempo, lyrics, and vibe with Gemma AI...
                  </p>
                </div>
              ) : activeAnalysis ? (
                <>
                  {/* Primary Mood & Energy Level */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          AI Suggested Primary Mood
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-sm font-black px-3.5 py-1 rounded-full border ${
                              MOOD_DEFINITIONS[activeAnalysis.primaryMood]?.bgBadge || 'bg-sky-500/20'
                            } ${
                              MOOD_DEFINITIONS[activeAnalysis.primaryMood]?.textBadge || 'text-sky-300'
                            } ${
                              MOOD_DEFINITIONS[activeAnalysis.primaryMood]?.borderBadge || 'border-sky-500/30'
                            }`}
                          >
                            {activeAnalysis.primaryMood}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Confidence: {Math.round((activeAnalysis.confidence || 0.95) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Energy Level
                        </span>
                        <div className="mt-1">
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                              activeAnalysis.energyLevel === 'Extreme' ||
                              activeAnalysis.energyLevel === 'High'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : activeAnalysis.energyLevel === 'Medium'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            ⚡ {activeAnalysis.energyLevel} Energy
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed italic">
                      &ldquo;{activeAnalysis.vibes}&rdquo;
                    </div>
                  </div>

                  {/* Interactive Mood Labels Pill Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                        <Tag size={15} className="text-[#38bdf8]" />
                        Active Mood Labels (Click to toggle)
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">
                        {customTags.length} labels active
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
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#38bdf8] text-slate-950 shadow-md shadow-sky-500/20 scale-102 font-extrabold'
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
                        className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-[#38bdf8]"
                      />
                      <button
                        type="submit"
                        disabled={!newTagInput.trim()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Add Tag</span>
                      </button>
                    </form>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleSaveCurrentSongTags}
                      className="px-6 py-3 bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-extrabold text-xs rounded-full shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <Check size={16} />
                      <span>Save & Apply Mood Tags to Song</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs bg-[#0f172a] rounded-2xl border border-sky-500/10">
              Select a song from the left list to inspect its mood analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
