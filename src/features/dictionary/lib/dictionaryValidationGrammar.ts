import {
  DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS,
  DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS,
  DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT,
  DICTIONARY_PREP_GOVERNMENT_FORMS,
  DICTIONARY_SENSE_CODES,
  PARTS_OF_SPEECH,
} from "../config.ts";
import {
  addIssue,
  allowedDialectCodes,
  senseGrammarEnumFields,
  isPlainRecord,
  validateDialectCodeArray,
  validateOptionalLocalizedStringArrays,
  type DictionaryValidationIssue,
} from "./dictionaryValidationShared";

const allowedSenseGrammarKeys = new Set([
  "affix",
  "caseRole",
  "complementizerGovernment",
  "constructionGovernment",
  "derivation",
  "form",
  "gender",
  "mood",
  "number",
  "polarity",
  "pos",
  "prepGovernment",
  "tags",
  "valency",
  "voice",
]);

const allowedSenseGrammarPartOfSpeech = new Set([...PARTS_OF_SPEECH, "PRON"]);

const allowedComplementizerGovernmentForms = new Set<string>(
  DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS,
);

const allowedConstructionGovernmentForms = new Set<string>(
  DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS,
);

const allowedPrepGovernmentForms = new Set<string>(
  DICTIONARY_PREP_GOVERNMENT_FORMS,
);

const allowedPrepGovernmentFormsForDialect = {
  S: new Set<string>(DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.S),
  B: new Set<string>(DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.B),
};

const allowedSenseGrammarTags = new Set<string>(DICTIONARY_SENSE_CODES);

/**
 * Validates grammar fields that are represented as non-empty unique lists of
 * registry-backed government forms.
 */
function validateGovernmentForms(
  issues: DictionaryValidationIssue[],
  allowedForms: ReadonlySet<string>,
  fieldName: string,
  label: string,
  value: unknown,
  path: string,
) {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(issues, path, `expected a non-empty ${fieldName} array`, value);
    return;
  }

  const seen = new Set<string>();

  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;

    if (typeof item !== "string" || !allowedForms.has(item)) {
      addIssue(issues, itemPath, `expected a supported ${label} form`, item);
      continue;
    }

    if (seen.has(item)) {
      addIssue(issues, itemPath, `${label} forms must be unique`, item);
      continue;
    }

    seen.add(item);
  }
}

function validateComplementizerGovernment(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  validateGovernmentForms(
    issues,
    allowedComplementizerGovernmentForms,
    "complementizerGovernment",
    "complementizer government",
    value,
    path,
  );
}

function validateConstructionGovernment(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  validateGovernmentForms(
    issues,
    allowedConstructionGovernmentForms,
    "constructionGovernment",
    "construction government",
    value,
    path,
  );
}

/**
 * Validates dialect-keyed prepositional government and enforces the current
 * dialect-specific S/B form registries.
 */
function validatePrepGovernment(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(
      issues,
      path,
      "expected a dialect-keyed prepositional government object",
      value,
    );
    return;
  }

  for (const [dialect, prepList] of Object.entries(value)) {
    const dialectPath = `${path}.${dialect}`;
    if (!allowedDialectCodes.has(dialect)) {
      addIssue(
        issues,
        dialectPath,
        "expected a supported dialect code",
        dialect,
      );
      continue;
    }
    if (dialect !== "S" && dialect !== "B") {
      addIssue(
        issues,
        dialectPath,
        "prepositional government is only supported for S and B dialects currently",
        dialect,
      );
      continue;
    }

    if (!Array.isArray(prepList) || prepList.length === 0) {
      addIssue(
        issues,
        dialectPath,
        "expected a non-empty prepositional government array",
        prepList,
      );
      continue;
    }

    const seen = new Set<string>();
    for (const [index, prep] of prepList.entries()) {
      const itemPath = `${dialectPath}[${index}]`;
      if (typeof prep !== "string" || !allowedPrepGovernmentForms.has(prep)) {
        addIssue(
          issues,
          itemPath,
          "expected a supported prepositional government form",
          prep,
        );
        continue;
      }

      const dialectAllowedPreps =
        allowedPrepGovernmentFormsForDialect[dialect as "S" | "B"];
      if (!dialectAllowedPreps.has(prep)) {
        addIssue(
          issues,
          itemPath,
          `preposition "${prep}" is not standard for dialect ${dialect}`,
          prep,
        );
        continue;
      }

      if (seen.has(prep)) {
        addIssue(
          issues,
          itemPath,
          "prepositional government forms must be unique",
          prep,
        );
        continue;
      }
      seen.add(prep);
    }
  }
}

