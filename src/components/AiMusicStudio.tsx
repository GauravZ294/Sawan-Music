import React, { useState } from 'react';
import { Song } from '../types/music';
import {
  Sparkles,
  Music,
  Mic2,
  Wand2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Flame,
  Music2,
  ListMusic,
  Search,
} from 'lucide-react';

interface AiMusicStudioProps {
  songs: Song[];
  onSongCreated: (newSong: Song) => void;
  onPlaySong: (song: Song) => void;
}

export const AiMusicStudio: React.FC<AiMusicStudioProps> = ({
  songs,
  onSongCreated,
  onPlaySong,
}) => {
  const [activeTab, setActiveTab] = useState<'lyria' | 'singing' | 'analysis'>('lyria');

  // Song selection state
  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0]?.id || '');

  // Lyria Generation States
  const [lyriaModel, setLyriaModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [lyriaTitle, setLyriaTitle] = useState(songs[0] ? `${songs[0].title} (AI Remake)` : 'Bollywood AI Romance');
  const [lyriaPrompt, setLyriaPrompt] = useState(
    'Heartfelt romantic Bollywood acoustic ballad in D minor, emotive nylon guitar arpeggios, soulful bansuri flute melodies, gentle tabla rhythm, warm cinematic strings.'
  );
  const [useUserLyricsForLyria, setUseUserLyricsForLyria] = useState(true);
  const [lyriaGenre, setLyriaGenre] = useState(songs[0]?.genre || 'Bollywood Romance');
  const [lyriaMood, setLyriaMood] = useState(songs[0]?.mood || 'Soulful & Passionate');
  const [isGeneratingLyria, setIsGeneratingLyria] = useState(false);
  const [lyriaError, setLyriaError] = useState<string | null>(null);

  // Vocal Singing States
  const [singingLyrics, setSingingLyrics] = useState<string>(songs[0]?.lyrics || 'तू ही ये मुझको बता दे, चाहूँ मैं या ना...');
  const [vocalVoice, setVocalVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [vocalStyle, setVocalStyle] = useState(
    'Soulful, passionate romantic singing performance of Hindi song lyrics, melodious and heartfelt'
  );
  const [isSynthesizingVocal, setIsSynthesizingVocal] = useState(false);
  const [vocalError, setVocalError] = useState<string | null>(null);

  // Analysis States
  const [analysisText, setAnalysisText] = useState<string>(songs[0]?.lyrics || 'तू ही ये मुझको बता दे, चाहूँ मैं या ना...');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Success feedback state
  const [lastCreatedSong, setLastCreatedSong] = useState<Song | null>(null);

  // Fetch original song lyrics & details when song selected
  const handleSelectSongForLyrics = (songId: string) => {
    const matched = songs.find((s) => s.id === songId);
    if (!matched) return;

    setSelectedSongId(matched.id);
    setLyriaTitle(`${matched.title} (AI Remake)`);
    setLyriaGenre(matched.genre || 'Bollywood Romance');
    setLyriaMood(matched.mood || 'Soulful & Passionate');

    if (matched.lyrics) {
      setSingingLyrics(matched.lyrics);
      setAnalysisText(matched.lyrics);
    }
  };

  // Handle Lyria / AI Generation
  const handleGenerateLyria = async () => {
    setIsGeneratingLyria(true);
    setLyriaError(null);
    setLastCreatedSong(null);

    try {
      const response = await fetch('/api/music/generate-lyria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lyriaPrompt,
          title: lyriaTitle,
          genre: lyriaGenre,
          mood: lyriaMood,
          lyricsPrompt: useUserLyricsForLyria ? singingLyrics : '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate music with AI.');
      }

      const generatedLyrics = data.generatedLyrics || data.lyricsDevanagari || singingLyrics;

      const newSong: Song = {
        id: `ai-lyrics-${Date.now()}`,
        title: data.title || lyriaTitle,
        titleDevanagari: data.titleDevanagari || 'एआई संगीत रचना',
        artist: data.artistStyle || 'Sawan AI Lyricist & Composer',
        album: 'AI Studio Masterpieces',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: 180,
        genre: data.genre || lyriaGenre,
        year: 2026,
        mood: data.mood || lyriaMood,
        bpm: data.bpm || 78,
        lyrics: generatedLyrics,
        isFavorite: true,
        playlistIds: ['romantic-hits'],
        dateAdded: new Date().toISOString().split('T')[0],
        playCount: 1,
        aiGenerated: true,
        modelUsed: data.modelUsed || 'google/gemma-4-31b-it',
        themeNotes: data.compositionNotes || `Generated with AI. Prompt: "${lyriaPrompt.slice(0, 100)}..."`,
      };

      onSongCreated(newSong);
      setLastCreatedSong(newSong);
      onPlaySong(newSong);
    } catch (err: any) {
      console.error(err);
      setLyriaError(err?.message || 'Error occurred while generating track.');
    } finally {
      setIsGeneratingLyria(false);
    }
  };

  // Handle Vocal Singing Synthesis
  const handleSynthesizeVocal = async () => {
    setIsSynthesizingVocal(true);
    setVocalError(null);
    setLastCreatedSong(null);

    try {
      const response = await fetch('/api/music/sing-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: singingLyrics.slice(0, 1200),
          voice: vocalVoice,
          style: vocalStyle,
          language: 'hi-IN',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize singing audio.');
      }

      const selectedTrack = songs.find((s) => s.id === selectedSongId);
      const newSong: Song = {
        id: `vocal-singing-${Date.now()}`,
        title: selectedTrack ? `${selectedTrack.title} (${vocalVoice} AI Vocal)` : `AI Vocal Singing (${vocalVoice})`,
        titleDevanagari: selectedTrack ? `${selectedTrack.titleDevanagari || selectedTrack.title} (एआई स्वर)` : 'एआई गायकी स्वर',
        artist: `Sawan Music AI Voice (${vocalVoice})`,
        album: 'AI Vocal Renditions',
        coverUrl: selectedTrack?.coverUrl || 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
        duration: selectedTrack?.duration || 120,
        genre: selectedTrack?.genre || 'Bollywood Vocal',
        year: 2026,
        mood: selectedTrack?.mood || 'Soulful & Passionate',
        bpm: selectedTrack?.bpm || 78,
        lyrics: singingLyrics,
        isFavorite: true,
        playlistIds: ['romantic-hits'],
        dateAdded: new Date().toISOString().split('T')[0],
        playCount: 1,
        aiGenerated: true,
        modelUsed: data.modelUsed || 'google/gemma-4-31b-it',
        themeNotes: `Sung in Hindi with AI voice "${vocalVoice}". ${data.performanceSummary || ''}`,
      };

      onSongCreated(newSong);
      setLastCreatedSong(newSong);
      onPlaySong(newSong);
    } catch (err: any) {
      console.error(err);
      setVocalError(err?.message || 'Error occurred while synthesizing singing audio.');
    } finally {
      setIsSynthesizingVocal(false);
    }
  };

  // Handle Lyrics Analysis
  const handleAnalyzeSong = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const selectedTrack = songs.find((s) => s.id === selectedSongId);
      const response = await fetch('/api/music/analyze-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: analysisText,
          songName: selectedTrack?.title || 'Selected Track',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze lyrics.');
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-sky-950/80 via-slate-900 to-[#0b1329] border border-sky-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold tracking-wide border border-sky-500/30">
              <Sparkles size={14} />
              AI Lyrics & Musicology Engine
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Sawan AI Lyricist & Music Studio
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              Select any song from your catalog to fetch its original lyrics, then generate, remix, or analyze lyrics using <span className="text-[#38bdf8] font-mono text-xs font-bold">google/gemma-4-31b-it</span> AI.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('lyria')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'lyria'
                  ? 'bg-[#38bdf8] text-slate-950 shadow-lg shadow-sky-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music size={14} />
              AI Lyrics
            </button>
            <button
              onClick={() => setActiveTab('singing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'singing'
                  ? 'bg-[#38bdf8] text-slate-950 shadow-lg shadow-sky-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic2 size={14} />
              AI Vocal Guide
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'analysis'
                  ? 'bg-[#38bdf8] text-slate-950 shadow-lg shadow-sky-500/20 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wand2 size={14} />
              Lyrics Sync
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner if song was generated */}
      {lastCreatedSong && (
        <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-sky-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-sky-200">
                AI Track Generated & Saved to Library!
              </p>
              <p className="text-xs text-sky-400/80">
                &ldquo;{lastCreatedSong.title}&rdquo; is now saved in your library and ready to play.
              </p>
            </div>
          </div>
          <button
            onClick={() => onPlaySong(lastCreatedSong)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38bdf8] text-slate-950 text-xs font-bold hover:bg-sky-300 transition-colors shadow"
          >
            <Play size={13} fill="currentColor" /> Play Now
          </button>
        </div>
      )}

      {/* SELECT SONG FROM LIBRARY DROPDOWN (Primary User Feature) */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-sky-500/20 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="select-song-lyrics" className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ListMusic size={16} className="text-[#38bdf8]" />
            Select Song from Library to Fetch Original Lyrics
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            {songs.length} catalog tracks available
          </span>
        </div>

        <select
          id="select-song-lyrics"
          value={selectedSongId}
          onChange={(e) => handleSelectSongForLyrics(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#38bdf8] transition-colors"
        >
          {songs.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#0f172a] text-white py-1">
              {s.title} — {s.artist} ({s.album || 'Single'})
            </option>
          ))}
        </select>
      </div>

      {/* TAB 1: AI Lyrics Generation */}
      {activeTab === 'lyria' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main AI Generator Form */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-sky-500/10 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Music size={18} className="text-[#38bdf8]" />
                Generate & Remix Lyrics with Gemma 4 31B
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Utilizes Google Gemma 4 31B AI model to craft original Hindi/English poetic lyrics, verses, and chord arrangements.
              </p>
            </div>

            {/* Track Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Track Title</label>
              <input
                type="text"
                value={lyriaTitle}
                onChange={(e) => setLyriaTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#38bdf8] transition-colors"
                placeholder="e.g. Tum Hi Ho (AI Acoustic Remake)"
              />
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Composition Prompt & Style Guidance</label>
                <span className="text-[11px] text-slate-500">Language Prompt</span>
              </div>
              <textarea
                rows={3}
                value={lyriaPrompt}
                onChange={(e) => setLyriaPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-[#38bdf8] transition-colors leading-relaxed"
                placeholder="Describe theme, mood, instruments, rhythm, and lyrical story..."
              />
            </div>

            {/* Style presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Quick Style Presets</label>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    name: 'Bollywood Romance (Aashiqui)',
                    prompt: 'Heartfelt romantic Bollywood acoustic ballad in D minor, emotive nylon guitar arpeggios, soulful bansuri flute melodies, gentle tabla rhythm, warm cinematic strings.',
                    genre: 'Bollywood Romance',
                    mood: 'Soulful & Passionate',
                  },
                  {
                    name: 'Sufi Fusion & Acoustic',
                    prompt: 'Soulful Sufi acoustic fusion with dynamic acoustic strums, harmonium drone, passionate melodic lead, rhythmic dholak and electric bass.',
                    genre: 'Sufi Fusion',
                    mood: 'Spiritual & Intense',
                  },
                  {
                    name: 'Midnight Monsoon Lo-Fi',
                    prompt: 'Lo-fi chill Indian classical beat, rain sound effects, mellow bansuri flute improvisation, vinyl crackle, warm rhodes piano chords.',
                    genre: 'Lo-Fi Classical',
                    mood: 'Mellow & Nostalgic',
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setLyriaPrompt(preset.prompt);
                      setLyriaGenre(preset.genre);
                      setLyriaMood(preset.mood);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle to include original lyrics */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <input
                type="checkbox"
                id="lyrics-checkbox"
                checked={useUserLyricsForLyria}
                onChange={(e) => setUseUserLyricsForLyria(e.target.checked)}
                className="rounded accent-[#38bdf8] w-4 h-4 cursor-pointer"
              />
              <label htmlFor="lyrics-checkbox" className="text-xs text-slate-300 cursor-pointer">
                Incorporate fetched original lyrics into AI composition context
              </label>
            </div>

            {lyriaError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <p className="text-rose-200/90 leading-relaxed">{lyriaError}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleGenerateLyria}
              disabled={isGeneratingLyria}
              className="w-full py-3.5 rounded-xl bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-extrabold text-sm shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isGeneratingLyria ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating AI Lyrics with Gemma 4 31B...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate AI Song Lyrics & Composition
                </>
              )}
            </button>
          </div>

          {/* Side Info & Fetched Original Lyrics Display */}
          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-sky-500/10 rounded-2xl p-5 backdrop-blur-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Flame size={14} className="text-[#38bdf8]" />
                Fetched Original Lyrics
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                {songs.find((s) => s.id === selectedSongId)?.title || 'Current Song'}
              </p>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 max-h-80 overflow-y-auto">
                <p className="font-devanagari text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {singingLyrics || 'Select a song from above to load its lyrics.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Vocal Singing Synthesis */}
      {activeTab === 'singing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f172a] border border-sky-500/10 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Mic2 size={18} className="text-[#38bdf8]" />
                Sing Original Hindi Lyrics (AI Vocal Guide)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generates a melodic vocal performance guide for the fetched original song lyrics using AI vocal phrasing.
              </p>
            </div>

            {/* Lyrics Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Original Hindi Lyrics (Devanagari)
                </label>
                <button
                  onClick={() => {
                    const matched = songs.find((s) => s.id === selectedSongId);
                    if (matched?.lyrics) setSingingLyrics(matched.lyrics);
                  }}
                  className="text-[11px] text-[#38bdf8] hover:underline"
                >
                  Reload Original Lyrics
                </button>
              </div>
              <textarea
                rows={6}
                value={singingLyrics}
                onChange={(e) => setSingingLyrics(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-devanagari text-sm text-slate-100 focus:outline-none focus:border-[#38bdf8] transition-colors leading-relaxed"
                placeholder="Selected song lyrics will appear here..."
              />
            </div>

            {/* Vocalist Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Singer Persona
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Kore', label: 'Kore', desc: 'Soulful Female Romantic', tag: 'Romantic' },
                  { id: 'Puck', label: 'Puck', desc: 'Emotive Acoustic Male', tag: 'Acoustic' },
                  { id: 'Charon', label: 'Charon', desc: 'Deep Resonant Sufi', tag: 'Ghazal' },
                  { id: 'Zephyr', label: 'Zephyr', desc: 'Contemporary Melodic', tag: 'Pop' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVocalVoice(v.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      vocalVoice === v.id
                        ? 'border-[#38bdf8] bg-sky-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#38bdf8]">{v.label}</div>
                    <div className="text-[10px] text-slate-300 font-medium mt-0.5">{v.desc}</div>
                    <div className="text-[9px] text-slate-500 mt-1">{v.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {vocalError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <p>{vocalError}</p>
              </div>
            )}

            <button
              onClick={handleSynthesizeVocal}
              disabled={isSynthesizingVocal}
              className="w-full py-3.5 rounded-xl bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-extrabold text-sm shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSynthesizingVocal ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating AI Vocal Performance...
                </>
              ) : (
                <>
                  <Mic2 size={16} />
                  Synthesize Song Performance with {vocalVoice} Voice
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-sky-500/10 rounded-2xl p-5 backdrop-blur-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Vocal Phrasing Guide
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you click <span className="text-[#38bdf8] font-semibold">&ldquo;Synthesize Song Performance&rdquo;</span>, the original lyrics are processed through Gemma 4 31B audio phonetics for realistic vocal cadence and pitch structure.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Song Analysis & Automatic Karaoke Sync */}
      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0f172a] border border-sky-500/10 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wand2 size={18} className="text-[#38bdf8]" />
                Analyze Lyrics & Generate Karaoke Timestamps
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Uses Gemma 4 31B to parse song lyrics, interpret poetic sentiment, and generate synchronized karaoke timestamps.
              </p>
            </div>

            <textarea
              rows={8}
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-devanagari text-sm text-slate-100 focus:outline-none focus:border-[#38bdf8] transition-colors leading-relaxed"
              placeholder="Fetched song lyrics appear here..."
            />

            <button
              onClick={handleAnalyzeSong}
              disabled={isAnalyzing}
              className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing Lyrics with Gemma 4 31B...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Analyze Lyrics & Timings
                </>
              )}
            </button>

            {analysisResult && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <h3 className="text-sm font-bold text-[#38bdf8]">Analysis Output:</h3>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <p><strong>Title:</strong> {analysisResult.title}</p>
                  <p><strong>Key & BPM:</strong> {analysisResult.keySignature} • {analysisResult.bpm} BPM</p>
                  <p><strong>Mood & Genre:</strong> {analysisResult.mood} • {analysisResult.genre}</p>
                  <p><strong>Theme Interpretation:</strong> {analysisResult.themeAnalysis}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0f172a] border border-sky-500/10 rounded-2xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Karaoke Sync Engine
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every timed line includes Devanagari text, Romanized Hinglish phonetics, and English translation, enabling live interactive karaoke.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
