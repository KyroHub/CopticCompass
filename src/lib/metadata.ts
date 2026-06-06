import {
  createLanguageAlternates,
  getLocalizedPath,
  getOpenGraphLocale,
} from "@/lib/locale";
import { buildOpenGraphImageUrl } from "@/lib/openGraph";
import { buildPageTitle, siteConfig } from "@/lib/site";
import type { Language } from "@/types/i18n";

import type { Metadata } from "next";

type SocialImage = {
  alt: string;
  height: number;
  url: string;
  width: number;
};

/**
 * Normalizes a social preview image into the Open Graph and Twitter card
 * dimensions used across the site.
 */
export function createSocialImage(url: string, alt: string): SocialImage {
  return {
    url,
    width: 1200,
    height: 630,
    alt,
  };
}

function getSocialImages() {
  return [
    createSocialImage(
      buildOpenGraphImageUrl({
        type: "site",
      }),
      "Coptic Compass digital Coptology platform social preview",
    ),
  ];
}

function getTwitterImages(images: SocialImage[]) {
  return images.map((image) => image.url);
}

/**
 * Builds the social metadata block shared by page-level metadata helpers.
 */
export function createPageSocialMetadata({
  title,
  description,
  path,
  locale,
  images = getSocialImages(),
}: {
  title: string;
  description: string;
  path: string;
  locale?: Language;
  images?: SocialImage[];
}) {
  return {
    openGraph: {
      title: buildPageTitle(title),
      description,
      url: `${siteConfig.liveUrl}${path}`,
      ...(locale ? { locale: getOpenGraphLocale(locale) } : {}),
      images,
    },
    twitter: {
      title: buildPageTitle(title),
      description,
      images: getTwitterImages(images),
    },
  };
}

/**
 * Returns the root layout metadata shared by every localized site page.
 */
export function createRootLayoutMetadata(locale: Language): Metadata {
  return {
    metadataBase: new URL(siteConfig.liveUrl),
    title: {
      default: siteConfig.title,
      template: `%s | ${siteConfig.brandName}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.brandName,
    keywords: siteConfig.keywords,
    authors: [
      {
        name: siteConfig.author.name,
        url: siteConfig.author.github,
      },
    ],
    creator: siteConfig.author.name,
    publisher: siteConfig.brandName,
    category: "education",
    openGraph: {
      type: "website",
      title: siteConfig.title,
      description: siteConfig.description,
      siteName: siteConfig.brandName,
      locale: getOpenGraphLocale(locale),
      url: `${siteConfig.liveUrl}${getLocalizedPath(locale)}`,
      images: getSocialImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.title,
      description: siteConfig.description,
      creator: siteConfig.author.twitter,
      images: getSocialImages().map((image) => image.url),
    },
  };
}

/**
 * Builds canonical metadata for a non-localized page path.
 */
export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    metadataBase: new URL(siteConfig.liveUrl),
    title,
    description,
    alternates: {
      canonical: path,
    },
    ...createPageSocialMetadata({
      title,
      description,
      path,
    }),
  };
}

/**
 * Builds localized metadata with canonical and alternate-language links for a
 * translated page.
 */
export function createLocalizedPageMetadata({
  title,
  description,
  path,
  locale,
}: {
  title: string;
  description: string;
  path: string;
  locale: Language;
}): Metadata {
  const localizedPath = getLocalizedPath(locale, path);

  return {
    metadataBase: new URL(siteConfig.liveUrl),
    title,
    description,
    alternates: {
      canonical: localizedPath,
      languages: createLanguageAlternates(path),
    },
    ...createPageSocialMetadata({
      title,
      description,
      path: localizedPath,
      locale,
    }),
  };
}

/**
 * Builds metadata for pages that should stay out of search indexes while
 * preserving a title and optional description.
 */
export function createNoIndexMetadata({
  title,
  description,
}: {
  title: string;
  description?: string;
}): Metadata {
  return {
    metadataBase: new URL(siteConfig.liveUrl),
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
  };
}
