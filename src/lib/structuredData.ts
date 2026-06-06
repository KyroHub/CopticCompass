import { siteConfig } from "@/lib/site";

export type JsonLd = Record<string, unknown>;

type BreadcrumbStructuredDataItem = {
  name: string;
  path: string;
};

/**
 * Resolves a relative application path against the canonical production site
 * URL so JSON-LD records always use absolute identifiers.
 */
export function absoluteUrl(path: string) {
  return new URL(path, siteConfig.liveUrl).toString();
}

/**
 * Builds a breadcrumb list JSON-LD payload for a page-level breadcrumb trail.
 */
export function createBreadcrumbStructuredData(
  items: readonly BreadcrumbStructuredDataItem[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
