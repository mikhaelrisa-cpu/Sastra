import type { ProseWork } from '../types/prose';

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export interface ShareOutcome {
  status: 'shared' | 'cancelled' | 'fallback';
  copied: boolean;
  payload: SharePayload;
}

export function buildProseShareUrl(currentHref: string, proseId: string): string {
  try {
    const parsed = new URL(currentHref);
    parsed.searchParams.set('karya', proseId);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return `?karya=${encodeURIComponent(proseId)}`;
  }
}

export function extractProseIdFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const id = params.get('karya')?.trim();
    return id ? id : null;
  } catch {
    return null;
  }
}

export function buildWorkSharePayload(
  work: Pick<ProseWork, 'id' | 'title' | 'author' | 'pullQuote'>,
  url: string,
): SharePayload {
  return {
    title: `${work.title} — Senandika`,
    text: `“${work.pullQuote}” — ${work.author}, dalam «${work.title}» (Senandika)`,
    url,
  };
}

export function buildQuoteSharePayload(
  quote: { text: string; author: string; proseTitle: string },
  url: string,
): SharePayload {
  return {
    title: `Kutipan dari ${quote.proseTitle} — Senandika`,
    text: `“${quote.text}” — ${quote.author}, dalam «${quote.proseTitle}» (Senandika)`,
    url,
  };
}

export function buildSocialShareUrls(payload: SharePayload): {
  whatsapp: string;
  twitter: string;
  telegram: string;
  email: string;
} {
  const combined = `${payload.text}\n${payload.url}`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(combined)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`,
    email: `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(combined)}`,
  };
}

export function formatClipboardShareText(payload: SharePayload): string {
  return `${payload.text}\n\nBaca selengkapnya: ${payload.url}`;
}

export async function invokeWebShare(
  payload: SharePayload,
  deps?: {
    shareFn?: (data: ShareData) => Promise<void>;
    canShareFn?: (data: ShareData) => boolean;
    copyFn?: (text: string) => Promise<void>;
  },
): Promise<ShareOutcome> {
  const shareFn =
    deps?.shareFn ??
    (typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      ? navigator.share.bind(navigator)
      : undefined);

  const canShareFn =
    deps?.canShareFn ??
    (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
      ? navigator.canShare.bind(navigator)
      : undefined);

  const copyFn =
    deps?.copyFn ??
    (typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
      ? navigator.clipboard.writeText.bind(navigator.clipboard)
      : undefined);

  if (shareFn) {
    const canShare = canShareFn ? canShareFn(payload) : true;
    if (canShare) {
      try {
        await shareFn(payload);
        return { status: 'shared', copied: false, payload };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { status: 'cancelled', copied: false, payload };
        }
        // Other errors (e.g., NotAllowedError inside restricted desktop/iframe environments) fall through to fallback
      }
    }
  }

  let copied = false;
  if (copyFn) {
    try {
      await copyFn(formatClipboardShareText(payload));
      copied = true;
    } catch {
      copied = false;
    }
  }

  return { status: 'fallback', copied, payload };
}
