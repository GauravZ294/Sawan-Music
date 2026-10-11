import test from 'node:test';
import assert from 'node:assert/strict';
import { importYouTubeSong, readPlayerMetadata } from '../server/youtubeMetadata.js';

const source = {
  youtubeId: 'aaaaaaaaaaa', title: 'Original song', artist: 'Artist',
  channelTitle: 'Official artist', language: 'Gujarati',
};
const payload = {
  videoDetails: { videoId: source.youtubeId, lengthSeconds: '213', channelId: 'channel-id', isPrivate: false },
  microformat: { playerMicroformatRenderer: {
    category: 'Music', publishDate: '2026-09-01T12:00:00Z', availableCountries: ['IN', 'US'],
  } },
  playabilityStatus: { status: 'OK', playableInEmbed: true },
  streamingData: { formats: [{ url: 'https://example.test/do-not-import-audio' }] },
};
const html = value => `<script>var ytInitialPlayerResponse = ${JSON.stringify(value)};</script>`;
const oembed = {
  author_name: source.channelTitle, title: 'Original song (Official Video)',
  thumbnail_url: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg',
};
const mockedFetch = (player = payload, embed = oembed) => async url => new Response(
  String(url).includes('/oembed?') ? JSON.stringify(embed) : html(player),
);

test('imports verified metadata and language without storing media URLs', async () => {
  const song = await importYouTubeSong(source, {
    fetchImpl: mockedFetch(), now: new Date('2026-10-10T00:00:00Z'),
  });
  assert.equal(song.duration, 213);
  assert.equal(song.language, 'Gujarati');
  assert.equal(song.year, 2026);
  assert.equal(song.youtubeUrl, 'https://www.youtube.com/watch?v=aaaaaaaaaaa');
  assert.equal(song.channelTitle, source.channelTitle);
  assert.equal(song.audioSrc, undefined);
  assert.equal(JSON.stringify(song).includes('do-not-import-audio'), false);
});

test('rejects blocked embeds, unofficial reuploads, and region restrictions', async () => {
  for (const change of [
    { playabilityStatus: { status: 'OK', playableInEmbed: false } },
    { videoDetails: { ...payload.videoDetails, isPrivate: true } },
    { microformat: { playerMicroformatRenderer: {
      ...payload.microformat.playerMicroformatRenderer, availableCountries: ['US'],
    } } },
  ]) {
    await assert.rejects(importYouTubeSong(source, {
      fetchImpl: mockedFetch({ ...payload, ...change }), now: new Date('2026-10-10'),
    }), /unavailable for embedding/);
  }
  await assert.rejects(importYouTubeSong(source, {
    fetchImpl: mockedFetch(payload, { ...oembed, author_name: 'Unofficial reupload' }),
  }), /channel does not match/);
});

test('rejects invalid sources before requesting YouTube', async () => {
  await assert.rejects(importYouTubeSong({ ...source, youtubeId: '../bad' }, {
    fetchImpl: () => assert.fail('Unexpected request'),
  }), /valid YouTube ID/);
});

test('imports verified film songs labeled Entertainment only when the source declares that category', async () => {
  const filmSong = { ...payload, microformat: { playerMicroformatRenderer: {
    ...payload.microformat.playerMicroformatRenderer, category: 'Entertainment',
  } } };
  const options = { fetchImpl: mockedFetch(filmSong), now: new Date('2026-10-10') };
  await assert.rejects(importYouTubeSong(source, options), /unavailable for embedding/);
  const song = await importYouTubeSong({ ...source, youtubeCategory: 'Entertainment', market: 'south' }, options);
  assert.equal(song.youtubeCategory, 'Entertainment');
  assert.equal(song.market, 'south');
  assert.equal(song.audioSrc, undefined);
});

test('reads JSON with braces and escaped quotes and rejects missing metadata', () => {
  const metadata = readPlayerMetadata(html({ ...payload, videoDetails: {
    ...payload.videoDetails, title: 'A }; title with "quotes" and {braces}',
  } }));
  assert.equal(metadata.duration, 213);
  assert.throws(() => readPlayerMetadata('<html>Unavailable</html>'), /did not return/);
  assert.equal(metadata.streamingData, undefined);
});
