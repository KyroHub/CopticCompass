import {
  addIssue,
  isPlainRecord,
  localizedArrayFields,
  validateDialectCodeArray,
  validateNonEmptyString,
  validateNonEmptyStringArray,
  validateOptionalLocalizedStringArrays,
  type DictionaryValidationIssue,
} from "./dictionaryValidationShared";

const allowedGenderedMeaningMarkers = new Set(["f", "m", "pl"]);

const allowedGreekContextFields = new Set(["equivalents", "sources"]);

export function validateGreekContext(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a Greek context object", value);
    return;
  }

  const fields = Object.keys(value);

  if (fields.length === 0) {
    addIssue(issues, path, "expected at least one Greek context field", value);
  }

  for (const field of fields) {
    if (!allowedGreekContextFields.has(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected Greek context field");
      continue;
    }

    validateNonEmptyStringArray(issues, value[field], `${path}.${field}`);
  }
}

export function validateDialectMeaning(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a dialect meaning object", value);
    return;
  }

  for (const field of Object.keys(value)) {
    if (!["dialects", "meanings", "notes", "sourceLabel"].includes(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected dialect meaning field");
    }
  }

  validateNonEmptyString(issues, value.sourceLabel, `${path}.sourceLabel`);

  validateDialectCodeArray(issues, value.dialects, `${path}.dialects`);

  validateOptionalLocalizedStringArrays(
    issues,
    value.meanings,
    `${path}.meanings`,
  );
  validateOptionalLocalizedStringArrays(issues, value.notes, `${path}.notes`);
}

function validateGenderedMeaningValues(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a gendered meaning values object", value);
    return;
  }

  if (Object.keys(value).length === 0) {
    addIssue(issues, path, "expected at least one gendered meaning marker");
  }

  for (const [marker, meaning] of Object.entries(value)) {
    if (!allowedGenderedMeaningMarkers.has(marker)) {
      addIssue(
        issues,
        `${path}.${marker}`,
        "unexpected gendered meaning marker",
      );
      continue;
    }

    validateNonEmptyString(issues, meaning, `${path}.${marker}`);
  }
}

export function validateGenderedMeaning(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a gendered meaning object", value);
    return;
  }

  for (const field of Object.keys(value)) {
    if (field !== "meanings") {
      addIssue(issues, `${path}.${field}`, "unexpected gendered meaning field");
    }
  }

  if (!isPlainRecord(value.meanings)) {
    addIssue(
      issues,
      `${path}.meanings`,
      "expected localized gendered meanings",
    );
    return;
  }

  for (const [locale, localizedValue] of Object.entries(value.meanings)) {
    if (!localizedArrayFields.has(locale)) {
      addIssue(issues, `${path}.meanings.${locale}`, "unexpected locale");
      continue;
    }

    validateGenderedMeaningValues(
      issues,
      localizedValue,
      `${path}.meanings.${locale}`,
    );
  }
}
