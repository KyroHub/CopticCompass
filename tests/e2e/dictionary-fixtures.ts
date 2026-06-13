import fs from "node:fs";
import path from "node:path";

type DictionaryRelation = {
  targetId: number;
  type: string;
};

export type DictionaryFixtureEntry = {
  headword: string;
  id: number;
  relations?: DictionaryRelation[];
};

const dictionary = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "public/data/dictionary.json"),
    "utf8",
  ),
) as DictionaryFixtureEntry[];
const entriesById = new Map(dictionary.map((entry) => [entry.id, entry]));

export function getDictionaryEntryPath(entry: DictionaryFixtureEntry) {
  return `/en/entry/${entry.id}`;
}

export function getUniqueDictionaryEntryByHeadword(headword: string) {
  const matches = dictionary.filter((entry) => entry.headword === headword);

  if (matches.length !== 1) {
    throw new Error(
      `Expected one dictionary entry for ${headword}, found ${matches.length}.`,
    );
  }

  return matches[0];
}

export function getDictionaryRelationTarget(
  entry: DictionaryFixtureEntry,
  relationType: string,
) {
  const matches = (entry.relations ?? []).filter(
    (relation) => relation.type === relationType,
  );

  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${relationType} relation for ${entry.headword}, found ${matches.length}.`,
    );
  }

  const target = entriesById.get(matches[0].targetId);

  if (!target) {
    throw new Error(
      `${entry.headword} references missing dictionary entry ${matches[0].targetId}.`,
    );
  }

  return target;
}
