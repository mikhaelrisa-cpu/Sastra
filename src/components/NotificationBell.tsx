import { Bell, Check, CheckCheck, FileEdit, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AuthorNotification } from '../types/prose';
import {
  buildNotificationAriaLabel,
  countUnreadNotifications,
  formatNotificationRelativeTime,
  getNotificationCategoryLabel,
} from '../utils/notificationLogic';

interface NotificationBellProps {
  notifications: AuthorNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: (ids: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenProse?: (proseId: string) => void;
}

export function NotificationBell({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onOpenProse,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = countUnreadNotifications(notifications);
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenRelated = async (item: AuthorNotification) => {
    if (!item.read) {
      await onMarkRead(item.id);
    }
    if (item.relatedProseId && onOpenProse) {
      onOpenProse(item.relatedProseId);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={buildNotificationAriaLabel(unreadCount)}
        data-testid="notification-bell-button"
        className={`relative inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#881337] ${
          isOpen
            ? 'border-[#881337] bg-[#F3EFE7] text-[#1C1917]'
            : 'border-[#D6CEBE] bg-[#FBF9F5] text-[#1C1917] hover:bg-[#F3EFE7]'
        }`}
      >
        <Bell
          className={`h-4 w-4 ${unreadCount > 0 ? 'text-[#881337]' : 'text-[#57534E]'}`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Notifikasi</span>
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="inline-flex min-w-[18px] items-center justify-center rounded bg-[#881337] px-1 py-0.5 text-[10px] font-semibold leading-none text-[#FBF9F5] tabular-nums"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Daftar notifikasi penulis"
          data-testid="notification-panel"
          className="absolute right-0 z-40 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-lg border border-[#E5DFD3] bg-[#FBF9F5] shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#E5DFD3] bg-[#F3EFE7]/70 px-4 py-3">
            <div>
              <p className="font-serif text-lg font-semibold text-[#1C1917]">
                Notifikasi Redaksi
              </p>
              <p className="text-[11px] text-[#57534E] tabular-nums">
                {unreadCount > 0
                  ? `${unreadCount} pembaruan belum dibaca`
                  : 'Semua pembaruan telah dibaca'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={busyId === 'all'}
                onClick={async () => {
                  setBusyId('all');
                  try {
                    await onMarkAllRead(unreadIds);
                  } finally {
                    setBusyId(null);
                  }
                }}
                className="inline-flex items-center gap-1 rounded border border-[#D6CEBE] bg-[#FBF9F5] px-2 py-1 text-[11px] font-medium text-[#881337] hover:bg-[#F3EFE7] cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="h-3 w-3" aria-hidden="true" />
                <span>Tandai Semua</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#E5DFD3]">
            {notifications.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="font-serif text-lg text-[#1C1917]">
                  Belum ada notifikasi
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  Pembaruan status permohonan penulis atau komentar editor pada draf Anda akan tampil di sini.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`px-4 py-3.5 transition-colors ${
                    item.read ? 'bg-[#FBF9F5]' : 'bg-[#F3EFE7]/55'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {!item.read && (
                        <span
                          aria-label="Belum dibaca"
                          className="inline-block h-1.5 w-1.5 rounded-full bg-[#881337]"
                        />
                      )}
                      <span className="font-medium uppercase tracking-wider text-[#881337]">
                        {getNotificationCategoryLabel(item.type)}
                      </span>
                      <span aria-hidden="true" className="text-[#78716C]">
                        ·
                      </span>
                      <span className="text-[#57534E] tabular-nums">
                        {formatNotificationRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await onDelete(item.id);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      aria-label={`Hapus notifikasi ${item.title}`}
                      className="rounded p-1 text-[#78716C] hover:bg-[#E5DFD3]/60 hover:text-[#1C1917] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="mt-1 font-serif text-base font-semibold leading-snug text-[#1C1917]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#44403C]">
                    {item.message}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {item.relatedProseId && onOpenProse && (
                      <button
                        type="button"
                        onClick={() => void handleOpenRelated(item)}
                        className="inline-flex items-center gap-1 rounded border border-[#D6CEBE] bg-[#FBF9F5] px-2.5 py-1 text-[11px] font-medium text-[#881337] hover:border-[#881337] cursor-pointer"
                      >
                        <FileEdit className="h-3 w-3" aria-hidden="true" />
                        <span>Buka Draf</span>
                      </button>
                    )}

                    {!item.read && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={async () => {
                          setBusyId(item.id);
                          try {
                            await onMarkRead(item.id);
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-[#57534E] hover:bg-[#E5DFD3]/50 hover:text-[#1C1917] cursor-pointer"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        <span>Tandai dibaca</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
