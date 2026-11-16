import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnthologyView } from './components/AnthologyView';
import { AuthorPortalView } from './components/AuthorPortalView';
import { EditorialView } from './components/EditorialView';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ReadingRoomView } from './components/ReadingRoomView';
import { ShareModal } from './components/ShareModal';
import { ShelfView } from './components/ShelfView';
import type { ProseEditUpdates } from './components/WriteProsaView';
import { CURATED_ANTHOLOGY } from './data/anthology';
import { auth, googleProvider } from './firebase';
import {
  approveAuthorRequest,
  createOrUpdateAuthorInvite,
  createProseInFirestore,
  deleteAuthorInvite,
  deleteNotification,
  deleteProseInFirestore,
  fetchUserRBACState,
  markAllNotificationsRead,
  markNotificationRead,
  rejectAuthorRequest,
  saveEditorCommentOnProse,
  seedCuratedAnthologyIfEmpty,
  submitAuthorRequest,
  subscribeAdminLists,
  subscribeAllProsesForAdmin,
  subscribeOwnProsesForAuthor,
  subscribePublishedProses,
  subscribeUserNotifications,
  toggleAuthorInviteStatus,
  toggleAuthorStatus,
  updateAuthorPenName,
  updateProseInFirestore,
} from './services/firestoreService';
import type {
  AuthorInvite,
  AuthorNotification,
  AuthorProfile,
  AuthorRequest,
  PersistedState,
  ProseTheme,
  ProseWork,
  ReaderFontSize,
  ReaderTheme,
  SavedQuote,
  SortOption,
  ViewTab,
} from './types/prose';
import {
  addOrRemoveSavedQuote,
  parsePersistedState,
  toggleIdInList,
} from './utils/proseLogic';
import { canUserEditWork, resolveUserRole } from './utils/rbacLogic';
import { buildPageSeoMetadata } from './utils/seoLogic';
import {
  buildProseShareUrl,
  buildQuoteSharePayload,
  buildWorkSharePayload,
  extractProseIdFromSearch,
  invokeWebShare,
  type SharePayload,
} from './utils/shareLogic';

const STORAGE_KEY = 'senandika_archive_v1';

interface AuthUserSummary {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export default function App() {
  const [persisted, setPersisted] = useState<PersistedState>(() => {
    if (typeof window === 'undefined') {
      return parsePersistedState(null);
    }
    return parsePersistedState(window.localStorage.getItem(STORAGE_KEY));
  });

  // Auth & RBAC state
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [authorRequest, setAuthorRequest] = useState<AuthorRequest | null>(null);

  // Firestore collections state
  const [remotePublishedWorks, setRemotePublishedWorks] = useState<ProseWork[]>([]);
  const [hasLoadedPublished, setHasLoadedPublished] = useState(false);
  const [firestoreEmpty, setFirestoreEmpty] = useState(false);
  const [adminAllWorks, setAdminAllWorks] = useState<ProseWork[]>([]);
  const [authorOwnWorks, setAuthorOwnWorks] = useState<ProseWork[]>([]);
  const [adminAuthors, setAdminAuthors] = useState<AuthorProfile[]>([]);
  const [adminInvites, setAdminInvites] = useState<AuthorInvite[]>([]);
  const [adminRequests, setAdminRequests] = useState<AuthorRequest[]>([]);
  const [notifications, setNotifications] = useState<AuthorNotification[]>([]);

  const [editingWork, setEditingWork] = useState<ProseWork | null>(null);

  const userRole = useMemo(
    () =>
      resolveUserRole({
        uid: authUser?.uid,
        email: authUser?.email,
        emailVerified: authUser?.emailVerified,
        isAdminDoc,
        authorProfile,
        authorRequest,
      }),
    [authUser, isAdminDoc, authorProfile, authorRequest],
  );

