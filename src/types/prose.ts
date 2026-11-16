export type ProseTheme =
  | 'Surat & Epistolari'
  | 'Melankolia'
  | 'Senja & Kota'
  | 'Alam & Rindu';

export type ReaderTheme = 'kertas' | 'sepia' | 'malam';
export type ReaderFontSize = 'kecil' | 'nyaman' | 'besar';
export type ViewTab = 'antologi' | 'baca' | 'rak' | 'tulis' | 'redaksi';
export type SortOption = 'pilihan' | 'terbaru' | 'singkat';
export type FeaturedRank = 'lead' | 'curated' | 'archive';
export type ProseStatus = 'published' | 'draft';
export type UserRole = 'visitor' | 'pending' | 'rejected' | 'suspended' | 'author' | 'admin';

export interface MarginNote {
  id: string;
  term: string;
  note: string;
}

export interface ProseWork {
  id: string;
  accession: string;
  title: string;
  subtitle: string;
  author: string;
  authorUid?: string;
  theme: ProseTheme;
  year: string;
  epigraph?: string;
  pullQuote: string;
  excerpt: string;
  body: string;
  image?: string;
  imageCaption?: string;
  featuredRank?: FeaturedRank;
  status?: ProseStatus;
  marginNotes: MarginNote[];
  editorNote?: string;
  editorNoteUpdatedAt?: number;
  isUserCreated?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface SavedQuote {
  id: string;
  proseId: string;
  proseTitle: string;
  author: string;
  text: string;
  savedAt: number;
}

export interface PersistedState {
  bookmarks: string[];
  savedQuotes: SavedQuote[];
  userWorks: ProseWork[];
  readerTheme: ReaderTheme;
  readerFontSize: ReaderFontSize;
}

export interface AuthorProfile {
  uid: string;
  penName: string;
  bio?: string;
  status: 'active' | 'suspended';
  approvedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthorInvite {
  email: string;
  penName: string;
  bio?: string;
  status: 'active' | 'revoked';
  invitedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthorRequest {
  uid: string;
  email: string;
  penName: string;
  bio?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt: number;
}

export type NotificationType = 'request_status' | 'editor_comment' | 'draft_status';

export interface AuthorNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedProseId?: string;
  relatedStatus?: string;
  read: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
