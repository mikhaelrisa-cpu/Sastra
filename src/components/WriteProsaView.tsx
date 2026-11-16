import { ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type {
  FeaturedRank,
  MarginNote,
  ProseStatus,
  ProseTheme,
  ProseWork,
} from '../types/prose';
import {
  CURATED_COVER_IMAGES,
  compressImageFileToDataUrl,
} from '../utils/imageUpload';
import {
  PROSE_THEMES,
  countWords,
  createProseWork,
  estimateReadMinutes,
  splitParagraphs,
  validateProseSubmission,
} from '../utils/proseLogic';
import { resolveAssetSrc } from '../utils/seoLogic';
import { EditorialImage } from './EditorialImage';

export interface ProseEditUpdates {
  title: string;
  subtitle: string;
  author: string;
  theme: ProseTheme;
  year: string;
  epigraph?: string;
  pullQuote: string;
  excerpt: string;
  body: string;
  image?: string;
  imageCaption?: string;
  featuredRank: FeaturedRank;
  status: ProseStatus;
  marginNotes: MarginNote[];
  editorNote?: string;
}

interface WriteProsaViewProps {
  existingCount: number;
  initialWork?: ProseWork | null;
  defaultAuthorName?: string;
  authorUid?: string;
  isAdmin?: boolean;
  embedded?: boolean;
  onPublish?: (work: ProseWork) => Promise<void> | void;
  onSaveEdit?: (workId: string, updates: ProseEditUpdates) => Promise<void> | void;
  onCancel: () => void;
}

export function WriteProsaView({
  existingCount,
  initialWork = null,
  defaultAuthorName = '',
  authorUid,
  isAdmin = false,
  embedded = false,
  onPublish,
  onSaveEdit,
  onCancel,
}: WriteProsaViewProps) {
  const isEditMode = Boolean(initialWork);

  const [title, setTitle] = useState(initialWork?.title ?? '');
  const [subtitle, setSubtitle] = useState(initialWork?.subtitle ?? '');
  const [author, setAuthor] = useState(
    initialWork?.author ?? defaultAuthorName ?? '',
  );
  const [theme, setTheme] = useState<ProseTheme>(
    initialWork?.theme ?? 'Surat & Epistolari',
  );
  const [year, setYear] = useState(
    initialWork?.year ?? String(new Date().getFullYear()),
  );
  const [epigraph, setEpigraph] = useState(initialWork?.epigraph ?? '');
  const [pullQuote, setPullQuote] = useState(initialWork?.pullQuote ?? '');
  const [excerptInput, setExcerptInput] = useState(initialWork?.excerpt ?? '');
  const [body, setBody] = useState(initialWork?.body ?? '');
  const [image, setImage] = useState(initialWork?.image ?? '');
  const [imageCaption, setImageCaption] = useState(
    initialWork?.imageCaption ?? '',
  );
  const [featuredRank, setFeaturedRank] = useState<FeaturedRank>(
    initialWork?.featuredRank ?? 'archive',
  );
  const [status, setStatus] = useState<ProseStatus>(
    initialWork?.status ?? 'published',
  );
  const [marginNotes, setMarginNotes] = useState<MarginNote[]>(
    initialWork?.marginNotes ?? [],
  );
  const [editorNote, setEditorNote] = useState(initialWork?.editorNote ?? '');

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialWork) {
      setTitle(initialWork.title);
      setSubtitle(initialWork.subtitle);
      setAuthor(initialWork.author);
      setTheme(initialWork.theme);
      setYear(initialWork.year);
      setEpigraph(initialWork.epigraph ?? '');
      setPullQuote(initialWork.pullQuote);
      setExcerptInput(initialWork.excerpt);
      setBody(initialWork.body);
      setImage(initialWork.image ?? '');
      setImageCaption(initialWork.imageCaption ?? '');
      setFeaturedRank(initialWork.featuredRank ?? 'archive');
      setStatus(initialWork.status ?? 'published');
      setMarginNotes(initialWork.marginNotes ?? []);
      setEditorNote(initialWork.editorNote ?? '');
      setErrors({});
      setSubmitError(null);
      setImageError(null);
      setMode('edit');
    } else if (defaultAuthorName && !author) {
      setAuthor(defaultAuthorName);
    }
  }, [initialWork, defaultAuthorName]);

  const wordCount = countWords(body);
  const readMins = estimateReadMinutes(body);
  const previewParagraphs = splitParagraphs(body);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setIsProcessingImage(true);
    try {
      const compressed = await compressImageFileToDataUrl(file);
      setImage(compressed);
      if (!imageCaption.trim()) {
        setImageCaption(
          `Ilustrasi naskah — ${title.trim() || file.name.replace(/\.[^/.]+$/, '')}`,
        );
      }
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : 'Gagal mengolah berkas gambar.',
      );
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddMarginNote = () => {
    if (marginNotes.length >= 12) return;
    setMarginNotes((prev) => [
      ...prev,
      { id: `note-${Date.now()}-${prev.length + 1}`, term: '', note: '' },
    ]);
  };

  const handleUpdateMarginNote = (
    id: string,
    field: 'term' | 'note',
    value: string,
  ) => {
    setMarginNotes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleRemoveMarginNote = (id: string) => {
    setMarginNotes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateProseSubmission({
      title,
      subtitle,
      author,
      theme,
      epigraph,
      pullQuote,
      body,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const cleanedMarginNotes = marginNotes
      .filter((n) => n.term.trim().length > 0 && n.note.trim().length > 0)
      .slice(0, 12)
      .map((n) => ({
        id: n.id.slice(0, 64),
        term: n.term.trim().slice(0, 120),
        note: n.note.trim().slice(0, 600),
      }));

    setErrors({});
    setIsSubmitting(true);

    try {
      if (isEditMode && initialWork && onSaveEdit) {
        const paragraphs = splitParagraphs(body);
        const firstParagraph = paragraphs[0] ?? body.trim();
        const fallbackExcerpt =
          firstParagraph.length > 175
            ? `${firstParagraph.slice(0, 172).trimEnd()}...`
            : firstParagraph;
        const resolvedExcerpt = excerptInput.trim() || fallbackExcerpt;
        const resolvedPullQuote =
          pullQuote.trim() ||
          paragraphs.find((p) => p.length >= 40 && p.length <= 200) ||
          resolvedExcerpt;

        await onSaveEdit(initialWork.id, {
          title: title.trim(),
          subtitle: subtitle.trim() || initialWork.subtitle,
          author: author.trim(),
          theme,
          year: year.trim() || initialWork.year,
          epigraph: epigraph.trim() || undefined,
          pullQuote: resolvedPullQuote,
          excerpt: resolvedExcerpt,
          body: body.trim(),
          image: image.trim() || undefined,
          imageCaption:
            image.trim() && imageCaption.trim()
              ? imageCaption.trim()
              : undefined,
          featuredRank: isAdmin
            ? featuredRank
            : (initialWork.featuredRank ?? 'archive'),
          status,
          marginNotes: cleanedMarginNotes,
          editorNote: isAdmin ? editorNote : undefined,
        });
      } else if (onPublish) {
        const created = createProseWork(
          {
            title,
            subtitle,
            author,
            authorUid,
            theme,
            year,
            epigraph,
            pullQuote,
            excerpt: excerptInput,
            body,
            image: image.trim() || undefined,
            imageCaption:
              image.trim() && imageCaption.trim()
                ? imageCaption.trim()
                : undefined,
            featuredRank: isAdmin ? featuredRank : 'archive',
            status,
            marginNotes: cleanedMarginNotes,
          },
          existingCount,
        );
        await onPublish(created);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat menyimpan naskah ke antologi.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={embedded ? '' : 'mx-auto max-w-4xl px-6 py-10 lg:py-14'}>
      <header className="flex flex-col gap-4 border-b border-[#E5DFD3] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
            {isEditMode ? 'Penyuntingan Naskah' : 'Meja Tulis Senandika'}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[#1C1917] sm:text-4xl headline-balance">
            {isEditMode
              ? `Sunting: ${initialWork?.title}`
              : 'Tulis Prosa Romantis'}
          </h1>
          <p className="mt-2 text-sm text-[#57534E]">
            {isEditMode
              ? 'Perbarui teks prosa, kutipan, gambar sampul, maupun catatan diksi dengan cermat.'
              : 'Tuangkan surat, fragmen kenangan, atau prosa liris Anda beserta gambar sampul pilihan.'}
          </p>
        </div>

        <div
          role="group"
          aria-label="Mode meja tulis"
          className="inline-flex self-start rounded-lg bg-[#F3EFE7] p-1"
        >
          <button
            type="button"
            onClick={() => setMode('edit')}
            aria-pressed={mode === 'edit'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'edit'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Sunting Naskah
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            aria-pressed={mode === 'preview'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'preview'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Pratinjau Halaman
          </button>
        </div>
      </header>

      {mode === 'preview' ? (
        <div className="mt-8 rounded-lg border border-[#E5DFD3] bg-[#FBF9F5] p-6 sm:p-10">
          <p className="text-xs uppercase tracking-[0.16em] text-[#881337]">
            {theme} · <span className="tabular-nums">{readMins} mnt baca</span>
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-[#1C1917] headline-balance">
            {title.trim() || 'Judul Naskah Anda'}
          </h2>
          {subtitle.trim() && (
            <p className="mt-2 font-serif text-xl italic text-[#57534E]">
              {subtitle}
            </p>
          )}
          <p className="mt-4 text-sm font-medium text-[#1C1917]">
            Oleh {author.trim() || 'Nama Penulis'} · {year}
          </p>

          {epigraph.trim() ? (
            <p className="my-6 border-y border-[#E5DFD3] py-4 text-center font-serif text-lg italic text-[#57534E]">
              {epigraph}
            </p>
          ) : (
            <hr className="my-6 border-t border-[#E5DFD3]" />
          )}

          {image.trim() && (
            <div className="mb-8">
              <EditorialImage
                src={image.trim()}
                alt={title.trim() || 'Pratinjau gambar sampul'}
                caption={imageCaption.trim() || undefined}
                imgClassName="aspect-[16/10]"
              />
            </div>
          )}

          {previewParagraphs.length === 0 ? (
            <p className="font-serif text-lg italic text-[#78716C]">
              Belum ada isi naskah. Kembali ke tab Sunting Naskah untuk mulai menulis.
            </p>
          ) : (
            <div className="space-y-6">
              {previewParagraphs.map((para, idx) => (
                <p
                  key={idx}
                  className={`font-serif text-[20px] leading-[1.85] text-[#292524] ${
                    idx === 0 ? 'prose-drop-cap' : ''
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>
          )}

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#E5DFD3] pt-6">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="rounded-md border border-[#D6CEBE] px-4 py-2 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer"
            >
              Kembali Menyunting
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
          {submitError && (
            <div
              role="alert"
              className="rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-4 py-3 text-sm text-[#9F1239]"
            >
              {submitError}
            </div>
          )}

          {!isAdmin && initialWork?.editorNote && (
            <div className="rounded-lg border border-[#881337]/25 bg-[#F3EFE7]/75 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#881337]">
                Catatan Editor Redaksi
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#1C1917]">
                {initialWork.editorNote}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="prose-title"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Judul Prosa *
              </label>
              <input
                id="prose-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                placeholder="Misal: Senja di Jendela Kereta"
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 font-serif text-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
              />
              {errors.title && (
                <p role="alert" className="mt-1.5 text-xs text-[#9F1239]">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="prose-author"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Nama Penulis / Nama Pena *
              </label>
              <input
                id="prose-author"
                type="text"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (errors.author) setErrors((prev) => ({ ...prev, author: '' }));
                }}
                placeholder="Misal: Larasati Kirana"
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
              />
              {errors.author && (
                <p role="alert" className="mt-1.5 text-xs text-[#9F1239]">
                  {errors.author}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="prose-theme"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Tema Sastra
              </label>
              <select
                id="prose-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ProseTheme)}
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none cursor-pointer"
              >
                {PROSE_THEMES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="prose-subtitle"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Subjudul Ringkas (Opsional)
              </label>
              <input
                id="prose-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Keterangan singkat suasana naskah"
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
              />
            </div>
          </div>

          {isAdmin ? (
            <div className="space-y-4 rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/50 p-5">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="prose-rank"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Posisi Kurasi (Admin)
                  </label>
                  <select
                    id="prose-rank"
                    value={featuredRank}
                    onChange={(e) => setFeaturedRank(e.target.value as FeaturedRank)}
                    className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none cursor-pointer"
                  >
                    <option value="lead">Naskah Utama (Hero)</option>
                    <option value="curated">Pilihan Kurator</option>
                    <option value="archive">Indeks Antologi</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prose-status"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Status Terbit (Admin)
                  </label>
                  <select
                    id="prose-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProseStatus)}
                    className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none cursor-pointer"
                  >
                    <option value="published">Terbit Publik</option>
                    <option value="draft">Draf Redaksi</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prose-year"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Tahun Terbit
                  </label>
                  <input
                    id="prose-year"
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    maxLength={10}
                    className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {isEditMode && (
                <div>
                  <label
                    htmlFor="prose-editor-note"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Komentar Editor untuk Penulis (Opsional — mengirim notifikasi)
                  </label>
                  <textarea
                    id="prose-editor-note"
                    rows={2}
                    maxLength={1000}
                    value={editorNote}
                    onChange={(e) => setEditorNote(e.target.value)}
                    placeholder="Tulis catatan penyuntingan atau saran revisi untuk draf penulis ini..."
                    className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] p-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/40 p-4">
              <label
                htmlFor="prose-author-status"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Status Penerbitan Naskah
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <select
                  id="prose-author-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProseStatus)}
                  className="rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none cursor-pointer"
                >
                  <option value="published">Terbitkan Langsung ke Antologi</option>
                  <option value="draft">Simpan sebagai Draf (Tinjauan Editor)</option>
                </select>
                <p className="text-xs text-[#57534E]">
                  Draf dapat ditinjau dan diberi komentar oleh Editor Redaksi sebelum terbit.
                </p>
              </div>
            </div>
          )}

          {/* Gambar Sampul Naskah */}
          <section
            aria-labelledby="cover-image-heading"
            className="rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/40 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="cover-image-heading"
                  className="text-xs font-medium uppercase tracking-wider text-[#1C1917]"
                >
                  Gambar Sampul Naskah
                </h2>
                <p className="mt-1 text-xs text-[#57534E]">
                  Pilih ilustrasi arsip Senandika, unggah berkas gambar dari perangkat, atau tempel tautan URL.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                  id="prose-image-file"
                />
                <button
                  type="button"
                  disabled={isProcessingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {isProcessingImage ? 'Mengolah Gambar...' : 'Unggah Gambar'}
                  </span>
                </button>

                {image && (
                  <button
                    type="button"
                    onClick={() => {
                      setImage('');
                      setImageCaption('');
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#9F1239] hover:bg-[#881337]/5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Hapus Gambar</span>
                  </button>
                )}
              </div>
            </div>

            {imageError && (
              <p role="alert" className="mt-2 text-xs text-[#9F1239]">
                {imageError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CURATED_COVER_IMAGES.map((preset) => {
                const isSelected = image === preset.src;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setImage(preset.src);
                      if (!imageCaption.trim()) {
                        setImageCaption(preset.defaultCaption);
                      }
                    }}
                    aria-pressed={isSelected}
                    className={`overflow-hidden rounded-md border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#881337] ring-2 ring-[#881337]/25'
                        : 'border-[#E5DFD3] hover:border-[#881337]/50'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#EBE5D8]">
                      <img
                        src={resolveAssetSrc(preset.src, import.meta.env.BASE_URL)}
                        alt={preset.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="px-2 py-1.5 text-[11px] font-medium text-[#1C1917] truncate">
                      {preset.label}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="prose-image-url"
                  className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                >
                  Atau Tautan URL Gambar
                </label>
                <div className="relative mt-1.5">
                  <ImagePlus
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716C]"
                    aria-hidden="true"
                  />
                  <input
                    id="prose-image-url"
                    type="text"
                    value={image.startsWith('data:') ? '' : image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder={
                      image.startsWith('data:')
                        ? 'Gambar unggahan perangkat aktif'
                        : 'https://... atau /src/assets/images/...'
                    }
                    className="w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] py-2 pl-9 pr-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="prose-image-caption"
                  className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                >
                  Keterangan Gambar (Caption)
                </label>
                <input
                  id="prose-image-caption"
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Misal: Fig. 5 — Jendela kereta pada pukul lima sore."
                  className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
                />
              </div>
            </div>

            {image.trim() && (
              <div className="mt-4 max-w-sm">
                <p className="mb-1.5 text-xs font-medium text-[#57534E]">
                  Pratinjau Gambar Aktif
                </p>
                <EditorialImage
                  src={image.trim()}
                  alt={title.trim() || 'Sampul naskah'}
                  caption={imageCaption.trim() || undefined}
                  imgClassName="aspect-[16/10]"
                />
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="prose-epigraph"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Epigraf Pembuka (Opsional)
              </label>
              <input
                id="prose-epigraph"
                type="text"
                value={epigraph}
                onChange={(e) => setEpigraph(e.target.value)}
                placeholder="Kalimat pembuka puitis sebelum paragraf pertama"
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="prose-pullquote"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Kutipan Utama (Opsional)
              </label>
              <input
                id="prose-pullquote"
                type="text"
                value={pullQuote}
                onChange={(e) => setPullQuote(e.target.value)}
                placeholder="Baris paling berkesan dari naskah Anda"
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
              />
            </div>
          </div>

          {isEditMode && (
            <div>
              <label
                htmlFor="prose-excerpt"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Cuplikan Pengantar (Excerpt)
              </label>
              <textarea
                id="prose-excerpt"
                rows={2}
                value={excerptInput}
                onChange={(e) => setExcerptInput(e.target.value)}
                placeholder="Ringkasan pembuka yang tampil di halaman indeks Antologi"
                className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] p-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="prose-body"
                className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
              >
                Isi Prosa Romantis *
              </label>
              <span className="text-xs text-[#57534E] tabular-nums">
                {wordCount} kata · {readMins} mnt baca
              </span>
            </div>
            <textarea
              id="prose-body"
              rows={11}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
              }}
              placeholder="Tuliskan prosa Anda di sini. Gunakan baris kosong untuk memisahkan antarparagraf..."
              className="mt-2 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] p-4 font-serif text-lg leading-relaxed text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
            />
            {errors.body && (
              <p role="alert" className="mt-1.5 text-xs text-[#9F1239]">
                {errors.body}
              </p>
            )}
          </div>

          {/* Catatan Tepi & Diksi */}
          <section
            aria-labelledby="margin-notes-heading"
            className="rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/30 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="margin-notes-heading"
                  className="text-xs font-medium uppercase tracking-wider text-[#1C1917]"
                >
                  Catatan Tepi & Diksi ({marginNotes.length}/12)
                </h2>
                <p className="mt-1 text-xs text-[#57534E]">
                  Tambahkan ulasan kata atau metafora pilihan untuk tampil di bilah tepi Ruang Baca.
                </p>
              </div>
              <button
                type="button"
                disabled={marginNotes.length >= 12}
                onClick={handleAddMarginNote}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah Catatan Diksi</span>
              </button>
            </div>

            {marginNotes.length > 0 && (
              <div className="mt-4 space-y-3">
                {marginNotes.map((note, idx) => (
                  <div
                    key={note.id}
                    className="grid grid-cols-1 gap-3 rounded-md border border-[#E5DFD3] bg-[#FBF9F5] p-3 sm:grid-cols-12 sm:items-start"
                  >
                    <div className="sm:col-span-4">
                      <label
                        htmlFor={`note-term-${note.id}`}
                        className="sr-only"
                      >
                        Istilah diksi {idx + 1}
                      </label>
                      <input
                        id={`note-term-${note.id}`}
                        type="text"
                        value={note.term}
                        onChange={(e) =>
                          handleUpdateMarginNote(note.id, 'term', e.target.value)
                        }
                        placeholder="Diksi atau frasa"
                        className="w-full rounded border border-[#D6CEBE] px-2.5 py-1.5 text-sm font-serif font-medium text-[#1C1917] focus:border-[#881337] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <label
                        htmlFor={`note-body-${note.id}`}
                        className="sr-only"
                      >
                        Penjelasan catatan {idx + 1}
                      </label>
                      <input
                        id={`note-body-${note.id}`}
                        type="text"
                        value={note.note}
                        onChange={(e) =>
                          handleUpdateMarginNote(note.id, 'note', e.target.value)
                        }
                        placeholder="Penjelasan puitis atau makna di balik frasa tersebut"
                        className="w-full rounded border border-[#D6CEBE] px-2.5 py-1.5 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveMarginNote(note.id)}
                        aria-label={`Hapus catatan diksi ${note.term || idx + 1}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#9F1239] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5DFD3] pt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-md border border-[#D6CEBE] px-4 py-2 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isProcessingImage}
              className="rounded-md bg-[#881337] px-5 py-2.5 text-xs font-medium text-[#FBF9F5] transition-colors hover:bg-[#9F1239] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] cursor-pointer disabled:opacity-60"
            >
              {isSubmitting
                ? 'Menyimpan Naskah...'
                : isEditMode
                  ? 'Simpan Perubahan Naskah'
                  : status === 'draft'
                    ? 'Simpan sebagai Draf'
                    : 'Terbitkan ke Antologi'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
