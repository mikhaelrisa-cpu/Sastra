import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  MessageSquarePlus,
  RefreshCw,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  AuthorInvite,
  AuthorProfile,
  AuthorRequest,
  ProseWork,
} from '../types/prose';
import { estimateReadMinutes } from '../utils/proseLogic';
import { validateAuthorInviteInput } from '../utils/rbacLogic';
import { resolveAssetSrc } from '../utils/seoLogic';

interface AdminDashboardViewProps {
  works: ProseWork[];
  authors: AuthorProfile[];
  invites: AuthorInvite[];
  requests: AuthorRequest[];
  adminUid: string;
  activeSubTab: 'naskah' | 'penulis';
  onSubTabChange: (tab: 'naskah' | 'penulis') => void;
  onEditWork: (work: ProseWork) => void;
  onToggleWorkStatus: (work: ProseWork) => Promise<void>;
  onDeleteWork: (workId: string) => Promise<void>;
  onOpenWork: (workId: string) => void;
  onSeedCurated: () => Promise<number>;
  onCreateInvite: (params: {
    email: string;
    penName: string;
    bio?: string;
    adminUid: string;
  }) => Promise<void>;
  onToggleInviteStatus: (invite: AuthorInvite) => Promise<void>;
  onDeleteInvite: (email: string) => Promise<void>;
  onApproveRequest: (req: AuthorRequest) => Promise<void>;
  onRejectRequest: (req: AuthorRequest) => Promise<void>;
  onToggleAuthorStatus: (author: AuthorProfile) => Promise<void>;
  onUpdateAuthorPenName: (author: AuthorProfile, penName: string) => Promise<void>;
  onSaveEditorComment: (work: ProseWork, editorNote: string) => Promise<void>;
}

const RANK_LABELS: Record<NonNullable<ProseWork['featuredRank']>, string> = {
  lead: 'Naskah Utama',
  curated: 'Pilihan Kurator',
  archive: 'Indeks Antologi',
};

