import { describe, expect, it } from "vitest";

import {
  getPublicSitemapIndexEntries,
  getPublicSitemapShardById,
  getPublicSitemapShards,
  PUBLIC_SITEMAP_MAX_URLS,
} from "@/lib/server/sitemaps";

function getContentSitemapUrls() {
  return (
    getPublicSitemapShardById("content")?.entries.map((entry) => entry.url) ??
    []
  );
}

describe("sitemap route", () => {
  it("publishes a sitemap index that points to content and dictionary shards", () => {
    const urls = getPublicSitemapIndexEntries().map((entry) => entry.url);

    expect(urls).toContain("https://www.copticcompass.com/sitemaps/content");
    expect(
      urls.some((url) =>
        url.startsWith("https://www.copticcompass.com/sitemaps/entries"),
      ),
    ).toBe(true);
  });

  it("includes high-value public landing pages and developer docs in the content shard", () => {
    const urls = getContentSitemapUrls();

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://www.copticcompass.com/en",
        "https://www.copticcompass.com/nl",
        "https://www.copticcompass.com/en/dictionary",
        "https://www.copticcompass.com/nl/grammar",
        "https://www.copticcompass.com/en/developers",
        "https://www.copticcompass.com/en/contributors",
        "https://www.copticcompass.com/nl/analytics",
        "https://www.copticcompass.com/en/contact",
        "https://www.copticcompass.com/en/faq",
        "https://www.copticcompass.com/nl/faq",
        "https://www.copticcompass.com/api-docs",
      ]),
    );
  });

  it("keeps private workspace routes out of the public sitemap shards", () => {
    const urls = getPublicSitemapShards().flatMap((shard) =>
      shard.entries.map((entry) => entry.url),
    );

    expect(urls).not.toContain("https://www.copticcompass.com/en/dashboard");
    expect(urls).not.toContain("https://www.copticcompass.com/nl/admin");
    expect(urls).not.toContain("https://www.copticcompass.com/login");
  });

  it("keeps each sitemap shard within the shard-size budget", () => {
    const shards = getPublicSitemapShards();

    expect(
      shards.every((shard) => shard.entries.length <= PUBLIC_SITEMAP_MAX_URLS),
    ).toBe(true);
  });
});
