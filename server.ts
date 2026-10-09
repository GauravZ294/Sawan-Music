import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { BOLLYWOOD_FALLBACK_CATALOG } from './src/data/youtubeFallbackCatalog';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({ apiKey });
}

// Endpoint 1: Lyria Music Generation (Clip or Pro)
app.post('/api/music/generate-lyria', async (req, res) => {
  try {
    const {
      prompt,
      model = 'lyria-3-clip-preview', // or 'lyria-3-pro-preview'
      title = 'AI Generated Track',
      genre = 'Bollywood Romance',
      mood = 'Romantic & Soulful',
      lyricsPrompt = '',
    } = req.body;

    const fullPrompt = `${prompt || 'Soulful romantic Bollywood acoustic song with acoustic guitar, emotive flute, soft tabla, heartfelt strings, expressive melody.'} ${lyricsPrompt ? `Inspired by lyrics: "${lyricsPrompt.slice(0, 300)}"` : ''}`.trim();

    const ai = getGenAI();

    // Use generateContentStream as documented for Lyria models
    const stream = await ai.models.generateContentStream({
      model: model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview',
      contents: fullPrompt,
    });

    let audioBase64 = '';
    let generatedLyrics = '';
    let mimeType = 'audio/wav';

    for await (const chunk of stream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !generatedLyrics) {
          generatedLyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(502).json({
        error: 'Lyria model did not return audio data for this prompt. You can try adjusting the prompt or use AI Vocal Singing.',
      });
    }

    return res.json({
      success: true,
      audioBase64,
      mimeType,
      title: title || 'Lyria Melody',
      genre,
      mood,
      generatedLyrics,
      modelUsed: model,
    });
  } catch (err: any) {
    console.error('Lyria Generation Error:', err);
    const message = err?.message || 'Failed to generate music with Lyria.';
    return res.status(500).json({
      error: message,
      details: err?.toString(),
    });
  }
});

// Endpoint 2: Gemini TTS Vocal Singing (Hindi / Multi-lingual)
app.post('/api/music/sing-lyrics', async (req, res) => {
  try {
    const {
      lyrics,
      voice = 'Kore', // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
      style = 'Romantic, passionate, soulful singing performance of Hindi song lyrics, rhythmic and melodious',
      language = 'hi-IN',
    } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: 'Lyrics are required for singing.' });
    }

    const ai = getGenAI();

    // Singing synthesis using gemini-3.8-flash-lite-tts or gemini-3.8-flash-tts
    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash-lite-tts',
      input: [
        {
          type: 'text',
          text: lyrics,
          annotations: [
            {
              type: 'speech_metadata',
              style: style,
            },
          ],
        },
      ],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          {
            language: language || 'hi-IN',
            voice: voice,
          },
        ],
      },
    });

    const outputAudio = interaction.output_audio;
    if (!outputAudio?.data) {
      return res.status(502).json({ error: 'Failed to synthesize vocal audio.' });
    }

    return res.json({
      success: true,
      audioBase64: outputAudio.data,
      mimeType: outputAudio.mime_type || 'audio/wav',
      voiceUsed: voice,
    });
  } catch (err: any) {
    console.error('TTS Vocal Singing Error:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to synthesize singing audio.',
    });
  }
});

