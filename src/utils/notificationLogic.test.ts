import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotificationAriaLabel,
  clampNotificationPayload,
  countUnreadNotifications,
  createNotificationId,
  formatNotificationRelativeTime,
  getNotificationCategoryLabel,
  sortNotificationsNewestFirst,
} from './notificationLogic';
import type { AuthorNotification } from '../types/prose';

test('createNotificationId generates Firestore-safe valid IDs', () => {
  const id = createNotificationId(1700000000000);
  assert.match(id, /^[a-zA-Z0-9_\-]+$/);
  assert.ok(id.startsWith('notif-1700000000000-'));
});

test('clampNotificationPayload trims and enforces field bounds', () => {
  const clamped = clampNotificationPayload({
    recipientUid: '  uid-123  ',
    type: 'editor_comment',
    title: 'A'.repeat(200),
    message: 'B'.repeat(700),
    relatedProseId: '  prose-1  ',
    createdBy: 'admin-1',
  });
  assert.equal(clamped.recipientUid, 'uid-123');
  assert.equal(clamped.title.length, 140);
  assert.equal(clamped.message.length, 600);
  assert.equal(clamped.relatedProseId, 'prose-1');
  assert.equal(clamped.relatedStatus, undefined);
});

test('countUnreadNotifications and sortNotificationsNewestFirst work properly', () => {
  const sample: AuthorNotification[] = [
    {
      id: 'n1',
      recipientUid: 'u1',
      type: 'request_status',
      title: 'Disetujui',
      message: 'Permohonan disetujui.',
      read: true,
      createdBy: 'admin',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'n2',
      recipientUid: 'u1',
      type: 'editor_comment',
      title: 'Komentar Editor',
      message: 'Perhalus bagian penutup.',
      relatedProseId: 'draft-1',
      read: false,
      createdBy: 'admin',
      createdAt: 3000,
      updatedAt: 3000,
    },
    {
      id: 'n3',
      recipientUid: 'u1',
      type: 'draft_status',
      title: 'Terbit',
      message: 'Naskah diterbitkan.',
      read: false,
      createdBy: 'admin',
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  assert.equal(countUnreadNotifications(sample), 2);
  assert.deepEqual(
    sortNotificationsNewestFirst(sample).map((n) => n.id),
    ['n2', 'n3', 'n1'],
  );
  assert.equal(
    buildNotificationAriaLabel(2),
    'Notifikasi redaksi, 2 belum dibaca',
  );
  assert.equal(
    buildNotificationAriaLabel(0),
    'Notifikasi redaksi, belum ada pembaruan baru',
  );
  assert.equal(getNotificationCategoryLabel('editor_comment'), 'Komentar Editor');
  assert.equal(getNotificationCategoryLabel('request_status'), 'Status Permohonan');
});

test('formatNotificationRelativeTime formats Indonesian relative labels accurately', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatNotificationRelativeTime(now - 20_000, now), 'Baru saja');
  assert.equal(formatNotificationRelativeTime(now - 5 * 60_000, now), '5 mnt lalu');
  assert.equal(formatNotificationRelativeTime(now - 3 * 3600_000, now), '3 jam lalu');
  assert.equal(formatNotificationRelativeTime(now - 2 * 86400_000, now), '2 hari lalu');
});
