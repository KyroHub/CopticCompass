import {
  getPublicSitemapShardById,
  renderSitemapUrlSetXml,
} from "@/features/seo/lib/server/sitemaps";

export const runtime = "nodejs";
export const revalidate = 86400;

/**
 * Serves one public sitemap shard by id so the dictionary entry set can be
 * split away from the lower-cardinality content routes.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const shard = getPublicSitemapShardById(resolvedParams.id);

  if (!shard) {
    return new Response("Not Found", {
      status: 404,
    });
  }

  return new Response(renderSitemapUrlSetXml(shard.entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
