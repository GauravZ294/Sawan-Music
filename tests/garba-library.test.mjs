import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGarbaSongs, matchesGarbaStyleSearch } from '../src/utils/garbaLibrary.ts';

const songs = [
  { id: 'gujarati', language: 'Gujarati', garbaStyles: ['garba', 'titoda', 'dandiya'] },
  { id: 'hindi', language: 'Hindi', garbaStyles: ['garba', 'dandiya'] },
  { id: 'mandli', language: 'Gujarati', garbaStyles: ['garba', 'mandli'] },
  { id: 'dodhiya', language: 'Gujarati', garbaStyles: ['garba', 'dodhiya'] },
  { id: 'mixed', language: 'Hindi / Gujarati', garbaStyles: ['garba'] },
  { id: 'ordinary', language: 'Gujarati' },
];

test('Garba library combines dance style and language and keeps unrelated songs out', () => {
  assert.equal(filterGarbaSongs(songs).length, 5);
  assert.deepEqual(filterGarbaSongs(songs, 'dandiya', 'Gujarati').map(s => s.id), ['gujarati']);
  assert.deepEqual(filterGarbaSongs(songs, 'mandli').map(s => s.id), ['mandli']);
  assert.deepEqual(filterGarbaSongs(songs, 'dodhiya', 'Hindi'), []);
  assert.deepEqual(filterGarbaSongs(songs, 'all', 'Hindi').map(s => s.id), ['hindi', 'mixed']);
});

test('style search recognizes common English and Gujarati aliases', () => {
  assert.equal(matchesGarbaStyleSearch(songs[0], 'Titodo'), true);
  assert.equal(matchesGarbaStyleSearch(songs[0], 'ટિટોડા'), true);
  assert.equal(matchesGarbaStyleSearch(songs[3], 'dodhiyu'), true);
  assert.equal(matchesGarbaStyleSearch(songs[2], 'Mandali'), true);
  assert.equal(matchesGarbaStyleSearch(songs[2], 'મંડળી'), true);
  assert.equal(matchesGarbaStyleSearch(songs[5], 'garba'), false);
});
