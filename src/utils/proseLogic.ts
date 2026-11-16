import type {
  PersistedState,
  ProseTheme,
  ProseWork,
  SavedQuote,
  SortOption,
} from '../types/prose';

export const PROSE_THEMES: ProseTheme[] = [
  'Surat & Epistolari',
  'Melankolia',
  'Senja & Kota',
  'Alam & Rindu',
];

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function estimateReadMinutes(text: string): number {
  const words = countWords(text);
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 180));
}

export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function filterAndSortProse(
  works: ProseWork[],
  options: {
    theme: ProseTheme | 'Semua';
    query: string;
    sortBy: SortOption;
  },
): ProseWork[] {
  const normalizedQuery = options.query.trim().toLowerCase();

  const filtered = works.filter((work) => {
    const matchesTheme =
      options.theme === 'Semua' || work.theme === options.theme;

    if (!matchesTheme) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      work.title,
      work.subtitle,
      work.author,
      work.theme,
      work.pullQuote,
      work.excerpt,
      work.body,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const sorted = [...filtered];
  if (options.sortBy === 'terbaru') {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  } else if (options.sortBy === 'singkat') {
    sorted.sort(
      (a, b) => estimateReadMinutes(a.body) - estimateReadMinutes(b.body),
    );
  } else {
    // 'pilihan': lead first, then curated, then contributor works, then remaining archive
    const rankScore = (work: ProseWork) => {
      if (work.featuredRank === 'lead') return 0;
      if (work.featuredRank === 'curated') return 1;
      if (work.isUserCreated) return 2;
      return 3;
    };
    sorted.sort((a, b) => {
      const diff = rankScore(a) - rankScore(b);
      if (diff !== 0) return diff;
      return b.createdAt - a.createdAt;
    });
  }

  return sorted;
}

export interface ProseInput {
  title: string;
  subtitle?: string;
  author: string;
  authorUid?: string;
  theme: ProseTheme;
  year?: string;
  epigraph?: string;
  pullQuote?: string;
  excerpt?: string;
  body: string;
  image?: string;
  imageCaption?: string;
  featuredRank?: ProseWork['featuredRank'];
  status?: ProseWork['status'];
  marginNotes?: ProseWork['marginNotes'];
}

export function validateProseSubmission(input: ProseInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (input.title.trim().length < 3) {
    errors.title = 'Judul naskah minimal terdiri dari 3 karakter.';
  }
  if (input.author.trim().length < 2) {
    errors.author = 'Nama penulis atau nama pena wajib diisi.';
  }
  const words = countWords(input.body);
  if (words < 20) {
    errors.body = `Isi prosa minimal 20 kata agar layak terbit di antologi (saat ini ${words} kata).`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function createProseWork(
  input: ProseInput,
  existingCount: number,
  now = Date.now(),
): ProseWork {
  const paragraphs = splitParagraphs(input.body);
  const firstParagraph = paragraphs[0] ?? input.body.trim();
  const autoExcerpt =
    firstParagraph.length > 175
      ? `${firstParagraph.slice(0, 172).trimEnd()}...`
      : firstParagraph;
  const excerpt = input.excerpt?.trim() || autoExcerpt;

  const fallbackPullQuote =
    paragraphs.find((p) => p.length >= 40 && p.length <= 200) ?? excerpt;

  const indexNum = String(existingCount + 1).padStart(2, '0');
  const cleanedNotes = (input.marginNotes ?? [])
    .filter((n) => n.term.trim() && n.note.trim())
    .map((n) => ({
      id: n.id,
      term: n.term.trim(),
      note: n.note.trim(),
    }));

  return {
    id: `naskah-${now}-${Math.random().toString(36).slice(2, 6)}`,
    accession: `ED. PEMBACA · ${indexNum}`,
    title: input.title.trim(),
    subtitle:
      input.subtitle?.trim() ||
      'Prosa liris kontribusi penulis untuk antologi Senandika',
    author: input.author.trim(),
    authorUid: input.authorUid,
    theme: input.theme,
    year: input.year?.trim() || String(new Date(now).getFullYear()),
    epigraph: input.epigraph?.trim() || undefined,
    pullQuote: input.pullQuote?.trim() || fallbackPullQuote,
    excerpt,
    body: input.body.trim(),
    image: input.image?.trim() || undefined,
    imageCaption:
      input.image?.trim() && input.imageCaption?.trim()
        ? input.imageCaption.trim()
        : undefined,
    featuredRank: input.featuredRank ?? 'archive',
    status: input.status ?? 'published',
    marginNotes:
      cleanedNotes.length > 0
        ? cleanedNotes
        : [
            {
              id: `note-${now}`,
              term: 'Catatan Penulis',
              note: `Naskah diterbitkan melalui Meja Tulis Senandika pada kategori ${input.theme}.`,
            },
          ],
    isUserCreated: true,
    createdAt: now,
  };
}

export function toggleIdInList(list: string[], id: string): string[] {
  if (list.includes(id)) {
    return list.filter((item) => item !== id);
  }
  return [id, ...list];
}

export function addOrRemoveSavedQuote(
  quotes: SavedQuote[],
  candidate: Omit<SavedQuote, 'id' | 'savedAt'>,
  now = Date.now(),
): { next: SavedQuote[]; added: boolean } {
  const normalized = candidate.text.trim();
  const existing = quotes.find(
    (q) => q.proseId === candidate.proseId && q.text.trim() === normalized,
  );
  if (existing) {
    return {
      next: quotes.filter((q) => q.id !== existing.id),
      added: false,
    };
  }
  const created: SavedQuote = {
    id: `kutipan-${now}-${Math.random().toString(36).slice(2, 6)}`,
    proseId: candidate.proseId,
    proseTitle: candidate.proseTitle,
    author: candidate.author,
    text: normalized,
    savedAt: now,
  };
  return {
    next: [created, ...quotes],
    added: true,
  };
}

export const DEFAULT_PERSISTED_STATE: PersistedState = {
  bookmarks: [],
  savedQuotes: [],
  userWorks: [],
  readerTheme: 'kertas',
  readerFontSize: 'nyaman',
};

export function parsePersistedState(raw: string | null): PersistedState {
  if (!raw) return DEFAULT_PERSISTED_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      bookmarks: Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks.filter((x): x is string => typeof x === 'string')
        : [],
      savedQuotes: Array.isArray(parsed.savedQuotes) ? parsed.savedQuotes : [],
      userWorks: Array.isArray(parsed.userWorks) ? parsed.userWorks : [],
      readerTheme:
        parsed.readerTheme === 'kertas' ||
        parsed.readerTheme === 'sepia' ||
        parsed.readerTheme === 'malam'
          ? parsed.readerTheme
          : 'kertas',
      readerFontSize:
        parsed.readerFontSize === 'kecil' ||
        parsed.readerFontSize === 'nyaman' ||
        parsed.readerFontSize === 'besar'
          ? parsed.readerFontSize
          : 'nyaman',
    };
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}
