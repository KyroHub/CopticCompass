import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getDictionaryJsonStatus,
  getGrammarJsonStatus,
  getRagJsonSourceStatuses,
} from "./ragJsonSourceStatus";

const tempRoots: string[] = [];

async function createTempRoot() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "rag-json-status-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

function getDataRoot(tempRoot: string) {
  return path.join(tempRoot, "public", "data");
}

describe("RAG JSON source status primitives", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots
        .splice(0)
        .map((tempRoot) => rm(tempRoot, { force: true, recursive: true })),
    );
  });

  it("reports dictionary JSON entry counts", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = getDataRoot(tempRoot);

    await mkdir(dataRoot, { recursive: true });
    await writeFile(
      path.join(dataRoot, "dictionary.json"),
      JSON.stringify([{ id: 1 }, { id: 2 }]),
    );

    await expect(
      getDictionaryJsonStatus({ dataRoot, projectRoot: tempRoot }),
    ).resolves.toEqual({
      healthy: true,
      label: "Dictionary JSON RAG",
      note: "2 source entries available",
    });
  });

  it("reports missing dictionary JSON files as unhealthy", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = getDataRoot(tempRoot);
    const status = await getDictionaryJsonStatus({
      dataRoot,
      projectRoot: tempRoot,
    });

    expect(status.healthy).toBe(false);
    expect(status.label).toBe("Dictionary JSON RAG");
    expect(status.note).toContain("ENOENT");
  });

  it("reports grammar JSON files from the first populated candidate directory", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = getDataRoot(tempRoot);
    const grammarV1Root = path.join(dataRoot, "grammar", "v1");
    const nestedRoot = path.join(grammarV1Root, "nested");

    await mkdir(nestedRoot, { recursive: true });
    await writeFile(path.join(grammarV1Root, "lesson.json"), "{}");
    await writeFile(path.join(nestedRoot, "deep.JSON"), "{}");
    await writeFile(path.join(grammarV1Root, "notes.txt"), "not json");

    await expect(
      getGrammarJsonStatus({ dataRoot, projectRoot: tempRoot }),
    ).resolves.toEqual({
      healthy: true,
      label: "Grammar JSON RAG",
      note: "2 JSON files available in public/data/grammar/v1",
    });
  });

  it("falls through to the broader grammar directory when v1 is empty", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = getDataRoot(tempRoot);
    const grammarV1Root = path.join(dataRoot, "grammar", "v1");

    await mkdir(grammarV1Root, { recursive: true });
    await writeFile(path.join(dataRoot, "grammar", "overview.json"), "{}");

    await expect(
      getGrammarJsonStatus({ dataRoot, projectRoot: tempRoot }),
    ).resolves.toEqual({
      healthy: true,
      label: "Grammar JSON RAG",
      note: "1 JSON files available in public/data/grammar",
    });
  });

  it("reports the last found empty grammar candidate", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = getDataRoot(tempRoot);

    await mkdir(path.join(dataRoot, "grammar", "v1"), { recursive: true });

    await expect(
      getGrammarJsonStatus({ dataRoot, projectRoot: tempRoot }),
    ).resolves.toEqual({
      healthy: false,
      label: "Grammar JSON RAG",
      note: "No grammar JSON files found under public/data/grammar",
    });
  });

  it("returns dictionary and grammar statuses together", async () => {
    const tempRoot = await createTempRoot();
    const dataRoot = getDataRoot(tempRoot);
    const grammarV1Root = path.join(dataRoot, "grammar", "v1");

    await mkdir(grammarV1Root, { recursive: true });
    await writeFile(path.join(dataRoot, "dictionary.json"), "{}");
    await writeFile(path.join(grammarV1Root, "lesson.json"), "{}");

    await expect(
      getRagJsonSourceStatuses({ dataRoot, projectRoot: tempRoot }),
    ).resolves.toEqual({
      dictionaryJsonRag: {
        healthy: true,
        label: "Dictionary JSON RAG",
        note: "0 source entries available",
      },
      grammarJsonRag: {
        healthy: true,
        label: "Grammar JSON RAG",
        note: "1 JSON files available in public/data/grammar/v1",
      },
    });
  });
});
