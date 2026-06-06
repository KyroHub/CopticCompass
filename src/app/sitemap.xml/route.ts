import {
  getPublicSitemapIndexEntries,
  renderSitemapIndexXml,
} from "@/features/seo/lib/server/sitemaps";

export const runtime = "nodejs";
export const revalidate = 86400;

/**
 * Serves the public sitemap index that points crawlers at the content and
 * dictionary sitemap shards.
 */
export function GET() {
  return new Response(renderSitemapIndexXml(getPublicSitemapIndexEntries()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
