import test from 'node:test';
import assert from 'node:assert/strict';
import { createFreqBlogClient, FreqBlogError, mapFreqBlogTrack } from '../server/freqblog.js';

// All requests use fixtures and this non-working credential. Never read local env files.
const FAKE_KEY = 'fb_test_mock_not_a_real_credential';
const PRIVATE_DETAIL = `Private account detail: person@example.test ${FAKE_KEY}`;
const source = {
  itunes_track_id: '123456789', track_name: 'A Song', artist_name: 'An Artist',
  album_name: 'An Album', genre: 'pop', release_date: '2026-10-01',
  duration_ms: 213500, explicit: false, isrc: 'TEST12345678',
};
const another = { ...source, itunes_track_id: '987654321', track_name: 'Another Song' };

function mockClient(payload, status = 200) {
  const calls = [];
  const client = createFreqBlogClient({
    apiKey: FAKE_KEY,
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      const body = typeof payload === 'function' ? payload(new URL(url)) : payload;
      return new Response(JSON.stringify(body), { status });
    },
  });
  return { client, calls };
}

function isPublicError(status, code) {
  return error => {
    assert.ok(error instanceof FreqBlogError);
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    assert.ok(error.message.length > 0);
    const exposed = `${error.message} ${JSON.stringify(error)}`;
    assert.equal(exposed.includes(FAKE_KEY), false);
    assert.equal(exposed.includes('person@example.test'), false);
    assert.equal(exposed.includes(PRIVATE_DETAIL), false);
    return true;
  };
}

test('keeps the credential in a header on fixed-origin backend requests', async () => {
  const { client, calls } = mockClient(url => {
    if (url.pathname === '/me/stats') return {};
    if (url.pathname === '/genres') return { genres: [] };
    if (url.pathname === '/search') return { results: [] };
    if (url.pathname.startsWith('/charts/')) return { entries: [] };
    return { total: 0, tracks: [] };
  });
  await client.status();
  await client.search({ q: 'https://another-host.example.test/music' });
  await client.genres();
  await client.browse({ genre: 'singer/songwriter' });
  await client.artist({ artist: 'An Artist' });
  await client.charts({ country: 'IN' });
  assert.equal(calls.length, 6);
  for (const { url, options } of calls) {
    assert.equal(url.origin, 'https://api.freqblog.com');
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(url.href.includes(FAKE_KEY), false);
    assert.equal(options.body, undefined);
    assert.equal(new Headers(options.headers).get('X-Api-Key'), FAKE_KEY);
    assert.equal(new Headers(options.headers).get('Accept'), 'application/json');
    assert.equal(options.redirect, 'error');
  }
  assert.equal(calls[1].url.searchParams.get('q'), 'https://another-host.example.test/music');
  assert.equal(calls[3].url.pathname, '/genres/singer%2Fsongwriter/tracks');
  assert.equal(calls[3].url.searchParams.get('include_subgenres'), 'true');
  assert.equal(calls[5].url.pathname, '/charts/in');
});

test('maps descriptive metadata without manufacturing playback sources or language', () => {
  const mapped = mapFreqBlogTrack({
    ...source, language: 'Hindi', audioSrc: 'https://example.test/full.mp3',
    youtubeId: 'aaaaaaaaaaa', preview_url: 'https://example.test/preview.mp3',
    email: 'person@example.test', key_prefix: FAKE_KEY,
  });
  assert.deepEqual(mapped, {
    id: source.itunes_track_id, title: source.track_name, artist: source.artist_name,
    album: source.album_name, genre: source.genre, releaseDate: source.release_date,
    duration: 213.5, explicit: false, isrc: source.isrc,
  });
  for (const field of ['language', 'audioSrc', 'youtubeId', 'preview_url', 'email', 'key_prefix']) {
    assert.equal(Object.hasOwn(mapped, field), false);
  }
});

test('handles incomplete metadata and rejects records without title or artist', () => {
  assert.deepEqual(mapFreqBlogTrack({
    track_name: 'પંખીડા', artist_name: 'Artist', duration_ms: 'invalid',
  }), {
    id: 'Artist:પંખીડા', title: 'પંખીડા', artist: 'Artist', album: '', genre: '',
    releaseDate: null, duration: 0, explicit: null, isrc: null,
  });
  for (const duration_ms of [-1, Infinity, null]) {
    assert.equal(mapFreqBlogTrack({ ...source, duration_ms }).duration, 0);
  }
  for (const record of [null, {}, { ...source, track_name: ' ' }, { ...source, artist_name: 12 }]) {
    assert.equal(mapFreqBlogTrack(record), null);
  }
});

