export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  releaseDate: string | null;
  duration: number;
  explicit: boolean | null;
  isrc: string | null;
  artworkUrl?: string;
}

export interface CatalogResults {
  tracks: CatalogTrack[];
  total: number | null;
  count: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface CatalogGenre {
  name: string;
  count: number;
}

export interface CatalogStatus {
  configured: boolean;
  connected: boolean;
  tier?: string | null;
  quota?: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string | null;
  } | null;
}
