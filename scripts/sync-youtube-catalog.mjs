import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { searchYouTube, refreshYouTubeSongs } from '../server/youtubeSearch.js';

const root = new URL('../', import.meta.url);
dotenv.config({ path: [fileURLToPath(new URL('.env.local', root)), fileURLToPath(new URL('.env', root))], quiet: true });

async function sync() {
  if (!process.env.YOUTUBE_API_KEY?.trim()) {
    throw new Error('Add YOUTUBE_API_KEY to .env.local, then run npm run catalog:sync again. No catalog files were changed.');
  }
  const config = JSON.parse(await readFile(new URL('catalog.config.json', root), 'utf8'));
  if (!Array.isArray(config.queries) || config.queries.length < 1 || config.queries.length > 30 ||
      config.queries.some((q) => typeof q !== 'string' || !q.trim() || q.length > 200) ||
      !Number.isInteger(config.pagesPerQuery) || config.pagesPerQuery < 1 || config.pagesPerQuery > 5 ||
      !['any', 'creativeCommon'].includes(config.license)) {
    throw new Error('Use 1–30 queries, 1–5 pagesPerQuery, and license any or creativeCommon in catalog.config.json.');
  }
  const catalogPath = new URL('src/data/youtubeCatalog.json', root);
  const previous = JSON.parse(await readFile(catalogPath, 'utf8'));
  // Recheck existing entries on every import; drop removed/private/non-embeddable videos.
  const refreshed = await refreshYouTubeSongs(previous.songs || [], config.license);
  const songs = new Map(refreshed.map((song) => [song.youtubeId, song]));
  for (const query of config.queries) {
    let pageToken = '';
    for (let page = 0; page < config.pagesPerQuery; page++) {
      const result = await searchYouTube({ q: query, license: config.license, pageToken });
      if (result.status !== 200) throw new Error(result.body.error);
      for (const song of result.body.songs) songs.set(song.youtubeId, song);
      console.log(`${query}: page ${page + 1}, ${result.body.count} available videos`);
      pageToken = result.body.nextPageToken;
      if (!pageToken) break;
    }
  }
  const snapshot = {
    updatedAt: new Date().toISOString(),
    excludedVideoIds: [...new Set([
      ...(previous.excludedVideoIds || []),
      ...(previous.songs || []).map((song) => song.youtubeId),
    ])].filter((id) => !songs.has(id)),
    songs: [...songs.values()].sort((a, b) => a.title.localeCompare(b.title)),
  };
  const temporaryPath = new URL('src/data/youtubeCatalog.json.tmp', root);
  try {
    await writeFile(temporaryPath, JSON.stringify(snapshot, null, 2) + '\n');
    await rename(temporaryPath, catalogPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  console.log(`Saved ${snapshot.songs.length} songs. Local search now uses this catalog. Build and deploy to update the public site.`);
}

sync().catch((error) => {
  console.error(`Catalog import failed: ${error.message}`);
  process.exitCode = 1;
});
