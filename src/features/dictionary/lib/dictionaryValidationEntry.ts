import { validateDialectForms } from "./dictionaryValidationForms";
import { validateSense } from "./dictionaryValidationGrammar";
import { validateInflections } from "./dictionaryValidationInflections";
import {
  validateDialectMeaning,
  validateGenderedMeaning,
  validateGreekContext,
} from "./dictionaryValidationMeanings";
import { validateRelations } from "./dictionaryValidationRelations";
import {
  addIssue,
  allowedDialectCodes,
  allowedEtymologies,
  allowedTopLevelEntryFields,
  isInteger,
  isPlainRecord,
  validateNonEmptyString,
  type DictionaryEntryIdRef,
  type DictionaryValidationIssue,
} from "./dictionaryValidationShared";

export function validateEntry(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
  entryIdRefs: DictionaryEntryIdRef[],
  relationTargetIdRefs: DictionaryEntryIdRef[],
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a dictionary entry object", value);
    return;
  }

  for (const field of Object.keys(value)) {
    if (!allowedTopLevelEntryFields.has(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected entry field");
    }
  }

  if (!isInteger(value.id)) {
    addIssue(issues, `${path}.id`, "expected an integer entry id", value.id);
  }

  validateNonEmptyString(issues, value.headword, `${path}.headword`);

  if (!isPlainRecord(value.dialects)) {
    addIssue(
      issues,
      `${path}.dialects`,
      "expected a dialect map",
      value.dialects,
    );
  } else if (
    Object.keys(value.dialects).length === 0 &&
    value.inflections !== undefined
  ) {
    addIssue(
      issues,
      `${path}.dialects`,
      "entries with structured inflections should expose dialect forms",
    );
  } else {
    for (const [dialect, forms] of Object.entries(value.dialects)) {
      if (!allowedDialectCodes.has(dialect)) {
        addIssue(
          issues,
          `${path}.dialects.${dialect}`,
          "expected a supported dialect code",
        );
        continue;
      }

      validateDialectForms(issues, forms, `${path}.dialects.${dialect}`);
    }
  }

  if (!Array.isArray(value.senses) || value.senses.length === 0) {
    addIssue(issues, `${path}.senses`, "expected a non-empty senses array");
  } else {
    for (const [index, sense] of value.senses.entries()) {
      validateSense(issues, sense, `${path}.senses[${index}]`);
    }
  }

  if (typeof value.etym !== "string" || !allowedEtymologies.has(value.etym)) {
    addIssue(
      issues,
      `${path}.etym`,
      "expected a supported etymology",
      value.etym,
    );
  }

  if (value.greekContext !== undefined) {
    validateGreekContext(issues, value.greekContext, `${path}.greekContext`);
  }

  if (value.dialectMeanings !== undefined) {
    if (!Array.isArray(value.dialectMeanings)) {
      addIssue(
        issues,
        `${path}.dialectMeanings`,
        "expected a dialect meanings array",
      );
    } else {
      for (const [index, dialectMeaning] of value.dialectMeanings.entries()) {
        validateDialectMeaning(
          issues,
          dialectMeaning,
          `${path}.dialectMeanings[${index}]`,
        );
      }
    }
  }

  if (value.genderedMeanings !== undefined) {
    if (!Array.isArray(value.genderedMeanings)) {
      addIssue(
        issues,
        `${path}.genderedMeanings`,
        "expected a gendered meanings array",
      );
    } else {
      for (const [index, genderedMeaning] of value.genderedMeanings.entries()) {
        validateGenderedMeaning(
          issues,
          genderedMeaning,
          `${path}.genderedMeanings[${index}]`,
        );
      }
    }
  }

  if (value.inflections !== undefined) {
    validateInflections(
      issues,
      value.inflections,
      `${path}.inflections`,
      entryIdRefs,
    );
  }

  if (value.relations !== undefined) {
    validateRelations(
      issues,
      value.relations,
      `${path}.relations`,
      relationTargetIdRefs,
      isInteger(value.id) ? value.id : undefined,
    );
  }
}
