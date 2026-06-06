import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { assertServerOnly } from "./assertServerOnly.ts";

assertServerOnly("src/lib/server/ragJsonSources.ts");

export type RagJsonKnowledgeSource = {
  fileName: string;
  filePath: string;
  title: string;
};

export type RagJsonSourceLocations = {
  dataRoot: string;
  dictionaryPath: string;
  grammarDirectoryPaths: readonly string[];
};

export type RagJsonSourceDiscoveryOptions = Partial<RagJsonSourceLocations> & {
  log?: (message: string) => void;
};

export function getRagJsonSourceLocations(
  dataRoot = path.join(process.cwd(), "public", "data"),
): RagJsonSourceLocations {
  return {
    dataRoot,
    dictionaryPath: path.join(dataRoot, "dictionary.json"),
    grammarDirectoryPaths: [
      path.join(dataRoot, "grammar", "v1"),
      path.join(dataRoot, "grammar"),
    ],
  };
}

export function buildJsonKnowledgeSourceTitle(
  sourcePath: string,
  dataRoot = getRagJsonSourceLocations().dataRoot,
) {
  const relativePath = path
    .relative(dataRoot, sourcePath)
    .split(path.sep)
    .join("/");

  return `JSON Source: data/${relativePath}`;
}

export function getJsonKnowledgeSourceFileName(sourcePath: string) {
  return path.basename(sourcePath);
}

export async function readJsonKnowledgeSourceContent(sourcePath: string) {
  return readFile(sourcePath, "utf-8");
}

async function collectJsonFilesRecursively(
  directoryPath: string,
): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJsonFilesRecursively(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveJsonSourceLocations({
  dataRoot = getRagJsonSourceLocations().dataRoot,
  dictionaryPath,
  grammarDirectoryPaths,
}: RagJsonSourceDiscoveryOptions) {
  const defaults = getRagJsonSourceLocations(dataRoot);

  return {
    dataRoot,
    dictionaryPath: dictionaryPath ?? defaults.dictionaryPath,
    grammarDirectoryPaths:
      grammarDirectoryPaths ?? defaults.grammarDirectoryPaths,
  };
}

async function addDictionarySource(
  sources: Set<string>,
  dictionaryPath: string,
  log?: (message: string) => void,
) {
  try {
    await readFile(dictionaryPath, "utf-8");
    log?.(`[RAG:JSON] Found dictionary file: ${dictionaryPath}`);
    sources.add(dictionaryPath);
  } catch {
    log?.(`[RAG:JSON] Dictionary file NOT found: ${dictionaryPath}`);
  }
}

async function addGrammarSources(
  sources: Set<string>,
  grammarDirectoryPath: string,
  log?: (message: string) => void,
) {
  try {
    log?.(`[RAG:JSON] Checking grammar directory: ${grammarDirectoryPath}`);
    const grammarFiles =
      await collectJsonFilesRecursively(grammarDirectoryPath);
    log?.(
      `[RAG:JSON] Found ${grammarFiles.length} files in ${grammarDirectoryPath}`,
    );

    for (const grammarFile of grammarFiles) {
      sources.add(grammarFile);
    }
  } catch (error) {
    log?.(
      `[RAG:JSON] Error checking grammar directory ${grammarDirectoryPath}: ${error}`,
    );
  }
}

async function collectJsonKnowledgeSourcePaths(
  options: RagJsonSourceDiscoveryOptions = {},
) {
  const { dictionaryPath, grammarDirectoryPaths } =
    resolveJsonSourceLocations(options);
  const sources = new Set<string>();

  await addDictionarySource(sources, dictionaryPath, options.log);
  for (const grammarDirectoryPath of grammarDirectoryPaths) {
    await addGrammarSources(sources, grammarDirectoryPath, options.log);
  }

  const result = Array.from(sources).sort((left, right) =>
    left.localeCompare(right),
  );
  options.log?.(`[RAG:JSON] Final collected sources count: ${result.length}`);
  return result;
}

export async function discoverJsonKnowledgeSources(
  options: RagJsonSourceDiscoveryOptions = {},
): Promise<RagJsonKnowledgeSource[]> {
  const { dataRoot } = resolveJsonSourceLocations(options);
  const sourcePaths = await collectJsonKnowledgeSourcePaths(options);

  return sourcePaths.map((sourcePath) => ({
    fileName: getJsonKnowledgeSourceFileName(sourcePath),
    filePath: sourcePath,
    title: buildJsonKnowledgeSourceTitle(sourcePath, dataRoot),
  }));
}
