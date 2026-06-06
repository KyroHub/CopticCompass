import { assertServerOnly } from "@/lib/server/assertServerOnly";

assertServerOnly("src/lib/server/sitemaps.ts");

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapUrlEntry = {
  changeFrequency?: SitemapChangeFrequency;
  lastModified?: Date;
  priority?: number;
  url: string;
};

export type SitemapShard = {
  entries: readonly SitemapUrlEntry[];
  id: string;
  lastModified?: Date;
};

export type SitemapIndexEntry = {
  lastModified?: Date;
  url: string;
};

export const PUBLIC_SITEMAP_MAX_URLS = 5000;

/**
 * Splits sitemap entries into fixed-size shards without mutating the input.
 */
export function chunkEntries<T>(entries: readonly T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(entries.slice(index, index + chunkSize));
  }

  return chunks;
}

/**
 * Finds the newest `lastModified` timestamp across a sitemap entry list.
 */
export function getLatestEntryTimestamp(entries: readonly SitemapUrlEntry[]) {
  const timestamps = entries
    .map((entry) => entry.lastModified?.getTime())
    .filter((timestamp): timestamp is number => typeof timestamp === "number");

  if (timestamps.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...timestamps));
}

/**
 * Builds stable shard ids, only appending an index when multiple shards exist.
 */
export function getSitemapShardId(
  baseId: string,
  chunkIndex: number,
  chunkCount: number,
) {
  return chunkCount === 1 ? baseId : `${baseId}-${chunkIndex}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastModified(date: Date) {
  return date.toISOString();
}

/**
 * Serializes one sitemap shard into XML.
 */
export function renderSitemapUrlSetXml(entries: readonly SitemapUrlEntry[]) {
  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `
    <lastmod>${formatLastModified(entry.lastModified)}</lastmod>`
        : ""
    }${
      entry.changeFrequency
        ? `
    <changefreq>${entry.changeFrequency}</changefreq>`
        : ""
    }${
      typeof entry.priority === "number"
        ? `
    <priority>${entry.priority.toFixed(2)}</priority>`
        : ""
    }
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

/**
 * Serializes the top-level sitemap index into XML.
 */
export function renderSitemapIndexXml(entries: readonly SitemapIndexEntry[]) {
  const body = entries
    .map(
      (entry) => `  <sitemap>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified
        ? `
    <lastmod>${formatLastModified(entry.lastModified)}</lastmod>`
        : ""
    }
  </sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}
