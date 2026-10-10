const markets = {
  all: '', bollywood: ' Bollywood', hollywood: ' English music',
  south: ' Tamil Telugu Malayalam Kannada music',
};
const categories = {
  all: '', regular: ' original song', remix: ' remix', lofi: ' lofi', mashup: ' mashup',
};
const failure = (status, code, error) => ({ status, body: { success: false, code, error } });

function durationSeconds(value = '') {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}

function available(video, license) {
  return video?.status?.embeddable === true && video.status.privacyStatus === 'public' &&
    (license !== 'creativeCommon' || video.status.license === 'creativeCommon');
}

function toSong(video, category = 'regular') {
  const snippet = video.snippet || {};
  return {
    id: `youtube-${video.id}`, youtubeId: video.id,
    title: snippet.title || 'YouTube video', artist: snippet.channelTitle || 'YouTube channel',
    channelTitle: snippet.channelTitle || '', channelId: snippet.channelId || '',
    album: '', category, genre: 'Music', mood: '', bpm: 0, lyrics: '',
    year: Number((snippet.publishedAt || '').slice(0, 4)) || new Date().getFullYear(),
    duration: durationSeconds(video.contentDetails?.duration),
    coverUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
    youtubeLicense: video.status.license || 'youtube',
    isYoutubeSource: true, isFavorite: false, playlistIds: [],
    dateAdded: new Date().toISOString().slice(0, 10), playCount: 0,
  };
}

// Refresh metadata without downloading or storing audio/video.
export async function refreshYouTubeSongs(songs, license = 'any', { apiKey = process.env.YOUTUBE_API_KEY, fetchImpl = fetch } = {}) {
  const refreshed = [];
  for (let offset = 0; offset < songs.length; offset += 50) {
    const batch = songs.slice(offset, offset + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({ key: apiKey, part: 'snippet,contentDetails,status', id: batch.map((song) => song.youtubeId).join(',') }).toString();
    let payload;
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Upstream error');
      payload = await response.json();
    } catch {
      throw new Error('Could not refresh the existing catalog. Check the API key and quota. The saved catalog has been preserved.');
    }
    const byId = new Map((payload.items || []).map((video) => [video.id, video]));
    for (const previous of batch) {
      const video = byId.get(previous.youtubeId);
      if (available(video, license)) refreshed.push({ ...toSong(video), dateAdded: previous.dateAdded });
    }
  }
  return refreshed;
}

/** Search metadata only. Playback always goes through the official YouTube player. */
export async function searchYouTube(input, { apiKey = process.env.YOUTUBE_API_KEY, fetchImpl = fetch } = {}) {
  const { q = 'popular music', market = 'all', category = 'all', license = 'any', pageToken = '' } = input;
  if ([q, market, category, license, pageToken].some((value) => typeof value !== 'string') ||
      !q.trim() || q.length > 200 || pageToken.length > 512 ||
      !Object.hasOwn(markets, market) || !Object.hasOwn(categories, category) ||
      !['any', 'creativeCommon'].includes(license)) {
    return failure(400, 'INVALID_SEARCH', 'Please enter a search of 1–200 characters and valid filters.');
  }
  if (!apiKey?.trim() || apiKey.startsWith('MY_')) {
    return failure(503, 'YOUTUBE_NOT_CONFIGURED', 'Live YouTube search is not available yet. You can still open YouTube directly.');
  }

  async function request(resource, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    url.search = new URLSearchParams({ ...params, key: apiKey }).toString();
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
    const body = await response.json();
    if (!response.ok) {
      const reason = body?.error?.errors?.[0]?.reason;
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || response.status === 429) {
        throw failure(503, 'YOUTUBE_QUOTA_EXCEEDED', 'YouTube search quota has been reached. Please try again later.');
      }
      if (reason === 'invalidPageToken') {
        throw failure(400, 'INVALID_PAGE_TOKEN', 'These search results have expired. Please search again.');
      }
      throw failure(502, 'YOUTUBE_UNAVAILABLE', 'YouTube could not complete this search. Please try again later.');
    }
    return body;
  }

  try {
    const params = {
      part: 'snippet', q: `${q.trim()}${markets[market]}${categories[category]}`,
      type: 'video', videoCategoryId: '10', videoEmbeddable: 'true', videoSyndicated: 'true',
      videoLicense: license, maxResults: '50', order: 'relevance', pageToken,
    };
    const search = await request('search', params);
    const ids = [...new Set((search.items || []).map((item) => item.id?.videoId)
      .filter((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)))];
    const details = ids.length ? await request('videos', {
      part: 'snippet,contentDetails,status', id: ids.join(','),
    }) : { items: [] };
    const byId = new Map((details.items || []).map((video) => [video.id, video]));
    const songs = ids.map((id) => byId.get(id)).filter((video) => available(video, license))
      .map((video) => toSong(video, category === 'all' ? 'regular' : category));
    return { status: 200, body: {
      success: true, source: 'youtube', query: q.trim(), market, category, license,
      count: songs.length, songs, nextPageToken: search.nextPageToken || null,
    } };
  } catch (error) {
    // Never return upstream URLs or error messages containing the API key.
    if (error?.body?.code) return error;
    return failure(502, 'YOUTUBE_UNAVAILABLE', 'YouTube search is temporarily unavailable. Please try again.');
  }
}
