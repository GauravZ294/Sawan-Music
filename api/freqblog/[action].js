import { createFreqBlogClient, FreqBlogError } from '../../server/freqblog.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET to browse the music catalog.' });
  }
  const { action, ...params } = req.query || {};
  if (!['status', 'search', 'genres', 'browse', 'artist', 'charts'].includes(action)) {
    return res.status(404).json({ error: 'This music catalog action is unavailable.' });
  }
  try {
    return res.status(200).json(await createFreqBlogClient()[action](params));
  } catch (error) {
    return res.status(error instanceof FreqBlogError ? error.status : 502).json({
      code: error instanceof FreqBlogError ? error.code : 'SERVICE_UNAVAILABLE',
      error: error instanceof FreqBlogError ? error.message : 'The music catalog is temporarily unavailable.',
    });
  }
}
