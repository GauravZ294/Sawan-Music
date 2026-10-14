import { searchYouTube } from '../../server/youtubeSearch.js';

const LANGUAGES = ['Gujarati', 'Hindi', 'English', 'Telugu', 'Punjabi', 'Tamil'];

// Search public, embeddable YouTube music metadata. Playback remains in the official player.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET to search YouTube songs.' });
  }
  const language = String(req.query?.language || '');
  if (!LANGUAGES.includes(language)) return res.status(400).json({ error: 'Choose a supported song language.' });
  const result = await searchYouTube({ q: `${language} popular songs`, market: language === 'English' ? 'hollywood' : 'all' });
  if (result.status !== 200) return res.status(result.status).json(result.body);
  const songs = result.body.songs.map((song) => ({ ...song, language }));
  return res.status(200).json({ ...result.body, language, songs });
}
