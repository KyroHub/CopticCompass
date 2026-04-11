import { siteConfig } from "@/lib/site";
import type { Language } from "@/types/i18n";

type OpenGraphCardType = "site" | "entry" | "lesson" | "publication";
type OpenGraphSection = "dictionary" | "grammar" | "publications" | "site";

type OpenGraphImageUrlInput =
  | {
      baseUrl?: string;
      locale?: Language;
      type: "site";
    }
  | {
      baseUrl?: string;
      id: string;
      locale: Language;
      type: "entry" | "publication";
    }
  | {
      baseUrl?: string;
      locale: Language;
      slug: string;
      type: "lesson";
    };

/**
 * Narrows arbitrary query-string input to one of the supported Open Graph card
 * variants, defaulting to the generic site card for unknown values.
 */
export function normalizeOpenGraphCardType(
  value: string | null | undefined,
): OpenGraphCardType {
  switch (value) {
    case "entry":
    case "lesson":
    case "publication":
      return value;
    default:
      return "site";
  }
}

/**
 * Builds the `/api/og` image URL for a site, entry, lesson, or publication
 * preview card.
 */
export function buildOpenGraphImageUrl(input: OpenGraphImageUrlInput) {
  const baseUrl = input.baseUrl ?? siteConfig.liveUrl;
  const params = new URLSearchParams({
    type: input.type,
  });

  if (input.locale) {
    params.set("locale", input.locale);
  }

  if ("id" in input) {
    params.set("id", input.id);
  }

  if ("slug" in input) {
    params.set("slug", input.slug);
  }

  return `${baseUrl}/api/og?${params.toString()}`;
}

/**
 * Returns the localized brand label used inside generated Open Graph cards.
 */
export function getOpenGraphBrandLabel(locale: Language) {
  return locale === "nl" ? "Koptisch Kompas" : siteConfig.brandName;
}

/**
 * Returns the localized footer label for one Open Graph card section.
 */
export function getOpenGraphSectionFooter(
  section: OpenGraphSection,
  locale: Language,
) {
  if (section === "site") {
    return locale === "nl"
      ? "Woordenboek • Grammatica • Publicaties • Shenute AI"
      : "Dictionary • Grammar • Publications • Shenute AI";
  }

  const brandLabel = getOpenGraphBrandLabel(locale);

  switch (section) {
    case "dictionary":
      return locale === "nl"
        ? `${brandLabel} • Woordenboek`
        : `${brandLabel} • Dictionary`;
    case "grammar":
      return locale === "nl"
        ? `${brandLabel} • Grammatica`
        : `${brandLabel} • Grammar`;
    case "publications":
      return locale === "nl"
        ? `${brandLabel} • Publicaties`
        : `${brandLabel} • Publications`;
    default:
      return brandLabel;
  }
}
