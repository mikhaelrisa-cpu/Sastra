import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addOrRemoveSavedQuote,
  countWords,
  createProseWork,
  estimateReadMinutes,
  filterAndSortProse,
  parsePersistedState,
  splitParagraphs,
  toggleIdInList,
  validateProseSubmission,
} from './proseLogic';
import type { ProseWork } from '../types/prose';

const SAMPLE_WORKS: ProseWork[] = [
  {
    id: 'w1',
    accession: 'ED. I · 01',
    title: 'Surat yang Tertinggal di Bulan Hujan',
    subtitle: 'Tentang langkah yang menunda pulang',
    author: 'Nadia Larasati',
    theme: 'Surat & Epistolari',
    year: '2026',
    pullQuote: 'Kita belajar mencintai jarak sebelum mengenal kepulangan.',
    excerpt: 'Di antara bunyi rintik yang mengetuk jendela tua...',
    body: 'Paragraf pertama tentang hujan dan surat yang belum terkirim.\n\nParagraf kedua tentang kota yang menyimpan namamu di setiap lampu jalan.',
    featuredRank: 'lead',
    marginNotes: [],
    createdAt: 1000,
  },
  {
    id: 'w2',
    accession: 'ED. I · 02',
    title: 'Senja di Peron Utara',
    subtitle: 'Kereta terakhir menuju selatan',
    author: 'Bagas Prakoso',
    theme: 'Senja & Kota',
    year: '2025',
    pullQuote: 'Peron hanya tahu cara melepas, tidak pernah mengikat.',
    excerpt: 'Lampu peron memantul di genangan air seperti ingatan...',
    body: Array.from({ length: 220 }, () => 'kata').join(' '),
    featuredRank: 'curated',
    marginNotes: [],
    createdAt: 2000,
  },
];

test('countWords and estimateReadMinutes compute accurately', () => {
  assert.equal(countWords('   '), 0);
  assert.equal(countWords('Senja jatuh perlahan di atas beranda.'), 6);
  assert.equal(estimateReadMinutes('Satu dua tiga'), 1);
  assert.equal(
    estimateReadMinutes(Array.from({ length: 360 }, () => 'rindu').join(' ')),
    2,
  );
});

test('splitParagraphs splits blank-line separated paragraphs cleanly', () => {
  const parts = splitParagraphs('Paragraf satu.\n\n  Paragraf dua.  \n\n\nParagraf tiga.');
  assert.deepEqual(parts, ['Paragraf satu.', 'Paragraf dua.', 'Paragraf tiga.']);
});

test('filterAndSortProse filters by theme, search query, and sorts properly', () => {
  const byTheme = filterAndSortProse(SAMPLE_WORKS, {
    theme: 'Senja & Kota',
    query: '',
    sortBy: 'pilihan',
  });
  assert.equal(byTheme.length, 1);
  assert.equal(byTheme[0].id, 'w2');

  const byQuery = filterAndSortProse(SAMPLE_WORKS, {
    theme: 'Semua',
    query: 'nadia',
    sortBy: 'pilihan',
  });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].id, 'w1');

  const byTerbaru = filterAndSortProse(SAMPLE_WORKS, {
    theme: 'Semua',
    query: '',
    sortBy: 'terbaru',
  });
  assert.deepEqual(
    byTerbaru.map((w) => w.id),
    ['w2', 'w1'],
  );

  const bySingkat = filterAndSortProse(SAMPLE_WORKS, {
    theme: 'Semua',
    query: '',
    sortBy: 'singkat',
  });
  assert.deepEqual(
    bySingkat.map((w) => w.id),
    ['w1', 'w2'],
  );
});

test('validateProseSubmission rejects incomplete inputs and accepts valid prose', () => {
  const invalid = validateProseSubmission({
    title: 'Ab',
    author: '',
    theme: 'Melankolia',
    body: 'Terlalu singkat.',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.author);
  assert.ok(invalid.errors.body);

  const validBody = Array.from({ length: 24 }, () => 'kenangan').join(' ');
  const valid = validateProseSubmission({
    title: 'Pelabuhan Sunyi',
    author: 'Sekar Arum',
    theme: 'Alam & Rindu',
    body: validBody,
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('createProseWork constructs a complete anthology item', () => {
  const body =
    'Di tepi laut yang tenang itu, aku menulis namamu di pasir basah.\n\nOmbak datang pelan, tidak untuk menghapus, melainkan untuk membawanya ke cakrawala.';
  const created = createProseWork(
    {
      title: 'Cakrawala di Ujung Dermaga',
      author: 'Raka Mahendra',
      theme: 'Alam & Rindu',
      body,
    },
    6,
    1700000000000,
  );
  assert.equal(created.accession, 'ED. PEMBACA · 07');
  assert.equal(created.isUserCreated, true);
  assert.equal(created.theme, 'Alam & Rindu');
  assert.ok(created.pullQuote.length > 10);
});

test('toggleIdInList and addOrRemoveSavedQuote manage state idempotently', () => {
  const added = toggleIdInList([], 'w1');
  assert.deepEqual(added, ['w1']);
  const removed = toggleIdInList(added, 'w1');
  assert.deepEqual(removed, []);

  const first = addOrRemoveSavedQuote(
    [],
    {
      proseId: 'w1',
      proseTitle: 'Surat',
      author: 'Nadia',
      text: 'Kita belajar mencintai jarak.',
    },
    100,
  );
  assert.equal(first.added, true);
  assert.equal(first.next.length, 1);

  const second = addOrRemoveSavedQuote(
    first.next,
    {
      proseId: 'w1',
      proseTitle: 'Surat',
      author: 'Nadia',
      text: 'Kita belajar mencintai jarak.',
    },
    200,
  );
  assert.equal(second.added, false);
  assert.equal(second.next.length, 0);
});

test('parsePersistedState handles invalid JSON safely', () => {
  const fallback = parsePersistedState('{broken json');
  assert.deepEqual(fallback.bookmarks, []);
  assert.equal(fallback.readerTheme, 'kertas');

  const valid = parsePersistedState(
    JSON.stringify({
      bookmarks: ['w1'],
      readerTheme: 'sepia',
      readerFontSize: 'besar',
    }),
  );
  assert.deepEqual(valid.bookmarks, ['w1']);
  assert.equal(valid.readerTheme, 'sepia');
  assert.equal(valid.readerFontSize, 'besar');
});