  // Public anthology: Firestore published works, falling back to CURATED_ANTHOLOGY before initial seed
  const publicWorks = useMemo<ProseWork[]>(() => {
    if (remotePublishedWorks.length > 0) {
      return remotePublishedWorks;
    }
    if (!hasLoadedPublished || firestoreEmpty) {
      return CURATED_ANTHOLOGY;
    }
    return CURATED_ANTHOLOGY;
  }, [remotePublishedWorks, hasLoadedPublished, firestoreEmpty]);

  // All works visible to the current signed-in user in management views (Admin sees drafts + published)
  const portalWorks = useMemo<ProseWork[]>(() => {
    if (userRole === 'admin') {
      return adminAllWorks.length > 0 ? adminAllWorks : publicWorks;
    }
    if (userRole === 'author') {
      const map = new Map<string, ProseWork>();
      for (const w of authorOwnWorks) map.set(w.id, w);
      for (const w of publicWorks) {
        if (!map.has(w.id)) map.set(w.id, w);
      }
      return Array.from(map.values());
    }
    return publicWorks;
  }, [userRole, adminAllWorks, authorOwnWorks, publicWorks]);

  const initialSharedId =
    typeof window !== 'undefined'
      ? extractProseIdFromSearch(window.location.search)
      : null;

  const [activeView, setActiveView] = useState<ViewTab>(() => {
    if (initialSharedId && CURATED_ANTHOLOGY.some((w) => w.id === initialSharedId)) {
      return 'baca';
    }
    return 'antologi';
  });

  const [activeWorkId, setActiveWorkId] = useState<string>(() => {
    if (initialSharedId) {
      return initialSharedId;
    }
    return CURATED_ANTHOLOGY[0].id;
  });

  const [selectedTheme, setSelectedTheme] = useState<ProseTheme | 'Semua'>(
    'Semua',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('pilihan');

  const [shareModal, setShareModal] = useState<{
    payload: SharePayload;
    copied: boolean;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showTemporaryNotice = useCallback((message: string) => {
    setStatusNotice(message);
    window.setTimeout(() => {
      setStatusNotice((current) => (current === message ? null : current));
    }, 3200);
  }, []);

  // Persist reading preferences & bookmarks locally
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore storage quota issues safely
    }
  }, [persisted]);

