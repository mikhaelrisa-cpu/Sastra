import { ArrowRight, Bookmark, Edit3, Search, Share2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { ProseTheme, ProseWork, SortOption, UserRole } from '../types/prose';
import {
  PROSE_THEMES,
  estimateReadMinutes,
  filterAndSortProse,
} from '../utils/proseLogic';
import { canUserEditWork } from '../utils/rbacLogic';
import { EditorialImage } from './EditorialImage';

interface AnthologyViewProps {
  works: ProseWork[];
  bookmarks: string[];
  savedQuotesCount: number;
  selectedTheme: ProseTheme | 'Semua';
  searchQuery: string;
  sortBy: SortOption;
  userRole?: UserRole;
  currentUid?: string | null;
  writeActionLabel?: string;
  onThemeChange: (theme: ProseTheme | 'Semua') => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: SortOption) => void;
  onOpenWork: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onShareWork: (work: ProseWork) => void;
  onGoToWrite: () => void;
  onEditWork?: (work: ProseWork) => void;
  onDeleteWork?: (workId: string) => Promise<void>;
}

export function AnthologyView({
  works,
  bookmarks,
  savedQuotesCount,
  selectedTheme,
  searchQuery,
  sortBy,
  userRole = 'visitor',
  currentUid = null,
  writeActionLabel = 'Masuk untuk Menulis',
  onThemeChange,
  onSearchChange,
  onSortChange,
  onOpenWork,
  onToggleBookmark,
  onShareWork,
  onGoToWrite,
  onEditWork,
  onDeleteWork,
}: AnthologyViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const leadWork =
    works.find((w) => w.featuredRank === 'lead') ?? works[0];
  const curatedWorks = works
    .filter((w) => w.id !== leadWork?.id && w.featuredRank === 'curated')
    .slice(0, 3);

  const filteredArchive = filterAndSortProse(works, {
    theme: selectedTheme,
    query: searchQuery,
    sortBy,
  });

  const totalNotes = works.reduce(
    (sum, item) => sum + item.marginNotes.length,
    0,
  );

  const filterButtons: Array<ProseTheme | 'Semua'> = ['Semua', ...PROSE_THEMES];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      {/* Tier 1: Lead Story Editorial Hero Split */}
      {leadWork && (
        <section aria-labelledby="lead-story-heading">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col justify-between lg:col-span-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#881337]">
                  Edisi Pertama · Naskah Utama
                </p>

                <h1
                  id="lead-story-heading"
                  className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-[#1C1917] sm:text-5xl lg:text-[3.35rem] headline-balance"
                >
                  {leadWork.title}
                </h1>

                <p className="mt-4 font-serif text-xl italic leading-snug text-[#44403C]">
                  {leadWork.subtitle}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#57534E]">
                  <span className="font-medium text-[#1C1917] whitespace-nowrap">
                    {leadWork.author}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">{leadWork.theme}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums whitespace-nowrap">
                    {estimateReadMinutes(leadWork.body)} mnt baca
                  </span>
                </div>

                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[#44403C]">
                  {leadWork.excerpt}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenWork(leadWork.id)}
                  className="inline-flex min-h-[44px] items-center gap-2.5 rounded-md bg-[#881337] px-5 py-2.5 text-sm font-medium text-[#FBF9F5] transition-colors duration-150 hover:bg-[#9F1239] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Baca Naskah Utama</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(leadWork.id)}
                  aria-pressed={bookmarks.includes(leadWork.id)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#D6CEBE] bg-transparent px-4 py-2.5 text-sm font-medium text-[#1C1917] transition-colors duration-150 hover:bg-[#F3EFE7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Bookmark
                    className={`h-4 w-4 ${
                      bookmarks.includes(leadWork.id)
                        ? 'fill-[#881337] text-[#881337]'
                        : 'text-[#57534E]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {bookmarks.includes(leadWork.id)
                      ? 'Tersimpan di Rak'
                      : 'Simpan ke Rak'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onShareWork(leadWork)}
                  aria-label={`Bagikan ${leadWork.title}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#D6CEBE] bg-transparent px-3.5 py-2.5 text-sm font-medium text-[#57534E] transition-colors duration-150 hover:bg-[#F3EFE7] hover:text-[#1C1917] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Bagikan</span>
                </button>

                {onEditWork && canUserEditWork(userRole, currentUid, leadWork) && (
                  <button
                    type="button"
                    onClick={() => onEditWork(leadWork)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#D6CEBE] bg-[#F3EFE7]/70 px-3.5 py-2.5 text-sm font-medium text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    <span>Sunting</span>
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <EditorialImage
                src={leadWork.image}
                alt={leadWork.title}
                caption={leadWork.imageCaption}
                className="h-full"
                imgClassName="aspect-[4/3] lg:aspect-auto lg:min-h-[380px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* Full-Width Literary Index Strip below Hero Split */}
      <section
        aria-label="Ringkasan koleksi antologi"
        className="mt-12 grid grid-cols-2 gap-6 border-y border-[#E5DFD3] py-5 lg:grid-cols-4"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-[#57534E]">
            Naskah Terhimpun
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#1C1917] tabular-nums">
            {works.length} Karya
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#57534E]">
            Catatan Diksi
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#1C1917] tabular-nums">
            {totalNotes} Ulasan
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#57534E]">
            Rak Tersimpan
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#1C1917] tabular-nums">
            {bookmarks.length} Naskah
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#57534E]">
            Kutipan Pilihan
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[#1C1917] tabular-nums">
            {savedQuotesCount} Baris
          </p>
        </div>
      </section>

      {/* Tier 2: Pilihan Kurator (3-Column Feature Grid) */}
      <section aria-labelledby="curated-heading" className="mt-16">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#57534E]">
              Pilihan Kurator
            </p>
            <h2
              id="curated-heading"
              className="mt-1 font-serif text-3xl font-semibold text-[#1C1917]"
            >
              Prosa Pilihan Pekan Ini
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#57534E]">
            Tiga naskah pendek tentang peron stasiun, tanjung berkabut, dan percakapan di margin buku lawas.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {curatedWorks.map((work) => {
            const isSaved = bookmarks.includes(work.id);
            return (
              <article
                key={work.id}
                className="flex flex-col justify-between border-b border-[#E5DFD3] pb-6 md:border-b-0 md:pb-0"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenWork(work.id)}
                    aria-label={`Baca ${work.title}`}
                    className="group block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#881337]"
                  >
                    <EditorialImage
                      src={work.image}
                      alt={work.title}
                      imgClassName="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                    <span>{work.theme}</span>
                    <span aria-hidden="true">·</span>
                    <span>{work.author}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {estimateReadMinutes(work.body)} mnt baca
                    </span>
                  </div>

                  <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-[#1C1917] headline-balance">
                    <button
                      type="button"
                      onClick={() => onOpenWork(work.id)}
                      className="text-left transition-colors hover:text-[#881337] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337]"
                    >
                      {work.title}
                    </button>
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
                    {work.excerpt}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenWork(work.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#881337] hover:text-[#9F1239] transition-colors cursor-pointer"
                  >
                    <span>Baca Prosa</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(work.id)}
                    aria-label={
                      isSaved
                        ? `Hapus ${work.title} dari rak`
                        : `Simpan ${work.title} ke rak`
                    }
                    aria-pressed={isSaved}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#57534E] transition-colors hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${
                        isSaved ? 'fill-[#881337] text-[#881337]' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Tier 3: Arsip & Indeks Penelusuran Prosa */}
      <section aria-labelledby="archive-heading" className="mt-20">
        <div className="flex flex-col gap-4 border-t border-[#E5DFD3] pt-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#57534E]">
              Indeks Antologi
            </p>
            <h2
              id="archive-heading"
              className="mt-1 font-serif text-3xl font-semibold text-[#1C1917]"
            >
              Semua Naskah & Kontribusi
            </h2>
          </div>

          <button
            type="button"
            onClick={onGoToWrite}
            className="self-start rounded-md border border-[#D6CEBE] bg-[#F3EFE7] px-4 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#EBE5D8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {writeActionLabel}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label="Filter tema prosa"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F3EFE7] p-1"
          >
            {filterButtons.map((theme) => {
              const active = selectedTheme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => onThemeChange(theme)}
                  aria-pressed={active}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {theme}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-64">
              <label htmlFor="anthology-search" className="sr-only">
                Cari judul, penulis, atau kutipan
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716C]"
                aria-hidden="true"
              />
              <input
                id="anthology-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari judul, penulis, atau kata..."
                className="w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] py-2 pl-9 pr-8 text-sm text-[#1C1917] placeholder:text-[#78716C] focus:border-[#881337] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div>
              <label htmlFor="anthology-sort" className="sr-only">
                Urutkan naskah
              </label>
              <select
                id="anthology-sort"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                className="w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none cursor-pointer"
              >
                <option value="pilihan">Urutan: Pilihan Redaksi</option>
                <option value="terbaru">Urutan: Terbaru</option>
                <option value="singkat">Urutan: Durasi Singkat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Archive List */}
        {filteredArchive.length === 0 ? (
          <div className="mt-8 rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/50 px-6 py-12 text-center">
            <p className="font-serif text-2xl font-medium text-[#1C1917]">
              Tidak ada naskah yang cocok dengan pencarian Anda.
            </p>
            <p className="mt-2 text-sm text-[#57534E]">
              Coba kata kunci lain atau kembalikan penyaring tema ke semua kategori.
            </p>
            <button
              type="button"
              onClick={() => {
                onThemeChange('Semua');
                onSearchChange('');
              }}
              className="mt-5 rounded-md bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#292524] transition-colors cursor-pointer"
            >
              Atur Ulang Filter
            </button>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
            {filteredArchive.map((work) => {
              const isSaved = bookmarks.includes(work.id);
              const readMins = estimateReadMinutes(work.body);
              return (
                <article
                  key={work.id}
                  className="grid grid-cols-1 gap-4 py-6 md:grid-cols-12 md:items-center"
                >
                  <div className="md:col-span-3">
                    <p className="text-xs font-medium tracking-wider text-[#57534E] tabular-nums">
                      {work.accession}
                    </p>
                    <p className="mt-1 text-xs text-[#881337] font-medium">
                      {work.theme}
                    </p>
                  </div>

                  <div className="md:col-span-6">
                    <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                      <button
                        type="button"
                        onClick={() => onOpenWork(work.id)}
                        className="text-left transition-colors hover:text-[#881337] cursor-pointer"
                      >
                        {work.title}
                      </button>
                    </h3>
                    <p className="mt-1 text-sm text-[#44403C] line-clamp-2">
                      {work.excerpt}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                      <span>{work.author}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{readMins} mnt baca</span>
                      <span aria-hidden="true">·</span>
                      <span>{work.year}</span>
                      {work.isUserCreated && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#881337]">Karya Pembaca</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:col-span-3 md:justify-end">
                    {onEditWork && canUserEditWork(userRole, currentUid, work) && (
                      <button
                        type="button"
                        onClick={() => onEditWork(work)}
                        aria-label={`Sunting ${work.title}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5DFD3] text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337] cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}

                    {onDeleteWork && canUserEditWork(userRole, currentUid, work) && (
                      confirmDeleteId === work.id ? (
                        <div className="inline-flex items-center gap-1 rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-2 py-1">
                          <button
                            type="button"
                            disabled={isDeletingId === work.id}
                            onClick={async () => {
                              setIsDeletingId(work.id);
                              try {
                                await onDeleteWork(work.id);
                                setConfirmDeleteId(null);
                              } finally {
                                setIsDeletingId(null);
                              }
                            }}
                            className="rounded bg-[#881337] px-2 py-1 text-[11px] font-medium text-[#FBF9F5] cursor-pointer"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-1 text-[11px] text-[#57534E] cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(work.id)}
                          aria-label={`Hapus ${work.title}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5DFD3] text-[#9F1239] transition-colors hover:bg-[#881337]/5 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => onShareWork(work)}
                      aria-label={`Bagikan ${work.title}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5DFD3] text-[#57534E] transition-colors hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(work.id)}
                      aria-label={
                        isSaved
                          ? `Hapus ${work.title} dari rak`
                          : `Simpan ${work.title} ke rak`
                      }
                      aria-pressed={isSaved}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5DFD3] text-[#57534E] transition-colors hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${
                          isSaved ? 'fill-[#881337] text-[#881337]' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenWork(work.id)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#D6CEBE] px-4 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Baca</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
