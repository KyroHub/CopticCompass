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

    expect(urls).toContain("https://kyrilloswannes.com/sitemaps/content");
    expect(
      urls.some((url) =>
        url.startsWith("https://kyrilloswannes.com/sitemaps/entries"),
      ),
    ).toBe(true);
  });

  it("includes high-value public landing pages and developer docs in the content shard", () => {
    const urls = getContentSitemapUrls();

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://kyrilloswannes.com/en",
        "https://kyrilloswannes.com/nl",
        "https://kyrilloswannes.com/en/dictionary",
        "https://kyrilloswannes.com/nl/grammar",
        "https://kyrilloswannes.com/en/developers",
        "https://kyrilloswannes.com/en/contributors",
        "https://kyrilloswannes.com/nl/analytics",
        "https://kyrilloswannes.com/en/contact",
        "https://kyrilloswannes.com/api-docs",
      ]),
    );
  });

  it("keeps private workspace routes out of the public sitemap shards", () => {
    const urls = getPublicSitemapShards().flatMap((shard) =>
      shard.entries.map((entry) => entry.url),
    );

    expect(urls).not.toContain("https://kyrilloswannes.com/en/dashboard");
    expect(urls).not.toContain("https://kyrilloswannes.com/nl/admin");
    expect(urls).not.toContain("https://kyrilloswannes.com/login");
  });

  it("keeps each sitemap shard within the shard-size budget", () => {
    const shards = getPublicSitemapShards();

    expect(
      shards.every((shard) => shard.entries.length <= PUBLIC_SITEMAP_MAX_URLS),
    ).toBe(true);
  });
});