test('advances genre offsets by upstream rows when invalid and duplicate rows are filtered', async () => {
  const { client, calls } = mockClient({ total: 12, tracks: [source, source, {}, another] });
  const page = await client.browse({ genre: ' pop ', limit: '4', offset: '6' });
  assert.equal(calls[0].url.searchParams.get('limit'), '4');
  assert.equal(calls[0].url.searchParams.get('offset'), '6');
  assert.equal(calls[0].url.pathname, '/genres/pop/tracks');
  assert.deepEqual(page.tracks.map(track => track.id), [source.itunes_track_id, another.itunes_track_id]);
  assert.equal(page.count, 2);
  assert.equal(page.total, 12);
  assert.equal(page.nextOffset, 10);
  assert.equal(page.hasMore, true);
});

test('artist pagination ends at the upstream total and empty pages cannot loop', async () => {
  const { client, calls } = mockClient({ total: 5, tracks: [source, another] });
  const page = await client.artist({ artist: ' An Artist ', limit: 2, offset: 3 });
  assert.equal(calls[0].url.pathname, '/artist/tracks');
  assert.equal(calls[0].url.searchParams.get('artist'), 'An Artist');
  assert.equal(calls[0].url.searchParams.get('offset'), '3');
  assert.equal(page.nextOffset, 5);
  assert.equal(page.hasMore, false);
  const empty = await mockClient({ total: 100, tracks: [] }).client.browse({ genre: 'pop', offset: 10 });
  assert.equal(empty.nextOffset, 10);
  assert.equal(empty.hasMore, false);
});

test('search deduplicates results and does not advertise unsupported pagination', async () => {
  const { client, calls } = mockClient({ count: 3, results: [source, another, source] });
  const result = await client.search({ q: ' An Artist ', limit: 20 });
  assert.equal(calls[0].url.searchParams.get('q'), 'An Artist');
  assert.equal(calls[0].url.searchParams.get('limit'), '20');
  assert.equal(calls[0].url.searchParams.has('offset'), false);
  assert.equal(result.count, 2);
  assert.equal(result.total, null);
  assert.equal(result.hasMore, false);
});

test('returns only public account status and quota fields', async () => {
  const { client } = mockClient({
    tier: 'free', monthly_quota: '1000', requests_this_month: 37,
    quota_reset_date: '2026-11-01', email: 'person@example.test',
    api_key: FAKE_KEY, key_prefix: 'fb_test_mock', billing: { secret: PRIVATE_DETAIL },
  });
  const status = await client.status();
  assert.deepEqual(status, {
    configured: true, connected: true, tier: 'free',
    quota: { limit: 1000, used: 37, remaining: 963, resetAt: '2026-11-01' },
  });
  assert.equal(JSON.stringify(status).includes('person@example.test'), false);
  assert.equal(JSON.stringify(status).includes('fb_test_mock'), false);
  const exhausted = await mockClient({ monthly_quota: 1000, requests_this_month: 1001 }).client.status();
  assert.equal(exhausted.quota.remaining, 0);
});

test('missing configuration does not perform network requests', async () => {
  const client = createFreqBlogClient({ apiKey: ' ', fetchImpl: () => assert.fail('Unexpected request') });
  assert.deepEqual(await client.status(), { configured: false, connected: false });
  for (const call of [
    () => client.search({ q: 'song' }), () => client.genres(),
    () => client.browse({ genre: 'pop' }), () => client.artist({ artist: 'Artist' }),
    () => client.charts(),
  ]) {
    await assert.rejects(call(), isPublicError(503, 'NOT_CONFIGURED'));
  }
});

test('invalid input is rejected before any network request', async () => {
  const client = createFreqBlogClient({ apiKey: FAKE_KEY, fetchImpl: () => assert.fail('Unexpected request') });
  const cases = [
    [() => client.search(), 'INVALID_QUERY'],
    [() => client.search({ q: ' ' }), 'INVALID_QUERY'],
    [() => client.search({ q: 'x'.repeat(201) }), 'INVALID_QUERY'],
    [() => client.search({ q: ['song'] }), 'INVALID_QUERY'],
    [() => client.search({ q: 'song', limit: 51 }), 'INVALID_PAGE'],
    [() => client.search({ q: 'song', limit: 0 }), 'INVALID_PAGE'],
    [() => client.search({ q: 'song', limit: 1.5 }), 'INVALID_PAGE'],
    [() => client.search({ q: 'song', limit: '0x10' }), 'INVALID_PAGE'],
    [() => client.browse({ genre: 'pop', limit: 101 }), 'INVALID_PAGE'],
    [() => client.browse({ genre: 'pop', offset: -1 }), 'INVALID_PAGE'],
    [() => client.browse({ genre: 'pop', offset: Number.MAX_SAFE_INTEGER + 1 }), 'INVALID_PAGE'],
    [() => client.artist({ artist: '' }), 'INVALID_QUERY'],
    [() => client.artist({ artist: 'Artist', offset: '1.1' }), 'INVALID_PAGE'],
    [() => client.charts({ country: 'IND' }), 'INVALID_CHART'],
    [() => client.charts({ country: '../../evil' }), 'INVALID_CHART'],
    [() => client.charts({ type: 'unknown' }), 'INVALID_CHART'],
    [() => client.charts({ limit: 101 }), 'INVALID_PAGE'],
  ];
  for (const [call, code] of cases) await assert.rejects(call(), isPublicError(400, code));
});

