import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  Edit3,
  Quote,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  ProseWork,
  ReaderFontSize,
  ReaderTheme,
  SavedQuote,
} from '../types/prose';
import {
  countWords,
  estimateReadMinutes,
  splitParagraphs,
} from '../utils/proseLogic';
import { EditorialImage } from './EditorialImage';

interface ReadingRoomViewProps {
  work: ProseWork;
  allWorks: ProseWork[];
  isBookmarked: boolean;
  savedQuotes: SavedQuote[];
  readerTheme: ReaderTheme;
  readerFontSize: ReaderFontSize;
  onReaderThemeChange: (theme: ReaderTheme) => void;
  onReaderFontSizeChange: (size: ReaderFontSize) => void;
  onToggleBookmark: (id: string) => void;
  onToggleSaveQuote: (quote: {
    proseId: string;
    proseTitle: string;
    author: string;
    text: string;
  }) => void;
  onShareWork: (work: ProseWork) => void;
  onShareQuote: (quote: {
    proseId: string;
    proseTitle: string;
    author: string;
    text: string;
  }) => void;
  onSelectWork: (id: string) => void;
  onBackToAnthology: () => void;
  canEdit?: boolean;
  onEditWork?: (work: ProseWork) => void;
  onDeleteWork?: (workId: string) => Promise<void>;
}

const THEME_STYLES: Record<
  ReaderTheme,
  {
    wrapper: string;
    surface: string;
    border: string;
    heading: string;
    body: string;
    muted: string;
    accentText: string;
    controlBg: string;
    controlActive: string;
  }
> = {
  kertas: {
    wrapper: 'bg-[#FBF9F5] text-[#1C1917]',
    surface: 'bg-[#F3EFE7]/70',
    border: 'border-[#E5DFD3]',
    heading: 'text-[#1C1917]',
    body: 'text-[#292524]',
    muted: 'text-[#57534E]',
    accentText: 'text-[#881337]',
    controlBg: 'bg-[#F3EFE7]',
    controlActive: 'bg-[#FBF9F5] text-[#1C1917] shadow-xs',
  },
  sepia: {
    wrapper: 'bg-[#F4ECD8] text-[#2B2118]',
    surface: 'bg-[#EAE0C8]',
    border: 'border-[#D8CCB0]',
    heading: 'text-[#2B2118]',
    body: 'text-[#3A2E22]',
    muted: 'text-[#6A5A48]',
    accentText: 'text-[#881337]',
    controlBg: 'bg-[#E5DAC0]',
    controlActive: 'bg-[#F4ECD8] text-[#2B2118] shadow-xs',
  },
  malam: {
    wrapper: 'bg-[#171412] text-[#EDE7DF]',
    surface: 'bg-[#211D1A]',
    border: 'border-[#332D28]',
    heading: 'text-[#F5F0E8]',
    body: 'text-[#DDD5CA] tracking-[0.01em]',
    muted: 'text-[#A89F95]',
    accentText: 'text-[#FDA4AF]',
    controlBg: 'bg-[#26211D]',
    controlActive: 'bg-[#38312B] text-[#F5F0E8] shadow-xs',
  },
};

const FONT_SIZE_CLASSES: Record<ReaderFontSize, string> = {
  kecil: 'text-[18px] leading-[1.8]',
  nyaman: 'text-[20px] leading-[1.85]',
  besar: 'text-[23px] leading-[1.88]',
};

