import {
  addIssue,
  isInteger,
  isPlainRecord,
  validateOptionalLocalizedStringArrays,
  type DictionaryEntryIdRef,
  type DictionaryValidationIssue,
} from "./dictionaryValidationShared";

const allowedRelationTypes = new Set([
  "CAUS_OF",
  "COMPOUND_WITH",
  "DERIVED_FROM",
  "SEE_ALSO",
]);

export function validateRelations(
  issues: DictionaryValidationIssue[],
  value: unknown,
  path: string,
  relationTargetIdRefs: DictionaryEntryIdRef[],
  sourceEntryId?: number,
) {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(issues, path, "expected a non-empty relations array", value);
    return;
  }

  const seenRelationEdges = new Set<string>();

  for (const [index, relation] of value.entries()) {
    const relationPath = `${path}[${index}]`;

    if (!isPlainRecord(relation)) {
      addIssue(issues, relationPath, "expected a relation object", relation);
      continue;
    }

    for (const field of Object.keys(relation)) {
      if (!["notes", "targetId", "type"].includes(field)) {
        addIssue(
          issues,
          `${relationPath}.${field}`,
          "unexpected relation field",
        );
      }
    }

    const hasSupportedRelationType =
      typeof relation.type === "string" &&
      allowedRelationTypes.has(relation.type);

    if (!hasSupportedRelationType) {
      addIssue(
        issues,
        `${relationPath}.type`,
        "expected a supported relation type",
        relation.type,
      );
    }

    if (!isInteger(relation.targetId)) {
      addIssue(
        issues,
        `${relationPath}.targetId`,
        "expected an integer entry id",
        relation.targetId,
      );
    } else {
      relationTargetIdRefs.push({
        path: `${relationPath}.targetId`,
        value: relation.targetId,
      });

      if (sourceEntryId === relation.targetId) {
        addIssue(
          issues,
          `${relationPath}.targetId`,
          "relation targetId must not reference the same entry",
          relation.targetId,
        );
      }

      if (hasSupportedRelationType) {
        const edgeKey = `${relation.type}:${relation.targetId}`;

        if (seenRelationEdges.has(edgeKey)) {
          addIssue(
            issues,
            `${relationPath}.targetId`,
            "duplicate relation edge",
            relation.targetId,
          );
        } else {
          seenRelationEdges.add(edgeKey);
        }
      }
    }

    validateOptionalLocalizedStringArrays(
      issues,
      relation.notes,
      `${relationPath}.notes`,
    );
  }
}
