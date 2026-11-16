import { Check, Copy, Mail, MessageCircle, Send, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  buildSocialShareUrls,
  formatClipboardShareText,
  type SharePayload,
} from '../utils/shareLogic';

interface ShareModalProps {
  payload: SharePayload | null;
  initialCopied?: boolean;
  onClose: () => void;
}

export function ShareModal({
  payload,
  initialCopied = false,
  onClose,
}: ShareModalProps) {
  const [copiedText, setCopiedText] = useState(initialCopied);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setCopiedText(initialCopied);
    setCopiedLink(false);
  }, [payload, initialCopied]);

  useEffect(() => {
    if (!payload) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [payload, onClose]);

  if (!payload) return null;

  const socialUrls = buildSocialShareUrls(payload);

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(formatClipboardShareText(payload));
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 2200);
    } catch {
      setCopiedText(false);
    }
  };

  const handleCopyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(payload.url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1C1917]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="w-full max-w-lg rounded-t-xl border border-[#E5DFD3] bg-[#FBF9F5] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#1C1917] shadow-xl sm:rounded-xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5DFD3] pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#881337]">
              Sebarkan Sastra
            </p>
            <h2
              id="share-dialog-title"
              className="mt-1 font-serif text-2xl font-semibold text-[#1C1917]"
            >
              Bagikan Kutipan & Tautan
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog berbagi"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5DFD3] text-[#57534E] transition-colors hover:bg-[#F3EFE7] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-[#E5DFD3] bg-[#F3EFE7]/70 p-4">
          <p className="font-serif text-lg italic leading-relaxed text-[#1C1917]">
            {payload.text}
          </p>
          <p className="mt-2 truncate text-xs text-[#57534E]">{payload.url}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <a
            href={socialUrls.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>WhatsApp</span>
          </a>

          <a
            href={socialUrls.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337]"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>X / Twitter</span>
          </a>

          <a
            href={socialUrls.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337]"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Telegram</span>
          </a>

          <a
            href={socialUrls.email}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#D6CEBE] bg-[#FBF9F5] px-3 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:border-[#881337] hover:text-[#881337]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>Surel</span>
          </a>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#E5DFD3] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleCopyLinkOnly}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#D6CEBE] px-4 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F3EFE7] cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-[#881337]" aria-hidden="true" />
                <span>Tautan Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Salin Tautan Saja</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyFull}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-[#881337] px-5 py-2 text-xs font-medium text-[#FBF9F5] transition-colors hover:bg-[#9F1239] cursor-pointer"
          >
            {copiedText ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Kutipan & Tautan Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Salin Kutipan & Tautan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
