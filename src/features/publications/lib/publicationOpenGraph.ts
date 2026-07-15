import {
  buildPublicationTitle,
  getPublicationFormatLabel,
  getPublicationPrimaryContributor,
  getPublicationYear,
  type Publication,
} from "@/features/publications/lib/publications";
import {
  buildOpenGraphImageUrl,
  getOpenGraphSectionFooter,
} from "@/features/seo/lib/openGraph";
import type { Language } from "@/types/i18n";

type PublicationOpenGraphPreview = {
  eyebrow: string;
  footerLabel: string;
  languageLabel: string;
  statusLabel: string;
  subtitle?: string;
  summary: string;
  title: string;
};

/**
 * Returns the localized availability label shown on publication preview cards.
 */
function getPublicationStatusLabel(publication: Publication, locale: Language) {
  if (locale === "nl") {
    return publication.status === "published" ? "Nu beschikbaar" : "Binnenkort";
  }

  return publication.status === "published" ? "Available now" : "Forthcoming";
}

/**
 * Builds the `/api/og` image URL for one publication preview card.
 */
export function buildPublicationOpenGraphImageUrl(
  publicationId: string,
  language: Language,
  baseUrl?: string,
) {
  return buildOpenGraphImageUrl({
    baseUrl,
    id: publicationId,
    locale: language,
    type: "publication",
  });
}

/**
 * Builds the publication Open Graph preview payload with localized status and
 * summary metadata.
 */
export function buildPublicationOpenGraphPreview(
  publication: Publication,
  locale: Language,
): PublicationOpenGraphPreview {
  const contributor = getPublicationPrimaryContributor(publication);
  const year = getPublicationYear(publication);
  const metadataLabel = [
    publication.lang,
    getPublicationFormatLabel(publication, locale),
    year,
  ]
    .filter(Boolean)
    .join(" · ");
  let creatorPrefix = "";

  if (contributor) {
    if (contributor.role === "translator") {
      creatorPrefix =
        locale === "nl"
          ? `Vertaald door ${contributor.name}.`
          : `Translated by ${contributor.name}.`;
    } else if (contributor.role === "compiler") {
      creatorPrefix =
        locale === "nl"
          ? `Redactie en samenstelling door ${contributor.name}.`
          : `Edited and compiled by ${contributor.name}.`;
    } else if (contributor.role === "editor") {
      creatorPrefix =
        locale === "nl"
          ? `Redactie door ${contributor.name}.`
          : `Edited by ${contributor.name}.`;
    } else {
      creatorPrefix =
        locale === "nl"
          ? `Door ${contributor.name}.`
          : `By ${contributor.name}.`;
    }
  }

  return {
    eyebrow: locale === "nl" ? "Publicaties" : "Publications",
    footerLabel: getOpenGraphSectionFooter("publications", locale),
    languageLabel: metadataLabel,
    statusLabel: getPublicationStatusLabel(publication, locale),
    subtitle: publication.subtitle,
    summary: [creatorPrefix, publication.summary[locale]]
      .filter(Boolean)
      .join(" "),
    title: buildPublicationTitle(publication),
  };
}
