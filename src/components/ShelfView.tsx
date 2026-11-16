import { ArrowRight, Bookmark, Check, Copy, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ProseWork, SavedQuote } from '../types/prose';
import { estimateReadMinutes } from '../utils/proseLogic';

interface ShelfViewProps {
  bookmarkedWorks: ProseWork[];
  savedQuotes: SavedQuote[];
  onOpenWork: (id: string) => void;
  onRemoveBookmark: (id: string) => void;
  onRemoveQuote: (quote: SavedQuote) => void;
  onShareWork: (work: ProseWork) => void;
  onShareQuote: (quote: {
    proseId: string;
    proseTitle: string;
    author: string;
    text: string;
  }) => void;
  onExploreAnthology: () => void;
}

export function ShelfView({
  bookmarkedWorks,
  savedQuotes,
  onOpenWork,
  onRemoveBookmark,
  onRemoveQuote,
  onShareWork,
  onShareQuote,
  onExploreAnthology,
}: ShelfViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyQuote = async (quote: SavedQuote) => {
    const formatted = `“${quote.text}” — ${quote.author} (${quote.proseTitle})`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedId(quote.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <header className="border-b border-[#E5DFD3] pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
          Koleksi Pribadi
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1C1917] sm:text-5xl headline-balance">
          Rak Simpan & Kutipan Pilihan
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#57534E]">
          Semua naskah yang Anda tandai serta kalimat puitis yang Anda simpan tersimpan otomatis di peramban ini untuk dibaca kembali kapan saja.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Bookmarked Prose Section */}
        <section aria-labelledby="saved-works-heading" className="lg:col-span-6">
          <div className="flex items-baseline justify-between border-b border-[#E5DFD3] pb-3">
            <h2
              id="saved-works-heading"
              className="font-serif text-2xl font-semibold text-[#1C1917]"
            >
              Naskah Tersimpan
            </h2>
            <span className="text-xs text-[#57534E] tabular-nums">
              {bookmarkedWorks.length} naskah
            </span>
          </div>

          {bookmarkedWorks.length === 0 ? (
            <div className="mt-6 rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/50 p-8 text-center">
              <Bookmark
                className="mx-auto h-6 w-6 text-[#881337]/60"
                aria-hidden="true"
              />
              <p className="mt-3 font-serif text-xl font-medium text-[#1C1917]">
                Belum ada naskah di rak Anda
              </p>
              <p className="mt-1.5 text-sm text-[#57534E]">
                Tandai naskah favorit dari halaman Antologi atau Ruang Baca agar mudah ditemukan kembali.
              </p>
              <button
                type="button"
                onClick={onExploreAnthology}
                className="mt-5 rounded-md bg-[#881337] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] transition-colors cursor-pointer"
              >
                Jelajahi Antologi
              </button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[#E5DFD3]">
              {bookmarkedWorks.map((work) => (
                <li key={work.id} className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#57534E]">
                        {work.theme} · {work.author} ·{' '}
                        <span className="tabular-nums">
                          {estimateReadMinutes(work.body)} mnt baca
                        </span>
                      </p>
                      <h3 className="mt-1 font-serif text-2xl font-semibold text-[#1C1917]">
                        <button
                          type="button"
                          onClick={() => onOpenWork(work.id)}
                          className="text-left hover:text-[#881337] transition-colors cursor-pointer"
                        >
                          {work.title}
                        </button>
                      </h3>
                      <p className="mt-1.5 text-sm text-[#44403C] line-clamp-2">
                        {work.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onOpenWork(work.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#881337] hover:text-[#9F1239] cursor-pointer"
                    >
                      <span>Lanjut Baca</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShareWork(work)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:text-[#881337] cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Bagikan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(work.id)}
                      aria-label={`Hapus ${work.title} dari rak`}
                      className="inline-flex items-center gap-1 text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hapus dari Rak</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Saved Quotes Section */}
        <section aria-labelledby="saved-quotes-heading" className="lg:col-span-6">
          <div className="flex items-baseline justify-between border-b border-[#E5DFD3] pb-3">
            <h2
              id="saved-quotes-heading"
              className="font-serif text-2xl font-semibold text-[#1C1917]"
            >
              Koleksi Kutipan Pilihan
            </h2>
            <span className="text-xs text-[#57534E] tabular-nums">
              {savedQuotes.length} kutipan
            </span>
          </div>

          {savedQuotes.length === 0 ? (
            <div className="mt-6 rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/50 p-8 text-center">
              <p className="font-serif text-xl font-medium text-[#1C1917]">
                Belum ada kutipan yang disimpan
              </p>
              <p className="mt-1.5 text-sm text-[#57534E]">
                Saat membaca naskah di Ruang Baca, tekan tombol simpan pada paragraf atau kutipan utama yang menyentuh Anda.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[#E5DFD3]">
              {savedQuotes.map((quote) => (
                <li key={quote.id} className="py-5">
                  <blockquote className="font-serif text-xl italic leading-relaxed text-[#1C1917]">
                    “{quote.text}”
                  </blockquote>
                  <p className="mt-2 text-xs text-[#57534E]">
                    {quote.author} ·{' '}
                    <button
                      type="button"
                      onClick={() => onOpenWork(quote.proseId)}
                      className="underline decoration-[#D6CEBE] underline-offset-4 hover:text-[#881337] cursor-pointer"
                    >
                      {quote.proseTitle}
                    </button>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        onShareQuote({
                          proseId: quote.proseId,
                          proseTitle: quote.proseTitle,
                          author: quote.author,
                          text: quote.text,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#881337] hover:text-[#9F1239] cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Bagikan Kutipan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyQuote(quote)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1C1917] hover:text-[#881337] cursor-pointer"
                    >
                      {copiedId === quote.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#881337]" aria-hidden="true" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Salin Teks</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveQuote(quote)}
                      aria-label={`Hapus kutipan dari ${quote.proseTitle}`}
                      className="inline-flex items-center gap-1 text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
