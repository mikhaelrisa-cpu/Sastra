import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { CURATED_ANTHOLOGY } from '../data/anthology';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type {
  AuthorInvite,
  AuthorNotification,
  AuthorProfile,
  AuthorRequest,
  ProseWork,
} from '../types/prose';
import {
  clampNotificationPayload,
  createNotificationId,
  sortNotificationsNewestFirst,
} from '../utils/notificationLogic';
import { clampProsePayload, normalizeEmail } from '../utils/rbacLogic';

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (typeof val === 'number') {
    return val;
  }
  return Date.now();
}

function mapDocToProse(data: DocumentData): ProseWork {
  return {
    id: String(data.id ?? ''),
    accession: String(data.accession ?? ''),
    title: String(data.title ?? ''),
    subtitle: String(data.subtitle ?? ''),
    author: String(data.author ?? ''),
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : undefined,
    theme: data.theme,
    year: String(data.year ?? '2026'),
    epigraph: typeof data.epigraph === 'string' && data.epigraph ? data.epigraph : undefined,
    pullQuote: String(data.pullQuote ?? ''),
    excerpt: String(data.excerpt ?? ''),
    body: String(data.body ?? ''),
    image: typeof data.image === 'string' && data.image ? data.image : undefined,
    imageCaption:
      typeof data.imageCaption === 'string' && data.imageCaption
        ? data.imageCaption
        : undefined,
    featuredRank: data.featuredRank ?? 'archive',
    status: data.status === 'draft' ? 'draft' : 'published',
    marginNotes: Array.isArray(data.marginNotes) ? data.marginNotes : [],
    editorNote:
      typeof data.editorNote === 'string' && data.editorNote
        ? data.editorNote
        : undefined,
    editorNoteUpdatedAt: data.editorNoteUpdatedAt
      ? toMillis(data.editorNoteUpdatedAt)
      : undefined,
    isUserCreated: String(data.accession ?? '').startsWith('ED. PEMBACA'),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function mapDocToNotification(data: DocumentData): AuthorNotification {
  const type =
    data.type === 'editor_comment' || data.type === 'draft_status'
      ? data.type
      : 'request_status';
  return {
    id: String(data.id ?? ''),
    recipientUid: String(data.recipientUid ?? ''),
    type,
    title: String(data.title ?? ''),
    message: String(data.message ?? ''),
    relatedProseId:
      typeof data.relatedProseId === 'string' && data.relatedProseId
        ? data.relatedProseId
        : undefined,
    relatedStatus:
      typeof data.relatedStatus === 'string' && data.relatedStatus
        ? data.relatedStatus
        : undefined,
    read: Boolean(data.read),
    createdBy: String(data.createdBy ?? ''),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function mapDocToAuthorProfile(data: DocumentData): AuthorProfile {
  return {
    uid: String(data.uid ?? ''),
    penName: String(data.penName ?? ''),
    bio: typeof data.bio === 'string' ? data.bio : '',
    status: data.status === 'suspended' ? 'suspended' : 'active',
    approvedBy: String(data.approvedBy ?? ''),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function mapDocToAuthorInvite(data: DocumentData): AuthorInvite {
  return {
    email: String(data.email ?? ''),
    penName: String(data.penName ?? ''),
    bio: typeof data.bio === 'string' ? data.bio : '',
    status: data.status === 'revoked' ? 'revoked' : 'active',
    invitedBy: String(data.invitedBy ?? ''),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function mapDocToAuthorRequest(data: DocumentData): AuthorRequest {
  return {
    uid: String(data.uid ?? ''),
    email: String(data.email ?? ''),
    penName: String(data.penName ?? ''),
    bio: typeof data.bio === 'string' ? data.bio : '',
    reason: String(data.reason ?? ''),
    status:
      data.status === 'approved' || data.status === 'rejected'
        ? data.status
        : 'pending',
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function subscribePublishedProses(
  onData: (works: ProseWork[]) => void,
  onEmpty?: () => void,
): () => void {
  const path = 'proses';
  const q = query(
    collection(db, path),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onEmpty?.();
        return;
      }
      const list = snapshot.docs.map((d) => mapDocToProse(d.data()));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeAllProsesForAdmin(
  onData: (works: ProseWork[]) => void,
): () => void {
  const path = 'proses';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => mapDocToProse(d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeOwnProsesForAuthor(
  uid: string,
  onData: (works: ProseWork[]) => void,
): () => void {
  const path = 'proses';
  const q = query(
    collection(db, path),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => mapDocToProse(d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function seedCuratedAnthologyIfEmpty(adminUid: string): Promise<number> {
  const path = 'proses';
  try {
    const existingSnap = await getDocs(collection(db, path));
    if (!existingSnap.empty) {
      return 0;
    }
    const batch = writeBatch(db);
    for (const work of CURATED_ANTHOLOGY) {
      const clamped = clampProsePayload({
        title: work.title,
        subtitle: work.subtitle,
        author: work.author,
        epigraph: work.epigraph,
        pullQuote: work.pullQuote,
        excerpt: work.excerpt,
        body: work.body,
        image: work.image,
        imageCaption: work.imageCaption,
      });
      const payload: Record<string, unknown> = {
        id: work.id,
        accession: work.accession.slice(0, 64),
        title: clamped.title,
        subtitle: clamped.subtitle,
        author: clamped.author,
        authorUid: adminUid,
        theme: work.theme,
        year: work.year,
        pullQuote: clamped.pullQuote,
        excerpt: clamped.excerpt,
        body: clamped.body,
        featuredRank: work.featuredRank ?? 'archive',
        status: 'published',
        marginNotes: work.marginNotes.slice(0, 12),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (clamped.epigraph) payload.epigraph = clamped.epigraph;
      if (clamped.image) payload.image = clamped.image;
      if (clamped.imageCaption) payload.imageCaption = clamped.imageCaption;

      batch.set(doc(db, path, work.id), payload);
    }
    await batch.commit();
    return CURATED_ANTHOLOGY.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createProseInFirestore(
  work: ProseWork,
  authorUid: string,
): Promise<void> {
  const path = `proses/${work.id}`;
  const clamped = clampProsePayload({
    title: work.title,
    subtitle: work.subtitle,
    author: work.author,
    epigraph: work.epigraph,
    pullQuote: work.pullQuote,
    excerpt: work.excerpt,
    body: work.body,
    image: work.image,
    imageCaption: work.imageCaption,
  });

  const payload: Record<string, unknown> = {
    id: work.id,
    accession: work.accession.slice(0, 64),
    title: clamped.title,
    subtitle: clamped.subtitle,
    author: clamped.author,
    authorUid,
    theme: work.theme,
    year: work.year,
    pullQuote: clamped.pullQuote,
    excerpt: clamped.excerpt,
    body: clamped.body,
    featuredRank: work.featuredRank ?? 'archive',
    status: work.status ?? 'published',
    marginNotes: (work.marginNotes ?? []).slice(0, 12),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (clamped.epigraph) payload.epigraph = clamped.epigraph;
  if (clamped.image) payload.image = clamped.image;
  if (clamped.imageCaption) payload.imageCaption = clamped.imageCaption;

  try {
    await setDoc(doc(db, 'proses', work.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProseInFirestore(
  proseId: string,
  updates: {
    title: string;
    subtitle: string;
    author: string;
    theme: ProseWork['theme'];
    year?: string;
    epigraph?: string;
    pullQuote: string;
    excerpt: string;
    body: string;
    image?: string;
    imageCaption?: string;
    featuredRank?: ProseWork['featuredRank'];
    status?: ProseWork['status'];
    marginNotes?: ProseWork['marginNotes'];
    editorNote?: string;
  },
  isAdminUser: boolean,
  existingWork: ProseWork,
  actorUid?: string,
): Promise<void> {
  const path = `proses/${proseId}`;
  const clamped = clampProsePayload({
    title: updates.title,
    subtitle: updates.subtitle,
    author: updates.author,
    epigraph: updates.epigraph,
    pullQuote: updates.pullQuote,
    excerpt: updates.excerpt,
    body: updates.body,
    image: updates.image,
    imageCaption: updates.imageCaption,
  });

  const nextStatus = updates.status ?? existingWork.status ?? 'published';
  const trimmedEditorNote =
    isAdminUser && updates.editorNote !== undefined
      ? updates.editorNote.trim().slice(0, 1000)
      : undefined;

  const fullDoc: Record<string, unknown> = {
    id: existingWork.id,
    accession: existingWork.accession.slice(0, 64),
    title: clamped.title,
    subtitle: clamped.subtitle,
    author: clamped.author,
    authorUid: existingWork.authorUid ?? actorUid ?? 'redaksi-senandika',
    theme: updates.theme,
    year: isAdminUser && updates.year ? updates.year : existingWork.year,
    pullQuote: clamped.pullQuote,
    excerpt: clamped.excerpt,
    body: clamped.body,
    featuredRank: isAdminUser
      ? (updates.featuredRank ?? existingWork.featuredRank ?? 'archive')
      : (existingWork.featuredRank ?? 'archive'),
    status: nextStatus,
    marginNotes: (updates.marginNotes ?? existingWork.marginNotes ?? []).slice(0, 12),
    createdAt: Timestamp.fromMillis(existingWork.createdAt),
    updatedAt: serverTimestamp(),
  };

  if (clamped.epigraph) fullDoc.epigraph = clamped.epigraph;
  if (clamped.image) fullDoc.image = clamped.image;
  if (clamped.imageCaption) fullDoc.imageCaption = clamped.imageCaption;

  try {
    const snap = await getDoc(doc(db, 'proses', proseId));
    const batch = writeBatch(db);
    let targetAuthorUid = String(fullDoc.authorUid);

    if (!snap.exists()) {
      fullDoc.createdAt = serverTimestamp();
      if (isAdminUser && trimmedEditorNote) {
        fullDoc.editorNote = trimmedEditorNote;
        fullDoc.editorNoteUpdatedAt = serverTimestamp();
      }
      batch.set(doc(db, 'proses', proseId), fullDoc);
    } else {
      const serverData = snap.data();
      targetAuthorUid = String(serverData.authorUid ?? fullDoc.authorUid);
      fullDoc.createdAt = serverData.createdAt ?? serverTimestamp();
      fullDoc.authorUid = targetAuthorUid;

      if (isAdminUser) {
        if (updates.editorNote !== undefined) {
          if (trimmedEditorNote) {
            fullDoc.editorNote = trimmedEditorNote;
            fullDoc.editorNoteUpdatedAt =
              trimmedEditorNote !== (serverData.editorNote ?? '')
                ? serverTimestamp()
                : (serverData.editorNoteUpdatedAt ?? serverTimestamp());
          }
        } else if (serverData.editorNote) {
          fullDoc.editorNote = serverData.editorNote;
          if (serverData.editorNoteUpdatedAt) {
            fullDoc.editorNoteUpdatedAt = serverData.editorNoteUpdatedAt;
          }
        }
      } else {
        // Non-admin authors must preserve server editorNote untouched
        if (serverData.editorNote) {
          fullDoc.editorNote = serverData.editorNote;
        }
        if (serverData.editorNoteUpdatedAt) {
          fullDoc.editorNoteUpdatedAt = serverData.editorNoteUpdatedAt;
        }
      }

      batch.set(doc(db, 'proses', proseId), fullDoc);

      // Emit notification when Admin adds/updates editorNote or updates status for another author
      if (
        isAdminUser &&
        actorUid &&
        targetAuthorUid &&
        targetAuthorUid !== actorUid &&
        targetAuthorUid !== 'redaksi-senandika'
      ) {
        const noteChanged =
          Boolean(trimmedEditorNote) &&
          trimmedEditorNote !== (serverData.editorNote ?? '');
        const statusChanged = nextStatus !== (serverData.status ?? 'published');

        if (noteChanged && trimmedEditorNote) {
          const notifId = createNotificationId();
          const notif = clampNotificationPayload({
            recipientUid: targetAuthorUid,
            type: 'editor_comment',
            title: `Komentar editor pada “${clamped.title}”`,
            message: trimmedEditorNote,
            relatedProseId: proseId,
            relatedStatus: nextStatus,
            createdBy: actorUid,
          });
          batch.set(doc(db, 'notifications', notifId), {
            id: notifId,
            ...notif,
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (statusChanged) {
          const notifId = createNotificationId();
          const notif = clampNotificationPayload({
            recipientUid: targetAuthorUid,
            type: 'draft_status',
            title: `Status naskah “${clamped.title}” diperbarui`,
            message:
              nextStatus === 'published'
                ? 'Naskah Anda telah diterbitkan oleh Admin Redaksi ke halaman Antologi.'
                : 'Naskah Anda dipindahkan ke Draf Redaksi untuk penyuntingan lanjutan.',
            relatedProseId: proseId,
            relatedStatus: nextStatus,
            createdBy: actorUid,
          });
          batch.set(doc(db, 'notifications', notifId), {
            id: notifId,
            ...notif,
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveEditorCommentOnProse(
  work: ProseWork,
  editorNote: string,
  adminUid: string,
): Promise<void> {
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
      status: work.status ?? 'published',
      marginNotes: work.marginNotes,
      editorNote,
    },
    true,
    work,
    adminUid,
  );
}

export async function deleteProseInFirestore(proseId: string): Promise<void> {
  const path = `proses/${proseId}`;
  try {
    await deleteDoc(doc(db, 'proses', proseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUserRBACState(uid: string, email: string): Promise<{
  isAdminDoc: boolean;
  authorProfile: AuthorProfile | null;
  authorRequest: AuthorRequest | null;
}> {
  const emailLower = normalizeEmail(email);
  let isAdminDoc = false;
  let authorProfile: AuthorProfile | null = null;
  let authorRequest: AuthorRequest | null = null;

  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    isAdminDoc = adminSnap.exists();
  } catch {
    isAdminDoc = false;
  }

  try {
    const authorSnap = await getDoc(doc(db, 'authors', uid));
    if (authorSnap.exists()) {
      authorProfile = mapDocToAuthorProfile(authorSnap.data());
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `authors/${uid}`);
  }

  // Auto-claim pre-created author invite if no author profile exists yet
  if (!authorProfile && emailLower) {
    try {
      const inviteSnap = await getDoc(doc(db, 'authorInvites', emailLower));
      if (inviteSnap.exists()) {
        const invite = mapDocToAuthorInvite(inviteSnap.data());
        if (invite.status === 'active') {
          const newProfile: Record<string, unknown> = {
            uid,
            penName: invite.penName,
            status: 'active',
            approvedBy: invite.invitedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (invite.bio) newProfile.bio = invite.bio;
          await setDoc(doc(db, 'authors', uid), newProfile);
          const refreshed = await getDoc(doc(db, 'authors', uid));
          if (refreshed.exists()) {
            authorProfile = mapDocToAuthorProfile(refreshed.data());
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `authors/${uid}`);
    }
  }

  if (!authorProfile) {
    try {
      const reqSnap = await getDoc(doc(db, 'authorRequests', uid));
      if (reqSnap.exists()) {
        authorRequest = mapDocToAuthorRequest(reqSnap.data());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `authorRequests/${uid}`);
    }
  }

  return { isAdminDoc, authorProfile, authorRequest };
}

export async function submitAuthorRequest(params: {
  uid: string;
  email: string;
  penName: string;
  bio?: string;
  reason: string;
}): Promise<void> {
  const path = `authorRequests/${params.uid}`;
  const payload: Record<string, unknown> = {
    uid: params.uid,
    email: normalizeEmail(params.email).slice(0, 128),
    penName: params.penName.trim().slice(0, 100),
    reason: params.reason.trim().slice(0, 600),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.bio && params.bio.trim()) {
    payload.bio = params.bio.trim().slice(0, 500);
  }
  try {
    await setDoc(doc(db, 'authorRequests', params.uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeAdminLists(callbacks: {
  onAuthors: (authors: AuthorProfile[]) => void;
  onInvites: (invites: AuthorInvite[]) => void;
  onRequests: (requests: AuthorRequest[]) => void;
}): () => void {
  const unsubAuthors = onSnapshot(
    query(collection(db, 'authors'), orderBy('createdAt', 'desc')),
    (snap) => callbacks.onAuthors(snap.docs.map((d) => mapDocToAuthorProfile(d.data()))),
    (err) => handleFirestoreError(err, OperationType.LIST, 'authors'),
  );

  const unsubInvites = onSnapshot(
    query(collection(db, 'authorInvites'), orderBy('createdAt', 'desc')),
    (snap) => callbacks.onInvites(snap.docs.map((d) => mapDocToAuthorInvite(d.data()))),
    (err) => handleFirestoreError(err, OperationType.LIST, 'authorInvites'),
  );

  const unsubRequests = onSnapshot(
    query(collection(db, 'authorRequests'), orderBy('createdAt', 'desc')),
    (snap) => callbacks.onRequests(snap.docs.map((d) => mapDocToAuthorRequest(d.data()))),
    (err) => handleFirestoreError(err, OperationType.LIST, 'authorRequests'),
  );

  return () => {
    unsubAuthors();
    unsubInvites();
    unsubRequests();
  };
}

export async function createOrUpdateAuthorInvite(params: {
  email: string;
  penName: string;
  bio?: string;
  adminUid: string;
}): Promise<void> {
  const emailLower = normalizeEmail(params.email);
  const path = `authorInvites/${emailLower}`;
  try {
    const existingSnap = await getDoc(doc(db, 'authorInvites', emailLower));
    const payload: Record<string, unknown> = {
      email: emailLower,
      penName: params.penName.trim().slice(0, 100),
      status: 'active',
      invitedBy: params.adminUid,
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.bio && params.bio.trim()) {
      payload.bio = params.bio.trim().slice(0, 500);
    }
    await setDoc(doc(db, 'authorInvites', emailLower), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleAuthorInviteStatus(
  invite: AuthorInvite,
): Promise<void> {
  const emailLower = normalizeEmail(invite.email);
  const path = `authorInvites/${emailLower}`;
  try {
    await updateDoc(doc(db, 'authorInvites', emailLower), {
      status: invite.status === 'active' ? 'revoked' : 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAuthorInvite(email: string): Promise<void> {
  const emailLower = normalizeEmail(email);
  const path = `authorInvites/${emailLower}`;
  try {
    await deleteDoc(doc(db, 'authorInvites', emailLower));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function approveAuthorRequest(
  request: AuthorRequest,
  adminUid: string,
): Promise<void> {
  const path = `authorRequests/${request.uid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'authorRequests', request.uid), {
      status: 'approved',
      updatedAt: serverTimestamp(),
    });
    const authorPayload: Record<string, unknown> = {
      uid: request.uid,
      penName: request.penName.slice(0, 100),
      status: 'active',
      approvedBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (request.bio) authorPayload.bio = request.bio.slice(0, 500);
    batch.set(doc(db, 'authors', request.uid), authorPayload);

    const notifId = createNotificationId();
    const notif = clampNotificationPayload({
      recipientUid: request.uid,
      type: 'request_status',
      title: 'Permohonan penulis disetujui',
      message: `Selamat, akun penulis Anda dengan nama pena “${request.penName}” telah disetujui Admin Redaksi. Anda kini dapat menulis dan menerbitkan prosa.`,
      relatedStatus: 'approved',
      createdBy: adminUid,
    });
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      ...notif,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function rejectAuthorRequest(
  request: AuthorRequest,
  adminUid: string,
): Promise<void> {
  const path = `authorRequests/${request.uid}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'authorRequests', request.uid), {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });

    const notifId = createNotificationId();
    const notif = clampNotificationPayload({
      recipientUid: request.uid,
      type: 'request_status',
      title: 'Permohonan penulis belum disetujui',
      message: `Permohonan akses penulis untuk nama pena “${request.penName}” belum dapat disetujui saat ini. Anda dapat memperbarui catatan pengajuan dan mengirim ulang.`,
      relatedStatus: 'rejected',
      createdBy: adminUid,
    });
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      ...notif,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleAuthorStatus(
  author: AuthorProfile,
  adminUid?: string,
): Promise<void> {
  const path = `authors/${author.uid}`;
  const nextStatus = author.status === 'active' ? 'suspended' : 'active';
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'authors', author.uid), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    if (adminUid) {
      const notifId = createNotificationId();
      const notif = clampNotificationPayload({
        recipientUid: author.uid,
        type: 'request_status',
        title:
          nextStatus === 'active'
            ? 'Akses penulis diaktifkan kembali'
            : 'Akses menulis dinonaktifkan sementara',
        message:
          nextStatus === 'active'
            ? `Akun penulis “${author.penName}” telah diaktifkan kembali oleh Admin Redaksi.`
            : `Akses menulis untuk akun “${author.penName}” sedang dinonaktifkan sementara oleh Admin Redaksi.`,
        relatedStatus: nextStatus,
        createdBy: adminUid,
      });
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        ...notif,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAuthorPenName(
  author: AuthorProfile,
  penName: string,
): Promise<void> {
  const path = `authors/${author.uid}`;
  try {
    await updateDoc(doc(db, 'authors', author.uid), {
      penName: penName.trim().slice(0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserNotifications(
  uid: string,
  onData: (items: AuthorNotification[]) => void,
): () => void {
  const path = 'notifications';
  const q = query(collection(db, path), where('recipientUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const mapped = snapshot.docs.map((d) => mapDocToNotification(d.data()));
      onData(sortNotificationsNewestFirst(mapped));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function markNotificationRead(
  notificationId: string,
  read = true,
): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;
  const path = 'notifications';
  try {
    const batch = writeBatch(db);
    for (const id of notificationIds) {
      batch.update(doc(db, 'notifications', id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
