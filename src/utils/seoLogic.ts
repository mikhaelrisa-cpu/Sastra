import type { ProseWork, ViewTab } from '../types/prose';

export const SITE_NAME = 'Utaraksara';
export const ANTHOLOGY_EDITION_NAME = 'Senandika';
export const DEFAULT_SEO_TITLE =
  'Utaraksara — Antologi Sastra Prosa Romantis Senandika';
export const DEFAULT_SEO_DESCRIPTION =
  'Utaraksara adalah ruang kurasi dan antologi sastra prosa romantis berbahasa Indonesia (Senandika) dengan ruang baca tenang dan catatan diksi.';
export const DEFAULT_OG_IMAGE_PATH =
  '/src/assets/images/hero_romantic_letters_1794803327178.jpg';

export interface PageSeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogImage: string;
  robots: string;
  jsonLd: Record<string, unknown>;
}

function normalizeOrigin(currentHref: string): {
  origin: string;
  pathname: string;
} {
  try {
    const parsed = new URL(currentHref);
    return {
      origin: parsed.origin,
      pathname: parsed.pathname || '/',
    };
  } catch {
    return {
      origin: 'https://utaraksara.vercel.app',
      pathname: '/',
    };
  }
}

export function resolveAssetSrc(
  src: string | undefined,
  baseUrl = '/',
): string {
  const trimmed = src?.trim() ?? '';
  if (!trimmed) return '';
  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (trimmed.startsWith('/')) {
    if (cleanBase !== '/' && trimmed.startsWith(cleanBase)) {
      return trimmed;
    }
    return `${cleanBase}${trimmed.slice(1)}`;
  }
  return `${cleanBase}${trimmed}`;
}

export function buildCanonicalUrl(
  currentHref: string,
  activeView: ViewTab,
  activeWorkId?: string,
): string {
  const { origin, pathname } = normalizeOrigin(currentHref);
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  if (activeView === 'baca' && activeWorkId) {
    return `${origin}${cleanPath}?karya=${encodeURIComponent(activeWorkId)}`;
  }
  return `${origin}${cleanPath}`;
}

export function resolveAbsoluteImageUrl(
  imagePath: string | undefined,
  origin: string,
  baseUrl = '/',
): string {
  const trimmed = imagePath?.trim() ?? '';
  if (!trimmed || trimmed.startsWith('data:')) {
    const resolvedDefault = resolveAssetSrc(DEFAULT_OG_IMAGE_PATH, baseUrl);
    return `${origin}${resolvedDefault.startsWith('/') ? resolvedDefault : `/${resolvedDefault}`}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const resolved = resolveAssetSrc(trimmed, baseUrl);
  return `${origin}${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
}

function truncateDescription(text: string, maxLen = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

export function buildPageSeoMetadata(params: {
  activeView: ViewTab;
  activeWork?: ProseWork;
  totalWorks: number;
  currentHref: string;
  baseUrl?: string;
}): PageSeoMetadata {
  const { activeView, activeWork, totalWorks, currentHref, baseUrl = '/' } = params;
  const { origin } = normalizeOrigin(currentHref);
  const canonicalUrl = buildCanonicalUrl(
    currentHref,
    activeView,
    activeWork?.id,
  );
  const defaultOgImage = resolveAbsoluteImageUrl(
    DEFAULT_OG_IMAGE_PATH,
    origin,
    baseUrl,
  );
  const websiteRef = {
    '@type': 'WebSite',
    '@id': `${origin}${baseUrl === '/' ? '/' : baseUrl}#website`,
    name: SITE_NAME,
    alternateName: [
      `${SITE_NAME} ${ANTHOLOGY_EDITION_NAME}`,
      ANTHOLOGY_EDITION_NAME,
    ],
    url: `${origin}${baseUrl === '/' ? '/' : baseUrl}`,
    inLanguage: 'id-ID',
  };

  if (activeView === 'baca' && activeWork) {
    const title = `${activeWork.title} — ${SITE_NAME}`;
    const description = truncateDescription(
      `${activeWork.excerpt} Ditulis oleh ${activeWork.author} di ${SITE_NAME} (${ANTHOLOGY_EDITION_NAME}).`,
    );
    const ogImage = resolveAbsoluteImageUrl(activeWork.image, origin, baseUrl);

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'article',
      ogImage,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          websiteRef,
          {
            '@type': 'Article',
            '@id': `${canonicalUrl}#article`,
            headline: activeWork.title,
            alternativeHeadline: activeWork.subtitle,
            description,
            image: ogImage,
            inLanguage: 'id-ID',
            genre: activeWork.theme,
            author: {
              '@type': 'Person',
              name: activeWork.author,
            },
            publisher: {
              '@type': 'Organization',
              name: SITE_NAME,
            },
            isPartOf: {
              '@id': websiteRef['@id'],
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': canonicalUrl,
            },
          },
        ],
      },
    };
  }

  if (activeView === 'redaksi') {
    const title = `Redaksi & Manifest Kurasi — ${SITE_NAME}`;
    const description = truncateDescription(
      `Prinsip kurasi sastra prosa romantis ${SITE_NAME} (${ANTHOLOGY_EDITION_NAME}): ketepatan diksi, ruang baca tenang, dan penulis terkurasi.`,
    );
    return {
      title,
      description,
      canonicalUrl,
      ogType: 'website',
      ogImage: defaultOgImage,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          websiteRef,
          {
            '@type': 'AboutPage',
            name: title,
            description,
            url: canonicalUrl,
            inLanguage: 'id-ID',
            isPartOf: {
              '@id': websiteRef['@id'],
            },
          },
        ],
      },
    };
  }

  if (activeView === 'rak' || activeView === 'tulis') {
    const isPortal = activeView === 'tulis';
    const title = isPortal
      ? `Portal Penulis & Redaksi — ${SITE_NAME}`
      : `Rak Simpan Pembaca — ${SITE_NAME}`;
    return {
      title,
      description: DEFAULT_SEO_DESCRIPTION,
      canonicalUrl,
      ogType: 'website',
      ogImage: defaultOgImage,
      robots: 'noindex, follow',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [websiteRef],
      },
    };
  }

  return {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    canonicalUrl,
    ogType: 'website',
    ogImage: defaultOgImage,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        websiteRef,
        {
          '@type': 'CollectionPage',
          name: DEFAULT_SEO_TITLE,
          description: DEFAULT_SEO_DESCRIPTION,
          url: canonicalUrl,
          inLanguage: 'id-ID',
          numberOfItems: totalWorks,
          isPartOf: {
            '@id': websiteRef['@id'],
          },
        },
      ],
    },
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(
  baseOrigin: string,
  works: Array<Pick<ProseWork, 'id' | 'createdAt' | 'status'>>,
): string {
  const cleanOrigin = baseOrigin.replace(/\/+$/, '');
  const publishedWorks = works.filter((w) => (w.status ?? 'published') === 'published');

  const urls = [
    {
      loc: `${cleanOrigin}/`,
      priority: '1.0',
      changefreq: 'daily',
      lastmod: new Date().toISOString().slice(0, 10),
    },
    ...publishedWorks.map((w) => ({
      loc: `${cleanOrigin}/?karya=${encodeURIComponent(w.id)}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: new Date(w.createdAt || Date.now()).toISOString().slice(0, 10),
    })),
  ];

  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}
