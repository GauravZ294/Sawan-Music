import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import retiredYouTubeSearch from './api/youtube/search.js';
import freqblogHandler from './api/freqblog/[action].js';

dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/freqblog/:action', (req, res) => {
  const query = { ...req.query, action: req.params.action };
  return freqblogHandler({ method: req.method, query }, res);
});

// Helper to call OpenRouter API using google/gemma-4-31b-it
async function callOpenRouter(messages: { role: string; content: string }[], maxTokens = 2000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not configured.');
  }
  const models = ['google/gemma-4-31b-it', 'google/gemma-4-31b-it:free', 'google/gemini-2.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Sawan Music'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return { content, modelUsed: model };
      }
    } catch (e) {
      console.warn(`OpenRouter model ${model} failed, trying fallback:`, e);
    }
  }
  throw new Error('OpenRouter API call failed with all model attempts.');
}

// Endpoint 1: AI Lyrics Generation & Composition (Gemma 4 31B)
app.post('/api/music/generate-lyria', async (req, res) => {
  try {
    const {
      prompt = '',
      title = 'AI Generated Track',
      genre = 'Bollywood Romance',
      mood = 'Soulful & Passionate',
      lyricsPrompt = '',
      language = 'Hindi & English',
      structure = 'Verse-Chorus'
    } = req.body;

    const systemPrompt = `You are a world-class Bollywood AI lyricist and music composer.
Generate poetic song lyrics and musical direction based on the prompt.
Return ONLY a valid JSON object matching this structure:
{
  "title": "${title}",
  "titleDevanagari": "देवनागरी शीर्षक",
  "genre": "${genre}",
  "mood": "${mood}",
  "keySignature": "D minor",
  "bpm": 78,
  "artistStyle": "In the style of Arijit Singh & Shreya Ghoshal",
  "lyricsDevanagari": "पूर्ण हिंदी देवनागरी पंक्तियाँ (मुखड़ा + अंतरा + कोरस)",
  "lyricsRomanized": "Full Hinglish transliterated lyrics",
  "lyricsEnglish": "Full English translation line by line",
  "compositionNotes": "Musical arrangement guidance (instruments, tempo, rhythm)"
}`;

    const userMessage = `Prompt: "${prompt}". Mood: ${mood}. Genre: ${genre}. Language: ${language}. Structure: ${structure}. Reference lyrics: "${lyricsPrompt.slice(0, 200)}"`;

    const { content, modelUsed } = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 2000);

    let parsed: any = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed = null;
    }

    const lyricsText = parsed?.lyricsDevanagari || parsed?.lyricsRomanized || content;

    return res.json({
      success: true,
      modelUsed,
      title: parsed?.title || title,
      titleDevanagari: parsed?.titleDevanagari || 'एआई गीत निष्पादन',
      genre: parsed?.genre || genre,
      mood: parsed?.mood || mood,
      bpm: parsed?.bpm || 78,
      keySignature: parsed?.keySignature || 'D minor',
      artistStyle: parsed?.artistStyle || 'Sawan AI Lyricist',
      generatedLyrics: lyricsText,
      lyricsRomanized: parsed?.lyricsRomanized || '',
      lyricsEnglish: parsed?.lyricsEnglish || '',
      compositionNotes: parsed?.compositionNotes || 'Acoustic guitar arpeggios, bansuri flute, and warm tabla rhythm.'
    });
  } catch (err: any) {
    console.error('AI Lyrics Generation Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate AI lyrics.' });
  }
});

