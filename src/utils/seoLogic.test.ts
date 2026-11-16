import assert from 'node:assert/strict';
import test from 'node:test';
import { CURATED_ANTHOLOGY } from '../data/anthology';
import {
  SITE_NAME,
  buildCanonicalUrl,
  buildPageSeoMetadata,
  buildSitemapXml,
  resolveAbsoluteImageUrl,
  resolveAssetSrc,
} from './seoLogic';

test('buildCanonicalUrl formats clean root and karya URLs for Vercel', () => {
  assert.equal(
    buildCanonicalUrl('https://utaraksara.vercel.app/?foo=1#top', 'antologi'),
    'https://utaraksara.vercel.app/',
  );
  assert.equal(
    buildCanonicalUrl(
      'https://utaraksara.vercel.app/?karya=surat-ketujuh-bulan-november',
      'baca',
      'surat-ketujuh-bulan-november',
    ),
    'https://utaraksara.vercel.app/?karya=surat-ketujuh-bulan-november',
  );
  assert.equal(
    buildCanonicalUrl(
      'https://utaraksara.vercel.app/sub/?karya=surat-ketujuh-bulan-november',
      'baca',
      'surat-ketujuh-bulan-november',
    ),
    'https://utaraksara.vercel.app/sub?karya=surat-ketujuh-bulan-november',
  );
});

test('resolveAssetSrc handles root and subpath bases', () => {
  assert.equal(
    resolveAssetSrc('/src/assets/images/sample.jpg', '/'),
    '/src/assets/images/sample.jpg',
  );
  assert.equal(
    resolveAssetSrc('/src/assets/images/sample.jpg', '/utaraksara/'),
    '/utaraksara/src/assets/images/sample.jpg',
  );
  assert.equal(
    resolveAssetSrc('https://cdn.example.com/a.jpg', '/'),
    'https://cdn.example.com/a.jpg',
  );
  assert.equal(
    resolveAssetSrc('data:image/jpeg;base64,xyz', '/'),
    'data:image/jpeg;base64,xyz',
  );
});

test('resolveAbsoluteImageUrl converts relative assets and skips data URLs', () => {
  assert.equal(
    resolveAbsoluteImageUrl('/src/assets/images/sample.jpg', 'https://utaraksara.vercel.app'),
    'https://utaraksara.vercel.app/src/assets/images/sample.jpg',
  );
  assert.equal(
    resolveAbsoluteImageUrl('/src/assets/images/sample.jpg', 'https://utaraksara.vercel.app', '/sub/'),
    'https://utaraksara.vercel.app/sub/src/assets/images/sample.jpg',
  );
  assert.equal(
    resolveAbsoluteImageUrl('data:image/png;base64,abc', 'https://utaraksara.vercel.app'),
    'https://utaraksara.vercel.app/src/assets/images/hero_romantic_letters_1794803327178.jpg',
  );
  assert.equal(
    resolveAbsoluteImageUrl('https://cdn.example.com/cover.jpg', 'https://utaraksara.vercel.app'),
    'https://cdn.example.com/cover.jpg',
  );
});

test('buildPageSeoMetadata configures Utaraksara site name, article schema, and noindex on private views', () => {
  const homeSeo = buildPageSeoMetadata({
    activeView: 'antologi',
    totalWorks: 6,
    currentHref: 'https://utaraksara.vercel.app/',
  });
  assert.ok(homeSeo.title.includes(SITE_NAME));
  assert.equal(homeSeo.ogType, 'website');
  assert.match(homeSeo.robots, /^index, follow/);

  const work = CURATED_ANTHOLOGY[0];
  const articleSeo = buildPageSeoMetadata({
    activeView: 'baca',
    activeWork: work,
    totalWorks: 6,
    currentHref: `https://utaraksara.vercel.app/?karya=${work.id}`,
  });
  assert.equal(articleSeo.title, `${work.title} — ${SITE_NAME}`);
  assert.equal(articleSeo.ogType, 'article');
  assert.equal(
    articleSeo.canonicalUrl,
    `https://utaraksara.vercel.app/?karya=${work.id}`,
  );

  const portalSeo = buildPageSeoMetadata({
    activeView: 'tulis',
    totalWorks: 6,
    currentHref: 'https://utaraksara.vercel.app/',
  });
  assert.equal(portalSeo.robots, 'noindex, follow');
});

test('buildSitemapXml emits valid XML excluding drafts', () => {
  const xml = buildSitemapXml('https://utaraksara.vercel.app', [
    { id: 'karya-satu', createdAt: 1762900000000, status: 'published' },
    { id: 'draf-rahasia', createdAt: 1762900000000, status: 'draft' },
  ]);
  assert.ok(xml.includes('<loc>https://utaraksara.vercel.app/</loc>'));
  assert.ok(xml.includes('<loc>https://utaraksara.vercel.app/?karya=karya-satu</loc>'));
  assert.ok(!xml.includes('draf-rahasia'));
});
