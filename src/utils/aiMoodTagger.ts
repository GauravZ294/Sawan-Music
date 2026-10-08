import { Song } from '../types/music';

export interface MoodTagResult {
  songId: string;
  primaryMood: 'Workout' | 'Relaxing' | 'Party' | 'Romantic' | 'Focus' | 'Road Trip';
  moodLabels: string[];
  energyLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  vibes: string;
  confidence: number;
  suggestedPlaylists?: string[];
}

export const MOOD_DEFINITIONS: Record<
  string,
  {
    name: string;
    description: string;
    color: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    iconName: string;
    sampleTracks: string[];
  }
> = {
  Workout: {
    name: 'Workout',
    description: 'High tempo, driving basslines, gym cardio & fitness reps fuel',
    color: '#f97316',
    bgBadge: 'bg-orange-500/20',
    textBadge: 'text-orange-400',
    borderBadge: 'border-orange-500/30',
    iconName: 'Flame',
    sampleTracks: ['Kala Chashma (Club Remix)', 'Kar Gayi Chull', 'Dilbar', 'Aankh Marey'],
  },
  Relaxing: {
    name: 'Relaxing',
    description: 'Mellow lo-fi, peaceful acoustic melodies, destress & evening calm',
    color: '#10b981',
    bgBadge: 'bg-emerald-500/20',
    textBadge: 'text-emerald-400',
    borderBadge: 'border-emerald-500/30',
    iconName: 'Coffee',
    sampleTracks: ['Kesariya (Midnight Lo-Fi)', 'Tum Hi Ho (Slowed & Reverb)', 'Raataan Lambiyan Lo-Fi'],
  },
  Party: {
    name: 'Party',
    description: 'Bollywood dance bangers, club remixes, dhol drops & celebrations',
    color: '#d946ef',
    bgBadge: 'bg-fuchsia-500/20',
    textBadge: 'text-fuchsia-400',
    borderBadge: 'border-fuchsia-500/30',
    iconName: 'Sparkles',
    sampleTracks: ['Gallan Goodiyaan Club Mix', 'Badtameez Dil', 'Chaiyya Chaiyya EDM'],
  },
  Romantic: {
    name: 'Romantic',
    description: 'Heartfelt duets, acoustic warmth, soulful love expressions',
    color: '#f43f5e',
    bgBadge: 'bg-rose-500/20',
    textBadge: 'text-rose-400',
    borderBadge: 'border-rose-500/30',
    iconName: 'Heart',
    sampleTracks: ['Chahun Main Ya Naa', 'Tum Hi Ho', 'Kesariya', 'Raataan Lambiyan'],
  },
  Focus: {
    name: 'Focus',
    description: 'Distraction-free ambient vibes, steady tempo for deep work & study',
    color: '#3b82f6',
    bgBadge: 'bg-blue-500/20',
    textBadge: 'text-blue-400',
    borderBadge: 'border-blue-500/30',
    iconName: 'Headphones',
    sampleTracks: ['Sufi Ambient Lounge', 'Acoustic Ragas', 'Midnight Flute Meditations'],
  },
  'Road Trip': {
    name: 'Road Trip',
    description: 'Uplifting highway melodies, open windows & scenic sing-along anthems',
    color: '#eab308',
    bgBadge: 'bg-amber-500/20',
    textBadge: 'text-amber-400',
    borderBadge: 'border-amber-500/30',
    iconName: 'Compass',
    sampleTracks: ['Ilahi', 'Safarnama', 'Patakha Guddi', 'Kabira Mashup'],
  },
};

/**
 * Single Song Mood Analysis via AI Endpoint (with automatic resilient fallback)
 */
export async function analyzeSongMoodWithAI(song: Song): Promise<MoodTagResult> {
  try {
    const res = await fetch('/api/music/suggest-mood-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results) {
        return Array.isArray(data.results) ? data.results[0] : data.results;
      }
    }
  } catch (err) {
    console.warn('Network call to AI Mood Tagger failed, using smart local engine:', err);
  }

  // Local fallback heuristic
  return analyzeSongMoodLocally(song);
}

/**
 * Batch Mood Analysis for multiple songs
 */
