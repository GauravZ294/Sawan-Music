import test from 'node:test';
import assert from 'node:assert/strict';
import { searchYouTube, refreshYouTubeSongs } from '../server/youtubeSearch.js';
import { buildSiteCatalog, restoreLibrary } from '../src/utils/siteCatalog.ts';
import retiredSearch from '../api/youtube/search.js';

test('legacy Vercel search endpoint returns clear JSON for cached frontends', () => {
  const headers = {};
  let status;
  let body;
  const res = {
    setHeader(name, value) { headers[name] = value; },
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  };
  retiredSearch({ method: 'GET' }, res);
  assert.equal(status, 410);
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.equal(body.success, false);
  assert.equal(body.code, 'CATALOG_SEARCH_MOVED');
  assert.match(body.error, /Refresh this page/);
});

const key = 'test-key-never-returned';
const video = (id, overrides = {}) => ({
  id, snippet: { title: 'A song', channelTitle: 'An artist', publishedAt: '2025-01-01' },
  contentDetails: { duration: 'PT3M42S' },
  status: { embeddable: true, privacyStatus: 'public', license: 'youtube', ...overrides },
});
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('missing key fails explicitly without fabricating songs or contacting YouTube', async () => {
  const result = await searchYouTube({}, { apiKey: '', fetchImpl: () => assert.fail('Unexpected fetch') });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'YOUTUBE_NOT_CONFIGURED');
  assert.equal(result.body.songs, undefined);
});

test('imports unique embeddable music metadata and preserves pagination', async () => {
  const calls = [];
  const result = await searchYouTube({ q: 'a song', pageToken: 'page2' }, { apiKey: key,
    fetchImpl: async (url) => {
      calls.push(url);
      return url.pathname.endsWith('/search')
        ? response({ items: ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'aaaaaaaaaaa', 'ccccccccccc'].map((videoId) => ({ id: { videoId } })), nextPageToken: 'page3' })
        : response({ items: [video('aaaaaaaaaaa'), video('bbbbbbbbbbb', { embeddable: false })] });
    },
  });
  assert.equal(result.status, 200);
  assert.equal(calls[0].searchParams.get('videoEmbeddable'), 'true');
  assert.equal(calls[0].searchParams.get('videoSyndicated'), 'true');
  assert.equal(calls[0].searchParams.get('videoCategoryId'), '10');
  assert.equal(calls[0].searchParams.get('pageToken'), 'page2');
  assert.equal(result.body.nextPageToken, 'page3');
  assert.equal(result.body.songs.length, 1);
  assert.equal(result.body.songs[0].duration, 222);
  assert.equal(result.body.songs[0].audioSrc, undefined);
  assert.equal(JSON.stringify(result.body).includes(key), false);
});

test('Creative Commons filter is checked against video metadata', async () => {
  const result = await searchYouTube({ license: 'creativeCommon' }, { apiKey: key,
    fetchImpl: async (url) => url.pathname.endsWith('/search')
      ? response({ items: ['aaaaaaaaaaa', 'bbbbbbbbbbb'].map((videoId) => ({ id: { videoId } })) })
      : response({ items: [video('aaaaaaaaaaa'), video('bbbbbbbbbbb', { license: 'creativeCommon' })] }),
  });
  assert.deepEqual(result.body.songs.map((song) => song.youtubeId), ['bbbbbbbbbbb']);
});

test('quota, invalid inputs, and network errors remain actionable and do not leak secrets', async () => {
  const quota = await searchYouTube({}, { apiKey: key,
    fetchImpl: async () => response({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403),
  });
  assert.equal(quota.body.code, 'YOUTUBE_QUOTA_EXCEEDED');
  const invalid = await searchYouTube({ q: ['bad'] }, { apiKey: key });
  assert.equal(invalid.status, 400);
  const network = await searchYouTube({}, { apiKey: key, fetchImpl: async () => { throw new Error(key); } });
  assert.equal(network.status, 502);
  assert.equal(JSON.stringify(network).includes(key), false);
});

test('refresh removes deleted/private videos and updates retained metadata', async () => {
  const existing = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'].map((youtubeId) => ({ youtubeId, dateAdded: '2024-01-01' }));
  const refreshed = await refreshYouTubeSongs(existing, 'any', { apiKey: key,
    fetchImpl: async () => response({ items: [video('aaaaaaaaaaa'), video('bbbbbbbbbbb', { privacyStatus: 'private' })] }),
  });
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].dateAdded, '2024-01-01');
  assert.equal(refreshed[0].title, 'A song');
});

test('catalog merges matching videos without duplicating tracks or losing playlist identity', () => {
  const seed = { id: 'seed', youtubeId: 'aaaaaaaaaaa', title: 'Old title' };
  const imported = { id: 'youtube-aaaaaaaaaaa', youtubeId: 'aaaaaaaaaaa', title: 'Updated title' };
  const result = buildSiteCatalog([seed], [imported, imported]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'seed');
  assert.equal(result[0].title, 'Updated title');
});

test('restoring keeps preferences and local tracks, refreshes metadata, and drops removed catalog entries', () => {
  const site = [{ id: 'current', title: 'Fresh title', isCatalogSong: true }];
  const saved = [
    { id: 'current', title: 'Stale title', isFavorite: true, playCount: 7, playlistIds: ['favorites'], isCatalogSong: true },
    { id: 'removed', isCatalogSong: true },
    { id: 'my-upload', audioSrc: 'local-file' },
  ];
  const result = restoreLibrary(site, saved);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'Fresh title');
  assert.equal(result[0].isFavorite, true);
  assert.equal(result[0].playCount, 7);
  assert.deepEqual(result[0].playlistIds, ['favorites']);
  assert.equal(result[1].id, 'my-upload');
});

test('removed imported videos cannot reappear through the sample catalog', () => {
  assert.deepEqual(buildSiteCatalog([{ id: 'seed', youtubeId: 'aaaaaaaaaaa' }], [], ['aaaaaaaaaaa']), []);
  assert.deepEqual(restoreLibrary([], [{ id: 'seed', youtubeId: 'aaaaaaaaaaa' }], ['aaaaaaaaaaa']), []);
});