/**
 * Validates one sense's grammar object, including cross-field constraints such
 * as gender only applying to nouns and verbal fields only applying to verbs.
 */
function validateSenseGrammar(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a sense grammar object", value);
    return;
  }

  if (!("pos" in value)) {
    addIssue(issues, `${path}.pos`, "expected a part-of-speech code");
  }

  for (const [field, fieldValue] of Object.entries(value)) {
    if (!allowedSenseGrammarKeys.has(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected grammar field");
      continue;
    }

    if (field === "pos") {
      if (
        typeof fieldValue !== "string" ||
        !allowedSenseGrammarPartOfSpeech.has(fieldValue)
      ) {
        addIssue(
          issues,
          `${path}.pos`,
          "expected a supported part-of-speech code",
          fieldValue,
        );
      }
      continue;
    }

    if (field === "tags") {
      if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
        addIssue(issues, `${path}.tags`, "expected a non-empty tag array");
        continue;
      }

      for (const [index, tag] of fieldValue.entries()) {
        if (typeof tag !== "string" || !allowedSenseGrammarTags.has(tag)) {
          addIssue(
            issues,
            `${path}.tags[${index}]`,
            "expected a supported grammar tag",
            tag,
          );
        }
      }
      continue;
    }

    if (field === "prepGovernment") {
      validatePrepGovernment(issues, fieldValue, `${path}.prepGovernment`);
      continue;
    }

    if (field === "complementizerGovernment") {
      validateComplementizerGovernment(
        issues,
        fieldValue,
        `${path}.complementizerGovernment`,
      );
      continue;
    }

    if (field === "constructionGovernment") {
      validateConstructionGovernment(
        issues,
        fieldValue,
        `${path}.constructionGovernment`,
      );
      continue;
    }

    if (
      field in senseGrammarEnumFields &&
      !senseGrammarEnumFields[
        field as keyof typeof senseGrammarEnumFields
      ].includes(fieldValue as never)
    ) {
      addIssue(
        issues,
        `${path}.${field}`,
        "expected a supported grammar value",
        fieldValue,
      );
    }
  }

  if (value.gender !== undefined && value.pos !== "N") {
    addIssue(issues, `${path}.gender`, "gender is only valid on noun senses");
  }

  if (
    (value.valency !== undefined ||
      value.mood !== undefined ||
      value.voice !== undefined ||
      value.derivation !== undefined ||
      value.complementizerGovernment !== undefined ||
      value.constructionGovernment !== undefined ||
      value.prepGovernment !== undefined ||
      value.form === "PC" ||
      value.form === "STA") &&
    value.pos !== "V"
  ) {
    addIssue(
      issues,
      path,
      "verbal grammar fields are only valid on verb senses",
      value,
    );
  }
}

/**
 * Validates the full sense envelope before delegating localized text arrays and
 * grammar-specific rules to the narrower validators.
 */
export function validateSense(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
) {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "expected a sense object", value);
    return;
  }

  for (const field of Object.keys(value)) {
    if (!["dialects", "grammar", "meanings", "notes"].includes(field)) {
      addIssue(issues, `${path}.${field}`, "unexpected sense field");
    }
  }

  if (value.dialects !== undefined) {
    validateDialectCodeArray(issues, value.dialects, `${path}.dialects`);
  }

  validateSenseGrammar(issues, value.grammar, `${path}.grammar`);
  validateOptionalLocalizedStringArrays(
    issues,
    value.meanings,
    `${path}.meanings`,
  );
  validateOptionalLocalizedStringArrays(issues, value.notes, `${path}.notes`);
}
