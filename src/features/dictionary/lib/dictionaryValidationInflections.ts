import {
  addIssue,
  allowedDialectCodes,
  isInteger,
  isPlainRecord,
  senseGrammarEnumFields,
  validateNonEmptyString,
  validateNonEmptyStringArray,
  type DictionaryEntryIdRef,
  type DictionaryValidationIssue,
} from "./dictionaryValidationShared";

const allowedInflectionKinds = new Set([
  "dual",
  "feminine",
  "imperative",
  "masculine",
  "plural",
]);

const allowedInflectionRoles = new Set([
  "absolute",
  "default",
  "nominal",
  "pronominal",
]);

function validateInflectedFormValue(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
  entryIdRefs: DictionaryEntryIdRef[],
) {
  if (typeof value === "string") {
    validateNonEmptyString(issues, value, path);
    return;
  }

  if (!isPlainRecord(value)) {
    addIssue(
      issues,
      path,
      "expected an inflected form string or object",
      value,
    );
    return;
  }

  for (const field of Object.keys(value)) {
    if (
      !["entryId", "form", "gender", "notes", "number", "uncertain"].includes(
        field,
      )
    ) {
      addIssue(issues, `${path}.${field}`, "unexpected inflected form field");
    }
  }

  validateNonEmptyString(issues, value.form, `${path}.form`);

  if (
    value.gender !== undefined &&
    !senseGrammarEnumFields.gender.includes(value.gender as never)
  ) {
    addIssue(
      issues,
      `${path}.gender`,
      "expected a supported grammar value",
      value.gender,
    );
  }

  if (value.entryId !== undefined) {
    if (!isInteger(value.entryId)) {
      addIssue(issues, `${path}.entryId`, "expected an integer entry id");
    } else {
      entryIdRefs.push({ path: `${path}.entryId`, value: value.entryId });
    }
  }

  if (value.notes !== undefined) {
    validateNonEmptyStringArray(issues, value.notes, `${path}.notes`);
  }

  if (
    value.number !== undefined &&
    !senseGrammarEnumFields.number.includes(value.number as never)
  ) {
    addIssue(
      issues,
      `${path}.number`,
      "expected a supported grammar value",
      value.number,
    );
  }

  if (value.uncertain !== undefined && typeof value.uncertain !== "boolean") {
    addIssue(
      issues,
      `${path}.uncertain`,
      "expected a boolean",
      value.uncertain,
    );
  }
}

function validateInflectedFormArray(
  issues: DictionaryValidationIssue[],
  forms: unknown,
  path: string,
  entryIdRefs: DictionaryEntryIdRef[],
) {
  if (!Array.isArray(forms) || forms.length === 0) {
    addIssue(issues, path, "expected a non-empty inflected form array", forms);
    return;
  }

  for (const [index, form] of forms.entries()) {
    validateInflectedFormValue(issues, form, `${path}[${index}]`, entryIdRefs);
  }
}

export function validateInflections(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
  entryIdRefs: DictionaryEntryIdRef[],
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected an inflections object", value);
    return;
  }

  for (const [kind, dialects] of Object.entries(value)) {
    if (!allowedInflectionKinds.has(kind)) {
      addIssue(issues, `${path}.${kind}`, "unexpected inflection kind");
      continue;
    }

    if (!isPlainRecord(dialects)) {
      addIssue(issues, `${path}.${kind}`, "expected a dialect map", dialects);
      continue;
    }

    for (const [dialect, roles] of Object.entries(dialects)) {
      if (!allowedDialectCodes.has(dialect)) {
        addIssue(
          issues,
          `${path}.${kind}.${dialect}`,
          "expected a supported dialect code",
        );
        continue;
      }

      if (!isPlainRecord(roles)) {
        addIssue(
          issues,
          `${path}.${kind}.${dialect}`,
          "expected an inflection role map",
          roles,
        );
        continue;
      }

      for (const [role, forms] of Object.entries(roles)) {
        if (role === "variants") {
          if (!isPlainRecord(forms)) {
            addIssue(
              issues,
              `${path}.${kind}.${dialect}.variants`,
              "expected an inflection variants object",
              forms,
            );
            continue;
          }

          for (const [variantRole, variantForms] of Object.entries(forms)) {
            if (!allowedInflectionRoles.has(variantRole)) {
              addIssue(
                issues,
                `${path}.${kind}.${dialect}.variants.${variantRole}`,
                "unexpected inflection variant role",
              );
              continue;
            }

            validateInflectedFormArray(
              issues,
              variantForms,
              `${path}.${kind}.${dialect}.variants.${variantRole}`,
              entryIdRefs,
            );
          }

          continue;
        }

        if (!allowedInflectionRoles.has(role)) {
          addIssue(
            issues,
            `${path}.${kind}.${dialect}.${role}`,
            "unexpected inflection role",
          );
          continue;
        }

        validateInflectedFormArray(
          issues,
          forms,
          `${path}.${kind}.${dialect}.${role}`,
          entryIdRefs,
        );
      }
    }
  }
}
