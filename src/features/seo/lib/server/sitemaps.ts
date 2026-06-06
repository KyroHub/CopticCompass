import { cache } from "react";

import { listDictionaryEntryIds } from "@/features/dictionary/lib/dictionary";
import { listPublishedGrammarLessons } from "@/features/grammar/lib/grammarDataset";
import { getGrammarLessonPath } from "@/features/grammar/lib/grammarPaths";
import {
  getPublicationPath,
  publications,
} from "@/features/publications/lib/publications";
import {
  getAnalyticsPath,
  getContactPath,
  getContributorsPath,
  getCookiesPath,
  getDevelopersPath,
  getDictionaryPath,
  getEntryPath,
  getFaqPath,
  getGrammarPath,
  getLocalizedHomePath,
  getPrivacyPath,
  getPublicationsPath,
  getTermsPath,
  PUBLIC_LOCALES,
} from "@/lib/locale";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { getLatestProjectFileMtime } from "@/lib/server/projectFiles";
import {
  chunkEntries,
  getLatestEntryTimestamp,
  getSitemapShardId,
  PUBLIC_SITEMAP_MAX_URLS as publicSitemapMaxUrls,
  type SitemapChangeFrequency,
  type SitemapIndexEntry,
  type SitemapShard,
  type SitemapUrlEntry,
} from "@/lib/server/sitemaps";
import { siteConfig } from "@/lib/site";
import type { Language } from "@/types/i18n";

export {
  PUBLIC_SITEMAP_MAX_URLS,
  renderSitemapIndexXml,
  renderSitemapUrlSetXml,
} from "@/lib/server/sitemaps";

assertServerOnly("src/features/seo/lib/server/sitemaps.ts");

type LocalizedStaticRouteConfig = {
  changeFrequency: SitemapChangeFrequency;
  getRoute: (locale: Language) => string;
  priority: number;
  sourcePaths: readonly string[];
};

type StaticRouteConfig = {
  changeFrequency: SitemapChangeFrequency;
  priority: number;
  route: string;
  sourcePaths: readonly string[];
};

const localizedStaticRoutes: readonly LocalizedStaticRouteConfig[] = [
  {
    getRoute: getLocalizedHomePath,
    changeFrequency: "weekly",
    priority: 1,
    sourcePaths: [
      "src/app/(site)/[locale]/page.tsx",
      "src/app/(site)/[locale]/layout.tsx",
      "src/features/home/components/HomePageClient.tsx",
      "src/lib/site.ts",
    ],
  },
  {
    getRoute: getDictionaryPath,
    changeFrequency: "weekly",
    priority: 0.9,
    sourcePaths: [
      "src/app/(site)/[locale]/dictionary/page.tsx",
      "public/data/dictionary.json",
    ],
  },
  {
    getRoute: getGrammarPath,
    changeFrequency: "weekly",
    priority: 0.8,
    sourcePaths: [
      "src/app/(site)/[locale]/grammar/page.tsx",
      "public/data/grammar/v1/manifest.json",
    ],
  },
  {
    getRoute: getPublicationsPath,
    changeFrequency: "monthly",
    priority: 0.8,
    sourcePaths: [
      "src/app/(site)/[locale]/publications/page.tsx",
      "src/features/publications/lib/publications.ts",
    ],
  },
  {
    getRoute: getDevelopersPath,
    changeFrequency: "monthly",
    priority: 0.7,
    sourcePaths: [
      "src/app/(site)/[locale]/developers/page.tsx",
      "src/app/(app)/api-docs/page.tsx",
      "src/features/api-docs/lib/publicOpenApi.ts",
    ],
  },
  {
    getRoute: getContributorsPath,
    changeFrequency: "yearly",
    priority: 0.5,
    sourcePaths: ["src/app/(site)/[locale]/contributors/page.tsx"],
  },
  {
    getRoute: getAnalyticsPath,
    changeFrequency: "monthly",
    priority: 0.6,
    sourcePaths: [
      "src/app/(site)/[locale]/analytics/page.tsx",
      "public/data/dictionary.json",
      "src/features/analytics/lib/analytics.ts",
    ],
  },
  {
    getRoute: getContactPath,
    changeFrequency: "yearly",
    priority: 0.5,
    sourcePaths: [
      "src/app/(site)/[locale]/contact/page.tsx",
      "src/features/contact/components/ContactPageClient.tsx",
    ],
  },
  {
    getRoute: getFaqPath,
    changeFrequency: "yearly",
    priority: 0.45,
    sourcePaths: [
      "src/app/(site)/[locale]/faq/page.tsx",
      "src/features/faq/components/FaqPageContent.tsx",
      "src/features/faq/lib/faq.ts",
    ],
  },
  {
    getRoute: getPrivacyPath,
    changeFrequency: "yearly",
    priority: 0.3,
    sourcePaths: [
      "src/app/(site)/[locale]/privacy/page.tsx",
      "src/features/legal/lib/legalDocuments.ts",
      "src/features/legal/components/LegalDocumentPageClient.tsx",
    ],
  },
  {
    getRoute: getCookiesPath,
    changeFrequency: "yearly",
    priority: 0.3,
    sourcePaths: [
      "src/app/(site)/[locale]/cookies/page.tsx",
      "src/features/legal/lib/legalDocuments.ts",
      "src/features/legal/components/LegalDocumentPageClient.tsx",
    ],
  },
  {
    getRoute: getTermsPath,
    changeFrequency: "yearly",
    priority: 0.3,
    sourcePaths: [
      "src/app/(site)/[locale]/terms/page.tsx",
      "src/features/legal/lib/legalDocuments.ts",
      "src/features/legal/components/LegalDocumentPageClient.tsx",
    ],
  },
];