export function AdminDashboardView({
  works,
  authors,
  invites,
  requests,
  adminUid,
  activeSubTab,
  onSubTabChange,
  onEditWork,
  onToggleWorkStatus,
  onDeleteWork,
  onOpenWork,
  onSeedCurated,
  onCreateInvite,
  onToggleInviteStatus,
  onDeleteInvite,
  onApproveRequest,
  onRejectRequest,
  onToggleAuthorStatus,
  onUpdateAuthorPenName,
  onSaveEditorComment,
}: AdminDashboardViewProps) {
  const [confirmDeleteWorkId, setConfirmDeleteWorkId] = useState<string | null>(
    null,
  );
  const [confirmDeleteInviteEmail, setConfirmDeleteInviteEmail] = useState<
    string | null
  >(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline editor comment state
  const [commentingWorkId, setCommentingWorkId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePenName, setInvitePenName] = useState('');
  const [inviteBio, setInviteBio] = useState('');
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  // Pen name inline edit state
  const [editingAuthorUid, setEditingAuthorUid] = useState<string | null>(null);
  const [editingPenName, setEditingPenName] = useState('');

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const handleRunAction = async (
    key: string,
    fn: () => Promise<void>,
    successText?: string,
  ) => {
    setBusyActionId(key);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await fn();
      if (successText) setFeedback(successText);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Operasi gagal diproses. Periksa izin akses Anda.',
      );
    } finally {
      setBusyActionId(null);
    }
  };

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateAuthorInviteInput({
      email: inviteEmail,
      penName: invitePenName,
      bio: inviteBio,
    });
    if (!check.valid) {
      setInviteErrors(check.errors);
      return;
    }
    setInviteErrors({});
    await handleRunAction(
      'create-invite',
      async () => {
        await onCreateInvite({
          email: inviteEmail,
          penName: invitePenName,
          bio: inviteBio,
          adminUid,
        });
        setInviteEmail('');
        setInvitePenName('');
        setInviteBio('');
      },
      'Akun penulis baru berhasil didaftarkan. Penulis tinggal masuk dengan akun Google tersebut.',
    );
  };

  return (
    <div className="space-y-8">
      {/* Sub-navigation between Naskah & Penulis */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5DFD3] pb-4">
        <div
          role="tablist"
          aria-label="Menu meja redaksi admin"
          className="inline-flex rounded-lg bg-[#F3EFE7] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'naskah'}
            onClick={() => onSubTabChange('naskah')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'naskah'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Kelola Naskah ({works.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'penulis'}
            onClick={() => onSubTabChange('penulis')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'penulis'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Penulis & Persetujuan
            {pendingRequests.length > 0 ? ` (${pendingRequests.length} baru)` : ''}
          </button>
        </div>

        {works.length === 0 && (
          <button
            type="button"
            disabled={busyActionId === 'seed'}
            onClick={() =>
              void handleRunAction(
                'seed',
                async () => {
                  const count = await onSeedCurated();
                  if (count === 0) {
                    setFeedback('Koleksi antologi sudah tersinkron di Firestore.');
                  }
                },
                'Koleksi awal Senandika berhasil dimuat ke basis data.',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Muat Antologi Bawaan</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-md border border-[#881337]/20 bg-[#F3EFE7] px-4 py-3 text-xs font-medium text-[#1C1917]"
        >
          {feedback}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-4 py-3 text-xs font-medium text-[#9F1239]"
        >
          {errorMsg}
        </div>
      )}

      {activeSubTab === 'naskah' ? (
        <section aria-labelledby="admin-works-heading" className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="admin-works-heading"
                className="font-serif text-2xl font-semibold text-[#1C1917]"
              >
                Semua Naskah & Sampul Gambar
              </h2>
              <p className="mt-1 text-xs text-[#57534E]">
                Admin dapat menyunting teks, mengganti atau menghapus gambar sampul, mengatur posisi kurasi, maupun menghapus naskah secara permanen.
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
            {works.map((work) => {
              const isConfirming = confirmDeleteWorkId === work.id;
              const isPublished = (work.status ?? 'published') === 'published';
              const rankLabel =
                RANK_LABELS[work.featuredRank ?? 'archive'] ?? 'Indeks Antologi';

              return (
                <article
                  key={work.id}
                  className="py-5 space-y-3"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded border border-[#E5DFD3] bg-[#F3EFE7]">
                        {work.image ? (
                          <img
                            src={resolveAssetSrc(work.image, import.meta.env.BASE_URL)}
                            alt={work.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-[#78716C]">
                            Tanpa Gambar
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#57534E]">
                          <span className="font-medium text-[#881337]">
                            {isPublished ? 'Terbit' : 'Draf Redaksi'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{rankLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{work.theme}</span>
                        </div>
                        <h3 className="mt-1 font-serif text-xl font-semibold text-[#1C1917]">
                          <button
                            type="button"
                            onClick={() => onOpenWork(work.id)}
                            className="text-left hover:text-[#881337] cursor-pointer"
                          >
                            {work.title}
                          </button>
                        </h3>
                        <p className="mt-1 text-xs text-[#57534E]">
                          Oleh {work.author} · {work.year} ·{' '}
                          <span className="tabular-nums">
                            {estimateReadMinutes(work.body)} mnt baca
                          </span>
                        </p>
                        {work.editorNote && (
                          <p className="mt-1.5 text-xs italic text-[#44403C]">
                            Catatan Editor: “{work.editorNote}”
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (commentingWorkId === work.id) {
                            setCommentingWorkId(null);
                          } else {
                            setCommentingWorkId(work.id);
                            setCommentDraft(work.editorNote ?? '');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:border-[#881337] hover:text-[#881337] cursor-pointer"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Komentar Editor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditWork(work)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:border-[#881337] hover:text-[#881337] cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sunting / Gambar</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyActionId === `status-${work.id}`}
                        onClick={() =>
                          void handleRunAction(
                            `status-${work.id}`,
                            () => onToggleWorkStatus(work),
                            isPublished
                              ? `“${work.title}” dipindahkan ke Draf Redaksi.`
                              : `“${work.title}” diterbitkan ke publik.`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer disabled:opacity-50"
                      >
                        {isPublished ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Jadikan Draf</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Terbitkan</span>
                          </>
                        )}
                      </button>

                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-2.5 py-1">
                          <span className="text-xs font-medium text-[#9F1239]">
                            Hapus?
                          </span>
                          <button
                            type="button"
                            disabled={busyActionId === `del-${work.id}`}
                            onClick={() =>
                              void handleRunAction(
                                `del-${work.id}`,
                                async () => {
                                  await onDeleteWork(work.id);
                                  setConfirmDeleteWorkId(null);
                                },
                                `Naskah “${work.title}” telah dihapus.`,
                              )
                            }
                            className="rounded bg-[#881337] px-2 py-0.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] cursor-pointer"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteWorkId(null)}
                            className="rounded px-2 py-0.5 text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteWorkId(work.id)}
                          aria-label={`Hapus naskah ${work.title}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#9F1239] hover:bg-[#881337]/5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {commentingWorkId === work.id && (
                    <div className="rounded-md border border-[#E5DFD3] bg-[#F3EFE7]/50 p-4 space-y-3">
                      <label
                        htmlFor={`inline-comment-${work.id}`}
                        className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                      >
                        Komentar Editor untuk “{work.title}”
                      </label>
                      <textarea
                        id={`inline-comment-${work.id}`}
                        rows={2}
                        maxLength={1000}
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Tuliskan catatan penyuntingan atau saran untuk penulis (otomatis mengirim notifikasi lonceng ke penulis)..."
                        className="w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] p-2.5 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCommentingWorkId(null)}
                          className="rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                        >
                          Tutup
                        </button>
                        <button
                          type="button"
                          disabled={busyActionId === `comment-${work.id}`}
                          onClick={() =>
                            void handleRunAction(
                              `comment-${work.id}`,
                              async () => {
                                await onSaveEditorComment(work, commentDraft);
                                setCommentingWorkId(null);
                              },
                              commentDraft.trim()
                                ? `Komentar editor untuk “${work.title}” tersimpan dan notifikasi dikirim.`
                                : `Catatan editor pada “${work.title}” dihapus.`,
                            )
                          }
                          className="rounded-md bg-[#881337] px-3.5 py-1.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] cursor-pointer disabled:opacity-60"
                        >
                          {busyActionId === `comment-${work.id}`
                            ? 'Menyimpan...'
                            : 'Simpan & Kirim Notifikasi'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="space-y-12">
          {/* 1. Form Buat Akun / Akses Penulis Baru oleh Admin */}
          <section
            aria-labelledby="create-author-heading"
            className="rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/45 p-6"
          >
            <div className="flex items-start gap-3">
              <UserPlus
                className="mt-1 h-5 w-5 shrink-0 text-[#881337]"
                aria-hidden="true"
              />
              <div>
                <h2
                  id="create-author-heading"
                  className="font-serif text-2xl font-semibold text-[#1C1917]"
                >
                  Buat Akun Akses Penulis
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  Daftarkan alamat email Google penulis beserta nama penanya. Saat penulis masuk dengan Google, akun penulis akan langsung aktif tanpa perlu pengajuan ulang.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleInviteSubmit}
              noValidate
              className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <label
                  htmlFor="invite-email"
                  className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                >
                  Email Google Penulis *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteErrors.email) {
                      setInviteErrors((p) => ({ ...p, email: '' }));
                    }
                  }}
                  placeholder="penulis@gmail.com"
                  className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
                />
                {inviteErrors.email && (
                  <p role="alert" className="mt-1 text-xs text-[#9F1239]">
                    {inviteErrors.email}
                  </p>
                )}
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="invite-penname"
                  className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                >
                  Nama Pena *
                </label>
                <input
                  id="invite-penname"
                  type="text"
                  value={invitePenName}
                  onChange={(e) => {
                    setInvitePenName(e.target.value);
                    if (inviteErrors.penName) {
                      setInviteErrors((p) => ({ ...p, penName: '' }));
                    }
                  }}
                  placeholder="Misal: Sekar Arum"
                  className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
                />
                {inviteErrors.penName && (
                  <p role="alert" className="mt-1 text-xs text-[#9F1239]">
                    {inviteErrors.penName}
                  </p>
                )}
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="invite-bio"
                  className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                >
                  Catatan / Bio Singkat (Opsional)
                </label>
                <input
                  id="invite-bio"
                  type="text"
                  value={inviteBio}
                  onChange={(e) => setInviteBio(e.target.value)}
                  placeholder="Penulis esai & prosa liris"
                  className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#881337] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-12 flex justify-end">
                <button
                  type="submit"
                  disabled={busyActionId === 'create-invite'}
                  className="rounded-md bg-[#881337] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] cursor-pointer disabled:opacity-60"
                >
                  {busyActionId === 'create-invite'
                    ? 'Mendaftarkan...'
                    : 'Buat Akun Penulis'}
                </button>
              </div>
            </form>
          </section>

          {/* 2. Permohonan Menulis yang Masuk */}
          <section aria-labelledby="requests-heading">
            <h2
              id="requests-heading"
              className="font-serif text-2xl font-semibold text-[#1C1917]"
            >
              Permohonan Akses Penulis ({requests.length})
            </h2>
            <p className="mt-1 text-xs text-[#57534E]">
              Pengunjung yang mengajukan diri untuk menjadi penulis Senandika menunggu persetujuan Admin.
            </p>

            {requests.length === 0 ? (
              <p className="mt-4 rounded-md border border-[#E5DFD3] px-4 py-6 text-center text-sm text-[#57534E]">
                Belum ada pengajuan akses penulis yang masuk.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
                {requests.map((req) => (
                  <div
                    key={req.uid}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-[#881337]">
                          {req.status === 'pending'
                            ? 'Menunggu Persetujuan'
                            : req.status === 'approved'
                              ? 'Disetujui'
                              : 'Ditolak'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#57534E]">{req.email}</span>
                      </div>
                      <p className="mt-1 font-serif text-xl font-semibold text-[#1C1917]">
                        {req.penName}
                      </p>
                      <p className="mt-1 text-sm text-[#44403C]">{req.reason}</p>
                      {req.bio && (
                        <p className="mt-1 text-xs italic text-[#57534E]">
                          Bio: {req.bio}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {req.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={busyActionId === `approve-${req.uid}`}
                          onClick={() =>
                            void handleRunAction(
                              `approve-${req.uid}`,
                              () => onApproveRequest(req),
                              `Pengajuan ${req.penName} disetujui. Akun penulis kini aktif.`,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#881337] px-3 py-1.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Setujui Penulis</span>
                        </button>
                      )}

                      {req.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busyActionId === `reject-${req.uid}`}
                          onClick={() =>
                            void handleRunAction(
                              `reject-${req.uid}`,
                              () => onRejectRequest(req),
                              `Pengajuan ${req.penName} ditolak.`,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#9F1239] hover:bg-[#881337]/5 cursor-pointer disabled:opacity-50"
                        >
                          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tolak</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Undangan Akun Penulis yang Dibuat Admin */}
          <section aria-labelledby="invites-heading">
            <h2
              id="invites-heading"
              className="font-serif text-2xl font-semibold text-[#1C1917]"
            >
              Undangan Penulis Terdaftar ({invites.length})
            </h2>

            {invites.length === 0 ? (
              <p className="mt-4 rounded-md border border-[#E5DFD3] px-4 py-6 text-center text-sm text-[#57534E]">
                Belum ada undangan akun penulis yang dibuat Admin.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
                {invites.map((inv) => {
                  const isConfirming = confirmDeleteInviteEmail === inv.email;
                  return (
                    <div
                      key={inv.email}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-xs text-[#57534E]">
                          <span className="font-medium text-[#881337]">
                            {inv.status === 'active'
                              ? 'Undangan Aktif'
                              : 'Dicabut'}
                          </span>
                          {' · '}
                          {inv.email}
                        </p>
                        <p className="mt-1 font-serif text-lg font-semibold text-[#1C1917]">
                          {inv.penName}
                        </p>
                        {inv.bio && (
                          <p className="text-xs text-[#57534E]">{inv.bio}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyActionId === `inv-${inv.email}`}
                          onClick={() =>
                            void handleRunAction(
                              `inv-${inv.email}`,
                              () => onToggleInviteStatus(inv),
                              inv.status === 'active'
                                ? `Undangan ${inv.email} dicabut.`
                                : `Undangan ${inv.email} diaktifkan kembali.`,
                            )
                          }
                          className="rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer"
                        >
                          {inv.status === 'active'
                            ? 'Cabut Undangan'
                            : 'Aktifkan Kembali'}
                        </button>

                        {isConfirming ? (
                          <div className="inline-flex items-center gap-1.5 rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-2.5 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                void handleRunAction(
                                  `del-inv-${inv.email}`,
                                  async () => {
                                    await onDeleteInvite(inv.email);
                                    setConfirmDeleteInviteEmail(null);
                                  },
                                  `Undangan ${inv.email} dihapus.`,
                                )
                              }
                              className="rounded bg-[#881337] px-2 py-0.5 text-xs text-[#FBF9F5] cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteInviteEmail(null)}
                              className="px-2 py-0.5 text-xs text-[#57534E] cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteInviteEmail(inv.email)}
                            className="rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#9F1239] hover:bg-[#881337]/5 cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Daftar Akun Penulis Resmi */}
          <section aria-labelledby="authors-list-heading">
            <h2
              id="authors-list-heading"
              className="font-serif text-2xl font-semibold text-[#1C1917]"
            >
              Penulis Resmi Aktif & Nonaktif ({authors.length})
            </h2>

            {authors.length === 0 ? (
              <p className="mt-4 rounded-md border border-[#E5DFD3] px-4 py-6 text-center text-sm text-[#57534E]">
                Belum ada akun penulis yang teraktivasi.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
                {authors.map((author) => {
                  const isEditingName = editingAuthorUid === author.uid;
                  return (
                    <div
                      key={author.uid}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-xs text-[#57534E]">
                          <span className="font-medium text-[#881337]">
                            {author.status === 'active'
                              ? 'Penulis Aktif'
                              : 'Dinonaktifkan'}
                          </span>
                          {' · '}
                          ID {author.uid.slice(0, 8)}...
                        </p>

                        {isEditingName ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={editingPenName}
                              onChange={(e) => setEditingPenName(e.target.value)}
                              aria-label="Ubah nama pena"
                              className="rounded border border-[#D6CEBE] bg-[#FBF9F5] px-2.5 py-1 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={editingPenName.trim().length < 2}
                              onClick={() =>
                                void handleRunAction(
                                  `rename-${author.uid}`,
                                  async () => {
                                    await onUpdateAuthorPenName(
                                      author,
                                      editingPenName,
                                    );
                                    setEditingAuthorUid(null);
                                  },
                                  'Nama pena berhasil diperbarui.',
                                )
                              }
                              className="inline-flex items-center gap-1 rounded bg-[#881337] px-2.5 py-1 text-xs font-medium text-[#FBF9F5] cursor-pointer disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" aria-hidden="true" />
                              <span>Simpan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAuthorUid(null)}
                              className="px-2 py-1 text-xs text-[#57534E] cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <p className="mt-1 font-serif text-xl font-semibold text-[#1C1917]">
                            {author.penName}
                          </p>
                        )}

                        {author.bio && (
                          <p className="mt-0.5 text-xs text-[#57534E]">
                            {author.bio}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {!isEditingName && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAuthorUid(author.uid);
                              setEditingPenName(author.penName);
                            }}
                            className="rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer"
                          >
                            Ubah Nama Pena
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyActionId === `toggle-auth-${author.uid}`}
                          onClick={() =>
                            void handleRunAction(
                              `toggle-auth-${author.uid}`,
                              () => onToggleAuthorStatus(author),
                              author.status === 'active'
                                ? `Akses menulis ${author.penName} dinonaktifkan.`
                                : `Akses menulis ${author.penName} diaktifkan kembali.`,
                            )
                          }
                          className="rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#9F1239] hover:bg-[#881337]/5 cursor-pointer disabled:opacity-50"
                        >
                          {author.status === 'active'
                            ? 'Nonaktifkan Akses'
                            : 'Aktifkan Kembali'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