// Endpoint 3: Analyze Lyrics & Generate Smart Song Metadata + Synced Karaoke Timing
app.post('/api/music/analyze-song', async (req, res) => {
  try {
    const { lyrics, songName = 'Chahun Main Ya Naa' } = req.body;
    const ai = getGenAI();

    const promptText = `You are an expert musicologist and lyric synchronizer.
Analyze the following lyrics for the song "${songName}":
"""
${lyrics}
"""

Return a clean JSON object with:
- title: Recommended song title in English and Devanagari
- originalArtist: Original singers/composers if recognized (e.g. Arijit Singh, Palak Muchhal / Jeet Gannguli for Aashiqui 2)
- movieOrAlbum: Movie or album name (e.g. Aashiqui 2)
- keySignature: Musical key (e.g. D minor)
- bpm: Approximate tempo BPM (e.g. 78)
- mood: Mood description (e.g. "Soulful Romantic", "Bittersweet Melancholy")
- genre: Genre tags
- themeAnalysis: 2-3 sentences explaining the lyrical meaning, emotion, and poetic nuances
- timedLyrics: array of objects { time: number (seconds from 0 to 120), devanagari: string, romanized: string, english: string } for the key verses, spaced chronologically for a 2-3 minute song.`;

    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash',
      input: promptText,
      response_format: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          originalArtist: { type: Type.STRING },
          movieOrAlbum: { type: Type.STRING },
          keySignature: { type: Type.STRING },
          bpm: { type: Type.INTEGER },
          mood: { type: Type.STRING },
          genre: { type: Type.STRING },
          themeAnalysis: { type: Type.STRING },
          timedLyrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.NUMBER },
                devanagari: { type: Type.STRING },
                romanized: { type: Type.STRING },
                english: { type: Type.STRING },
              },
            },
          },
        },
      },
    });

    const lastStep = interaction.steps.at(-1);
    let result = null;
    if (lastStep?.type === 'model_output') {
      const textContent = lastStep.content?.find((c) => c.type === 'text');
      if (textContent?.text) {
        try {
          result = JSON.parse(textContent.text.trim());
        } catch {
          // Lenient fallback
        }
      }
    }

    if (!result && interaction.output_text) {
      try {
        result = JSON.parse(interaction.output_text);
      } catch {
        // fallback
      }
    }

    return res.json({ success: true, analysis: result });
  } catch (err: any) {
    console.error('Song analysis error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to analyze song.' });
  }
});

