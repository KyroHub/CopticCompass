import { DICTIONARY_DIALECT_CODES } from "../config.ts";

export type DictionaryValidationIssue = {
  message: string;
  path: string;
  value?: unknown;
};

export type DictionaryValidationResult = {
  issues: DictionaryValidationIssue[];
  valid: boolean;
};

export type DictionaryEntryIdRef = { path: string; value: number };

export const allowedTopLevelEntryFields = new Set([
  "dialectMeanings",
  "dialects",
  "etym",
  "genderedMeanings",
  "greekContext",
  "headword",
  "id",
  "inflections",
  "relations",
  "senses",
]);

export const allowedEtymologies = new Set([
  "Egy",
  "Gr",
  "Lat",
  "Sem",
  "Unknown",
]);

export const allowedDialectCodes = new Set<string>(DICTIONARY_DIALECT_CODES);

export const localizedArrayFields = new Set(["en", "nl"]);

export const senseGrammarEnumFields = {
  affix: ["PFX", "SFX"],
  caseRole: ["DAT", "OBJ"],
  derivation: ["CAUS"],
  form: ["ABS", "PC", "STA", "VBAL"],
  gender: ["BOTH", "F", "M"],
  mood: ["IMP"],
  number: ["PL", "SG"],
  polarity: ["NEG"],
  valency: ["INTR", "TR"],
  voice: ["REFL"],
} as const;

export function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function describeValue(value: unknown) {
  if (value === undefined) {
    return "";
  }

  try {
    return `: ${JSON.stringify(value)}`;
  } catch {
    return "";
  }
}

export function addIssue(
  issues: DictionaryValidationIssue[],
  path: string,
  message: string,
  value?: unknown,
) {
  issues.push({ message, path, ...(value !== undefined ? { value } : {}) });
}

export function validateNonEmptyString(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isNonEmptyString(value)) {
    addIssue(issues, path, "expected a non-empty string", value);
  }
}

export function validateNonEmptyStringArray(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(issues, path, "expected a non-empty string array", value);
    return;
  }

  for (const [index, item] of value.entries()) {
    validateNonEmptyString(issues, item, `${path}[${index}]`);
  }
}

function validateLocalizedStringArrays(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a localized string-array object", value);
    return;
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    addIssue(issues, path, "expected at least one locale", value);
  }

  for (const [locale, localizedValue] of entries) {
    if (!localizedArrayFields.has(locale)) {
      addIssue(
        issues,
        `${path}.${locale}`,
        "unexpected locale",
        localizedValue,
      );
      continue;
    }

    validateNonEmptyStringArray(issues, localizedValue, `${path}.${locale}`);
  }
}

export function validateOptionalLocalizedStringArrays(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (value !== undefined) {
    validateLocalizedStringArrays(issues, value, path);
  }
}

export function validateDialectCodeArray(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(issues, path, "expected a non-empty dialect array", value);
    return;
  }

  const seen = new Set<string>();

  for (const [index, dialect] of value.entries()) {
    const itemPath = `${path}[${index}]`;

    if (typeof dialect !== "string" || !allowedDialectCodes.has(dialect)) {
      addIssue(issues, itemPath, "expected a supported dialect code", dialect);
      continue;
    }

    if (seen.has(dialect)) {
      addIssue(issues, itemPath, "dialect codes must be unique", dialect);
      continue;
    }

    seen.add(dialect);
  }
}
