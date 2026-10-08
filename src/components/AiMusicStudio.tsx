import React, { useState } from 'react';
import { Song } from '../types/music';
import { USER_REQUESTED_LYRICS } from '../data/initialLibrary';
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
  Layers,
  Flame,
  Radio,
  FileMusic,
} from 'lucide-react';

interface AiMusicStudioProps {
  onSongCreated: (newSong: Song) => void;
  onPlaySong: (song: Song) => void;
}

export const AiMusicStudio: React.FC<AiMusicStudioProps> = ({
  onSongCreated,
  onPlaySong,
}) => {
  const [activeTab, setActiveTab] = useState<'lyria' | 'singing' | 'analysis'>('lyria');

  // Lyria Generation States
  const [lyriaModel, setLyriaModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [lyriaTitle, setLyriaTitle] = useState('Chahun Main Ya Naa (Lyria Romantic Acoustic)');
  const [lyriaPrompt, setLyriaPrompt] = useState(
    'Heartfelt romantic Bollywood acoustic ballad in D minor, emotive nylon guitar arpeggios, soulful bansuri flute melodies, gentle tabla rhythm, warm cinematic strings.'
  );
  const [useUserLyricsForLyria, setUseUserLyricsForLyria] = useState(true);
  const [lyriaGenre, setLyriaGenre] = useState('Bollywood Romance');
  const [lyriaMood, setLyriaMood] = useState('Soulful & Passionate');
  const [isGeneratingLyria, setIsGeneratingLyria] = useState(false);
  const [lyriaError, setLyriaError] = useState<string | null>(null);

  // Vocal Singing States (Hindi Lyrics Singing via Gemini TTS)
  const [singingLyrics, setSingingLyrics] = useState(USER_REQUESTED_LYRICS);
  const [vocalVoice, setVocalVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [vocalStyle, setVocalStyle] = useState(
    'Soulful, passionate romantic singing performance of Hindi song lyrics, melodious and heartfelt'
  );
  const [isSynthesizingVocal, setIsSynthesizingVocal] = useState(false);
  const [vocalError, setVocalError] = useState<string | null>(null);

  // Analysis States
  const [analysisText, setAnalysisText] = useState(USER_REQUESTED_LYRICS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Success feedback state
  const [lastCreatedSong, setLastCreatedSong] = useState<Song | null>(null);

  // Handle Lyria Generation
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
          model: lyriaModel,
          title: lyriaTitle,
          genre: lyriaGenre,
          mood: lyriaMood,
          lyricsPrompt: useUserLyricsForLyria ? singingLyrics : '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate music with Lyria.');
      }

      const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      const newSong: Song = {
        id: `lyria-${Date.now()}`,
        title: lyriaTitle,
        titleDevanagari: 'चाहूँ मैं या ना (लिरिया वर्ज़न)',
        artist: lyriaModel === 'lyria-3-pro-preview' ? 'Lyria Pro AI Orchestra' : 'Lyria 3 Clip AI',
        album: 'AI Studio Masterpieces',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: lyriaModel === 'lyria-3-clip-preview' ? 30 : 180,
        genre: lyriaGenre,
        year: 2026,
        mood: lyriaMood,
        bpm: 78,
        lyrics: data.generatedLyrics || singingLyrics,
        audioSrc: audioSrc,
        isFavorite: true,
        playlistIds: ['lyria-creations', 'romantic-hits'],
        dateAdded: new Date().toISOString().split('T')[0],
        playCount: 1,
        aiGenerated: true,
        modelUsed: lyriaModel,
        themeNotes: `Generated with Google ${lyriaModel}. Prompt: "${lyriaPrompt.slice(0, 100)}..."`,
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
          lyrics: singingLyrics.slice(0, 1200), // First major portion of lyrics
          voice: vocalVoice,
          style: vocalStyle,
          language: 'hi-IN',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize singing audio.');
      }

      const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      const newSong: Song = {
        id: `vocal-singing-${Date.now()}`,
        title: `Chahun Main Ya Naa (${vocalVoice} Vocal Singing)`,
        titleDevanagari: `चाहूँ मैं या ना (${vocalVoice} गायकी)`,
        artist: `SwarSync AI Voice (${vocalVoice})`,
        artistDevanagari: `स्वरसिंक एआई आवाज़ (${vocalVoice})`,
        album: 'Aashiqui 2 - AI Vocal Renditions',
        coverUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
        duration: 90,
        genre: 'Bollywood Romance / Vocal Solo',
        year: 2026,
        mood: 'Soulful & Passionate',
        bpm: 78,
        lyrics: singingLyrics,
        audioSrc: audioSrc,
        isFavorite: true,
        playlistIds: ['romantic-hits'],
        dateAdded: new Date().toISOString().split('T')[0],
        playCount: 1,
        aiGenerated: true,
        modelUsed: 'gemini-3.8-flash-lite-tts (Singing Mode)',
        themeNotes: `Sung in Hindi with AI voice "${vocalVoice}". Full lyrics vocalized with emotional nuance.`,
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
      const response = await fetch('/api/music/analyze-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: analysisText,
          songName: 'Chahun Main Ya Naa',
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
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-rose-950/70 via-purple-950/40 to-zinc-900 border border-rose-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold tracking-wide border border-rose-500/30">
              <Sparkles size={14} />
              AI Music & Singing Generation Engine
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-display">
              SwarSync Creative Studio
            </h1>
            <p className="text-zinc-300 text-sm md:text-base max-w-xl">
              Sing Hindi lyrics using AI vocal synthesis or compose brand new music tracks with Google Lyria models (<span className="text-rose-400 font-mono text-xs">lyria-3-clip-preview</span> and <span className="text-rose-400 font-mono text-xs">lyria-3-pro-preview</span>).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('lyria')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'lyria'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Music size={14} />
              Lyria Music AI
            </button>
            <button
              onClick={() => setActiveTab('singing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'singing'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Mic2 size={14} />
              Sing Hindi Lyrics
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'analysis'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wand2 size={14} />
              Lyrics & Sync
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner if song was generated */}
      {lastCreatedSong && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                Track Generated & Added to Library!
              </p>
              <p className="text-xs text-emerald-400/80">
                &ldquo;{lastCreatedSong.title}&rdquo; is now playing and saved in your library playlists.
              </p>
            </div>
          </div>
          <button
            onClick={() => onPlaySong(lastCreatedSong)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors shadow"
          >
            <Play size={13} fill="currentColor" /> Play Now
          </button>
        </div>
      )}

      {/* TAB 1: Lyria Generation */}
      {activeTab === 'lyria' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Lyria Generator Form */}
          <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Music size={18} className="text-rose-400" />
                Generate Music with Lyria
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Utilizes Google Lyria audio models to create original musical compositions from natural language instructions.
              </p>
            </div>

            {/* Model Selector: Clip vs Pro */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Lyria Model
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLyriaModel('lyria-3-clip-preview')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    lyriaModel === 'lyria-3-clip-preview'
                      ? 'border-rose-500 bg-rose-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-rose-400">Lyria 3 Clip</span>
                    <span className="text-[10px] bg-rose-950 px-2 py-0.5 rounded text-rose-300">Up to 30s</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">lyria-3-clip-preview</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Fast, expressive previews and song motifs.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setLyriaModel('lyria-3-pro-preview')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    lyriaModel === 'lyria-3-pro-preview'
                      ? 'border-rose-500 bg-rose-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-400">Lyria 3 Pro</span>
                    <span className="text-[10px] bg-purple-950 px-2 py-0.5 rounded text-purple-300">Full Track</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">lyria-3-pro-preview</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Full-length master track production.</p>
                </button>
              </div>
            </div>

            {/* Track Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Track Title</label>
              <input
                type="text"
                value={lyriaTitle}
                onChange={(e) => setLyriaTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="e.g. Chahun Main Ya Naa (Acoustic Redux)"
              />
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Composition Prompt & Instrumentation</label>
                <span className="text-[11px] text-zinc-500">English prompt</span>
              </div>
              <textarea
                rows={3}
                value={lyriaPrompt}
                onChange={(e) => setLyriaPrompt(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-colors leading-relaxed"
                placeholder="Describe instruments, tempo, mood, chord progressions..."
              />
            </div>

            {/* Style presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Quick Style Presets</label>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    name: 'Bollywood Romance (Aashiqui)',
                    prompt: 'Heartfelt romantic Bollywood acoustic ballad in D minor, emotive nylon guitar arpeggios, soulful bansuri flute melodies, gentle tabla rhythm, warm cinematic strings.',
                    genre: 'Bollywood Romance',
                    mood: 'Soulful & Passionate',
                  },
                  {
                    name: 'Sufi Rock & Acoustic',
                    prompt: 'Soulful Sufi acoustic fusion with dynamic acoustic strums, harmonium drone, passionate melodic lead, rhythmic dholak and electric bass.',
                    genre: 'Sufi Rock Fusion',
                    mood: 'Spiritual & Intense',
                  },
                  {
                    name: 'Midnight Monsoon Lo-Fi',
                    prompt: 'Lo-fi chill Indian classical beat, rain sound effects, mellow bansuri flute improvisation, vinyl crackle, warm rhodes piano chords.',
                    genre: 'Lo-Fi Classical',
                    mood: 'Mellow & Nostalgic',
                  },
                  {
                    name: 'Classical Raga Fusion',
                    prompt: 'Indian classical raga in Bhairavi, vibrant sitar jhala, pulsating tabla tarang, gentle ambient synth pads, contemplative melody.',
                    genre: 'Indian Classical Fusion',
                    mood: 'Transcendent',
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
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle to include user lyrics */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <input
                type="checkbox"
                id="lyrics-checkbox"
                checked={useUserLyricsForLyria}
                onChange={(e) => setUseUserLyricsForLyria(e.target.checked)}
                className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="lyrics-checkbox" className="text-xs text-zinc-300 cursor-pointer">
                Incorporate the user&apos;s lyrics (<span className="font-devanagari text-rose-400">तू ही ये मुझको बता दे...</span>) into the music generation context
              </label>
            </div>

            {lyriaError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <p className="font-semibold">Lyria Generation Note</p>
                  <p className="mt-0.5 text-rose-200/90 leading-relaxed">{lyriaError}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Tip: If Lyria quota is restricted, try the &ldquo;Sing Hindi Lyrics&rdquo; tab which utilizes Gemini Vocal Synthesis to perform the exact song in Hindi!
                  </p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleGenerateLyria}
              disabled={isGeneratingLyria}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isGeneratingLyria ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Track with {lyriaModel}...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Track with {lyriaModel === 'lyria-3-clip-preview' ? 'Lyria Clip' : 'Lyria Pro'}
                </>
              )}
            </button>
          </div>

          {/* Side Info & Lyrics Preview */}
          <div className="space-y-4">
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Flame size={14} className="text-amber-400" />
                Lyrics In Queue
              </h3>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                Chahun Main Ya Naa (चाहूँ मैं या ना)
              </p>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 max-h-60 overflow-y-auto">
                <p className="font-devanagari text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {singingLyrics.slice(0, 300)}...
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Sliders size={14} className="text-rose-400" />
                Track Specifications
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Key Signature</span>
                  <span className="font-semibold text-zinc-200">D Minor (Dm)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Tempo</span>
                  <span className="font-semibold text-zinc-200">78 BPM (Andante)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Language</span>
                  <span className="font-semibold text-zinc-200">Hindi (हिंदी)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Audio Format</span>
                  <span className="font-semibold text-zinc-200">WAV (Lossless 44.1kHz)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Vocal Singing Synthesis (Gemini TTS in Hindi) */}
      {activeTab === 'singing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Mic2 size={18} className="text-rose-400" />
                Sing Song Lyrics (Hindi Vocal Synthesis)
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Synthesizes the actual lyrical singing of the Hindi song using Gemini vocal models with melodic phrasing and emotion.
              </p>
            </div>

            {/* Lyrics Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  Hindi Lyrics to Sing (Devanagari)
                </label>
                <button
                  onClick={() => setSingingLyrics(USER_REQUESTED_LYRICS)}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Reset to Original Request
                </button>
              </div>
              <textarea
                rows={6}
                value={singingLyrics}
                onChange={(e) => setSingingLyrics(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-devanagari text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-colors leading-relaxed"
                placeholder="Enter song lyrics here..."
              />
            </div>

            {/* Vocalist Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Singer Persona
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'Kore', label: 'Kore', desc: 'Soulful Female Romantic', tag: 'Aashiqui Style' },
                  { id: 'Puck', label: 'Puck', desc: 'Emotive Acoustic Male', tag: 'Arijit Style' },
                  { id: 'Charon', label: 'Charon', desc: 'Deep Resonant Sufi', tag: 'Ghazal' },
                  { id: 'Zephyr', label: 'Zephyr', desc: 'Contemporary Melodic', tag: 'Pop' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVocalVoice(v.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      vocalVoice === v.id
                        ? 'border-rose-500 bg-rose-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-rose-400">{v.label}</div>
                    <div className="text-[10px] text-zinc-300 font-medium mt-0.5">{v.desc}</div>
                    <div className="text-[9px] text-zinc-500 mt-1">{v.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal Style Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Vocal Expression & Style Direction
              </label>
              <input
                type="text"
                value={vocalStyle}
                onChange={(e) => setVocalStyle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="e.g. Soulful romantic singing performance in Hindi..."
              />
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
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm shadow-xl shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSynthesizingVocal ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Singing Hindi Lyrics with AI Voice...
                </>
              ) : (
                <>
                  <Mic2 size={16} />
                  Sing Song with {vocalVoice} Voice
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Vocal Arrangement Notes
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When you click <span className="text-rose-400 font-semibold">&ldquo;Sing Song&rdquo;</span>, the lyrics are processed through Gemini&apos;s speech and audio synthesis engine configured for Indian music phonetics. The resulting audio is loaded right into the player with synchronized real-time waveform visualization.
              </p>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Key Song Verses
              </h3>
              <div className="space-y-2 text-xs font-devanagari text-zinc-300">
                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                  तू ही ये मुझको बता दे, चाहूँ मैं या ना
                </div>
                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                  अपने तू दिल का पता दे, चाहूँ मैं या ना
                </div>
                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                  तन्हा लम्हों में अपने, बुनती हूँ तेरे सपने...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Song Analysis & Automatic Karaoke Sync */}
      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wand2 size={18} className="text-rose-400" />
                Analyze Song Lyrics & Generate Karaoke Timing
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Uses Gemini to parse Hindi/English song lyrics, extract poetic themes, and calculate synchronized karaoke timestamps.
              </p>
            </div>

            <textarea
              rows={8}
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-devanagari text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-colors leading-relaxed"
              placeholder="Paste lyrics to analyze..."
            />

            <button
              onClick={handleAnalyzeSong}
              disabled={isAnalyzing}
              className="py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing with Gemini 3.8 Flash...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Analyze Lyrics & Timings
                </>
              )}
            </button>

            {analysisResult && (
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-rose-400">Analysis Output:</h3>
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <p><strong>Title:</strong> {analysisResult.title}</p>
                  <p><strong>Key & BPM:</strong> {analysisResult.keySignature} • {analysisResult.bpm} BPM</p>
                  <p><strong>Mood & Genre:</strong> {analysisResult.mood} • {analysisResult.genre}</p>
                  <p><strong>Theme Interpretation:</strong> {analysisResult.themeAnalysis}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Karaoke Sync Engine
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every timed line includes Devanagari text, Romanized Hinglish phonetics, and English translation, enabling live interactive karaoke in the player.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
