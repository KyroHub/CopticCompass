/**
 * Collapses repeated whitespace and trims surrounding space without applying
 * domain-specific validation or formatting.
 */
export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Converts a small HTML-ish fragment into readable plain text. This intentionally
 * stays conservative so callers can use it for model output and source snippets.
 */
export function stripHtml(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

export function toStringArray(value: unknown, maxItems = 24) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = normalizeWhitespace(entry).slice(0, 120);
    if (!normalized) {
      continue;
    }

    unique.add(normalized);
    if (unique.size >= maxItems) {
      break;
    }
  }

  return Array.from(unique);
}

export function splitIntoSemanticSegments(value: string) {
  return value
    .split(/\n{2,}|(?<=[.!?])\s+/u)
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0);
}
