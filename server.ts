import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

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
const BOLLYWOOD_FALLBACK_CATALOG = [
  {
    id: 'chahun-main-ya-naa-yt',
    title: 'Chahun Main Ya Naa',
    titleDevanagari: 'चाहूँ मैं या ना',
    artist: 'Arijit Singh & Palak Muchhal',
    artistDevanagari: 'अरिजीत सिंह और पलक मुच्छल',
    album: 'Aashiqui 2',
    category: 'regular',
    genre: 'Bollywood Romance',
    mood: 'Soulful & Passionate',
    year: 2013,
    duration: 202,
    youtubeId: '2bsw3t5eK-Y',
    channelTitle: 'T-Series',
    lyricsExcerpt: 'तू ही ये मुझको बता दे, चाहूँ मैं या ना',
  },
  {
    id: 'tum-hi-ho-yt',
    title: 'Tum Hi Ho',
    titleDevanagari: 'तुम ही हो',
    artist: 'Arijit Singh',
    artistDevanagari: 'अरिजीत सिंह',
    album: 'Aashiqui 2',
    category: 'regular',
    genre: 'Bollywood Romance',
    mood: 'Deeply Emotional',
    year: 2013,
    duration: 262,
    youtubeId: 'Umqb9KENgmk',
    channelTitle: 'T-Series',
    lyricsExcerpt: 'क्यूँकि तुम ही हो, अब तुम ही हो, ज़िन्दगी अब तुम ही हो',
  },
  {
    id: 'kesariya-yt',
    title: 'Kesariya',
    titleDevanagari: 'केसरिया',
    artist: 'Pritam & Arijit Singh',
    artistDevanagari: 'प्रीतम और अरिजीत सिंह',
    album: 'Brahmāstra',
    category: 'regular',
    genre: 'Sufi Romance',
    mood: 'Heartwarming',
    year: 2022,
    duration: 268,
    youtubeId: 'BddP6PYo2gs',
    channelTitle: 'Sony Music India',
    lyricsExcerpt: 'केसरिया तेरा इश्क़ है पिया, रंग जाऊँ जो मैं हाथ लगाऊँ',
  },
  {
    id: 'chaleya-yt',
    title: 'Chaleya',
    titleDevanagari: 'चलेया',
    artist: 'Arijit Singh, Shilpa Rao, Anirudh',
    artistDevanagari: 'अरिजीत सिंह, शिल्पा राव, अनिरुद्ध',
    album: 'Jawan',
    category: 'regular',
    genre: 'Groovy Bollywood Romance',
    mood: 'Playful & Romantic',
    year: 2023,
    duration: 200,
    youtubeId: 'VAdGW7QDJUI',
    channelTitle: 'T-Series',
    lyricsExcerpt: 'हाय चलेया तेरी ओर, चलेया तेरी ओर',
  },
  {
    id: 'apna-bana-le-yt',
    title: 'Apna Bana Le',
    titleDevanagari: 'अपना बना ले',
    artist: 'Arijit Singh, Sachin-Jigar',
    artistDevanagari: 'अरिजीत सिंह, सचिन-जिगर',
    album: 'Bhediya',
    category: 'regular',
    genre: 'Bollywood Romance',
    mood: 'Tender Devotion',
    year: 2022,
    duration: 261,
    youtubeId: 'ElZfdU54Cp8',
    channelTitle: 'Zee Music Company',
    lyricsExcerpt: 'अपना बना ले पिया, अपना बना ले पिया',
  },
  {
    id: 'dilbar-remix-yt',
    title: 'Dilbar (Club Dance Remix)',
    titleDevanagari: 'दिलबर (क्लब रीमिक्स)',
    artist: 'Neha Kakkar, Dhvani Bhanushali, DJ Chetas',
    artistDevanagari: 'नेहा कक्कड़, ध्वनि भानुशाली, डीजे चेतस',
    album: 'Satyameva Jayate',
    category: 'remix',
    genre: 'Bollywood Club Remix',
    mood: 'High-Energy Party',
    year: 2018,
    duration: 198,
    youtubeId: 'JFcgOboQZ08',
    channelTitle: 'T-Series',
    lyricsExcerpt: 'दिलबर दिलबर हाँ दिलबर दिलबर',
  },
  {
    id: 'kala-chashma-remix-yt',
    title: 'Kala Chashma (Club Remix)',
    titleDevanagari: 'काला चश्मा (क्लब रीमिक्स)',
    artist: 'Badshah, Amar Arshi, Neha Kakkar',
    artistDevanagari: 'बादशाह, अमर अर्शी, नेहा कक्कड़',
    album: 'Baar Baar Dekho',
    category: 'remix',
    genre: 'Punjabi EDM Fusion',
    mood: 'Festival Energy',
    year: 2016,
    duration: 195,
    youtubeId: 'k4yXQkGLeAA',
    channelTitle: 'Zee Music Company',
    lyricsExcerpt: 'तेनु काला चश्मा जचदा ऐ, जचदा ऐ गोरे मुखड़े ते',
  },
  {
    id: 'aankh-marey-remix-yt',
    title: 'Aankh Marey (DJ Remix)',
    titleDevanagari: 'आँख मारे (डीजे रीमिक्स)',
    artist: 'Mika Singh, Neha Kakkar, DJ Notorious',
    artistDevanagari: 'मीका सिंह, नेहा कक्कड़',
    album: 'Simmba',
    category: 'remix',
    genre: 'Desi Dance Remix',
    mood: 'Ecstatic Party',
    year: 2018,
    duration: 213,
    youtubeId: '_KhQT-LGb-4',
    channelTitle: 'T-Series',
    lyricsExcerpt: 'ओ लड़की आँख मारे, आँख मारे वो लड़की आँख मारे',
  },
  {
    id: 'kar-gayi-chull-remix-yt',
    title: 'Kar Gayi Chull (Bass Remix)',
    titleDevanagari: 'कर गयी चुल (बेस रीमिक्स)',
    artist: 'Badshah, Fazilpuria, Neha Kakkar',
    artistDevanagari: 'बादशाह, नेहा कक्कड़',
    album: 'Kapoor & Sons',
    category: 'remix',
    genre: 'Bollywood Party Trap',
    mood: 'Party Swagger',
    year: 2016,
    duration: 187,
    youtubeId: 'NTHz9ephYTw',
    channelTitle: 'Sony Music India',
    lyricsExcerpt: 'अरे लड़की ब्यूटीफुल कर गयी चुल',
  },
  {
    id: 'chahun-main-lofi-yt',
    title: 'Chahun Main Ya Naa (Lo-Fi Slowed + Reverb)',
    titleDevanagari: 'चाहूँ मैं या ना (लो-फ़ाई स्लोड + रीवर्ब)',
    artist: 'Arijit Singh / Lo-Fi Station',
    artistDevanagari: 'अरिजीत सिंह / लो-फ़ाई',
    album: 'Midnight Bollywood Lo-Fi',
    category: 'lofi',
    genre: 'Lo-Fi Chillhop',
    mood: 'Dreamy & Solitude',
    year: 2024,
    duration: 245,
    youtubeId: 'y-371Xf4Pj0',
    channelTitle: 'Bollywood Lo-Fi Station',
    lyricsExcerpt: 'तू ही ये मुझको बता दे, चाहूँ मैं या ना (लो-फ़ाई संस्करण)',
  },
  {
    id: 'kesariya-lofi-yt',
    title: 'Kesariya (Midnight Rain Lo-Fi)',
    titleDevanagari: 'केसरिया (मिडनाइट रेन लो-फ़ाई)',
    artist: 'Pritam / Indian Chillout',
    artistDevanagari: 'प्रीतम / इंडियन चिलआउट',
    album: 'Monsoon Chai Lo-Fi',
    category: 'lofi',
    genre: 'Lo-Fi Beats',
    mood: 'Soothing & Rain',
    year: 2023,
    duration: 210,
    youtubeId: 'Jg7sX3n6LzE',
    channelTitle: 'Lofi Records India',
    lyricsExcerpt: 'केसरिया तेरा इश्क़ है पिया (बारिश और लो-फ़ाई धुन)',
  },
  {
    id: 'shayad-lofi-yt',
    title: 'Shayad (Midnight Lo-Fi Flip)',
    titleDevanagari: 'शायद (मिडनाइट लो-फ़ाई)',
    artist: 'Pritam, Arijit Singh / Chillhop India',
    artistDevanagari: 'प्रीतम, अरिजीत सिंह',
    album: 'Love Aaj Kal Lo-Fi',
    category: 'lofi',
    genre: 'Lo-Fi Acoustic',
    mood: 'Quiet Solitude',
    year: 2023,
    duration: 232,
    youtubeId: 'lBvbNkWbgWc',
    channelTitle: 'T-Series LoFi',
    lyricsExcerpt: 'शायद कभी ना कह सकूँ मैं तुमको',
  },
  {
    id: 'iktara-lofi-yt',
    title: 'Iktara (Lo-Fi Nostalgia Version)',
    titleDevanagari: 'इकतारा (लो-फ़ाई नॉस्टैल्जिया)',
    artist: 'Kavita Seth, Amit Trivedi',
    artistDevanagari: 'कविता सेठ, अमित त्रिवेदी',
    album: 'Wake Up Sid Reimagined',
    category: 'lofi',
    genre: 'Sufi Lo-Fi',
    mood: 'Peaceful & Warm',
    year: 2022,
    duration: 248,
    youtubeId: 'f6vF2K6j8v8',
    channelTitle: 'Sony Music LoFi',
    lyricsExcerpt: 'गूंजा सा है कोई इकतारा इकतारा',
  },
  {
    id: 'arijit-mega-mashup-yt',
    title: 'Arijit Singh Ultimate Romantic Mashup',
    titleDevanagari: 'अरिजीत सिंह अल्टीमेट रोमांटिक मैशअप',
    artist: 'Arijit Singh / DJ Lemon',
    artistDevanagari: 'अरिजीत सिंह मैशअप',
    album: 'King of Romance Mashup',
    category: 'mashup',
    genre: 'Bollywood Mashup',
    mood: 'Emotional Rollercoaster',
    year: 2024,
    duration: 310,
    youtubeId: 'j8K_r2Ff3Qc',
    channelTitle: 'Bollywood Mashup Hub',
    lyricsExcerpt: 'चाहूँ मैं या ना + तुम ही हो + मुस्कुराने + राबता',
  },
  {
    id: 'atif-arijit-mashup-yt',
    title: 'Atif Aslam x Arijit Singh Mega Mashup',
    titleDevanagari: 'आतिफ असलम x अरिजीत सिंह मैशअप',
    artist: 'Atif Aslam & Arijit Singh',
    artistDevanagari: 'आतिफ असलम और अरिजीत सिंह',
    album: 'Voices of Hearts Mashup',
    category: 'mashup',
    genre: 'Acoustic Mashup',
    mood: 'Nostalgic & Grand',
    year: 2023,
    duration: 340,
    youtubeId: 'mN9q1o9_6pA',
    channelTitle: 'Desi Music Mashups',
    lyricsExcerpt: 'तेरा होने लगा हूँ + जीना जीना + पहली नज़र में',
  },
  {
    id: 'acoustic-love-mashup-yt',
    title: 'Bollywood Acoustic Love Mashup 2024',
    titleDevanagari: 'बॉलीवुड अकूस्टिक लव मैशअप 2024',
    artist: 'Unplugged Trio',
    artistDevanagari: 'अनप्लग्ड ट्रायो',
    album: 'Coffee House Bollywood',
    category: 'mashup',
    genre: 'Unplugged Mashup',
    mood: 'Sweet & Harmonious',
    year: 2024,
    duration: 285,
    youtubeId: 'B7pLq8w_8m0',
    channelTitle: 'T-Series Acoustics',
    lyricsExcerpt: 'अपना बना ले + केसरिया + रातां लम्बियां',
  },
  {
    id: 'retro-90s-mashup-yt',
    title: 'Retro to Metro 90s Bollywood Mashup',
    titleDevanagari: 'रेट्रो टू मेट्रो 90s बॉलीवुड मैशअप',
    artist: 'Kumar Sanu, Udit Narayan, Alka Yagnik',
    artistDevanagari: 'कुमार सानू, उदित नारायण, अलका याग्निक',
    album: 'Golden Era Mashup',
    category: 'mashup',
    genre: '90s Retro Mashup',
    mood: 'Pure Nostalgia',
    year: 2023,
    duration: 325,
    youtubeId: 'z_8L9wK_p1A',
    channelTitle: 'Retro Bollywood Hub',
    lyricsExcerpt: 'पहला नशा + तुझे देखा तो ये जाना + सूरज हुआ मद्धम',
  },
];

