import { validateEntry } from "./dictionaryValidationEntry";
import {
  addIssue,
  describeValue,
  isInteger,
  isPlainRecord,
  type DictionaryEntryIdRef,
  type DictionaryValidationIssue,
  type DictionaryValidationResult,
} from "./dictionaryValidationShared";

export function validateDictionaryEntries(
  payload: unknown,
): DictionaryValidationResult {
  const issues: DictionaryValidationIssue[] = [];
  const entryIdRefs: DictionaryEntryIdRef[] = [];
  const relationTargetIdRefs: DictionaryEntryIdRef[] = [];

  if (!Array.isArray(payload)) {
    addIssue(
      issues,
      "$",
      "expected dictionary payload to be an array",
      payload,
    );
    return { issues, valid: false };
  }

  const entryIds = new Set<number>();

  for (const [index, entry] of payload.entries()) {
    if (isPlainRecord(entry) && isInteger(entry.id)) {
      if (entryIds.has(entry.id)) {
        addIssue(issues, `$[${index}].id`, "entry id must be unique", entry.id);
      }

      entryIds.add(entry.id);
    }

    validateEntry(
      issues,
      entry,
      `$[${index}]`,
      entryIdRefs,
      relationTargetIdRefs,
    );
  }

  for (const ref of entryIdRefs) {
    if (!entryIds.has(ref.value)) {
      addIssue(
        issues,
        ref.path,
        "inflected form entryId must reference an existing entry id",
      );
    }
  }

  for (const ref of relationTargetIdRefs) {
    if (!entryIds.has(ref.value)) {
      addIssue(
        issues,
        ref.path,
        "relation targetId must reference an existing entry id",
      );
    }
  }

  return { issues, valid: issues.length === 0 };
}

export function formatDictionaryValidationIssues(
  issues: readonly DictionaryValidationIssue[],
  limit = 50,
) {
  return issues.slice(0, limit).map((issue) => {
    const suffix = describeValue(issue.value);

    return `${issue.path}: ${issue.message}${suffix}`;
  });
}
