import {
  BookOpen,
  Edit3,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  AuthorInvite,
  AuthorNotification,
  AuthorProfile,
  AuthorRequest,
  ProseWork,
  UserRole,
} from '../types/prose';
import { estimateReadMinutes } from '../utils/proseLogic';
import { validateAuthorRequestInput } from '../utils/rbacLogic';
import { resolveAssetSrc } from '../utils/seoLogic';
import { AdminDashboardView } from './AdminDashboardView';
import { NotificationBell } from './NotificationBell';
import { WriteProsaView, type ProseEditUpdates } from './WriteProsaView';

interface AuthorPortalViewProps {
  authLoading: boolean;
  authError: string | null;
  authUser: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
  } | null;
  role: UserRole;
  authorProfile: AuthorProfile | null;
  authorRequest: AuthorRequest | null;
  allWorks: ProseWork[];
  adminAuthors: AuthorProfile[];
  adminInvites: AuthorInvite[];
  adminRequests: AuthorRequest[];
  editingWork: ProseWork | null;
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSubmitAuthorRequest: (params: {
    penName: string;
    bio?: string;
    reason: string;
  }) => Promise<void>;
  onPublishProse: (work: ProseWork) => Promise<void>;
  onSaveEditProse: (workId: string, updates: ProseEditUpdates) => Promise<void>;
  onStartEditWork: (work: ProseWork) => void;
  onClearEditWork: () => void;
  onDeleteWork: (workId: string) => Promise<void>;
  onToggleWorkStatus: (work: ProseWork) => Promise<void>;
  onOpenWork: (workId: string) => void;
  onCancelToAnthology: () => void;
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
  onUpdateAuthorPenName: (
    author: AuthorProfile,
    penName: string,
  ) => Promise<void>;
  onSaveEditorComment: (work: ProseWork, editorNote: string) => Promise<void>;
  notifications: AuthorNotification[];
  onMarkNotificationRead: (id: string) => Promise<void>;
  onMarkAllNotificationsRead: (ids: string[]) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onOpenProseFromNotification: (proseId: string) => void;
}