// Endpoint: AI-Powered Mood Tagger analyzing metadata and genre (Workout, Relaxing, Party, etc.)
app.post('/api/music/suggest-mood-tags', async (req, res) => {
  try {
    const { song, songs } = req.body;
    const targetSongs = Array.isArray(songs) ? songs : song ? [song] : [];
    if (targetSongs.length === 0) {
      return res.status(400).json({ error: 'No song data provided for mood tagging.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isMockKey = !apiKey || apiKey === 'MY_GEMINI_API_KEY';

    const analyzeLocally = (item: any) => {
      const title = (item.title || '').toLowerCase();
      const genre = (item.genre || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const bpm = Number(item.bpm) || 85;
      const mood = (item.mood || '').toLowerCase();
      const lyrics = (item.lyrics || '').toLowerCase();

      let primaryMood = 'Relaxing';
      const labels = new Set<string>();
      let energyLevel: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Medium';
      let vibes = 'A balanced musical composition with soothing melodies.';

      const isHighEnergy =
        bpm >= 115 ||
        category === 'remix' ||
        /dance|party|club|bhangra|remix|dj|dhol|beat|punjabi|electronic|edm|gym|workout|fast/i.test(genre + ' ' + title + ' ' + mood);

      const isRelaxing =
        category === 'lofi' ||
        category === 'acoustic' ||
        bpm <= 85 ||
        /lofi|chill|acoustic|slow|reverb|ambient|peaceful|relax|calm|sleep|meditation|ghazal|sufi|unplugged/i.test(genre + ' ' + title + ' ' + mood);

      const isParty =
        category === 'remix' ||
        /party|club|celebration|dj|remix|dance|shadi|dhol|bhangra|masti|chull|kala chashma|dilbar|nachde|aankh marey/i.test(genre + ' ' + title + ' ' + mood);

      const isRomantic =
        /romantic|love|dil|ishq|pyar|pyaar|chahun|tum hi ho|kesariya|raataan|mohabbat|deewana|sanam/i.test(genre + ' ' + title + ' ' + mood + ' ' + lyrics);

      if (isParty && isHighEnergy) {
        primaryMood = 'Party';
        labels.add('Party');
        labels.add('Workout');
        if (category === 'remix') labels.add('Club Remix');
        labels.add('High Energy');
        energyLevel = bpm >= 126 ? 'Extreme' : 'High';
        vibes = `High-octane ${bpm} BPM rhythm and dynamic bass drops make this an explosive party anthem and pump-up workout track.`;
      } else if (isHighEnergy) {
        primaryMood = 'Workout';
        labels.add('Workout');
        labels.add('Party');
        labels.add('Cardio Fuel');
        energyLevel = 'High';
        vibes = `Propulsive tempo (${bpm} BPM) with driving cadence, ideal for gym reps, running, and high-intensity sessions.`;
      } else if (isRelaxing) {
        primaryMood = 'Relaxing';
        labels.add('Relaxing');
        if (category === 'lofi') labels.add('Lo-Fi Chill');
        labels.add('Evening Calm');
        labels.add('De-stress');
        energyLevel = bpm <= 75 ? 'Low' : 'Medium';
        vibes = `Gentle acoustic arrangement with mellow undertones, perfect for unwinding, studying, or late-night relaxation.`;
      } else if (isRomantic) {
        primaryMood = 'Romantic';
        labels.add('Romantic');
        labels.add('Relaxing');
        labels.add('Soulful');
        energyLevel = 'Medium';
        vibes = `Heartfelt melodic phrasing and poetic sentiment designed for intimate moments and reflective listening.`;
      } else {
        primaryMood = 'Focus';
        labels.add('Focus');
        labels.add('Relaxing');
        energyLevel = 'Medium';
        vibes = `Smooth rhythmic continuity suitable for creative focus and daily background listening.`;
      }

      return {
        songId: item.id,
        primaryMood,
        moodLabels: Array.from(labels),
        energyLevel,
        vibes,
        confidence: 0.95,
        suggestedPlaylists: [primaryMood + ' Bollywood', category ? category.toUpperCase() + ' Mix' : 'Bollywood Favorites'],
      };
    };

    if (isMockKey) {
      const results = targetSongs.map(analyzeLocally);
      return res.json({
        success: true,
        source: 'heuristic_engine',
        results: targetSongs.length === 1 ? results[0] : results,
      });
    }

    const ai = getGenAI();
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
- Current Mood Description: "${s.mood || ''}"
- Lyrics Excerpt: "${(s.lyrics || '').slice(0, 150)}"`
      )
      .join('\n\n');

    const prompt = `You are an expert musicologist and audio intelligence tagger.
Analyze the metadata, musical genre, tempo/BPM, and artistic vibe of the following Bollywood songs to assign automatic mood labels:
Primary mood categories to evaluate:
- "Workout": High BPM (110+), driving bass, intense beats, fitness motivation, gym cardio.
- "Relaxing": Peaceful, lo-fi, acoustic, mellow tempo (60-85 BPM), destress, late-night chill.
- "Party": Club bangers, celebration, DJ remixes, dhol beats, festive dance.
- "Romantic": Soulful love songs, heartfelt acoustic ballads, poetic duets.
- "Focus": Ambient, steady instrumental flow, distraction-free study music.
- "Road Trip": Uplifting, highway anthems, joyful open-air vibes.

Song details:
${songDescriptions}

Return a clean JSON array of analysis objects:
[
  {
    "songId": "id",
    "primaryMood": "Workout" | "Relaxing" | "Party" | "Romantic" | "Focus" | "Road Trip",
    "moodLabels": ["Workout", "Party", "High Energy"],
    "energyLevel": "Low" | "Medium" | "High" | "Extreme",
    "vibes": "1-2 sentence explanation of why this song fits this mood based on tempo, genre, and instrumentation",
    "confidence": 0.95,
    "suggestedPlaylists": ["Workout Fuel", "Bollywood Party"]
  }
]`;

    const interactionPromise = ai.interactions.create({
      model: 'gemini-3.8-flash',
      input: prompt,
      response_format: { type: 'json' },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI tagger timed out')), 6000)
    );

    const interaction: any = await Promise.race([interactionPromise, timeoutPromise]);
    let parsed: any = null;

    const lastStep = interaction.steps?.at(-1);
    if (lastStep?.type === 'model_output') {
      const textContent = lastStep.content?.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          parsed = JSON.parse(textContent.text.trim());
        } catch {}
      }
    }

    if (!parsed && interaction.output_text) {
      try {
        parsed = JSON.parse(interaction.output_text);
      } catch {}
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.json({
        success: true,
        source: 'gemini_ai',
        results: targetSongs.length === 1 ? parsed[0] : parsed,
      });
    }

    const fallbackResults = targetSongs.map(analyzeLocally);
    return res.json({
      success: true,
      source: 'heuristic_fallback',
      results: targetSongs.length === 1 ? fallbackResults[0] : fallbackResults,
    });
  } catch (err: any) {
    console.error('AI Mood Tagger error:', err);
    const targetSongs = req.body?.songs || (req.body?.song ? [req.body.song] : []);
    
    // Evaluate using comprehensive audio metadata analysis
    const results = targetSongs.map((item: any) => {
      const title = (item.title || '').toLowerCase();
      const genre = (item.genre || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const bpm = Number(item.bpm) || 85;
      const mood = (item.mood || '').toLowerCase();

      let primaryMood = 'Relaxing';
      const labels = new Set<string>();
      let energyLevel: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Medium';
      let vibes = 'A balanced musical composition with soothing melodies.';

      const isHighEnergy =
        bpm >= 115 ||
        category === 'remix' ||
        /dance|party|club|bhangra|remix|dj|dhol|beat|punjabi|electronic|edm|gym|workout|fast/i.test(genre + ' ' + title + ' ' + mood);

      const isRelaxing =
        category === 'lofi' ||
        category === 'acoustic' ||
        bpm <= 85 ||
        /lofi|chill|acoustic|slow|reverb|ambient|peaceful|relax|calm|sleep|meditation/i.test(genre + ' ' + title + ' ' + mood);

      const isParty =
        category === 'remix' ||
        /party|club|celebration|dj|remix|dance|shadi|dhol|bhangra|masti|chull|kala chashma|dilbar|nachde|aankh marey/i.test(genre + ' ' + title + ' ' + mood);

      const isRomantic =
        /romantic|love|dil|ishq|pyar|pyaar|chahun|tum hi ho|kesariya|raataan|mohabbat/i.test(genre + ' ' + title + ' ' + mood);

      if (isParty && isHighEnergy) {
        primaryMood = 'Party';
        labels.add('Party');
        labels.add('Workout');
        if (category === 'remix') labels.add('Club Remix');
        labels.add('High Energy');
        energyLevel = bpm >= 126 ? 'Extreme' : 'High';
        vibes = `High-octane ${bpm} BPM rhythm and dynamic bass drops make this an explosive party anthem and pump-up workout track.`;
      } else if (isHighEnergy) {
        primaryMood = 'Workout';
        labels.add('Workout');
        labels.add('Party');
        labels.add('Cardio Fuel');
        energyLevel = 'High';
        vibes = `Propulsive tempo (${bpm} BPM) with driving cadence, ideal for gym reps, running, and high-intensity sessions.`;
      } else if (isRelaxing) {
        primaryMood = 'Relaxing';
        labels.add('Relaxing');
        if (category === 'lofi') labels.add('Lo-Fi Chill');
        labels.add('Evening Calm');
        labels.add('De-stress');
        energyLevel = bpm <= 75 ? 'Low' : 'Medium';
        vibes = `Gentle acoustic arrangement with mellow undertones, perfect for unwinding, studying, or late-night relaxation.`;
      } else if (isRomantic) {
        primaryMood = 'Romantic';
        labels.add('Romantic');
        labels.add('Relaxing');
        labels.add('Soulful');
        energyLevel = 'Medium';
        vibes = `Heartfelt melodic phrasing and poetic sentiment designed for intimate moments and reflective listening.`;
      } else {
        primaryMood = 'Focus';
        labels.add('Focus');
        labels.add('Relaxing');
        energyLevel = 'Medium';
        vibes = `Smooth rhythmic continuity suitable for creative focus and daily background listening.`;
      }

      return {
        songId: item.id,
        primaryMood,
        moodLabels: Array.from(labels),
        energyLevel,
        vibes,
        confidence: 0.95,
        suggestedPlaylists: [primaryMood + ' Bollywood', category ? category.toUpperCase() + ' Mix' : 'Bollywood Favorites'],
      };
    });

    return res.json({
      success: true,
      source: 'heuristic_resilience',
      results: targetSongs.length === 1 ? results[0] : results,
    });
  }
});

// Fallback curated Bollywood catalog for instant YouTube search responses


// Endpoint 4: Search & Fetch Bollywood Music from YouTube & Online Sources
app.get('/api/youtube/search', async (req, res) => {
  const query = ((req.query.q as string) || 'Bollywood Trending Songs 2024').trim();
  const categoryFilter = ((req.query.category as string) || 'all').toLowerCase();
  const market = ((req.query.market as string) || 'all').toLowerCase();
  const pageToken = (req.query.pageToken as string) || '';

  const getFilteredFallback = () => {
    let list = [...BOLLYWOOD_FALLBACK_CATALOG];
    if (categoryFilter !== 'all') {
      list = list.filter((s) => s.category === categoryFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      const matched = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          (s.titleDevanagari && s.titleDevanagari.includes(q))
      );
      if (matched.length > 0) return matched;
    }
    return list;
  };

  // Search YouTube itself when a server-side Data API key is configured.
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (youtubeApiKey) {
    try {
      const marketQuery: Record<string, string> = {
        all: '',
        bollywood: ' Bollywood official song',
        hollywood: ' official music video',
        south: ' Tamil Telugu Malayalam Kannada official movie song',
      };
      const categoryQuery: Record<string, string> = {
        all: '', regular: ' original song', remix: ' official remix', lofi: ' official lofi', mashup: ' official mashup',
      };
      const params = new URLSearchParams({
        key: youtubeApiKey,
        part: 'snippet',
        q: `${query}${marketQuery[market] || ''}${categoryQuery[categoryFilter] || ''}`.trim(),
        type: 'video',
        videoEmbeddable: 'true',
        maxResults: '25',
        order: 'relevance',
      });
      if (pageToken) params.set('pageToken', pageToken);
      if (market === 'bollywood' || market === 'south') params.set('regionCode', 'IN');
      if (market === 'hollywood') params.set('regionCode', 'US');

      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      const payload: any = await response.json();
      if (!response.ok) {
        const reason = payload?.error?.errors?.[0]?.reason;
        return res.status(response.status === 403 ? 503 : response.status).json({
          success: false,
          error: reason === 'quotaExceeded'
            ? 'YouTube search quota has been reached. Please try again later.'
            : 'YouTube could not complete this search. Please try another query.',
        });
      }

      const dateAdded = new Date().toISOString().slice(0, 10);
      const songs = (payload.items || []).filter((item: any) => item.id?.videoId).map((item: any) => {
        const videoId = item.id.videoId;
        const snippet = item.snippet || {};
        return {
          id: `youtube-${videoId}`,
          title: snippet.title || 'YouTube music video',
          artist: snippet.channelTitle || 'YouTube channel',
          album: '',
          category: ['regular', 'remix', 'lofi', 'mashup'].includes(categoryFilter) ? categoryFilter : 'regular',
          genre: market === 'all' ? 'Music' : market,
          mood: 'Music',
          year: Number((snippet.publishedAt || '').slice(0, 4)) || new Date().getFullYear(),
          duration: 0,
          youtubeId: videoId,
          channelTitle: snippet.channelTitle || '',
          coverUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          isYoutubeSource: true,
          isFavorite: false,
          playlistIds: [],
          dateAdded,
          playCount: 0,
        };
      });
      return res.json({ success: true, count: songs.length, query, market, songs, nextPageToken: payload.nextPageToken || null });
    } catch (err: any) {
      console.error('YouTube Data API search failed:', err?.message);
      return res.status(502).json({ success: false, error: 'YouTube search is temporarily unavailable. Please try again.' });
    }
  }

  if (market !== 'all' && market !== 'bollywood') {
    return res.status(503).json({
      success: false,
      error: 'Global music search needs a YouTube Data API key. Add YOUTUBE_API_KEY to the deployment environment and redeploy.',
    });
  }

  const fallbackSongs = getFilteredFallback().map((song) => ({
    ...song,
    bpm: 80,
    lyrics: song.lyricsExcerpt,
    coverUrl: `https://img.youtube.com/vi/${song.youtubeId}/hqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${song.youtubeId}`,
    isYoutubeSource: true,
    isFavorite: false,
    playlistIds: [],
    dateAdded: new Date().toISOString().slice(0, 10),
    playCount: 0,
  }));
  return res.json({
    success: true,
    count: fallbackSongs.length,
    query,
    songs: fallbackSongs,
    warning: 'Showing the curated Bollywood catalog. Configure YOUTUBE_API_KEY for live global YouTube search.',
  });
});

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
    console.log(`🎵 SwarSync server running on port ${PORT} (isProd: ${isProd})`);
  });
}

setupServer();
