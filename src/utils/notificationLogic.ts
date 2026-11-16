import type { AuthorNotification, NotificationType } from '../types/prose';

export interface NotificationInput {
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedProseId?: string;
  relatedStatus?: string;
  createdBy: string;
}

export function createNotificationId(now = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `notif-${now}-${rand}`;
}

export function clampNotificationPayload(input: NotificationInput): {
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedProseId?: string;
  relatedStatus?: string;
  createdBy: string;
} {
  return {
    recipientUid: input.recipientUid.trim().slice(0, 128),
    type: input.type,
    title: input.title.trim().slice(0, 140),
    message: input.message.trim().slice(0, 600),
    relatedProseId: input.relatedProseId
      ? input.relatedProseId.trim().slice(0, 128)
      : undefined,
    relatedStatus: input.relatedStatus
      ? input.relatedStatus.trim().slice(0, 40)
      : undefined,
    createdBy: input.createdBy.trim().slice(0, 128),
  };
}

export function countUnreadNotifications(
  notifications: AuthorNotification[],
): number {
  return notifications.reduce((acc, item) => (item.read ? acc : acc + 1), 0);
}

export function sortNotificationsNewestFirst(
  notifications: AuthorNotification[],
): AuthorNotification[] {
  return [...notifications].sort((a, b) => b.createdAt - a.createdAt);
}

export function getNotificationCategoryLabel(type: NotificationType): string {
  if (type === 'request_status') return 'Status Permohonan';
  if (type === 'editor_comment') return 'Komentar Editor';
  return 'Status Naskah';
}

export function buildNotificationAriaLabel(unreadCount: number): string {
  if (unreadCount <= 0) {
    return 'Notifikasi redaksi, belum ada pembaruan baru';
  }
  return `Notifikasi redaksi, ${unreadCount} belum dibaca`;
}

export function formatNotificationRelativeTime(
  timestampMs: number,
  nowMs = Date.now(),
): string {
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} hari lalu`;
  return new Date(timestampMs).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
