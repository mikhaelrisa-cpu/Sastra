import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProseShareUrl,
  buildQuoteSharePayload,
  buildSocialShareUrls,
  buildWorkSharePayload,
  extractProseIdFromSearch,
  formatClipboardShareText,
  invokeWebShare,
} from './shareLogic';

test('buildProseShareUrl and extractProseIdFromSearch round-trip cleanly', () => {
  const url = buildProseShareUrl(
    'https://senandika.example/antologi?foo=1#bagian',
    'surat-ketujuh-bulan-november',
  );
  assert.equal(
    url,
    'https://senandika.example/antologi?foo=1&karya=surat-ketujuh-bulan-november',
  );
  const parsed = new URL(url);
  assert.equal(
    extractProseIdFromSearch(parsed.search),
    'surat-ketujuh-bulan-november',
  );
  assert.equal(extractProseIdFromSearch('?karya='), null);
});

test('buildWorkSharePayload and buildQuoteSharePayload format literary metadata', () => {
  const workPayload = buildWorkSharePayload(
    {
      id: 'w1',
      title: 'Surat Ketujuh di Bulan Hujan',
      author: 'Nadia Larasati',
      pullQuote: 'Kita mencintai bukan karena waktu memberi ruang luas.',
    },
    'https://senandika.id/?karya=w1',
  );
  assert.equal(workPayload.title, 'Surat Ketujuh di Bulan Hujan — Senandika');
  assert.ok(workPayload.text.includes('Nadia Larasati'));
  assert.equal(workPayload.url, 'https://senandika.id/?karya=w1');

  const quotePayload = buildQuoteSharePayload(
    {
      text: 'Jarak hanyalah gema dari kata yang lembut.',
      author: 'Sekar Arum',
      proseTitle: 'Menatap Mercusuar di Tanjung Sunyi',
    },
    'https://senandika.id/?karya=w3',
  );
  assert.ok(quotePayload.title.includes('Menatap Mercusuar di Tanjung Sunyi'));
  assert.ok(quotePayload.text.includes('Sekar Arum'));
});

test('buildSocialShareUrls encodes WhatsApp, Twitter/X, Telegram, and Email links', () => {
  const payload = {
    title: 'Judul — Senandika',
    text: '“Kutipan indah.” — Penulis',
    url: 'https://senandika.id/?karya=w1',
  };
  const links = buildSocialShareUrls(payload);
  assert.ok(links.whatsapp.startsWith('https://wa.me/?text='));
  assert.ok(links.twitter.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(links.telegram.startsWith('https://t.me/share/url?'));
  assert.ok(links.email.startsWith('mailto:?subject='));
});

test('invokeWebShare uses navigator.share when available and handles AbortError gracefully', async () => {
  const payload = {
    title: 'Judul',
    text: 'Teks kutipan',
    url: 'https://senandika.id/?karya=w1',
  };

  let received: ShareData | null = null;
  const shared = await invokeWebShare(payload, {
    shareFn: async (data) => {
      received = data;
    },
    canShareFn: () => true,
  });
  assert.equal(shared.status, 'shared');
  assert.deepEqual(received, payload);

  const cancelled = await invokeWebShare(payload, {
    shareFn: async () => {
      const err = new Error('User cancelled');
      err.name = 'AbortError';
      throw err;
    },
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.copied, false);
});

test('invokeWebShare falls back to clipboard and modal payload when Web Share is unavailable or blocked', async () => {
  const payload = {
    title: 'Judul',
    text: 'Teks kutipan',
    url: 'https://senandika.id/?karya=w1',
  };

  let copiedText = '';
  const fallback = await invokeWebShare(payload, {
    shareFn: async () => {
      throw new Error('NotAllowedError');
    },
    copyFn: async (text) => {
      copiedText = text;
    },
  });

  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.copied, true);
  assert.equal(copiedText, formatClipboardShareText(payload));
});