  // Sync URL ?karya=<id> for direct sharing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activeView === 'baca' && activeWorkId) {
      url.searchParams.set('karya', activeWorkId);
    } else {
      url.searchParams.delete('karya');
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeView, activeWorkId]);

  // Subscribe to published prose in Firestore
  useEffect(() => {
    const unsub = subscribePublishedProses(
      (works) => {
        setRemotePublishedWorks(works);
        setFirestoreEmpty(false);
        setHasLoadedPublished(true);
      },
      () => {
        setRemotePublishedWorks([]);
        setFirestoreEmpty(true);
        setHasLoadedPublished(true);
      },
    );
    return () => unsub();
  }, []);

  // Open ?karya=<id> once Firestore works arrive if it wasn't in CURATED_ANTHOLOGY
  useEffect(() => {
    if (initialSharedId && publicWorks.some((w) => w.id === initialSharedId)) {
      setActiveWorkId(initialSharedId);
      setActiveView('baca');
    }
  }, [initialSharedId, publicWorks]);

  const refreshRBAC = useCallback(async (uid: string, email: string) => {
    try {
      const state = await fetchUserRBACState(uid, email);
      setIsAdminDoc(state.isAdminDoc);
      setAuthorProfile(state.authorProfile);
      setAuthorRequest(state.authorRequest);
    } catch {
      // Errors handled inside fetchUserRBACState / fallback cleanly
    }
  }, []);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthUser(null);
        setIsAdminDoc(false);
        setAuthorProfile(null);
        setAuthorRequest(null);
        setAuthLoading(false);
        return;
      }

      const summary: AuthUserSummary = {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        emailVerified: user.emailVerified,
      };
      setAuthUser(summary);

      if (user.emailVerified && user.email) {
        await refreshRBAC(user.uid, user.email);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [refreshRBAC]);

  // Admin subscriptions + initial seed of curated anthology
  useEffect(() => {
    if (userRole !== 'admin' || !authUser) {
      setAdminAllWorks([]);
      setAdminAuthors([]);
      setAdminInvites([]);
      setAdminRequests([]);
      return;
    }

    void seedCuratedAnthologyIfEmpty(authUser.uid);

    const unsubWorks = subscribeAllProsesForAdmin(setAdminAllWorks);
    const unsubLists = subscribeAdminLists({
      onAuthors: setAdminAuthors,
      onInvites: setAdminInvites,
      onRequests: setAdminRequests,
    });

    return () => {
      unsubWorks();
      unsubLists();
    };
  }, [userRole, authUser]);

  // Approved author subscription to own works
  useEffect(() => {
    if (userRole !== 'author' || !authUser) {
      setAuthorOwnWorks([]);
      return;
    }
    const unsub = subscribeOwnProsesForAuthor(authUser.uid, setAuthorOwnWorks);
    return () => unsub();
  }, [userRole, authUser]);

  // Signed-in user notifications subscription (status updates & editor comments)
  useEffect(() => {
    if (!authUser || !authUser.emailVerified) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeUserNotifications(authUser.uid, setNotifications);
    return () => unsub();
  }, [authUser]);

  const activeWork = useMemo(
    () =>
      portalWorks.find((w) => w.id === activeWorkId) ??
      publicWorks.find((w) => w.id === activeWorkId) ??
      publicWorks[0],
    [portalWorks, publicWorks, activeWorkId],
  );

  const bookmarkedWorks = useMemo(
    () => publicWorks.filter((w) => persisted.bookmarks.includes(w.id)),
    [publicWorks, persisted.bookmarks],
  );

  // Sync dynamic SEO metadata, canonical URL, OpenGraph cards, and Schema.org JSON-LD
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const seo = buildPageSeoMetadata({
      activeView,
      activeWork: activeView === 'baca' ? activeWork : undefined,
      totalWorks: publicWorks.length,
      currentHref: window.location.href,
      baseUrl: import.meta.env.BASE_URL,
    });

    document.title = seo.title;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', seo.description);
    setMeta('meta[name="robots"]', seo.robots);
    setMeta('meta[property="og:type"]', seo.ogType);
    setMeta('meta[property="og:title"]', seo.title);
    setMeta('meta[property="og:description"]', seo.description);
    setMeta('meta[property="og:image"]', seo.ogImage);
    setMeta('meta[name="twitter:title"]', seo.title);
    setMeta('meta[name="twitter:description"]', seo.description);
    setMeta('meta[name="twitter:image"]', seo.ogImage);

    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', seo.canonicalUrl);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', seo.canonicalUrl);

    const jsonLdEl = document.getElementById('dynamic-jsonld');
    if (jsonLdEl) {
      jsonLdEl.textContent = JSON.stringify(seo.jsonLd);
    }
  }, [activeView, activeWork, publicWorks.length]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleNavigate = (view: ViewTab) => {
    if (view !== 'tulis') {
      setEditingWork(null);
    }
    setActiveView(view);
    scrollToTop();
  };

  const handleOpenWork = (id: string) => {
    setEditingWork(null);
    setActiveWorkId(id);
    setActiveView('baca');
    scrollToTop();
  };

  const handleToggleBookmark = (id: string) => {
    setPersisted((prev) => ({
      ...prev,
      bookmarks: toggleIdInList(prev.bookmarks, id),
    }));
  };

  const handleToggleSaveQuote = (quote: {
    proseId: string;
    proseTitle: string;
    author: string;
    text: string;
  }) => {
    setPersisted((prev) => {
      const { next } = addOrRemoveSavedQuote(prev.savedQuotes, quote);
      return { ...prev, savedQuotes: next };
    });
  };

  const handleRemoveQuote = (quote: SavedQuote) => {
    setPersisted((prev) => ({
      ...prev,
      savedQuotes: prev.savedQuotes.filter((q) => q.id !== quote.id),
    }));
  };

  const handleReaderThemeChange = (readerTheme: ReaderTheme) => {
    setPersisted((prev) => ({ ...prev, readerTheme }));
  };

  const handleReaderFontSizeChange = (readerFontSize: ReaderFontSize) => {
    setPersisted((prev) => ({ ...prev, readerFontSize }));
  };

  const handleSignInGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-blocked') {
        setAuthError(
          'Jendela masuk Google diblokir oleh peramban. Izinkan pop-up untuk situs ini lalu coba lagi.',
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('Proses masuk dibatalkan sebelum selesai.');
      } else {
        setAuthError('Gagal masuk dengan Google. Silakan coba kembali.');
      }
    }
  };

  const handleSignOut = async () => {
    setEditingWork(null);
    await signOut(auth);
    showTemporaryNotice('Anda telah keluar dari akun penulis.');
  };

  const handleSubmitAuthorRequest = async (params: {
    penName: string;
    bio?: string;
    reason: string;
  }) => {
    if (!authUser) return;
    await submitAuthorRequest({
      uid: authUser.uid,
      email: authUser.email,
      penName: params.penName,
      bio: params.bio,
      reason: params.reason,
    });
    await refreshRBAC(authUser.uid, authUser.email);
    showTemporaryNotice('Permohonan penulis telah dikirim ke Admin Redaksi.');
  };

  const handlePublishProse = async (newWork: ProseWork) => {
    if (!authUser) return;
    await createProseInFirestore(newWork, authUser.uid);
    if ((newWork.status ?? 'published') === 'published') {
      setActiveWorkId(newWork.id);
      setActiveView('baca');
      showTemporaryNotice('Prosa baru berhasil diterbitkan ke Antologi.');
    } else {
      showTemporaryNotice('Prosa disimpan sebagai Draf Redaksi.');
    }
    scrollToTop();
  };

  const handleStartEditWork = (work: ProseWork) => {
    setEditingWork(work);
    setActiveView('tulis');
    scrollToTop();
  };

  const handleSaveEditProse = async (
    workId: string,
    updates: ProseEditUpdates,
  ) => {
    const existingWork =
      portalWorks.find((w) => w.id === workId) ??
      publicWorks.find((w) => w.id === workId);
    if (!existingWork) return;

    await updateProseInFirestore(
      workId,
      updates,
      userRole === 'admin',
      existingWork,
      authUser?.uid,
    );
    setEditingWork(null);
    setActiveWorkId(workId);
    setActiveView('baca');
    showTemporaryNotice('Perubahan naskah dan gambar berhasil disimpan.');
    scrollToTop();
  };

  const handleToggleWorkStatus = async (work: ProseWork) => {
    const nextStatus =
      (work.status ?? 'published') === 'published' ? 'draft' : 'published';
    await updateProseInFirestore(
      work.id,
      {
        title: work.title,
        subtitle: work.subtitle,
        author: work.author,
        theme: work.theme,
        year: work.year,
        epigraph: work.epigraph,
        pullQuote: work.pullQuote,
        excerpt: work.excerpt,
        body: work.body,
        image: work.image,
        imageCaption: work.imageCaption,
        featuredRank: work.featuredRank ?? 'archive',
        status: nextStatus,
        marginNotes: work.marginNotes,
      },
      userRole === 'admin',
      work,
      authUser?.uid,
    );
    showTemporaryNotice(
      nextStatus === 'published'
        ? `“${work.title}” diterbitkan ke publik.`
        : `“${work.title}” dipindahkan ke Draf Redaksi.`,
    );
  };

  const handleSaveEditorComment = async (
    work: ProseWork,
    editorNote: string,
  ) => {
    if (!authUser) return;
    await saveEditorCommentOnProse(work, editorNote, authUser.uid);
  };

  const handleOpenProseFromNotification = (proseId: string) => {
    const target =
      portalWorks.find((w) => w.id === proseId) ??
      publicWorks.find((w) => w.id === proseId);
    if (!target) return;
    if (canUserEditWork(userRole, authUser?.uid, target)) {
      handleStartEditWork(target);
    } else {
      handleOpenWork(target.id);
    }
  };

  const handleDeleteWork = async (workId: string) => {
    await deleteProseInFirestore(workId);
    setPersisted((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.filter((id) => id !== workId),
    }));
    if (activeWorkId === workId && activeView === 'baca') {
      const remaining = publicWorks.filter((w) => w.id !== workId);
      setActiveWorkId(remaining[0]?.id ?? CURATED_ANTHOLOGY[0].id);
      setActiveView('antologi');
    }
    showTemporaryNotice('Naskah telah dihapus dari antologi.');
  };

  const handleSelectThemeFromEditorial = (theme: ProseTheme) => {
    setSelectedTheme(theme);
    setSearchQuery('');
    setActiveView('antologi');
    scrollToTop();
  };

  const executeShare = async (payload: SharePayload) => {
    const outcome = await invokeWebShare(payload);
    if (outcome.status === 'shared') {
      showTemporaryNotice('Berhasil membuka dialog berbagi perangkat.');
    } else if (outcome.status === 'fallback') {
      setShareModal({ payload: outcome.payload, copied: outcome.copied });
    }
  };

  const handleShareWork = (work: ProseWork) => {
    const shareUrl = buildProseShareUrl(window.location.href, work.id);
    const payload = buildWorkSharePayload(work, shareUrl);
    void executeShare(payload);
  };

  const handleShareQuote = (quote: {
    proseId: string;
    proseTitle: string;
    author: string;
    text: string;
  }) => {
    const shareUrl = buildProseShareUrl(window.location.href, quote.proseId);
    const payload = buildQuoteSharePayload(quote, shareUrl);
    void executeShare(payload);
  };

  const savedBadgeCount =
    persisted.bookmarks.length + persisted.savedQuotes.length;

  const portalActionLabel =
    userRole === 'admin'
      ? 'Meja Redaksi'
      : userRole === 'author'
        ? 'Tulis Prosa Baru'
        : 'Masuk untuk Menulis';

  const footerActionLabel =
    userRole === 'admin'
      ? 'Meja Redaksi'
      : userRole === 'author'
        ? 'Tulis Prosa'
        : 'Masuk Penulis';

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF9F5] text-[#1C1917]">
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        savedCount={savedBadgeCount}
        userRole={userRole}
      />

      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="border-b border-[#E5DFD3] bg-[#F3EFE7] px-6 py-2.5 text-center text-xs font-medium text-[#881337]"
        >
          {statusNotice}
        </div>
      )}

      <main className="flex-1">
        {activeView === 'antologi' && (
          <AnthologyView
            works={publicWorks}
            bookmarks={persisted.bookmarks}
            savedQuotesCount={persisted.savedQuotes.length}
            selectedTheme={selectedTheme}
            searchQuery={searchQuery}
            sortBy={sortBy}
            userRole={userRole}
            currentUid={authUser?.uid}
            writeActionLabel={portalActionLabel}
            onThemeChange={setSelectedTheme}
            onSearchChange={setSearchQuery}
            onSortChange={setSortBy}
            onOpenWork={handleOpenWork}
            onToggleBookmark={handleToggleBookmark}
            onShareWork={handleShareWork}
            onGoToWrite={() => handleNavigate('tulis')}
            onEditWork={handleStartEditWork}
            onDeleteWork={handleDeleteWork}
          />
        )}

        {activeView === 'baca' && activeWork && (
          <ReadingRoomView
            work={activeWork}
            allWorks={publicWorks}
            isBookmarked={persisted.bookmarks.includes(activeWork.id)}
            savedQuotes={persisted.savedQuotes}
            readerTheme={persisted.readerTheme}
            readerFontSize={persisted.readerFontSize}
            onReaderThemeChange={handleReaderThemeChange}
            onReaderFontSizeChange={handleReaderFontSizeChange}
            onToggleBookmark={handleToggleBookmark}
            onToggleSaveQuote={handleToggleSaveQuote}
            onShareWork={handleShareWork}
            onShareQuote={handleShareQuote}
            onSelectWork={handleOpenWork}
            onBackToAnthology={() => handleNavigate('antologi')}
            canEdit={canUserEditWork(userRole, authUser?.uid, activeWork)}
            onEditWork={handleStartEditWork}
            onDeleteWork={handleDeleteWork}
          />
        )}

        {activeView === 'rak' && (
          <ShelfView
            bookmarkedWorks={bookmarkedWorks}
            savedQuotes={persisted.savedQuotes}
            onOpenWork={handleOpenWork}
            onRemoveBookmark={handleToggleBookmark}
            onRemoveQuote={handleRemoveQuote}
            onShareWork={handleShareWork}
            onShareQuote={handleShareQuote}
            onExploreAnthology={() => handleNavigate('antologi')}
          />
        )}

        {activeView === 'tulis' && (
          <AuthorPortalView
            authLoading={authLoading}
            authError={authError}
            authUser={authUser}
            role={userRole}
            authorProfile={authorProfile}
            authorRequest={authorRequest}
            allWorks={portalWorks}
            adminAuthors={adminAuthors}
            adminInvites={adminInvites}
            adminRequests={adminRequests}
            editingWork={editingWork}
            onSignInGoogle={handleSignInGoogle}
            onSignOut={handleSignOut}
            onSubmitAuthorRequest={handleSubmitAuthorRequest}
            onPublishProse={handlePublishProse}
            onSaveEditProse={handleSaveEditProse}
            onStartEditWork={handleStartEditWork}
            onClearEditWork={() => setEditingWork(null)}
            onDeleteWork={handleDeleteWork}
            onToggleWorkStatus={handleToggleWorkStatus}
            onOpenWork={handleOpenWork}
            onCancelToAnthology={() => {
              setEditingWork(null);
              handleNavigate('antologi');
            }}
            onSeedCurated={() =>
              authUser ? seedCuratedAnthologyIfEmpty(authUser.uid) : Promise.resolve(0)
            }
            onCreateInvite={createOrUpdateAuthorInvite}
            onToggleInviteStatus={toggleAuthorInviteStatus}
            onDeleteInvite={deleteAuthorInvite}
            onApproveRequest={(req) =>
              authUser ? approveAuthorRequest(req, authUser.uid) : Promise.resolve()
            }
            onRejectRequest={(req) =>
              authUser ? rejectAuthorRequest(req, authUser.uid) : Promise.resolve()
            }
            onToggleAuthorStatus={(author) =>
              toggleAuthorStatus(author, authUser?.uid)
            }
            onUpdateAuthorPenName={updateAuthorPenName}
            onSaveEditorComment={handleSaveEditorComment}
            notifications={notifications}
            onMarkNotificationRead={(id) => markNotificationRead(id, true)}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onDeleteNotification={deleteNotification}
            onOpenProseFromNotification={handleOpenProseFromNotification}
          />
        )}

        {activeView === 'redaksi' && (
          <EditorialView
            works={publicWorks}
            onSelectThemeInAnthology={handleSelectThemeFromEditorial}
            onGoToWrite={() => handleNavigate('tulis')}
            actionLabel={footerActionLabel}
          />
        )}
      </main>

      <Footer
        onNavigate={handleNavigate}
        totalWorks={publicWorks.length}
        actionLabel={footerActionLabel}
      />

      <ShareModal
        payload={shareModal?.payload ?? null}
        initialCopied={shareModal?.copied ?? false}
        onClose={() => setShareModal(null)}
      />
    </div>
  );
}