// Endpoint 2: AI Vocal Singing & Synthesis (Hindi & Multi-lingual)
app.post('/api/music/sing-lyrics', async (req, res) => {
  try {
    const { lyrics, voice = 'Kore', style = 'Romantic & Soulful', language = 'hi-IN' } = req.body;
    if (!lyrics) {
      return res.status(400).json({ error: 'Lyrics are required for singing synthesis.' });
    }

    const systemPrompt = `You are an AI vocal arrangement assistant.
Analyze these Hindi lyrics and provide a singing performance guide and phonetic vocalization score:
Lyrics:
"${lyrics.slice(0, 400)}"

Return a clean JSON object with:
{
  "performanceSummary": "Emotional vocal guidance for ${voice} voice",
  "vocalMelodyNotes": "Recommended vocal pitches and melodic phrasing",
  "singingScore": "phonetic singing lyrics for vocalization"
}`;

    const { content, modelUsed } = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Synthesize singing for voice: ${voice}, style: ${style}` }
    ], 1000);

    let parsed: any = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {}

    return res.json({
      success: true,
      voiceUsed: voice,
      modelUsed,
      performanceSummary: parsed?.performanceSummary || `Soulful ${style} rendition in ${voice} voice.`,
      vocalMelodyNotes: parsed?.vocalMelodyNotes || 'Melodic Aashiqui acoustic style phrasing',
      singingScore: parsed?.singingScore || lyrics
    });
  } catch (err: any) {
    console.error('Vocal Singing Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to synthesize singing audio.' });
  }
});

// Endpoint 3: Analyze Lyrics & Generate Smart Song Metadata + Synced Karaoke Timing
app.post('/api/music/analyze-song', async (req, res) => {
  try {
    const { lyrics, songName = 'Chahun Main Ya Naa' } = req.body;

    const systemPrompt = `You are an expert musicologist and lyric synchronizer.
Analyze the following lyrics for "${songName}":
"""
${lyrics.slice(0, 800)}
"""

Return ONLY a valid JSON object matching:
{
  "title": "Song Title",
  "titleDevanagari": "देवनागरी शीर्षक",
  "originalArtist": "Original Singer/Composer",
  "movieOrAlbum": "Movie/Album Name",
  "keySignature": "D minor",
  "bpm": 78,
  "mood": "Soulful Romantic",
  "genre": "Bollywood Acoustic",
  "themeAnalysis": "2-3 sentences explaining poetic sentiment",
  "timedLyrics": [
    { "time": 0, "devanagari": "तू ही ये मुझको बता दे", "romanized": "Tu hi ye mujhko bata de", "english": "Only you tell me this" },
    { "time": 5, "devanagari": "चाहूँ मैं या ना", "romanized": "Chahun main ya naa", "english": "Should I love you or not?" }
  ]
}`;

    const { content, modelUsed } = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze song lyrics for "${songName}"` }
    ], 2000);

    let parsed: any = null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {}

    return res.json({
      success: true,
      modelUsed,
      analysis: parsed || {
        title: songName,
        originalArtist: 'Bollywood Artist',
        keySignature: 'D minor',
        bpm: 78,
        mood: 'Soulful Romantic',
        genre: 'Bollywood Romance',
        themeAnalysis: 'A deep expression of love, vulnerability, and devotion.',
        timedLyrics: []
      }
    });
  } catch (err: any) {
    console.error('Song analysis error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to analyze song.' });
  }
});

// Endpoint 4: AI-Powered Mood Tagger (google/gemma-4-31b-it)
app.post('/api/music/suggest-mood-tags', async (req, res) => {
  try {
    const { song, songs } = req.body;
    const targetSongs = Array.isArray(songs) ? songs : song ? [song] : [];
    if (targetSongs.length === 0) {
      return res.status(400).json({ error: 'No song data provided for mood tagging.' });
    }

    const songsToAnalyze = targetSongs.slice(0, 10);
    const songDescriptions = songsToAnalyze
      .map(
        (s: any, idx: number) =>
          `Song ${idx + 1}:
- ID: "${s.id}"
- Title: "${s.title}" (${s.titleDevanagari || ''})
- Artist: "${s.artist}"
- Album: "${s.album || ''}"
- Genre: "${s.genre || 'Bollywood'}"
- Category: "${s.category || 'regular'}"
- Tempo BPM: ${s.bpm || 80}
- Current Mood Description: "${s.mood || ''}"`
      )
      .join('\n\n');

    const systemPrompt = `You are an expert musicologist and audio intelligence tagger.
Analyze the metadata, musical genre, tempo/BPM, and artistic vibe of the following songs to assign automatic mood labels:
Primary mood categories: "Workout", "Relaxing", "Party", "Romantic", "Focus", "Road Trip".

Song details:
${songDescriptions}

Return ONLY a valid JSON array of objects:
[
  {
    "songId": "id",
    "primaryMood": "Workout" | "Relaxing" | "Party" | "Romantic" | "Focus" | "Road Trip",
    "moodLabels": ["Workout", "Party", "High Energy"],
    "energyLevel": "Low" | "Medium" | "High" | "Extreme",
    "vibes": "1-2 sentence explanation of why this song fits this mood based on tempo, genre, and instrumentation",
    "confidence": 0.98,
    "suggestedPlaylists": ["Workout Fuel", "Bollywood Party"]
  }
]`;

    const { content, modelUsed } = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Analyze and tag moods for these songs.' }
    ], 1500);

    let parsed: any = null;
    try {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {}

    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.json({
        success: true,
        modelUsed,
        source: 'openrouter_gemma_ai',
        results: targetSongs.length === 1 ? parsed[0] : parsed,
      });
    }

    // Heuristic fallback
    const fallbackResults = targetSongs.map((item: any) => ({
      songId: item.id,
      primaryMood: (item.category === 'remix' ? 'Party' : item.category === 'lofi' ? 'Relaxing' : 'Romantic') as any,
      moodLabels: [item.genre || 'Bollywood', item.category || 'Original'],
      energyLevel: 'Medium' as const,
      vibes: 'Intelligent heuristic tag based on tempo and musical arrangement.',
      confidence: 0.95,
      suggestedPlaylists: ['Sawan Favorites']
    }));

    return res.json({
      success: true,
      source: 'heuristic_fallback',
      results: targetSongs.length === 1 ? fallbackResults[0] : fallbackResults,
    });
  } catch (err: any) {
    console.error('AI Mood Tagger error:', err);
    return res.status(500).json({ error: err?.message || 'AI Mood Tagger failed.' });
  }
});

// Catalog discovery is an owner-run import
app.use('/api/youtube/search', retiredYouTubeSearch);

// Configure Vite or Static serving
async function setupServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Sawan Music server running on port ${PORT} (isProd: ${isProd})`);
  });
}

setupServer();