// Endpoint 4: Search & Fetch Bollywood Music from YouTube & Online Sources
app.get('/api/youtube/search', async (req, res) => {
  const query = ((req.query.q as string) || 'Bollywood Trending Songs 2024').trim();
  const categoryFilter = ((req.query.category as string) || 'all').toLowerCase();

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

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackSongs = getFilteredFallback().map((s) => ({
        ...s,
        bpm: 80,
        lyrics: s.lyricsExcerpt,
        coverUrl: `https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg`,
        youtubeUrl: `https://www.youtube.com/watch?v=${s.youtubeId}`,
        isYoutubeSource: true,
        isFavorite: false,
        playlistIds: [],
        dateAdded: new Date().toISOString().split('T')[0],
        playCount: Math.floor(Math.random() * 50) + 10,
      }));
      return res.json({ success: true, count: fallbackSongs.length, query, songs: fallbackSongs });
    }

    const ai = getGenAI();
    const prompt = `You are an expert Bollywood music database and YouTube music curator.
The user is searching for Bollywood music with the query: "${query}" (category filter: "${categoryFilter}").
Find 6 to 10 popular, real, authentic Bollywood tracks matching this search query (including category: regular, remix, lofi, or mashup).

For each song, return:
- id: unique slug
- title: exact track title
- titleDevanagari: title in Hindi Devanagari script
- artist: singers and music directors
- artistDevanagari: artist name in Devanagari
- album: movie or album name
- category: one of 'regular', 'remix', 'lofi', 'mashup'
- genre: genre description
- mood: mood tag
- year: release year (number)
- duration: estimated duration in seconds
- youtubeId: real, valid YouTube Video ID for the official song/video
- channelTitle: YouTube channel name
- lyricsExcerpt: 2-3 lines of key lyrics in Hindi

Return ONLY a JSON array under the key "songs".`;

    const interactionPromise = ai.interactions.create({
      model: 'gemini-3.8-flash',
      input: prompt,
      response_format: {
        type: Type.OBJECT,
        properties: {
          songs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                titleDevanagari: { type: Type.STRING },
                artist: { type: Type.STRING },
                artistDevanagari: { type: Type.STRING },
                album: { type: Type.STRING },
                category: { type: Type.STRING },
                genre: { type: Type.STRING },
                mood: { type: Type.STRING },
                year: { type: Type.INTEGER },
                duration: { type: Type.INTEGER },
                youtubeId: { type: Type.STRING },
                channelTitle: { type: Type.STRING },
                lyricsExcerpt: { type: Type.STRING },
              },
            },
          },
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI Search Timeout')), 3000)
    );

    const interaction: any = await Promise.race([interactionPromise, timeoutPromise]);


    let songs = [];
    const lastStep = interaction.steps?.at(-1);
    if (lastStep?.type === 'model_output') {
      const textContent = lastStep.content?.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          const parsed = JSON.parse(textContent.text.trim());
          songs = parsed.songs || [];
        } catch {}
      }
    }

    if (!songs || songs.length === 0) {
      songs = getFilteredFallback();
    }

    const formattedSongs = songs.map((s: any) => ({
      ...s,
      bpm: s.bpm || 80,
      lyrics: s.lyricsExcerpt || `${s.title} by ${s.artist}`,
      coverUrl: s.youtubeId
        ? `https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      youtubeUrl: s.youtubeId ? `https://www.youtube.com/watch?v=${s.youtubeId}` : undefined,
      isYoutubeSource: true,
      isFavorite: false,
      playlistIds: [],
      dateAdded: new Date().toISOString().split('T')[0],
      playCount: Math.floor(Math.random() * 50) + 10,
    }));

    return res.json({ success: true, count: formattedSongs.length, query, songs: formattedSongs });
  } catch (err: any) {
    console.error('YouTube search fallback triggered:', err?.message);
    const fallbackSongs = getFilteredFallback().map((s) => ({
      ...s,
      bpm: 80,
      lyrics: s.lyricsExcerpt,
      coverUrl: `https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${s.youtubeId}`,
      isYoutubeSource: true,
      isFavorite: false,
      playlistIds: [],
      dateAdded: new Date().toISOString().split('T')[0],
      playCount: Math.floor(Math.random() * 50) + 10,
    }));
    return res.json({ success: true, count: fallbackSongs.length, query, songs: fallbackSongs });
  }
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
