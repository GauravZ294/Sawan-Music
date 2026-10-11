import type { GarbaStyle, Song } from '../types/music';

export const GARBA_STYLES: { id: GarbaStyle; label: string }[] = [
  { id: 'garba', label: 'Garba' },
  { id: 'dandiya', label: 'Dandiya' },
  { id: 'titoda', label: 'Titoda' },
  { id: 'dodhiya', label: 'Dodhiya' },
  { id: 'mandli', label: 'Mandli' },
  { id: 'kathiyawadi', label: 'Kathiyawadi' },
];

export function filterGarbaSongs(songs: Song[], style: GarbaStyle | 'all' = 'all', language = 'all'): Song[] {
  return songs.filter(song => Boolean(song.garbaStyles?.length) &&
    (style === 'all' || song.garbaStyles!.includes(style)) &&
    (language === 'all' || song.language?.toLowerCase().includes(language.toLowerCase())));
}

const STYLE_ALIASES: Record<string, GarbaStyle> = {
  garba: 'garba', 'ગરબા': 'garba', dandiya: 'dandiya', 'દાંડિયા': 'dandiya',
  titoda: 'titoda', titodo: 'titoda', 'ટિટોડા': 'titoda', 'ટિટોડો': 'titoda',
  dodhiya: 'dodhiya', dodhiyu: 'dodhiya', dodhiyo: 'dodhiya', 'દોઢિયું': 'dodhiya',
  mandli: 'mandli', mandali: 'mandli', 'મંડળી': 'mandli',
  kathiyawadi: 'kathiyawadi', kathiawadi: 'kathiyawadi',
};

export function matchesGarbaStyleSearch(song: Song, query: string): boolean {
  const style = STYLE_ALIASES[query.trim().toLowerCase()];
  return Boolean(style && song.garbaStyles?.includes(style));
}
