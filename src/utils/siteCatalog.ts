import type { Song } from '../types/music';

export function buildSiteCatalog(seeds: Song[], imported: Song[], excludedVideoIds: string[] = []): Song[] {
  const excluded = new Set(excludedVideoIds);
  const byVideo = new Map(imported.map((song) => [song.youtubeId, song]));
  const seen = new Set<string>();
  const result = seeds.filter((seed) => !seed.youtubeId || !excluded.has(seed.youtubeId)).map((seed) => {
    const match = seed.youtubeId ? byVideo.get(seed.youtubeId) : undefined;
    if (!match) return seed;
    seen.add(match.youtubeId!);
    return { ...match, id: seed.id, isCatalogSong: true };
  });
  for (const song of imported) {
    if (!song.youtubeId || seen.has(song.youtubeId)) continue;
    seen.add(song.youtubeId);
    result.push({ ...song, isCatalogSong: true });
  }
  return result;
}

export function restoreLibrary(siteSongs: Song[], saved: Song[], excludedVideoIds: string[] = []): Song[] {
  const excluded = new Set(excludedVideoIds);
  const previous = new Map(saved.map((song) => [song.id, song]));
  const ids = new Set(siteSongs.map((song) => song.id));
  return [
    ...siteSongs.map((song) => {
      const old = previous.get(song.id);
      if (!old) return song;
      // Refresh imported metadata, retaining the listener's own preferences.
      if (song.isCatalogSong) return {
        ...song, isFavorite: old.isFavorite, playCount: old.playCount, playlistIds: old.playlistIds,
      };
      return old.isCatalogSong ? song : old;
    }),
    ...saved.filter((song) => !ids.has(song.id) && !song.isCatalogSong && (!song.youtubeId || !excluded.has(song.youtubeId))),
  ];
}
