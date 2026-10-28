export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const query = body.query || req.query?.q || '';

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Search query is required.' });
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await response.text();
    const songs = [];
    const seen = new Set();

    const matches = [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)];
    const titles = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"\}/g)];

    const videoIds = [...new Set(matches.map(m => m[1]))].slice(0, 20);
    const titleTexts = [...new Set(titles.map(m => m[1]))].filter(t => t && !t.includes('http') && t.length > 2);

    for (let i = 0; i < videoIds.length; i++) {
      const vId = videoIds[i];
      if (seen.has(vId)) continue;
      seen.add(vId);

      songs.push({
        id: `yt-live-${vId}`,
        youtubeId: vId,
        title: titleTexts[i] || `YouTube Track (${vId})`,
        artist: 'YouTube Music Channel',
        album: 'YouTube Live Search',
        coverUrl: `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
        duration: 210,
        genre: 'Music',
        year: 2026,
        isYoutubeSource: true,
        isCatalogSong: true
      });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      query: query.trim(),
      songs
    });
  } catch (err) {
    console.error('Vercel YouTube live search error:', err);
    return res.status(500).json({ success: false, error: 'Failed to search YouTube.' });
  }
}