test('upstream key, quota, and service errors never expose private details', async () => {
  for (const [upstreamStatus, publicStatus, code] of [
    [401, 401, 'INVALID_KEY'], [403, 403, 'PLAN_LIMIT'], [429, 429, 'QUOTA_LIMIT'],
    [404, 404, 'NOT_FOUND'], [500, 502, 'SERVICE_UNAVAILABLE'],
  ]) {
    const { client } = mockClient({ detail: PRIVATE_DETAIL, api_key: FAKE_KEY }, upstreamStatus);
    await assert.rejects(client.search({ q: 'song' }), isPublicError(publicStatus, code));
  }
});

test('network and malformed JSON failures are sanitized', async () => {
  for (const fetchImpl of [
    async () => { throw new Error(PRIVATE_DETAIL); },
    async () => new Response(`not JSON ${PRIVATE_DETAIL}`),
  ]) {
    const client = createFreqBlogClient({ apiKey: FAKE_KEY, fetchImpl });
    await assert.rejects(client.search({ q: 'song' }), isPublicError(502, 'SERVICE_UNAVAILABLE'));
  }
});

test('unexpected successful response shapes are reported as catalog errors', async () => {
  for (const payload of [null, [], {}, { results: null }, { results: {} }]) {
    await assert.rejects(mockClient(payload).client.search({ q: 'song' }), isPublicError(502, 'INVALID_RESPONSE'));
  }
  await assert.rejects(mockClient(null).client.status(), isPublicError(502, 'INVALID_RESPONSE'));
  await assert.rejects(mockClient({ genres: null }).client.genres(), isPublicError(502, 'INVALID_RESPONSE'));
});

test('genre browsing exposes only names and counts and tolerates malformed rows', async () => {
  const { client } = mockClient({ genres: [
    { genre: 'pop', track_count: 12, email: 'person@example.test' },
    { genre: 'folk', track_count: -2 }, null, { genre: 17, track_count: 5 },
  ] });
  assert.deepEqual(await client.genres(), { genres: [{ name: 'pop', count: 12 }, { name: 'folk', count: 0 }] });
});

test('chart results keep available catalog metadata when chart fields are null', async () => {
  const artwork = 'https://is1-ssl.mzstatic.com/image/thumb/Music/test.jpg/100x100bb.jpg';
  const { client, calls } = mockClient({ entries: [{
    rank: 1, track_name: source.track_name, artist_name: source.artist_name,
    itunes_track_id: null, album_name: null, in_catalog: true,
    catalog_track: source, artwork_url: artwork,
  }, null] });
  const result = await client.charts({ country: 'US', type: 'new-music', limit: 10 });
  assert.equal(calls[0].url.pathname, '/charts/us');
  assert.equal(calls[0].url.searchParams.get('type'), 'new-music');
  assert.equal(calls[0].url.searchParams.get('limit'), '10');
  assert.equal(result.count, 1);
  assert.equal(result.tracks[0].id, source.itunes_track_id);
  assert.equal(result.tracks[0].album, source.album_name);
  assert.equal(result.tracks[0].genre, source.genre);
  assert.equal(result.tracks[0].artworkUrl, artwork);
  assert.equal(result.tracks[0].audioSrc, undefined);
  assert.equal(result.tracks[0].youtubeId, undefined);
  assert.equal(result.tracks[0].language, undefined);
});

test('chart artwork accepts HTTPS Apple artwork hosts and rejects lookalikes and credentials', async () => {
  const allowed = 'https://is2-ssl.mzstatic.com/image/thumb/test.jpg';
  const rejected = [
    'http://is2-ssl.mzstatic.com/image.jpg', 'https://mzstatic.com.evil.test/image.jpg',
    'https://fake-mzstatic.com/image.jpg', 'https://example.test/image.jpg',
    'https://user:password@is2-ssl.mzstatic.com/image.jpg', 'javascript:alert(1)',
  ];
  const entries = [allowed, ...rejected].map((artwork_url, index) => ({
    ...source, itunes_track_id: String(index), artwork_url,
  }));
  const result = await mockClient({ entries }).client.charts();
  assert.equal(result.count, entries.length);
  assert.equal(result.tracks[0].artworkUrl, allowed);
  for (const track of result.tracks.slice(1)) assert.equal(Object.hasOwn(track, 'artworkUrl'), false);
});
