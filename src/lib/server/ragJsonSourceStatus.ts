import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { assertServerOnly } from "./assertServerOnly.ts";
import {
  getRagJsonSourceLocations,
  type RagJsonSourceLocations,
} from "./ragJsonSources";

assertServerOnly("src/lib/server/ragJsonSourceStatus.ts");

type RagJsonSourceStatusItem = {
  healthy: boolean;
  label: string;
  note?: string;
};

type RagJsonSourceStatusOptions = Partial<RagJsonSourceLocations> & {
  projectRoot?: string;
};

const DICTIONARY_JSON_RAG_LABEL = "Dictionary JSON RAG";
const GRAMMAR_JSON_RAG_LABEL = "Grammar JSON RAG";

function resolveJsonSourceStatusLocations({
  dataRoot = getRagJsonSourceLocations().dataRoot,
  dictionaryPath,
  grammarDirectoryPaths,
  projectRoot = process.cwd(),
}: RagJsonSourceStatusOptions) {
  const defaults = getRagJsonSourceLocations(dataRoot);

  return {
    dictionaryPath: dictionaryPath ?? defaults.dictionaryPath,
    grammarDirectoryPaths:
      grammarDirectoryPaths ?? defaults.grammarDirectoryPaths,
    projectRoot,
  };
}

function formatStatusCount(count: number) {
  return new Intl.NumberFormat("en-US").format(count);
}

function countDictionaryEntries(parsedJson: unknown) {
  if (Array.isArray(parsedJson)) {
    return parsedJson.length;
  }

  if (typeof parsedJson === "object" && parsedJson !== null) {
    return Object.keys(parsedJson).length;
  }

  return 0;
}

function toProjectRelativePath(filePath: string, projectRoot: string) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

async function countJsonFilesRecursively(
  directoryPath: string,
  maxDepth = 4,
  depth = 0,
): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      count += 1;
      continue;
    }

    if (entry.isDirectory() && depth < maxDepth) {
      count += await countJsonFilesRecursively(
        path.join(directoryPath, entry.name),
        maxDepth,
        depth + 1,
      );
    }
  }

  return count;
}

export async function getDictionaryJsonStatus(
  options: RagJsonSourceStatusOptions = {},
): Promise<RagJsonSourceStatusItem> {
  const { dictionaryPath } = resolveJsonSourceStatusLocations(options);

  try {
    await access(dictionaryPath);
    const fileContent = await readFile(dictionaryPath, "utf-8");
    const entryCount = countDictionaryEntries(JSON.parse(fileContent));

    return {
      healthy: true,
      label: DICTIONARY_JSON_RAG_LABEL,
      note: `${formatStatusCount(entryCount)} source entries available`,
    };
  } catch (error) {
    return {
      healthy: false,
      label: DICTIONARY_JSON_RAG_LABEL,
      note:
        error instanceof Error
          ? error.message
          : "Dictionary JSON source is unavailable",
    };
  }
}

export async function getGrammarJsonStatus(
  options: RagJsonSourceStatusOptions = {},
): Promise<RagJsonSourceStatusItem> {
  const { grammarDirectoryPaths, projectRoot } =
    resolveJsonSourceStatusLocations(options);
  let foundDirectory = false;
  let foundDirectoryLabel = "";
  let lastErrorMessage = "Grammar JSON source is unavailable";

  for (const grammarDirectoryPath of grammarDirectoryPaths) {
    try {
      const jsonFileCount =
        await countJsonFilesRecursively(grammarDirectoryPath);
      foundDirectory = true;
      foundDirectoryLabel = toProjectRelativePath(
        grammarDirectoryPath,
        projectRoot,
      );

      if (jsonFileCount === 0) {
        continue;
      }

      return {
        healthy: true,
        label: GRAMMAR_JSON_RAG_LABEL,
        note: `${formatStatusCount(jsonFileCount)} JSON files available in ${foundDirectoryLabel}`,
      };
    } catch (error) {
      lastErrorMessage =
        error instanceof Error
          ? error.message
          : "Grammar JSON source is unavailable";
    }
  }

  if (foundDirectory) {
    return {
      healthy: false,
      label: GRAMMAR_JSON_RAG_LABEL,
      note: `No grammar JSON files found under ${foundDirectoryLabel}`,
    };
  }

  return {
    healthy: false,
    label: GRAMMAR_JSON_RAG_LABEL,
    note: lastErrorMessage,
  };
}

export async function getRagJsonSourceStatuses(
  options: RagJsonSourceStatusOptions = {},
) {
  const [dictionaryJsonRag, grammarJsonRag] = await Promise.all([
    getDictionaryJsonStatus(options),
    getGrammarJsonStatus(options),
  ]);

  return {
    dictionaryJsonRag,
    grammarJsonRag,
  };
}
