import { notFound } from "next/navigation";

import StructuredData from "@/components/StructuredData";
import { listPublishedGrammarLessonsForPublication } from "@/features/grammar/lib/grammarContentGraph";
import PublicationDetailPageClient from "@/features/publications/components/PublicationDetailPageClient";
import { buildPublicationOpenGraphImageUrl } from "@/features/publications/lib/publicationOpenGraph";
import {
  buildPublicationDescription,
  buildPublicationTitle,
  getPublicationById,
  getPublicationPath,
  getRelatedPublications,
  publications,
} from "@/features/publications/lib/publications";
import {
  createBreadcrumbStructuredData,
  createPublicationStructuredData,
} from "@/features/seo/lib/structuredData";
import { getTranslation } from "@/lib/i18n";
import {
  createLanguageAlternates,
  getLocalizedHomePath,
  getPublicationsPath,
} from "@/lib/locale";
import { createPageSocialMetadata, createSocialImage } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";
import { siteConfig } from "@/lib/site";

import type { Metadata } from "next";

export const dynamicParams = false;

export async function generateStaticParams() {
  return publications.map((publication) => ({
    id: publication.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvePublicLocale(resolvedParams.locale);
  const publication = getPublicationById(resolvedParams.id);

  if (!publication) {
    return {
      title:
        locale === "nl" ? "Publicatie niet gevonden" : "Publication Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = buildPublicationTitle(publication);
  const description = buildPublicationDescription(publication, locale);
  const path = getPublicationPath(publication.id, locale);
  const imageUrl = buildPublicationOpenGraphImageUrl(publication.id, locale);
  const image = createSocialImage(
    imageUrl,
    `${title} | ${siteConfig.brandName} Publications`,
  );
  const shouldIndex = publication.status === "published";

  return {
    metadataBase: new URL(siteConfig.liveUrl),
    title,
    description,
    robots: shouldIndex
      ? undefined
      : {
          index: false,
          follow: true,
        },
    alternates: {
      canonical: path,
      languages: createLanguageAlternates(`/publications/${publication.id}`),
    },
    ...createPageSocialMetadata({
      title,
      description,
      path,
      locale,
      images: [image],
    }),
  };
}

/**
 * Renders one localized publication detail page together with its publication
 * and breadcrumb structured data.
 */
export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvePublicLocale(resolvedParams.locale);
  const publication = getPublicationById(resolvedParams.id);

  if (!publication) {
    notFound();
  }

  const publicationPath = getPublicationPath(publication.id, locale);
  const grammarLessons = listPublishedGrammarLessonsForPublication(
    publication.id,
  );
  const relatedPublications = getRelatedPublications(publication.id);

  return (
    <>
      <StructuredData
        data={[
          createBreadcrumbStructuredData([
            {
              name: getTranslation(locale, "nav.home"),
              path: getLocalizedHomePath(locale),
            },
            {
              name: getTranslation(locale, "nav.publications"),
              path: getPublicationsPath(locale),
            },
            { name: publication.title, path: publicationPath },
          ]),
          createPublicationStructuredData(publication, locale),
        ]}
      />
      <PublicationDetailPageClient
        grammarLessons={grammarLessons}
        publication={publication}
        relatedPublications={relatedPublications}
      />
    </>
  );
}