export async function batchAnalyzeSongsWithAI(
  songs: Song[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, MoodTagResult>> {
  const results = new Map<string, MoodTagResult>();
  const chunkSize = 5;

  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    try {
      const res = await fetch('/api/music/suggest-mood-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: chunk }),
      });

      if (res.ok) {
        const data = await res.json();
        const arrayResults: MoodTagResult[] = Array.isArray(data.results)
          ? data.results
          : [data.results];

        for (const r of arrayResults) {
          if (r && r.songId) {
            results.set(r.songId, r);
          }
        }
      } else {
        // Local chunk fallback
        for (const s of chunk) {
          results.set(s.id, analyzeSongMoodLocally(s));
        }
      }
    } catch {
      for (const s of chunk) {
        results.set(s.id, analyzeSongMoodLocally(s));
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, songs.length), songs.length);
    }
  }

  return results;
}

/**
 * Instant local heuristic analyzer based on Bollywood music knowledge
 */
export function analyzeSongMoodLocally(song: Song): MoodTagResult {
  const title = (song.title || '').toLowerCase();
  const genre = (song.genre || '').toLowerCase();
  const category = (song.category || '').toLowerCase();
  const mood = (song.mood || '').toLowerCase();
  const bpm = Number(song.bpm) || 85;

  const isParty =
    category === 'remix' ||
    /party|club|dance|remix|dj|dhol|bhangra|chull|kala chashma|dilbar|nachde|aankh marey|gallan/i.test(
      genre + ' ' + title + ' ' + mood
    );

  const isWorkout =
    bpm >= 115 ||
    category === 'remix' ||
    /workout|gym|cardio|fitness|energy|banger|beat|fast|rock/i.test(genre + ' ' + title + ' ' + mood);

  const isRelaxing =
    category === 'lofi' ||
    category === 'acoustic' ||
    bpm <= 82 ||
    /lofi|chill|slow|reverb|acoustic|calm|peaceful|sleep|sufi|ghazal/i.test(
      genre + ' ' + title + ' ' + mood
    );

  const isRomantic = /romantic|love|dil|ishq|pyar|chahun|tum hi ho|kesariya|raataan/i.test(
    genre + ' ' + title + ' ' + mood
  );

  let primaryMood: MoodTagResult['primaryMood'] = 'Relaxing';
  const moodLabels = new Set<string>();
  let energyLevel: MoodTagResult['energyLevel'] = 'Medium';
  let vibes = 'Balanced acoustic harmony with evocative melodies.';

  if (isParty) {
    primaryMood = 'Party';
    moodLabels.add('Party');
    moodLabels.add('Workout');
    if (category === 'remix') moodLabels.add('Club Remix');
    moodLabels.add('High Energy');
    energyLevel = bpm >= 125 ? 'Extreme' : 'High';
    vibes = `Heavy groove and explosive rhythm (${bpm} BPM) make this a premier party banger and workout booster.`;
  } else if (isWorkout) {
    primaryMood = 'Workout';
    moodLabels.add('Workout');
    moodLabels.add('Party');
    moodLabels.add('Cardio Fuel');
    energyLevel = 'High';
    vibes = `High tempo driving pulse (${bpm} BPM) engineered for workouts, running, and athletic focus.`;
  } else if (isRelaxing) {
    primaryMood = 'Relaxing';
    moodLabels.add('Relaxing');
    if (category === 'lofi') moodLabels.add('Lo-Fi Chill');
    moodLabels.add('Evening Calm');
    energyLevel = bpm <= 75 ? 'Low' : 'Medium';
    vibes = `Laid-back acoustic tones and relaxed cadences, ideal for unwinding, studying, and late-night calm.`;
  } else if (isRomantic) {
    primaryMood = 'Romantic';
    moodLabels.add('Romantic');
    moodLabels.add('Relaxing');
    moodLabels.add('Soulful');
    energyLevel = 'Medium';
    vibes = `Heartfelt poetic sentiments and emotional melodic curves designed for romantic moods.`;
  } else {
    primaryMood = 'Focus';
    moodLabels.add('Focus');
    moodLabels.add('Relaxing');
    energyLevel = 'Medium';
    vibes = `Smooth rhythmic continuity suited for background concentration.`;
  }

  return {
    songId: song.id,
    primaryMood,
    moodLabels: Array.from(moodLabels),
    energyLevel,
    vibes,
    confidence: 0.95,
    suggestedPlaylists: [primaryMood + ' Bollywood', 'Auto Curated'],
  };
}