export function ReadingRoomView({
  work,
  allWorks,
  isBookmarked,
  savedQuotes,
  readerTheme,
  readerFontSize,
  onReaderThemeChange,
  onReaderFontSizeChange,
  onToggleBookmark,
  onToggleSaveQuote,
  onShareWork,
  onShareQuote,
  onSelectWork,
  onBackToAnthology,
  canEdit = false,
  onEditWork,
  onDeleteWork,
}: ReadingRoomViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollProgress(100);
      } else {
        const pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
        setScrollProgress(Math.round(pct));
      }
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateProgress);
  }, [work.id]);

  const theme = THEME_STYLES[readerTheme];
  const paragraphs = splitParagraphs(work.body);
  const wordCount = countWords(work.body);
  const readMinutes = estimateReadMinutes(work.body);

  const currentIdx = allWorks.findIndex((item) => item.id === work.id);
  const prevWork = currentIdx > 0 ? allWorks[currentIdx - 1] : null;
  const nextWork =
    currentIdx >= 0 && currentIdx < allWorks.length - 1
      ? allWorks[currentIdx + 1]
      : null;

  const isQuoteSaved = (text: string) =>
    savedQuotes.some(
      (q) => q.proseId === work.id && q.text.trim() === text.trim(),
    );

  const handleCopyPullQuote = async () => {
    const formatted = `“${work.pullQuote}” — ${work.author}, dalam ${work.title}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedQuote(true);
      window.setTimeout(() => setCopiedQuote(false), 2000);
    } catch {
      setCopiedQuote(false);
    }
  };

  return (
    <div
      data-testid="reading-room"
      data-reader-theme={readerTheme}
      className={`min-h-[80vh] transition-colors duration-200 ${theme.wrapper}`}
    >
      {/* Thin editorial reading depth progress bar */}
      <div
        aria-hidden="true"
        className="sticky top-0 z-20 h-[2px] w-full bg-transparent"
      >
        <div
          className="h-full bg-[#881337] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        {/* Reader Utility Bar */}
        <div
          className={`flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between ${theme.border}`}
        >
          <button
            type="button"
            onClick={onBackToAnthology}
            className={`inline-flex items-center gap-2 self-start text-xs font-medium transition-colors hover:opacity-80 cursor-pointer ${theme.muted}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Antologi</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div
              role="group"
              aria-label="Tema kertas baca"
              className={`inline-flex items-center gap-1 rounded-lg p-1 ${theme.controlBg}`}
            >
              {(
                [
                  { id: 'kertas', label: 'Kertas' },
                  { id: 'sepia', label: 'Sepia' },
                  { id: 'malam', label: 'Malam' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onReaderThemeChange(opt.id)}
                  aria-pressed={readerTheme === opt.id}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    readerTheme === opt.id
                      ? theme.controlActive
                      : `${theme.muted} hover:opacity-90`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Font Size Selector */}
            <div
              role="group"
              aria-label="Ukuran huruf baca"
              className={`inline-flex items-center gap-1 rounded-lg p-1 ${theme.controlBg}`}
            >
              {(
                [
                  { id: 'kecil', label: 'A-' },
                  { id: 'nyaman', label: 'A' },
                  { id: 'besar', label: 'A+' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onReaderFontSizeChange(opt.id)}
                  aria-label={`Ukuran huruf ${opt.id}`}
                  aria-pressed={readerFontSize === opt.id}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    readerFontSize === opt.id
                      ? theme.controlActive
                      : `${theme.muted} hover:opacity-90`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Bookmark Toggle */}
            <button
              type="button"
              onClick={() => onToggleBookmark(work.id)}
              aria-pressed={isBookmarked}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${theme.border} ${
                isBookmarked ? theme.accentText : theme.heading
              }`}
            >
              <Bookmark
                className={`h-3.5 w-3.5 ${
                  isBookmarked ? 'fill-current' : ''
                }`}
                aria-hidden="true"
              />
              <span>{isBookmarked ? 'Tersimpan' : 'Simpan ke Rak'}</span>
            </button>

            {/* Web Share Work Button */}
            <button
              type="button"
              onClick={() => onShareWork(work)}
              aria-label={`Bagikan karya ${work.title}`}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${theme.border} ${theme.heading} hover:opacity-80`}
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bagikan</span>
            </button>

            {canEdit && onEditWork && (
              <button
                type="button"
                onClick={() => onEditWork(work)}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${theme.border} ${theme.heading} hover:opacity-80`}
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sunting</span>
              </button>
            )}

            {canEdit && onDeleteWork && (
              confirmDelete ? (
                <div className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[#9F1239]/40 bg-[#881337]/10 px-2.5 py-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await onDeleteWork(work.id);
                        setConfirmDelete(false);
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    className="rounded bg-[#881337] px-2 py-1 text-xs font-medium text-[#FBF9F5] cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className={`px-2 py-1 text-xs cursor-pointer ${theme.muted}`}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label={`Hapus karya ${work.title}`}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${theme.border} text-[#9F1239] hover:opacity-80`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hapus</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Asymmetric 70/30 Editorial Reading Grid */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Main 70% Narrative Column */}
          <article className="lg:col-span-8">
            <div className="max-w-2xl">
              <div
                className={`flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] ${theme.muted}`}
              >
                <span className={theme.accentText}>{work.accession}</span>
                <span aria-hidden="true">·</span>
                <span>{work.theme}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{readMinutes} mnt baca</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{wordCount} kata</span>
              </div>

              <h1
                className={`mt-4 font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl headline-balance ${theme.heading}`}
              >
                {work.title}
              </h1>

              <p
                className={`mt-3 font-serif text-xl italic leading-relaxed ${theme.muted}`}
              >
                {work.subtitle}
              </p>

              <p className={`mt-5 text-sm font-medium ${theme.heading}`}>
                Oleh {work.author} <span className={theme.muted}>· {work.year}</span>
              </p>

              {work.epigraph ? (
                <div className={`my-8 border-y py-5 text-center ${theme.border}`}>
                  <p className={`font-serif text-lg italic ${theme.muted}`}>
                    {work.epigraph}
                  </p>
                </div>
              ) : (
                <hr className={`my-8 border-t ${theme.border}`} />
              )}

              {work.image && (
                <div className="mb-10">
                  <EditorialImage
                    src={work.image}
                    alt={work.title}
                    caption={work.imageCaption}
                    imgClassName="aspect-[16/10]"
                    borderClass={theme.border}
                    captionClass={theme.muted}
                  />
                </div>
              )}

              {/* Long-form Literary Prose */}
              <div className="space-y-7">
                {paragraphs.map((paragraph, index) => {
                  const savedThisParagraph = isQuoteSaved(paragraph);
                  const showPullQuoteAfter =
                    index === Math.min(1, paragraphs.length - 1);

                  return (
                    <div key={`${work.id}-p-${index}`}>
                      <div className="group relative">
                        <p
                          className={`font-serif ${
                            FONT_SIZE_CLASSES[readerFontSize]
                          } ${theme.body} ${
                            index === 0
                              ? `prose-drop-cap ${
                                  readerTheme === 'malam'
                                    ? 'prose-drop-cap-dark'
                                    : ''
                                }`
                              : ''
                          }`}
                        >
                          {paragraph}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleSaveQuote({
                                proseId: work.id,
                                proseTitle: work.title,
                                author: work.author,
                                text: paragraph,
                              })
                            }
                            aria-pressed={savedThisParagraph}
                            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-opacity duration-150 cursor-pointer ${
                              savedThisParagraph
                                ? `${theme.accentText} opacity-100`
                                : `${theme.muted} opacity-80 hover:opacity-100`
                            }`}
                          >
                            <Quote className="h-3 w-3" aria-hidden="true" />
                            <span>
                              {savedThisParagraph
                                ? 'Tersimpan di Kutipan'
                                : 'Simpan paragraf sebagai kutipan'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onShareQuote({
                                proseId: work.id,
                                proseTitle: work.title,
                                author: work.author,
                                text: paragraph,
                              })
                            }
                            aria-label={`Bagikan kutipan paragraf ${index + 1}`}
                            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-opacity duration-150 cursor-pointer ${theme.muted} opacity-80 hover:opacity-100`}
                          >
                            <Share2 className="h-3 w-3" aria-hidden="true" />
                            <span>Bagikan</span>
                          </button>
                        </div>
                      </div>

                      {showPullQuoteAfter && work.pullQuote && (
                        <aside
                          aria-label="Kutipan utama naskah"
                          className={`my-10 border-y py-7 text-center ${theme.border}`}
                        >
                          <p
                            className={`font-serif text-2xl italic leading-relaxed lg:text-[26px] headline-balance ${theme.heading}`}
                          >
                            “{work.pullQuote}”
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                onToggleSaveQuote({
                                  proseId: work.id,
                                  proseTitle: work.title,
                                  author: work.author,
                                  text: work.pullQuote,
                                })
                              }
                              aria-pressed={isQuoteSaved(work.pullQuote)}
                              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${theme.border} ${
                                isQuoteSaved(work.pullQuote)
                                  ? theme.accentText
                                  : theme.muted
                              }`}
                            >
                              <Quote className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {isQuoteSaved(work.pullQuote)
                                  ? 'Kutipan Tersimpan'
                                  : 'Simpan Kutipan Utama'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onShareQuote({
                                  proseId: work.id,
                                  proseTitle: work.title,
                                  author: work.author,
                                  text: work.pullQuote,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${theme.border} ${theme.heading}`}
                            >
                              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Bagikan Kutipan</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleCopyPullQuote}
                              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${theme.border} ${theme.muted}`}
                            >
                              {copiedQuote ? (
                                <>
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Salin Kutipan</span>
                                </>
                              )}
                            </button>
                          </div>
                        </aside>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Prev / Next Navigation */}
              <nav
                aria-label="Navigasi antar naskah"
                className={`mt-14 grid grid-cols-1 gap-4 border-t pt-8 sm:grid-cols-2 ${theme.border}`}
              >
                <div>
                  {prevWork && (
                    <button
                      type="button"
                      onClick={() => onSelectWork(prevWork.id)}
                      className={`group flex w-full flex-col items-start rounded-lg border p-4 text-left transition-colors cursor-pointer ${theme.border} hover:opacity-85`}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${theme.muted}`}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Naskah Sebelumnya</span>
                      </span>
                      <span
                        className={`mt-1.5 font-serif text-xl font-semibold ${theme.heading}`}
                      >
                        {prevWork.title}
                      </span>
                    </button>
                  )}
                </div>
                <div>
                  {nextWork && (
                    <button
                      type="button"
                      onClick={() => onSelectWork(nextWork.id)}
                      className={`group flex w-full flex-col items-end rounded-lg border p-4 text-right transition-colors cursor-pointer ${theme.border} hover:opacity-85`}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${theme.muted}`}
                      >
                        <span>Naskah Berikutnya</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span
                        className={`mt-1.5 font-serif text-xl font-semibold ${theme.heading}`}
                      >
                        {nextWork.title}
                      </span>
                    </button>
                  )}
                </div>
              </nav>
            </div>
          </article>

          {/* Margin 30% Curatorial Notes Sidebar */}
          <aside
            aria-label="Catatan tepi dan diksi"
            className="lg:col-span-4"
          >
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className={`rounded-lg border p-6 ${theme.surface} ${theme.border}`}>
                <p
                  className={`text-xs font-medium uppercase tracking-[0.16em] ${theme.accentText}`}
                >
                  Catatan Tepi & Diksi
                </p>
                <h2 className={`mt-1 font-serif text-2xl font-semibold ${theme.heading}`}>
                  Apresiasi Bahasa
                </h2>
                <p className={`mt-2 text-xs leading-relaxed ${theme.muted}`}>
                  Telaah ringkas mengenai metafora, citraan, dan pilihan diksi yang membangun suasana dalam naskah ini.
                </p>

                <dl className={`mt-5 divide-y border-t ${theme.border}`}>
                  {work.marginNotes.map((note) => (
                    <div key={note.id} className="py-4">
                      <dt className={`font-serif text-lg font-semibold ${theme.heading}`}>
                        {note.term}
                      </dt>
                      <dd className={`mt-1 text-sm leading-relaxed ${theme.muted}`}>
                        {note.note}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Compact Index Switcher */}
              <div className={`rounded-lg border p-6 ${theme.border}`}>
                <p className={`text-xs font-medium uppercase tracking-[0.16em] ${theme.muted}`}>
                  Daftar Naskah
                </p>
                <ul className={`mt-4 divide-y ${theme.border}`}>
                  {allWorks.map((item) => {
                    const isCurrent = item.id === work.id;
                    return (
                      <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => onSelectWork(item.id)}
                          aria-current={isCurrent ? 'true' : undefined}
                          className={`flex w-full items-baseline justify-between gap-3 text-left transition-colors cursor-pointer ${
                            isCurrent
                              ? `${theme.accentText} font-semibold`
                              : `${theme.heading} hover:opacity-75`
                          }`}
                        >
                          <span className="font-serif text-base leading-snug">
                            {item.title}
                          </span>
                          <span className={`text-xs shrink-0 tabular-nums ${theme.muted}`}>
                            {estimateReadMinutes(item.body)} mnt
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
