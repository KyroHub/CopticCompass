import { isLanguage, DEFAULT_LANGUAGE, type Language } from "@/lib/i18n";

/**
 * Lists the public locales exposed in localized site routes and metadata.
 */
export const PUBLIC_LOCALES = [
  "en",
  "nl",
] as const satisfies readonly Language[];

/**
 * Normalizes route fragments so downstream helpers can safely assume a leading
 * slash and a root fallback.
 */
function normalizePath(path: string) {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Narrows an arbitrary string to one of the public locales supported in URLs.
 */
export function isPublicLocale(value: string): value is Language {
  return isLanguage(value);
}

/**
 * Reads a supported locale prefix from a pathname when the route is already
 * localized under the public site surface.
 */
export function getPublicLocaleFromPathname(
  pathname: string | null | undefined,
) {
  if (!pathname) {
    return null;
  }

  const normalizedPath = normalizePath(pathname);
  const [, maybeLocale] = normalizedPath.split("/");

  return maybeLocale && isPublicLocale(maybeLocale) ? maybeLocale : null;
}

/**
 * Prefixes an application path with the requested locale while keeping the
 * localized homepage at `/locale` rather than `/locale/`.
 */
export function getLocalizedPath(locale: Language, path = "/") {
  const normalizedPath = normalizePath(path);
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function getLocalizedHomePath(locale: Language) {
  return getLocalizedPath(locale);
}

export function getDictionaryPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/dictionary") : "/dictionary";
}

export function getEntryPath(id: string, locale?: Language) {
  const path = `/entry/${id}`;
  return locale ? getLocalizedPath(locale, path) : path;
}

export function getGrammarPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/grammar") : "/grammar";
}

export function getPublicationsPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/publications") : "/publications";
}

export function getContactPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/contact") : "/contact";
}

export function getChatPath() {
  return "/chat";
}

export function getAnalyticsPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/analytics") : "/analytics";
}

export function getDashboardPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/dashboard") : "/dashboard";
}

export function getDevelopersPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/developers") : "/developers";
}

export function getPrivacyPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/privacy") : "/privacy";
}

export function getTermsPath(locale?: Language) {
  return locale ? getLocalizedPath(locale, "/terms") : "/terms";
}

/**
 * Removes a supported locale prefix from a pathname so route switching and
 * alternate-link builders can work with locale-agnostic paths.
 */
export function stripLocaleFromPathname(pathname: string) {
  const normalizedPath = normalizePath(pathname);

  for (const locale of PUBLIC_LOCALES) {
    if (normalizedPath === `/${locale}`) {
      return "/";
    }

    if (normalizedPath.startsWith(`/${locale}/`)) {
      return normalizedPath.slice(locale.length + 1);
    }
  }

  return normalizedPath;
}

/**
 * Rebuilds the current pathname under a different locale while preserving the
 * underlying route segment.
 */
export function switchLocalePath(pathname: string, nextLocale: Language) {
  return getLocalizedPath(nextLocale, stripLocaleFromPathname(pathname));
}

/**
 * Reattaches search and hash fragments to a pathname while normalizing the
 * required `?` and `#` prefixes.
 */
export function appendSearchAndHash(pathname: string, search = "", hash = "") {
  const normalizedPathname = normalizePath(pathname);
  let normalizedSearch = "";

  if (search) {
    normalizedSearch = search.startsWith("?") ? search : `?${search}`;
  }

  let normalizedHash = "";

  if (hash) {
    normalizedHash = hash.startsWith("#") ? hash : `#${hash}`;
  }

  return `${normalizedPathname}${normalizedSearch}${normalizedHash}`;
}

/**
 * Builds the localized alternate-link map for a canonical route path.
 */
export function createLanguageAlternates(path: string) {
  return Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, getLocalizedPath(locale, path)]),
  ) as Record<Language, string>;
}

/**
 * Maps public locales onto the Open Graph locale identifiers used in metadata.
 */
export function getOpenGraphLocale(locale: Language) {
  return locale === "nl" ? "nl_BE" : "en_US";
}

/**
 * Returns the default public locale used when no path, cookie, or header
 * preference is available.
 */
function _getDefaultPublicLocale() {
  return DEFAULT_LANGUAGE;
}