export function AuthorPortalView({
  authLoading,
  authError,
  authUser,
  role,
  authorProfile,
  authorRequest,
  allWorks,
  adminAuthors,
  adminInvites,
  adminRequests,
  editingWork,
  onSignInGoogle,
  onSignOut,
  onSubmitAuthorRequest,
  onPublishProse,
  onSaveEditProse,
  onStartEditWork,
  onClearEditWork,
  onDeleteWork,
  onToggleWorkStatus,
  onOpenWork,
  onCancelToAnthology,
  onSeedCurated,
  onCreateInvite,
  onToggleInviteStatus,
  onDeleteInvite,
  onApproveRequest,
  onRejectRequest,
  onToggleAuthorStatus,
  onUpdateAuthorPenName,
  onSaveEditorComment,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDeleteNotification,
  onOpenProseFromNotification,
}: AuthorPortalViewProps) {
  const [authorTab, setAuthorTab] = useState<'tulis' | 'naskah'>('tulis');
  const [adminTab, setAdminTab] = useState<'naskah' | 'penulis' | 'tulis'>(
    'naskah',
  );
  const [confirmDeleteOwnId, setConfirmDeleteOwnId] = useState<string | null>(
    null,
  );
  const [isDeletingOwn, setIsDeletingOwn] = useState(false);

  // Author access request form state
  const [reqPenName, setReqPenName] = useState(authUser?.displayName ?? '');
  const [reqBio, setReqBio] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqErrors, setReqErrors] = useState<Record<string, string>>({});
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqFeedback, setReqFeedback] = useState<string | null>(null);
  const [reqSubmitError, setReqSubmitError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-serif text-2xl text-[#1C1917]">
          Memeriksa sesi akun penulis...
        </p>
        <p className="mt-2 text-sm text-[#57534E]">
          Mohon tunggu sejenak sementara Senandika memverifikasi status redaksi Anda.
        </p>
      </div>
    );
  }

  // Gate 1: Unauthenticated visitor
  if (!authUser || !authUser.emailVerified) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <div className="rounded-lg border border-[#E5DFD3] bg-[#FBF9F5] p-8 sm:p-12">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#881337]">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span>Portal Penulis & Redaksi</span>
          </div>

          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#1C1917] headline-balance">
            Masuk untuk Menulis di Senandika
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed text-[#44403C]">
            Untuk menjaga mutu kurasi sastra prosa romantis, ruang menulis di Senandika hanya terbuka bagi{' '}
            <strong className="font-medium text-[#1C1917]">
              penulis yang akunnya didaftarkan oleh Admin
            </strong>{' '}
            atau{' '}
            <strong className="font-medium text-[#1C1917]">
              pengajuannya telah disetujui Admin Redaksi
            </strong>
            .
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 border-y border-[#E5DFD3] py-6 sm:grid-cols-2">
            <div>
              <p className="font-serif text-lg font-semibold text-[#1C1917]">
                Sudah Diundang Admin?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                Masuk dengan akun Google yang telah didaftarkan Admin. Akses Meja Tulis Anda akan aktif secara otomatis.
              </p>
            </div>
            <div>
              <p className="font-serif text-lg font-semibold text-[#1C1917]">
                Ingin Bergabung sebagai Penulis?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                Masuk dengan Google terlebih dahulu untuk mengirimkan permohonan penulisan kepada Admin Redaksi.
              </p>
            </div>
          </div>

          {authError && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-4 py-3 text-xs font-medium text-[#9F1239]"
            >
              {authError}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onCancelToAnthology}
              className="rounded-md border border-[#D6CEBE] px-4 py-2.5 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
            >
              Kembali ke Antologi
            </button>

            <button
              type="button"
              onClick={() => void onSignInGoogle()}
              className="inline-flex items-center gap-2 rounded-md bg-[#881337] px-5 py-2.5 text-xs font-medium text-[#FBF9F5] transition-colors hover:bg-[#9F1239] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] cursor-pointer"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Masuk dengan Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Editing an existing prose work (Admin or Author for own work)
  if (editingWork) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 lg:py-14">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-[#E5DFD3] pb-4">
          <button
            type="button"
            onClick={onClearEditWork}
            className="text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
          >
            ← Kembali ke Portal Penulis
          </button>
          <NotificationBell
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onDelete={onDeleteNotification}
            onOpenProse={onOpenProseFromNotification}
          />
        </div>
        <WriteProsaView
          existingCount={allWorks.length}
          initialWork={editingWork}
          defaultAuthorName={authorProfile?.penName || authUser.displayName}
          authorUid={authUser.uid}
          isAdmin={role === 'admin'}
          embedded
          onSaveEdit={onSaveEditProse}
          onCancel={onClearEditWork}
        />
      </div>
    );
  }

  // Gate 3: Signed in, but not yet approved / pending / rejected / suspended
  if (role !== 'admin' && role !== 'author') {
    const handleRequestSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setReqSubmitError(null);
      setReqFeedback(null);
      const check = validateAuthorRequestInput({
        penName: reqPenName,
        bio: reqBio,
        reason: reqReason,
      });
      if (!check.valid) {
        setReqErrors(check.errors);
        return;
      }
      setReqErrors({});
      setReqSubmitting(true);
      try {
        await onSubmitAuthorRequest({
          penName: reqPenName,
          bio: reqBio,
          reason: reqReason,
        });
        setReqFeedback(
          'Permohonan Anda berhasil dikirim dan kini menunggu persetujuan Admin Redaksi.',
        );
      } catch (err) {
        setReqSubmitError(
          err instanceof Error
            ? err.message
            : 'Gagal mengirim permohonan akses penulis.',
        );
      } finally {
        setReqSubmitting(false);
      }
    };

    return (
      <div className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
        <div className="rounded-lg border border-[#E5DFD3] bg-[#FBF9F5] p-8 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5DFD3] pb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
                Akun Terhubung
              </p>
              <p className="mt-1 text-sm font-medium text-[#1C1917]">
                {authUser.displayName || 'Pembaca Senandika'} ·{' '}
                <span className="text-[#57534E]">{authUser.email}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <NotificationBell
                notifications={notifications}
                onMarkRead={onMarkNotificationRead}
                onMarkAllRead={onMarkAllNotificationsRead}
                onDelete={onDeleteNotification}
                onOpenProse={onOpenProseFromNotification}
              />
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {role === 'suspended' && (
            <div className="mt-6 space-y-3">
              <h1 className="font-serif text-3xl font-semibold text-[#1C1917]">
                Akses Penulis Dinonaktifkan
              </h1>
              <p className="text-sm leading-relaxed text-[#44403C]">
                Akun penulis atas nama{' '}
                <strong className="font-medium text-[#1C1917]">
                  {authorProfile?.penName}
                </strong>{' '}
                saat ini dinonaktifkan oleh Admin Redaksi. Anda tetap dapat membaca seluruh antologi, menyimpan kutipan ke Rak Simpan, dan membagikan karya.
              </p>
            </div>
          )}

          {role === 'pending' && authorRequest && (
            <div className="mt-6 space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
                Status: Menunggu Persetujuan Admin
              </p>
              <h1 className="font-serif text-3xl font-semibold text-[#1C1917]">
                Permohonan Penulis Sedang Ditinjau
              </h1>
              <p className="text-sm leading-relaxed text-[#44403C]">
                Terima kasih telah mengajukan diri. Admin Redaksi akan meninjau permohonan Anda sebelum membuka akses ke Meja Tulis Senandika.
              </p>
              <div className="rounded-md border border-[#E5DFD3] bg-[#F3EFE7]/50 p-4 text-sm">
                <p className="font-medium text-[#1C1917]">
                  Nama Pena Diajukan: {authorRequest.penName}
                </p>
                <p className="mt-1 text-xs text-[#57534E]">
                  Catatan Pengajuan: {authorRequest.reason}
                </p>
              </div>
            </div>
          )}

          {(role === 'visitor' || role === 'rejected') && (
            <div className="mt-6">
              {role === 'rejected' && (
                <div className="mb-6 rounded-md border border-[#9F1239]/25 bg-[#881337]/5 px-4 py-3 text-xs text-[#9F1239]">
                  Permohonan akses penulis Anda sebelumnya belum dapat disetujui. Anda dapat memperbarui catatan pengajuan di bawah ini jika ingin mengajukan ulang.
                </div>
              )}

              <h1 className="font-serif text-3xl font-semibold text-[#1C1917]">
                Ajukan Akun Penulis Senandika
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
                Akun Google Anda belum terdaftar sebagai penulis resmi. Lengkapi formulir singkat di bawah ini untuk meminta persetujuan Admin Redaksi.
              </p>

              {reqFeedback && (
                <div
                  role="status"
                  className="mt-5 rounded-md border border-[#881337]/20 bg-[#F3EFE7] px-4 py-3 text-xs font-medium text-[#1C1917]"
                >
                  {reqFeedback}
                </div>
              )}

              {reqSubmitError && (
                <div
                  role="alert"
                  className="mt-5 rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-4 py-3 text-xs font-medium text-[#9F1239]"
                >
                  {reqSubmitError}
                </div>
              )}

              <form
                onSubmit={handleRequestSubmit}
                noValidate
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="req-penname"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Nama Pena yang Diinginkan *
                  </label>
                  <input
                    id="req-penname"
                    type="text"
                    value={reqPenName}
                    onChange={(e) => {
                      setReqPenName(e.target.value);
                      if (reqErrors.penName) {
                        setReqErrors((p) => ({ ...p, penName: '' }));
                      }
                    }}
                    placeholder="Misal: Sekar Larasati"
                    className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none"
                  />
                  {reqErrors.penName && (
                    <p role="alert" className="mt-1 text-xs text-[#9F1239]">
                      {reqErrors.penName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="req-bio"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Profil Singkat Penulis (Opsional)
                  </label>
                  <input
                    id="req-bio"
                    type="text"
                    value={reqBio}
                    onChange={(e) => setReqBio(e.target.value)}
                    placeholder="Misal: Penggemar sastra epistolari & penulis lepas"
                    className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="req-reason"
                    className="block text-xs font-medium uppercase tracking-wider text-[#57534E]"
                  >
                    Alasan atau Cuplikan Gaya Prosa *
                  </label>
                  <textarea
                    id="req-reason"
                    rows={4}
                    value={reqReason}
                    onChange={(e) => {
                      setReqReason(e.target.value);
                      if (reqErrors.reason) {
                        setReqErrors((p) => ({ ...p, reason: '' }));
                      }
                    }}
                    placeholder="Ceritakan minat penulisan prosa romantis Anda atau tuliskan dua kalimat contoh gaya bahasa Anda..."
                    className="mt-1.5 w-full rounded-md border border-[#D6CEBE] bg-[#FBF9F5] p-3.5 text-sm text-[#1C1917] focus:border-[#881337] focus:outline-none"
                  />
                  {reqErrors.reason && (
                    <p role="alert" className="mt-1 text-xs text-[#9F1239]">
                      {reqErrors.reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5DFD3] pt-5">
                  <button
                    type="button"
                    onClick={onCancelToAnthology}
                    className="rounded-md border border-[#D6CEBE] px-4 py-2 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
                  >
                    Kembali Membaca
                  </button>

                  <button
                    type="submit"
                    disabled={reqSubmitting}
                    className="rounded-md bg-[#881337] px-5 py-2.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] cursor-pointer disabled:opacity-60"
                  >
                    {reqSubmitting
                      ? 'Mengirim Permohonan...'
                      : 'Kirim Permohonan Penulis'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Gate 4: Admin View
  if (role === 'admin') {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <header className="mb-8 flex flex-col gap-4 border-b border-[#E5DFD3] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Otoritas Admin Redaksi · {authUser.email}</span>
            </div>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1C1917]">
              Meja Redaksi Senandika
            </h1>
            <p className="mt-1 text-sm text-[#57534E]">
              Kelola seluruh naskah, ubah gambar sampul, setujui permohonan penulis, atau buat akun penulis baru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Navigasi ruang admin"
              className="inline-flex rounded-lg bg-[#F3EFE7] p-1"
            >
              <button
                type="button"
                onClick={() => setAdminTab('naskah')}
                aria-pressed={adminTab === 'naskah'}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  adminTab === 'naskah'
                    ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Naskah & Gambar
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('penulis')}
                aria-pressed={adminTab === 'penulis'}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  adminTab === 'penulis'
                    ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Kelola Penulis
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('tulis')}
                aria-pressed={adminTab === 'tulis'}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  adminTab === 'tulis'
                    ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Tulis Prosa Baru
              </button>
            </div>

            <NotificationBell
              notifications={notifications}
              onMarkRead={onMarkNotificationRead}
              onMarkAllRead={onMarkAllNotificationsRead}
              onDelete={onDeleteNotification}
              onOpenProse={onOpenProseFromNotification}
            />

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {adminTab === 'tulis' ? (
          <WriteProsaView
            existingCount={allWorks.length}
            defaultAuthorName={authUser.displayName || 'Redaksi Senandika'}
            authorUid={authUser.uid}
            isAdmin
            embedded
            onPublish={onPublishProse}
            onCancel={() => setAdminTab('naskah')}
          />
        ) : (
          <AdminDashboardView
            works={allWorks}
            authors={adminAuthors}
            invites={adminInvites}
            requests={adminRequests}
            adminUid={authUser.uid}
            activeSubTab={adminTab}
            onSubTabChange={(sub) => setAdminTab(sub)}
            onEditWork={onStartEditWork}
            onToggleWorkStatus={onToggleWorkStatus}
            onDeleteWork={onDeleteWork}
            onOpenWork={onOpenWork}
            onSeedCurated={onSeedCurated}
            onCreateInvite={onCreateInvite}
            onToggleInviteStatus={onToggleInviteStatus}
            onDeleteInvite={onDeleteInvite}
            onApproveRequest={onApproveRequest}
            onRejectRequest={onRejectRequest}
            onToggleAuthorStatus={onToggleAuthorStatus}
            onUpdateAuthorPenName={onUpdateAuthorPenName}
            onSaveEditorComment={onSaveEditorComment}
          />
        )}
      </div>
    );
  }

  // Gate 5: Approved Author View
  const ownWorks = allWorks.filter((w) => w.authorUid === authUser.uid);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="mb-8 flex flex-col gap-4 border-b border-[#E5DFD3] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
            Penulis Resmi Senandika · {authorProfile?.penName || authUser.displayName}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1C1917]">
            Ruang Karya Penulis
          </h1>
          <p className="mt-1 text-xs text-[#57534E]">
            Terhubung sebagai {authUser.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Navigasi ruang penulis"
            className="inline-flex rounded-lg bg-[#F3EFE7] p-1"
          >
            <button
              type="button"
              onClick={() => setAuthorTab('tulis')}
              aria-pressed={authorTab === 'tulis'}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                authorTab === 'tulis'
                  ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Tulis Prosa Baru
            </button>
            <button
              type="button"
              onClick={() => setAuthorTab('naskah')}
              aria-pressed={authorTab === 'naskah'}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                authorTab === 'naskah'
                  ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Naskah Saya ({ownWorks.length})
            </button>
          </div>

          <NotificationBell
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onDelete={onDeleteNotification}
            onOpenProse={onOpenProseFromNotification}
          />

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 text-xs font-medium text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {authorTab === 'tulis' ? (
        <WriteProsaView
          existingCount={allWorks.length}
          defaultAuthorName={authorProfile?.penName || authUser.displayName}
          authorUid={authUser.uid}
          isAdmin={false}
          embedded
          onPublish={onPublishProse}
          onCancel={onCancelToAnthology}
        />
      ) : (
        <section aria-labelledby="own-works-heading" className="space-y-4">
          <h2
            id="own-works-heading"
            className="font-serif text-2xl font-semibold text-[#1C1917]"
          >
            Daftar Naskah Anda
          </h2>

          {ownWorks.length === 0 ? (
            <div className="rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/40 px-6 py-10 text-center">
              <p className="font-serif text-2xl text-[#1C1917]">
                Anda belum menerbitkan prosa di Senandika.
              </p>
              <p className="mt-2 text-sm text-[#57534E]">
                Mulai tulis naskah pertama Anda di tab Tulis Prosa Baru.
              </p>
              <button
                type="button"
                onClick={() => setAuthorTab('tulis')}
                className="mt-5 rounded-md bg-[#881337] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#9F1239] cursor-pointer"
              >
                Tulis Prosa Pertama
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5DFD3] border-y border-[#E5DFD3]">
              {ownWorks.map((work) => {
                const isConfirming = confirmDeleteOwnId === work.id;
                const isDraft = (work.status ?? 'published') === 'draft';
                return (
                  <article
                    key={work.id}
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
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

                      <div>
                        <p className="text-xs text-[#881337] font-medium">
                          {isDraft ? 'Draf' : 'Terbit'} · {work.theme} ·{' '}
                          <span className="text-[#57534E]">
                            {estimateReadMinutes(work.body)} mnt baca
                          </span>
                        </p>
                        <h3 className="mt-1 font-serif text-xl font-semibold text-[#1C1917]">
                          {work.title}
                        </h3>
                        <p className="mt-1 text-xs text-[#57534E]">
                          Oleh {work.author} · {work.year}
                        </p>
                        {work.editorNote && (
                          <div className="mt-2 rounded border border-[#881337]/20 bg-[#F3EFE7]/70 px-3 py-2 text-xs text-[#1C1917]">
                            <span className="font-medium text-[#881337]">
                              Komentar Editor:{' '}
                            </span>
                            <span>{work.editorNote}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenWork(work.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F3EFE7] cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Baca</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartEditWork(work)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:border-[#881337] hover:text-[#881337] cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sunting / Gambar</span>
                      </button>

                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-[#9F1239]/30 bg-[#881337]/5 px-2.5 py-1">
                          <button
                            type="button"
                            disabled={isDeletingOwn}
                            onClick={async () => {
                              setIsDeletingOwn(true);
                              try {
                                await onDeleteWork(work.id);
                                setConfirmDeleteOwnId(null);
                              } finally {
                                setIsDeletingOwn(false);
                              }
                            }}
                            className="rounded bg-[#881337] px-2 py-0.5 text-xs text-[#FBF9F5] cursor-pointer"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteOwnId(null)}
                            className="px-2 py-0.5 text-xs text-[#57534E] cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOwnId(work.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#D6CEBE] px-3 py-1.5 text-xs font-medium text-[#9F1239] hover:bg-[#881337]/5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
