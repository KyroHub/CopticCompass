import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildJsonKnowledgeSourceTitle,
  discoverJsonKnowledgeSources,
  getJsonKnowledgeSourceFileName,
  getRagJsonSourceLocations,
  readJsonKnowledgeSourceContent,
} from "./ragJsonSources";

const tempRoots: string[] = [];

async function createTempRoot() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "rag-json-sources-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("RAG JSON source filesystem primitives", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((tempRoot) => rm(tempRoot, { force: true, recursive: true })),
    );
  });

  it("builds the default JSON source locations for a data root", () => {
    const dataRoot = path.join("project", "public", "data");

    expect(getRagJsonSourceLocations(dataRoot)).toEqual({
      dataRoot,
      dictionaryPath: path.join(dataRoot, "dictionary.json"),
      grammarDirectoryPaths: [
        path.join(dataRoot, "grammar", "v1"),
        path.join(dataRoot, "grammar"),
      ],
    });
  });

  it("normalizes source titles and file names", () => {
    const dataRoot = path.join("project", "public", "data");
    const sourcePath = path.join(dataRoot, "grammar", "v1", "lesson.json");

    expect(buildJsonKnowledgeSourceTitle(sourcePath, dataRoot)).toBe(
      "JSON Source: data/grammar/v1/lesson.json",
    );
    expect(getJsonKnowledgeSourceFileName(sourcePath)).toBe("lesson.json");
  });

  it("discovers dictionary and grammar JSON sources with deduped sorted paths", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = path.join(tempRoot, "public", "data");
    const grammarV1Root = path.join(dataRoot, "grammar", "v1");
    const nestedGrammarRoot = path.join(grammarV1Root, "nested");

    await mkdir(nestedGrammarRoot, { recursive: true });
    await writeFile(path.join(dataRoot, "dictionary.json"), "{}");
    await writeFile(path.join(grammarV1Root, "lesson.json"), "{}");
    await writeFile(path.join(nestedGrammarRoot, "deep.JSON"), "{}");
    await writeFile(path.join(grammarV1Root, "notes.txt"), "not json");

    const logMessages: string[] = [];
    const sources = await discoverJsonKnowledgeSources({
      dataRoot,
      log: (message) => logMessages.push(message),
    });

    expect(sources).toEqual([
      {
        fileName: "dictionary.json",
        filePath: path.join(dataRoot, "dictionary.json"),
        title: "JSON Source: data/dictionary.json",
      },
      {
        fileName: "lesson.json",
        filePath: path.join(grammarV1Root, "lesson.json"),
        title: "JSON Source: data/grammar/v1/lesson.json",
      },
      {
        fileName: "deep.JSON",
        filePath: path.join(nestedGrammarRoot, "deep.JSON"),
        title: "JSON Source: data/grammar/v1/nested/deep.JSON",
      },
    ]);
    expect(logMessages.at(-1)).toBe(
      "[RAG:JSON] Final collected sources count: 3",
    );
  });

  it("returns an empty collection when expected sources are absent", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = path.join(tempRoot, "public", "data");

    await expect(discoverJsonKnowledgeSources({ dataRoot })).resolves.toEqual(
      [],
    );
  });

  it("reads source content by path", async () => {
    const tempRoot = await createTempRoot();
    const sourcePath = path.join(tempRoot, "source.json");

    await writeFile(sourcePath, '{"value":true}');

    await expect(readJsonKnowledgeSourceContent(sourcePath)).resolves.toBe(
      '{"value":true}',
    );
  });
});
