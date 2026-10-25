import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { importYouTubeSong } from '../server/youtubeMetadata.js';

const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('catalog.sources.json', root), 'utf8'));
const catalogPath = new URL('src/data/youtubeCatalog.json', root);

async function main() {
  if (!Array.isArray(sources) || sources.length === 0) throw new Error('Add verified official videos to catalog.sources.json.');
  const previous = JSON.parse(await readFile(catalogPath, 'utf8'));
  const previousSongs = new Map((previous.songs || []).map(song => [song.youtubeId, song]));
  const songs = new Map();
  const toImport = [];

  for (const source of sources) {
    const prev = previousSongs.get(source.youtubeId);
    if (prev && prev.duration && prev.coverUrl) {
      songs.set(source.youtubeId, {
        ...prev,
        title: source.title || prev.title,
        artist: source.artist || prev.artist,
        album: source.album !== undefined ? source.album : prev.album,
        language: source.language || prev.language,
        market: source.market || prev.market,
      });
    } else {
      toImport.push(source);
    }
  }

  console.log(`Retaining ${songs.size} existing songs. Importing ${toImport.length} new sources...`);

  for (let offset = 0; offset < toImport.length; offset += 3) {
    const batch = toImport.slice(offset, offset + 3);
    const results = await Promise.allSettled(batch.map(source => importYouTubeSong(source)));
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const song = res.value;
        const old = previousSongs.get(song.youtubeId);
        songs.set(song.youtubeId, { ...song, dateAdded: old?.dateAdded || song.dateAdded });
        console.log(`${song.language}: ${song.title} (${song.channelTitle}, ${song.duration}s)`);
      } else if (res.status === 'rejected') {
        console.warn(`[WARN] Failed to import: ${res.reason?.message}`);
      }
    }
  }

  const snapshot = {
    updatedAt: new Date().toISOString(),
    excludedVideoIds: (previous.excludedVideoIds || []).filter(id => !songs.has(id)),
    songs: [...songs.values()].sort((a, b) => (a.language || '').localeCompare(b.language || '') || a.title.localeCompare(b.title)),
  };

  const temporary = new URL('src/data/youtubeCatalog.json.tmp', root);
  try {
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    await rename(temporary, catalogPath);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  console.log(`Saved ${snapshot.songs.length} verified songs. Refresh the app to see the catalog.`);
}

main().catch(error => {
  console.error(`Catalog import error: ${error.message}`);
  process.exitCode = 1;
});
