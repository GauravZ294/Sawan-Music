const API_ORIGIN = 'https://api.freqblog.com';

export class FreqBlogError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function textParameter(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) {
    throw new FreqBlogError(400, 'INVALID_QUERY', `Enter a ${name} of 1–200 characters.`);
  }
  return value.trim();
}

function integerParameter(value, fallback, max, minimum = 1) {
  if (value === undefined) return fallback;
  if (!/^[0-9]+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) ||
      Number(value) < minimum || Number(value) > max) {
    throw new FreqBlogError(400, 'INVALID_PAGE', 'Choose a valid page and result limit.');
  }
  return Number(value);
}

const optionalText = value => typeof value === 'string' ? value : '';

export function mapFreqBlogTrack(record) {
  if (!record || typeof record.track_name !== 'string' || !record.track_name.trim() ||
      typeof record.artist_name !== 'string' || !record.artist_name.trim()) return null;
  const duration = Number(record.duration_ms);
  let artworkUrl;
  try {
    const url = new URL(record.artwork_url);
    if (url.protocol === 'https:' && !url.username && !url.password &&
        (url.hostname === 'mzstatic.com' || url.hostname.endsWith('.mzstatic.com'))) {
      artworkUrl = url.href;
    }
  } catch {}
  return {
    id: String(record.itunes_track_id || `${record.artist_name}:${record.track_name}`),
    title: record.track_name, artist: record.artist_name,
    album: optionalText(record.album_name), genre: optionalText(record.genre),
    releaseDate: typeof record.release_date === 'string' ? record.release_date : null,
    duration: Number.isFinite(duration) && duration > 0 ? duration / 1000 : 0,
    explicit: typeof record.explicit === 'boolean' ? record.explicit : null,
    isrc: typeof record.isrc === 'string' ? record.isrc : null,
    ...(artworkUrl ? { artworkUrl } : {}),
  };
}

function pageResponse(records, total = null, offset = 0) {
  if (!Array.isArray(records)) throw new FreqBlogError(502, 'INVALID_RESPONSE', 'FreqBlog returned an unexpected catalog response. Try again.');
  const unique = new Map();
  for (const record of records) {
    const mapped = mapFreqBlogTrack(record);
    if (mapped) unique.set(mapped.id, mapped);
  }
  return {
    tracks: [...unique.values()], total, count: unique.size,
    hasMore: total !== null && records.length > 0 && offset + records.length < total,
    nextOffset: offset + records.length,
  };
}

export function createFreqBlogClient({ apiKey = process.env.FREQBLOG_API_KEY, fetchImpl = fetch } = {}) {
  async function request(path, params = {}) {
    if (!apiKey?.trim()) throw new FreqBlogError(503, 'NOT_CONFIGURED', 'The music catalog is not configured. Add FREQBLOG_API_KEY on the server.');
    const url = new URL(path, API_ORIGIN);
    url.search = new URLSearchParams(params).toString();
    let response;
    let body;
    try {
      response = await fetchImpl(url, {
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(25000), redirect: 'error',
      });
      body = await response.json();
    } catch {
      throw new FreqBlogError(502, 'SERVICE_UNAVAILABLE', 'Could not connect to FreqBlog. Please try again.');
    }
    // Public errors are fixed messages; upstream bodies may contain private account data.
    if (response.status === 401) throw new FreqBlogError(401, 'INVALID_KEY', 'FreqBlog did not accept the server API key. Check the key in .env.local.');
    if (response.status === 403) throw new FreqBlogError(403, 'PLAN_LIMIT', 'Your FreqBlog plan does not include this feature.');
    if (response.status === 429) throw new FreqBlogError(429, 'QUOTA_LIMIT', 'FreqBlog request limits have been reached. Check your remaining quota and try again later.');
    if (response.status === 404) throw new FreqBlogError(404, 'NOT_FOUND', 'No matching catalog entries were found.');
    if (!response.ok) throw new FreqBlogError(502, 'SERVICE_UNAVAILABLE', 'FreqBlog could not complete this request. Please try again.');
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new FreqBlogError(502, 'INVALID_RESPONSE', 'FreqBlog returned an unexpected response. Please try again.');
    }
    return body;
  }

  return {
    async status() {
      if (!apiKey?.trim()) return { configured: false, connected: false };
      const account = await request('/me/stats');
      const limit = Math.max(0, Number(account.monthly_quota) || 0);
      const used = Math.max(0, Number(account.requests_this_month) || 0);
      return {
        configured: true, connected: true, tier: optionalText(account.tier),
        quota: { limit, used, remaining: Math.max(0, limit - used), resetAt: optionalText(account.quota_reset_date) },
      };
    },
    async search({ q, limit } = {}) {
      const query = textParameter(q, 'search');
      const body = await request('/search', { q: query, limit: integerParameter(limit, 50, 50) });
      return pageResponse(body.results);
    },
    async genres() {
      const body = await request('/genres', { limit: 500 });
      if (!Array.isArray(body.genres)) throw new FreqBlogError(502, 'INVALID_RESPONSE', 'FreqBlog returned an unexpected genre response.');
      return { genres: body.genres.filter(g => g && typeof g.genre === 'string').map(g => ({
        name: g.genre, count: Math.max(0, Number(g.track_count) || 0),
      })) };
    },
    async browse({ genre, limit, offset } = {}) {
      const name = textParameter(genre, 'genre');
      const start = integerParameter(offset, 0, Number.MAX_SAFE_INTEGER, 0);
      const body = await request(`/genres/${encodeURIComponent(name)}/tracks`, {
        limit: integerParameter(limit, 100, 100), offset: start, include_subgenres: true,
      });
      return pageResponse(body.tracks, Number(body.total) || 0, start);
    },
    async artist({ artist, limit, offset } = {}) {
      const name = textParameter(artist, 'artist');
      const start = integerParameter(offset, 0, Number.MAX_SAFE_INTEGER, 0);
      const body = await request('/artist/tracks', { artist: name, limit: integerParameter(limit, 100, 100), offset: start });
      return pageResponse(body.tracks, Number(body.total) || 0, start);
    },
    async charts({ country = 'IN', limit, type = 'most-played' } = {}) {
      if (typeof country !== 'string' || !/^[A-Za-z]{2}$/.test(country) || !['most-played', 'new-music'].includes(type)) {
        throw new FreqBlogError(400, 'INVALID_CHART', 'Choose a valid country and chart type.');
      }
      const body = await request(`/charts/${country.toLowerCase()}`, { limit: integerParameter(limit, 100, 100), type });
      if (!Array.isArray(body.entries)) throw new FreqBlogError(502, 'INVALID_RESPONSE', 'FreqBlog returned an unexpected chart response.');
      return pageResponse(body.entries.filter(entry => entry && typeof entry === 'object').map(entry => ({
        ...entry.catalog_track, ...entry,
        itunes_track_id: entry.itunes_track_id || entry.catalog_track?.itunes_track_id,
        album_name: entry.album_name || entry.catalog_track?.album_name,
        release_date: entry.release_date || entry.catalog_track?.release_date,
      })));
    },
  };
}
