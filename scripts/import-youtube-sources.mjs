import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { importYouTubeSong } from '../server/youtubeMetadata.js';

const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('catalog.sources.json', root), 'utf8'));
const catalogPath = new URL('src/data/youtubeCatalog.json', root);

async function main() {
  if (!Array.isArray(sources) || sources.length === 0) throw new Error('Add verified official videos to catalog.sources.json.');
  const previous = JSON.parse(await readFile(catalogPath, 'utf8'));
  const previousSongs = new Map((previous.songs || []).map(song => [song.youtubeId, song]));
  // Recheck retained entries as well, so updatedAt never makes unchecked videos fresh.
  const selected = new Map(previousSongs);
  for (const source of sources) selected.set(source.youtubeId, source);
  const importSources = [...selected.values()];
  const songs = new Map();
  // Fetch in small batches. Any verification failure preserves the saved catalog.
  for (let offset = 0; offset < importSources.length; offset += 3) {
    const imported = await Promise.all(importSources.slice(offset, offset + 3).map(source => importYouTubeSong(source)));
    for (const song of imported) {
      const old = previousSongs.get(song.youtubeId);
      songs.set(song.youtubeId, { ...song, dateAdded: old?.dateAdded || song.dateAdded });
      console.log(`${song.language}: ${song.title} (${song.channelTitle}, ${song.duration}s)`);
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
  console.error(`Catalog import failed: ${error.message} The saved catalog has not changed.`);
  process.exitCode = 1;
});
