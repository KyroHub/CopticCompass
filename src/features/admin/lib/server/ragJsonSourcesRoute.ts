import "server-only";
import crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { ingestRagFile } from "@/features/admin/lib/ragIngestion";
import type { RagIngestionLogEntry } from "@/features/admin/lib/ragIngestion";
import { getProfileRole } from "@/features/profile/lib/server/queries";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type JsonSourceIngestionFileResult = {
  chunksInserted?: number;
  error?: string;
  logs?: RagIngestionLogEntry[];
  sourcePath: string;
  success: boolean;
};

type JsonSourceIngestionResponse = {
  chunksInserted: number;
  embeddingProvider: "gemini" | "hf" | "openrouter";
  filesDiscovered: number;
  filesFailed: number;
  filesSucceeded: number;
  ingestId: string;
  message: string;
  results: JsonSourceIngestionFileResult[];
  success: boolean;
};

type JsonSourceIngestionRequest = {
  embeddingProvider?: "gemini" | "hf" | "openrouter";
  ingestId?: string;
};

const DATA_ROOT = path.join(process.cwd(), "public", "data");
console.warn(`[RAG:JSON] DATA_ROOT is: ${DATA_ROOT}`);
const DICTIONARY_JSON_PATH = path.join(DATA_ROOT, "dictionary.json");
const GRAMMAR_JSON_CANDIDATE_DIRECTORIES = [
  path.join(DATA_ROOT, "grammar", "v1"),
  path.join(DATA_ROOT, "grammar"),
];

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

async function collectJsonKnowledgeSourcePaths() {
  const sources = new Set<string>();

  try {
    await readFile(DICTIONARY_JSON_PATH, "utf-8");
    console.warn(`[RAG:JSON] Found dictionary file: ${DICTIONARY_JSON_PATH}`);
    sources.add(DICTIONARY_JSON_PATH);
  } catch (_e) {
    console.warn(
      `[RAG:JSON] Dictionary file NOT found: ${DICTIONARY_JSON_PATH}`,
    );
  }

  for (const grammarDirectoryPath of GRAMMAR_JSON_CANDIDATE_DIRECTORIES) {
    try {
      console.warn(
        `[RAG:JSON] Checking grammar directory: ${grammarDirectoryPath}`,
      );
      const grammarFiles =
        await collectJsonFilesRecursively(grammarDirectoryPath);
      console.warn(
        `[RAG:JSON] Found ${grammarFiles.length} files in ${grammarDirectoryPath}`,
      );
      for (const grammarFile of grammarFiles) {
        sources.add(grammarFile);
      }
    } catch (_e) {
      console.warn(
        `[RAG:JSON] Error checking grammar directory ${grammarDirectoryPath}: ${_e}`,
      );
    }
  }

  const result = Array.from(sources).sort((left, right) =>
    left.localeCompare(right),
  );
  console.warn(`[RAG:JSON] Final collected sources count: ${result.length}`);
  return result;
}

function buildSourceTitle(sourcePath: string) {
  const relativePath = path
    .relative(DATA_ROOT, sourcePath)
    .split(path.sep)
    .join("/");
  return `JSON Source: data/${relativePath}`;
}

function toProvider(value: unknown): "gemini" | "hf" | "openrouter" {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  return "hf";
}

export async function handleAdminRagJsonSourcesPost(request: Request) {
  let ingestId = "initial";
  try {
    ingestId = crypto.randomUUID?.() || `local-${Date.now()}`;
  } catch {
    ingestId = `local-${Date.now()}`;
  }

  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        {
          success: false,
          error: "RAG ingestion is unavailable right now.",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to ingest files.",
        },
        { status: 401 },
      );
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can ingest RAG documents.",
        },
        { status: 403 },
      );
    }

    const requestBody = (await request
      .json()
      .catch(() => ({}))) as JsonSourceIngestionRequest;
    const requestedIngestId = requestBody.ingestId;
    if (
      typeof requestedIngestId === "string" &&
      requestedIngestId.trim().length > 0
    ) {
      ingestId = requestedIngestId.trim();
    }
    const embeddingProvider = toProvider(requestBody.embeddingProvider);

    const sourcePaths = await collectJsonKnowledgeSourcePaths();
    console.warn(`[RAG:JSON] Discovered ${sourcePaths.length} sources.`);

    if (sourcePaths.length === 0) {
      console.warn(`[RAG:JSON] No sources found in DATA_ROOT: ${DATA_ROOT}`);
      return NextResponse.json(
        {
          success: false,
          error:
            "No dictionary or grammar JSON files were found under public/data.",
          ingestId,
        },
        { status: 400 },
      );
    }

    const results: JsonSourceIngestionFileResult[] = [];
    let chunksInserted = 0;

    for (let index = 0; index < sourcePaths.length; index += 1) {
      const sourcePath = sourcePaths[index];

      try {
        const content = await readFile(sourcePath, "utf-8");
        if (content.trim().length === 0) {
          results.push({
            success: false,
            sourcePath: buildSourceTitle(sourcePath),
            error: "File is empty.",
          });
          continue;
        }

        const file = new File([content], path.basename(sourcePath), {
          type: "application/json",
        });

        const result = await ingestRagFile({
          embeddingProvider,
          enableOcr: false,
          file,
          ingestId: `${ingestId}-${index + 1}`,
          jsonChunkMode: "compact",
          skipThothEnrichment: true,
          skipThothProofcheck: true,
          sourceTitle: buildSourceTitle(sourcePath),
          userId: user.id,
        });

        if (!result.success) {
          results.push({
            success: false,
            sourcePath: buildSourceTitle(sourcePath),
            error: result.error ?? "Ingestion failed for this source file.",
            logs: result.logs,
          });
          continue;
        }

        const insertedForFile = result.chunksInserted ?? 0;
        chunksInserted += insertedForFile;
        results.push({
          success: true,
          sourcePath: buildSourceTitle(sourcePath),
          chunksInserted: insertedForFile,
          logs: result.logs,
        });
      } catch (error) {
        results.push({
          success: false,
          sourcePath: buildSourceTitle(sourcePath),
          error:
            error instanceof Error ? error.message : "Unknown ingestion error.",
        });
      }
    }

    const filesSucceeded = results.filter((result) => result.success).length;
    const filesFailed = results.length - filesSucceeded;

    const responsePayload: JsonSourceIngestionResponse = {
      success: filesSucceeded > 0,
      ingestId,
      embeddingProvider,
      filesDiscovered: sourcePaths.length,
      filesSucceeded,
      filesFailed,
      chunksInserted,
      message:
        filesFailed === 0
          ? `Ingested ${chunksInserted} chunks from ${filesSucceeded} JSON sources.`
          : `Ingested ${chunksInserted} chunks from ${filesSucceeded}/${sourcePaths.length} JSON sources. ${filesFailed} failed.`,
      results,
    };

    if (filesSucceeded === 0) {
      return NextResponse.json(responsePayload, { status: 500 });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not ingest JSON knowledge sources.",
        ingestId,
      },
      { status: 500 },
    );
  }
}
