import fs from "node:fs";
import path from "node:path";

import { format } from "prettier";

type DictionaryRecord = {
  id: number;
  [key: string]: unknown;
};

const dictionaryPath = path.resolve("public/data/dictionary.json");
const mapOutputArgument = process.argv.find((argument) =>
  argument.startsWith("--map-output="),
);
const mapOutputPath = mapOutputArgument
  ? path.resolve(mapOutputArgument.slice("--map-output=".length))
  : null;

const dictionary = JSON.parse(
  fs.readFileSync(dictionaryPath, "utf8"),
) as DictionaryRecord[];
const oldIds = dictionary.map((entry) => entry.id);

if (
  oldIds.some((id) => !Number.isInteger(id) || id < 1) ||
  new Set(oldIds).size !== oldIds.length
) {
  throw new Error("Dictionary entry IDs must be unique positive integers.");
}

const idMap = new Map(
  dictionary.map((entry, index) => [entry.id, index + 1] as const),
);

function remapReference(id: number, field: string): number {
  const remappedId = idMap.get(id);

  if (remappedId === undefined) {
    throw new Error(`${field} references missing dictionary entry ${id}.`);
  }

  return remappedId;
}

function remapNestedReferences(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(remapNestedReferences);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (
        (key === "entryId" || key === "targetId") &&
        typeof child === "number"
      ) {
        return [key, remapReference(child, key)];
      }

      return [key, remapNestedReferences(child)];
    }),
  );
}

const compactedDictionary = dictionary.map((entry, index) => ({
  ...(remapNestedReferences(entry) as Record<string, unknown>),
  id: index + 1,
}));
const formattedDictionary = await format(
  JSON.stringify(compactedDictionary, null, 2),
  { parser: "json" },
);

fs.writeFileSync(dictionaryPath, formattedDictionary);

if (mapOutputPath) {
  const serializedMap = Object.fromEntries(
    [...idMap.entries()].map(([oldId, newId]) => [String(oldId), newId]),
  );
  fs.writeFileSync(
    mapOutputPath,
    `${JSON.stringify(serializedMap, null, 2)}\n`,
  );
}

console.log(
  `Compacted ${dictionary.length} dictionary entries to IDs 1-${dictionary.length}.`,
);
