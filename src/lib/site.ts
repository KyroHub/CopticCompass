import { readProjectJsonFile } from "@/lib/server/projectFiles";

/**
 * Reads the generated dictionary payload to expose a best-effort entry count
 * for site copy and metadata without failing app startup when the file is
 * unavailable.
 */
function getDictionaryEntryCount() {
  try {
    const dictionary = readProjectJsonFile<unknown[]>(
      "public/data/dictionary.json",
    );

    return Array.isArray(dictionary) ? dictionary.length : 0;
  } catch {
    return 0;
  }
}

const dictionaryEntryCount = getDictionaryEntryCount();
const siteAuthor = {
  name: "Kyrillos Wannes",
  twitter: "@kyrilloswannes",
  github: "https://github.com/KyroHub",
};

/**
 * Builds the site-level description string and appends the current dictionary
 * entry count when that build-time statistic is available.
 */
function buildSiteDescription(entryCount: number) {
  const searchableEntries = entryCount
    ? ` It currently includes ${entryCount.toLocaleString()} searchable entries.`
    : "";

  return `Coptic Compass is a digital home for Coptic study, bringing together a searchable dictionary, grammar lessons, publications, Shenute AI, and research tools.${searchableEntries}`;
}

export const siteConfig = {
  brandName: "Coptic Compass",
  descriptor: "Coptic Dictionary, Grammar, Publications, and Shenute AI",
  founderLine: `by ${siteAuthor.name}`,
  founderCreditLine: "Built by Copts for Copts",
  name: "Coptic Compass",
  title: "Coptic Compass | Coptic Dictionary, Grammar, Publications, and Shenute AI",
  shortDescription: "A digital home for Coptic study and Shenute AI.",
  description: buildSiteDescription(dictionaryEntryCount),
  liveUrl: "https://kyrilloswannes.com",
  repoUrl: "https://github.com/KyroHub/CopticCompass",
  cloneUrl: "https://github.com/KyroHub/CopticCompass.git",
  author: siteAuthor,
  keywords: [
    "coptic",
    "linguistics",
    "dictionary",
    "digital humanities",
    "nextjs",
    "typescript",
    "tailwindcss",
    "recharts",
  ],
  dictionaryEntryCount,
};

/**
 * Formats a page title with the site brand suffix used across metadata and UI
 * headings.
 */
export function buildPageTitle(title: string) {
  return `${title} | ${siteConfig.brandName}`;
}

/**
 * Resolves the first valid absolute site URL from deployment-specific
 * environment variables, falling back to the canonical production URL.
 */
export function getSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    siteConfig.liveUrl,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(candidate);
    } catch {
      continue;
    }
  }

  return undefined;
}
