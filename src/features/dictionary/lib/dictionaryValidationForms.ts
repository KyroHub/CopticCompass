import {
  addIssue,
  isNonEmptyString,
  isPlainRecord,
  validateNonEmptyString,
  validateNonEmptyStringArray,
  type DictionaryValidationIssue,
} from "./dictionaryValidationShared";

const allowedDialectFormFields = new Set([
  "absolute",
  "nominal",
  "participles",
  "pronominal",
  "stative",
  "variants",
]);

const allowedDialectVariantFields = new Set([
  "absolute",
  "constructParticiples",
  "nominal",
  "pronominal",
  "stative",
]);

export function validateDialectForms(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a dialect forms object", value);
    return;
  }

  let visibleFormCount = 0;

  for (const [field, fieldValue] of Object.entries(value)) {
    if (!allowedDialectFormFields.has(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected dialect form field");
      continue;
    }

    if (field === "participles") {
      validateNonEmptyStringArray(issues, fieldValue, `${path}.${field}`);
      visibleFormCount += Array.isArray(fieldValue) ? fieldValue.length : 0;
      continue;
    }

    if (field === "variants") {
      validateDialectVariants(issues, fieldValue, `${path}.variants`);
      if (isPlainRecord(fieldValue)) {
        visibleFormCount += Object.values(fieldValue).reduce<number>(
          (count, variantValue) =>
            count + (Array.isArray(variantValue) ? variantValue.length : 0),
          0,
        );
      }
      continue;
    }

    validateNonEmptyString(issues, fieldValue, `${path}.${field}`);
    visibleFormCount += isNonEmptyString(fieldValue) ? 1 : 0;
  }

  if (visibleFormCount === 0) {
    addIssue(issues, path, "expected at least one dialect form");
  }
}

function validateDialectVariants(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a variants object", value);
    return;
  }

  if (Object.keys(value).length === 0) {
    addIssue(issues, path, "expected at least one variant field", value);
  }

  for (const [field, fieldValue] of Object.entries(value)) {
    if (!allowedDialectVariantFields.has(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected variant field");
      continue;
    }

    validateNonEmptyStringArray(issues, fieldValue, `${path}.${field}`);
  }
}
