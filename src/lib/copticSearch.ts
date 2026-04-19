const COPTIC_COMBINING_MARKS_REGEX =
  /[\u0300-\u036f\uFE20-\uFE2F\u0483-\u0489]/g;
const COPTIC_KHEI_EQUIVALENT_REGEX = /[ϧⳳ]/g;
const COPTIC_KHEI_REGEX_FRAGMENT = "[ϦϧⳲⳳ]";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes Coptic text for search so diacritic and legacy/modern character
 * variants resolve to the same canonical form.
 */
export function normalizeCopticSearchText(text: string): string {
  if (!text) {
    return "";
  }

  return text
    .normalize("NFD")
    .replace(COPTIC_COMBINING_MARKS_REGEX, "")
    .toLowerCase()
    .replace(COPTIC_KHEI_EQUIVALENT_REGEX, "ⳳ")
    .trim();
}

/**
 * Builds a query regex that mirrors the dictionary search normalizer while
 * still matching the original stored glyphs in rendered text.
 */
export function buildCopticSearchRegex(query: string): RegExp | null {
  const normalizedQuery = normalizeCopticSearchText(query);

  if (normalizedQuery.length === 0) {
    return null;
  }

  const combiningChars = "[\\u0300-\\u036f\\uFE20-\\uFE2F\\u0483-\\u0489]*";
  const pattern = Array.from(normalizedQuery)
    .map(
      (char) =>
        `${char === "ⳳ" ? COPTIC_KHEI_REGEX_FRAGMENT : escapeRegExp(char)}${combiningChars}`,
    )
    .join("");

  return new RegExp(`(${pattern})`, "iu");
}
