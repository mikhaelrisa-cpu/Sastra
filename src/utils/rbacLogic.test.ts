import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserEditWork,
  canUserPublishProse,
  clampProsePayload,
  isBootstrappedAdminEmail,
  isValidEmailAddress,
  normalizeEmail,
  resolveUserRole,
  validateAuthorInviteInput,
  validateAuthorRequestInput,
} from './rbacLogic';
import type { ProseWork } from '../types/prose';

test('email normalization and admin email matching work cleanly', () => {
  assert.equal(normalizeEmail('  MikhaelRisa@Gmail.com '), 'mikhaelrisa@gmail.com');
  assert.equal(isBootstrappedAdminEmail('MIKHAELRISA@GMAIL.COM'), true);
  assert.equal(isBootstrappedAdminEmail('penulis@gmail.com'), false);
  assert.equal(isValidEmailAddress('penulis.senandika@gmail.com'), true);
  assert.equal(isValidEmailAddress('bukan-email'), false);
});

test('resolveUserRole prioritizes verification, admin, active/suspended author, and requests', () => {
  assert.equal(
    resolveUserRole({ uid: 'u1', email: 'mikhaelrisa@gmail.com', emailVerified: false }),
    'visitor',
  );
  assert.equal(
    resolveUserRole({ uid: 'u1', email: 'mikhaelrisa@gmail.com', emailVerified: true }),
    'admin',
  );
  assert.equal(
    resolveUserRole({
      uid: 'u2',
      email: 'penulis@gmail.com',
      emailVerified: true,
      authorProfile: {
        uid: 'u2',
        penName: 'Sekar',
        status: 'active',
        approvedBy: 'u1',
        createdAt: 1,
        updatedAt: 1,
      },
    }),
    'author',
  );
  assert.equal(
    resolveUserRole({
      uid: 'u2',
      email: 'penulis@gmail.com',
      emailVerified: true,
      authorProfile: {
        uid: 'u2',
        penName: 'Sekar',
        status: 'suspended',
        approvedBy: 'u1',
        createdAt: 1,
        updatedAt: 1,
      },
    }),
    'suspended',
  );
  assert.equal(
    resolveUserRole({
      uid: 'u3',
      email: 'calon@gmail.com',
      emailVerified: true,
      authorRequest: {
        uid: 'u3',
        email: 'calon@gmail.com',
        penName: 'Damar',
        reason: 'Ingin menulis prosa romantis',
        status: 'pending',
        createdAt: 1,
        updatedAt: 1,
      },
    }),
    'pending',
  );
});

test('canUserPublishProse and canUserEditWork enforce strict RBAC boundaries', () => {
  assert.equal(canUserPublishProse('visitor'), false);
  assert.equal(canUserPublishProse('pending'), false);
  assert.equal(canUserPublishProse('suspended'), false);
  assert.equal(canUserPublishProse('author'), true);
  assert.equal(canUserPublishProse('admin'), true);

  const sampleWork: ProseWork = {
    id: 'w1',
    accession: 'ED. I · 01',
    title: 'Surat',
    subtitle: 'Sub',
    author: 'Nadia',
    authorUid: 'author-1',
    theme: 'Surat & Epistolari',
    year: '2026',
    pullQuote: 'Kutipan',
    excerpt: 'Cuplikan',
    body: 'Isi prosa panjang lebih dari dua puluh kata untuk pengujian hak akses.',
    marginNotes: [],
    createdAt: 1000,
  };

  assert.equal(canUserEditWork('admin', 'admin-uid', sampleWork), true);
  assert.equal(canUserEditWork('author', 'author-1', sampleWork), true);
  assert.equal(canUserEditWork('author', 'author-2', sampleWork), false);
  assert.equal(canUserEditWork('visitor', 'author-1', sampleWork), false);
});

test('validateAuthorInviteInput and validateAuthorRequestInput catch invalid inputs', () => {
  const badInvite = validateAuthorInviteInput({ email: 'salah', penName: 'A' });
  assert.equal(badInvite.valid, false);
  assert.ok(badInvite.errors.email);
  assert.ok(badInvite.errors.penName);

  const goodInvite = validateAuthorInviteInput({
    email: 'penulis@gmail.com',
    penName: 'Larasati',
  });
  assert.equal(goodInvite.valid, true);

  const badReq = validateAuthorRequestInput({ penName: 'X', reason: 'Hi' });
  assert.equal(badReq.valid, false);
  assert.ok(badReq.errors.penName);
  assert.ok(badReq.errors.reason);
});

test('clampProsePayload truncates fields to blueprint maxLength limits', () => {
  const longTitle = 'A'.repeat(250);
  const clamped = clampProsePayload({
    title: longTitle,
    subtitle: 'Sub',
    author: 'Nadia',
    pullQuote: 'Quote',
    excerpt: 'Excerpt',
    body: 'Body content',
  });
  assert.equal(clamped.title.length, 180);
});
