import type {
  AuthorProfile,
  AuthorRequest,
  ProseWork,
  UserRole,
} from '../types/prose';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'mikhaelrisa@gmail.com';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailAddress(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(normalized);
}

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return normalizeEmail(email) === BOOTSTRAPPED_ADMIN_EMAIL;
}

export function resolveUserRole(params: {
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  isAdminDoc?: boolean;
  authorProfile?: AuthorProfile | null;
  authorRequest?: AuthorRequest | null;
}): UserRole {
  if (!params.uid || !params.emailVerified) {
    return 'visitor';
  }
  if (isBootstrappedAdminEmail(params.email) || params.isAdminDoc) {
    return 'admin';
  }
  if (params.authorProfile) {
    return params.authorProfile.status === 'active' ? 'author' : 'suspended';
  }
  if (params.authorRequest) {
    if (params.authorRequest.status === 'pending') return 'pending';
    if (params.authorRequest.status === 'rejected') return 'rejected';
  }
  return 'visitor';
}

export function canUserPublishProse(role: UserRole): boolean {
  return role === 'admin' || role === 'author';
}

export function canUserEditWork(
  role: UserRole,
  currentUid: string | null | undefined,
  work: ProseWork,
): boolean {
  if (role === 'admin') return true;
  if (role === 'author' && currentUid && work.authorUid === currentUid) {
    return true;
  }
  return false;
}

export function validateAuthorInviteInput(input: {
  email: string;
  penName: string;
  bio?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!isValidEmailAddress(input.email)) {
    errors.email = 'Masukkan alamat email Google penulis yang valid.';
  }
  if (input.penName.trim().length < 2 || input.penName.trim().length > 100) {
    errors.penName = 'Nama pena penulis minimal 2 karakter (maks 100).';
  }
  if (input.bio && input.bio.trim().length > 500) {
    errors.bio = 'Biografi singkat maksimal 500 karakter.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateAuthorRequestInput(input: {
  penName: string;
  reason: string;
  bio?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (input.penName.trim().length < 2 || input.penName.trim().length > 100) {
    errors.penName = 'Nama pena wajib diisi (2–100 karakter).';
  }
  if (input.reason.trim().length < 5 || input.reason.trim().length > 600) {
    errors.reason = 'Tuliskan alasan atau contoh ringkas karya Anda (minimal 5 karakter).';
  }
  if (input.bio && input.bio.trim().length > 500) {
    errors.bio = 'Biografi singkat maksimal 500 karakter.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function clampProsePayload<T extends {
  title: string;
  subtitle: string;
  author: string;
  epigraph?: string;
  pullQuote: string;
  excerpt: string;
  body: string;
  image?: string;
  imageCaption?: string;
}>(payload: T): T {
  return {
    ...payload,
    title: payload.title.trim().slice(0, 180),
    subtitle: payload.subtitle.trim().slice(0, 260),
    author: payload.author.trim().slice(0, 100),
    epigraph: payload.epigraph ? payload.epigraph.trim().slice(0, 400) : undefined,
    pullQuote: payload.pullQuote.trim().slice(0, 600),
    excerpt: payload.excerpt.trim().slice(0, 500),
    body: payload.body.trim().slice(0, 50000),
    image: payload.image ? payload.image.trim().slice(0, 650000) : undefined,
    imageCaption: payload.imageCaption
      ? payload.imageCaption.trim().slice(0, 240)
      : undefined,
  };
}