const staticRoutes: readonly StaticRouteConfig[] = [
  {
    route: "/api-docs",
    changeFrequency: "monthly",
    priority: 0.65,
    sourcePaths: [
      "src/app/(app)/api-docs/page.tsx",
      "src/features/api-docs/components/SwaggerDocsClient.tsx",
      "src/features/api-docs/lib/publicOpenApi.ts",
    ],
  },
];

function buildAbsoluteUrl(path: string) {
  return `${siteConfig.liveUrl}${path}`;
}

function buildLocalizedStaticEntries(): SitemapUrlEntry[] {
  return PUBLIC_LOCALES.flatMap((locale) =>
    localizedStaticRoutes.map((route) => {
      const lastModified = getLatestProjectFileMtime(route.sourcePaths);

      return {
        changeFrequency: route.changeFrequency,
        ...(lastModified ? { lastModified } : {}),
        priority: route.priority,
        url: buildAbsoluteUrl(route.getRoute(locale)),
      };
    }),
  );
}

function buildStaticEntries(): SitemapUrlEntry[] {
  return staticRoutes.map((route) => {
    const lastModified = getLatestProjectFileMtime(route.sourcePaths);

    return {
      changeFrequency: route.changeFrequency,
      ...(lastModified ? { lastModified } : {}),
      priority: route.priority,
      url: buildAbsoluteUrl(route.route),
    };
  });
}

function buildPublicationEntries(): SitemapUrlEntry[] {
  const lastModified = getLatestProjectFileMtime([
    "src/features/publications/lib/publications.ts",
    "src/app/(site)/[locale]/publications/[id]/page.tsx",
    "src/features/publications/components/PublicationDetailPageClient.tsx",
  ]);

  return PUBLIC_LOCALES.flatMap((locale) =>
    publications
      .filter((publication) => publication.status === "published")
      .map((publication) => ({
        changeFrequency: "monthly" as const,
        ...(lastModified ? { lastModified } : {}),
        priority: 0.75,
        url: buildAbsoluteUrl(getPublicationPath(publication.id, locale)),
      })),
  );
}

function buildGrammarLessonEntries(): SitemapUrlEntry[] {
  return PUBLIC_LOCALES.flatMap((locale) =>
    listPublishedGrammarLessons().map((lesson) => {
      const lastModified = getLatestProjectFileMtime([
        "src/app/(site)/[locale]/grammar/[slug]/page.tsx",
        `public/data/grammar/v1/lessons/${lesson.slug}.json`,
        "public/data/grammar/v1/manifest.json",
      ]);

      return {
        changeFrequency: "monthly" as const,
        ...(lastModified ? { lastModified } : {}),
        priority: 0.78,
        url: buildAbsoluteUrl(getGrammarLessonPath(lesson.slug, locale)),
      };
    }),
  );
}

function buildDictionaryEntryEntries(): SitemapUrlEntry[] {
  const lastModified = getLatestProjectFileMtime([
    "public/data/dictionary.json",
  ]);

  return PUBLIC_LOCALES.flatMap((locale) =>
    listDictionaryEntryIds().map((entryId) => ({
      changeFrequency: "monthly" as const,
      ...(lastModified ? { lastModified } : {}),
      priority: 0.8,
      url: buildAbsoluteUrl(getEntryPath(String(entryId), locale)),
    })),
  );
}

const readPublicSitemapShards = cache((): SitemapShard[] => {
  const contentEntries = [
    ...buildLocalizedStaticEntries(),
    ...buildStaticEntries(),
    ...buildPublicationEntries(),
    ...buildGrammarLessonEntries(),
  ];
  const dictionaryEntryEntries = buildDictionaryEntryEntries();
  const contentChunks = chunkEntries(contentEntries, publicSitemapMaxUrls);
  const dictionaryChunks = chunkEntries(
    dictionaryEntryEntries,
    publicSitemapMaxUrls,
  );
  const contentShards = contentChunks.map((entries, chunkIndex) => ({
    entries,
    id: getSitemapShardId("content", chunkIndex, contentChunks.length),
    lastModified: getLatestEntryTimestamp(entries),
  }));
  const dictionaryShards = dictionaryChunks.map((entries, chunkIndex) => ({
    entries,
    id: getSitemapShardId("entries", chunkIndex, dictionaryChunks.length),
    lastModified: getLatestEntryTimestamp(entries),
  }));

  return [...contentShards, ...dictionaryShards];
});

/**
 * Returns the sitemap shards exposed under `/sitemaps/*`, splitting the
 * dictionary entry set away from the lower-cardinality static content pages.
 */
export function getPublicSitemapShards() {
  return readPublicSitemapShards();
}

/**
 * Resolves one sitemap shard by id for the shard route handler.
 */
export function getPublicSitemapShardById(id: string) {
  return getPublicSitemapShards().find((shard) => shard.id === id) ?? null;
}

/**
 * Returns the sitemap index entries that point search engines at each shard.
 */
export function getPublicSitemapIndexEntries(): SitemapIndexEntry[] {
  return getPublicSitemapShards().map((shard) => ({
    ...(shard.lastModified ? { lastModified: shard.lastModified } : {}),
    url: buildAbsoluteUrl(`/sitemaps/${shard.id}`),
  }));
}
