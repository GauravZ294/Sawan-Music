// Import public metadata only. Recordings stay in the official YouTube player.
export function readPlayerMetadata(html) {
  const assignment = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*/.exec(html);
  if (!assignment) throw new Error('YouTube did not return video metadata.');
  const start = assignment.index + assignment[0].length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < html.length; index++) {
    const character = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) {
      const response = JSON.parse(html.slice(start, index + 1));
      // Deliberately return only catalog fields, never media URLs or recordings.
      const details = response.videoDetails || {};
      const format = response.microformat?.playerMicroformatRenderer || {};
      return {
        videoId: details.videoId,
        duration: Number(details.lengthSeconds),
        channelId: details.channelId || format.externalChannelId || '',
        publishedAt: format.publishDate || format.uploadDate || '',
        category: format.category,
        isPrivate: details.isPrivate,
        isLive: details.isLiveContent,
        countries: format.availableCountries,
        embeddable: response.playabilityStatus?.playableInEmbed === true,
        available: response.playabilityStatus?.status === 'OK',
      };
    }
  }
  throw new Error('YouTube returned incomplete video metadata.');
}

export async function importYouTubeSong(source, {
  fetchImpl = fetch, now = new Date(), region = 'IN',
} = {}) {
  if (!source || !/^[A-Za-z0-9_-]{11}$/.test(source.youtubeId || '') ||
      (source.language !== undefined && (typeof source.language !== 'string' || !source.language.trim() || source.language.length > 80)) ||
      typeof source.title !== 'string' || !source.title.trim() ||
      typeof source.artist !== 'string' || !source.artist.trim() ||
      (source.market !== undefined && !['bollywood', 'hollywood', 'south'].includes(source.market)) ||
      (source.youtubeCategory !== undefined && !['Music', 'Entertainment'].includes(source.youtubeCategory)) ||
      (source.garbaStyles !== undefined && (!Array.isArray(source.garbaStyles) ||
        source.garbaStyles.some(style => !['garba', 'dandiya', 'titoda', 'dodhiya', 'mandli', 'kathiyawadi'].includes(style)))) ||
      typeof source.channelTitle !== 'string' || !source.channelTitle.trim()) {
    throw new Error('Each source needs a valid YouTube ID, title, artist, official channel, and a valid optional language.');
  }
  const youtubeUrl = `https://www.youtube.com/watch?v=${source.youtubeId}`;
  const oembedUrl = new URL('https://www.youtube.com/oembed');
  oembedUrl.search = new URLSearchParams({ url: youtubeUrl, format: 'json' }).toString();
  const [oembedResponse, watchResponse] = await Promise.all([
    fetchImpl(oembedUrl, { signal: AbortSignal.timeout(20000) }),
    fetchImpl(youtubeUrl, { signal: AbortSignal.timeout(20000) }),
  ]);
  if (!oembedResponse.ok || !watchResponse.ok) {
    throw new Error(`${source.title}: YouTube did not provide an available embed.`);
  }
  const [oembed, html] = await Promise.all([oembedResponse.json(), watchResponse.text()]);
  const metadata = readPlayerMetadata(html);
  if (metadata.videoId !== source.youtubeId || !metadata.available || !metadata.embeddable ||
      metadata.isPrivate || metadata.isLive || metadata.category !== (source.youtubeCategory || 'Music') ||
      !Number.isFinite(metadata.duration) || metadata.duration < 60 ||
      (Array.isArray(metadata.countries) && !metadata.countries.includes(region))) {
    throw new Error(`${source.title}: The original music video is unavailable for embedding in ${region}.`);
  }
  if (oembed.author_name !== source.channelTitle) {
    throw new Error(`${source.title}: The YouTube channel does not match the verified official source.`);
  }
  const published = Date.parse(metadata.publishedAt);
  if (!Number.isFinite(published) || published > now.getTime()) {
    throw new Error(`${source.title}: YouTube did not provide a valid release date.`);
  }
  return {
    id: `youtube-${source.youtubeId}`,
    youtubeId: source.youtubeId, youtubeUrl,
    title: source.title.trim(), artist: source.artist.trim(),
    channelTitle: oembed.author_name, channelId: metadata.channelId,
    youtubeCategory: metadata.category,
    album: source.album || '', language: source.language,
    ...(source.market ? { market: source.market } : {}),
    ...(source.garbaStyles?.length ? { garbaStyles: [...new Set(source.garbaStyles)] } : {}),
    category: 'regular', genre: source.language ? `${source.language} ${source.garbaStyles?.length ? 'Garba' : 'Music'}` : 'Music',
    duration: metadata.duration, year: new Date(published).getUTCFullYear(),
    publishedAt: metadata.publishedAt,
    coverUrl: oembed.thumbnail_url,
    mood: '', bpm: 0, lyrics: '',
    isYoutubeSource: true, isCatalogSong: true,
    isFavorite: false, playlistIds: [], playCount: 0,
    dateAdded: now.toISOString().slice(0, 10),
  };
}
