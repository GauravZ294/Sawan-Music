import { BOLLYWOOD_FALLBACK_CATALOG } from '../../src/data/youtubeFallbackCatalog';

interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const queryValue = req.query.q;
  const categoryValue = req.query.category;
  const query = (Array.isArray(queryValue) ? queryValue[0] : queryValue || 'Bollywood Trending Songs 2024').trim();
  const category = (Array.isArray(categoryValue) ? categoryValue[0] : categoryValue || 'all').toLowerCase();
  const normalizedQuery = query.toLowerCase();

  let songs = [...BOLLYWOOD_FALLBACK_CATALOG];
  if (category !== 'all') songs = songs.filter((song) => song.category === category);
  if (normalizedQuery) {
    const matches = songs.filter((song) =>
      [song.title, song.artist, song.album, song.titleDevanagari]
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
    if (matches.length) songs = matches;
  }

  const today = new Date().toISOString().slice(0, 10);
  const formattedSongs = songs.map((song) => ({
    ...song,
    bpm: 80,
    lyrics: song.lyricsExcerpt,
    coverUrl: `https://img.youtube.com/vi/${song.youtubeId}/hqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${song.youtubeId}`,
    isYoutubeSource: true,
    isFavorite: false,
    playlistIds: [],
    dateAdded: today,
    playCount: 20,
  }));

  return res.status(200).json({ success: true, count: formattedSongs.length, query, songs: formattedSongs });
}
