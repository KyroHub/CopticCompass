import { NextResponse } from "next/server";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getProfileRole } from "@/features/profile/lib/server/queries";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import {
  hasSupabaseRuntimeEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase/config";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type StatusItem = {
  healthy: boolean;
  label: string;
  note?: string;
};

type RagStatusResponse = {
  checkedAt: string;
  chunkCount: number;
  statuses: {
    embeddingModel: StatusItem;
    grammarJsonRag: StatusItem;
    dictionaryJsonRag: StatusItem;
    knowledgeBase: StatusItem;
    llm: StatusItem;
    vectorDb: StatusItem;
  };
  success: boolean;
};

function getDictionaryPath() {
  return path.join(process.cwd(), "public", "data", "dictionary.json");
}

function getGrammarDirectoryCandidates() {
  return [
    path.join(process.cwd(), "public", "data", "grammar", "v1"),
    path.join(process.cwd(), "public", "data", "grammer", "v1"),
    path.join(process.cwd(), "public", "data", "grammer"),
    path.join(process.cwd(), "public", "data", "grammar"),
  ];
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

async function getDictionaryJsonStatus(): Promise<StatusItem> {
  const dictionaryPath = getDictionaryPath();

  try {
    await access(dictionaryPath);
    const fileContent = await readFile(dictionaryPath, "utf-8");
    const parsed = JSON.parse(fileContent);

    const entryCount = Array.isArray(parsed)
      ? parsed.length
      : typeof parsed === "object" && parsed !== null
        ? Object.keys(parsed).length
        : 0;

    return {
      healthy: true,
      label: "Dictionary JSON RAG",
      note: `${new Intl.NumberFormat("en-US").format(entryCount)} source entries available`,
    };
  } catch (error) {
    return {
      healthy: false,
      label: "Dictionary JSON RAG",
      note:
        error instanceof Error
          ? error.message
          : "Dictionary JSON source is unavailable",
    };
  }
}

async function getGrammarJsonStatus(): Promise<StatusItem> {
  let foundDirectory = false;
  let foundDirectoryLabel = "";
  let lastErrorMessage = "Grammar JSON source is unavailable";

  for (const grammarDirectoryPath of getGrammarDirectoryCandidates()) {
    try {
      const jsonFileCount =
        await countJsonFilesRecursively(grammarDirectoryPath);
      foundDirectory = true;
      foundDirectoryLabel = path
        .relative(process.cwd(), grammarDirectoryPath)
        .split(path.sep)
        .join("/");

      if (jsonFileCount === 0) {
        continue;
      }

      return {
        healthy: true,
        label: "Grammar JSON RAG",
        note: `${new Intl.NumberFormat("en-US").format(jsonFileCount)} JSON files available in ${foundDirectoryLabel}`,
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
      label: "Grammar JSON RAG",
      note: `No grammar JSON files found under ${foundDirectoryLabel}`,
    };
  }

  return {
    healthy: false,
    label: "Grammar JSON RAG",
    note: lastErrorMessage,
  };
}

function getAvailableProviderLabel() {
  const providers: string[] = [];

  if (process.env.HF_TOKEN) {
    providers.push("Hugging Face");
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push("Gemini");
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push("OpenRouter");
  }

  if (providers.length === 0) {
    return "No LLM providers configured";
  }

  return providers.join(" + ");
}

function buildUnavailableResponse(): RagStatusResponse {
  return {
    success: false,
    checkedAt: new Date().toISOString(),
    chunkCount: 0,
    statuses: {
      llm: {
        healthy: false,
        label: "LLM model",
        note: "Supabase runtime env is unavailable",
      },
      embeddingModel: {
        healthy: false,
        label: "Embedding model",
        note: "Supabase runtime env is unavailable",
      },
      dictionaryJsonRag: {
        healthy: false,
        label: "Dictionary JSON RAG",
        note: "Supabase runtime env is unavailable",
      },
      grammarJsonRag: {
        healthy: false,
        label: "Grammar JSON RAG",
        note: "Supabase runtime env is unavailable",
      },
      vectorDb: {
        healthy: false,
        label: "Vector database",
        note: "Supabase runtime env is unavailable",
      },
      knowledgeBase: {
        healthy: false,
        label: "Knowledge base",
      },
    },
  };
}

export async function GET() {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(buildUnavailableResponse(), { status: 503 });
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to view RAG status.",
        },
        { status: 401 },
      );
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can view RAG status.",
        },
        { status: 403 },
      );
    }

    const llmConfigured = Boolean(
      process.env.HF_TOKEN ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENROUTER_API_KEY,
    );
    const embeddingConfigured = Boolean(
      process.env.HF_TOKEN ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENROUTER_API_KEY,
    );

    let chunkCount = 0;
    let vectorDbHealthy = false;
    let vectorDbNote: string | undefined;

    if (!hasSupabaseServiceRoleEnv()) {
      vectorDbNote = "Service role key is missing";
    } else {
      try {
        const serviceRoleClient = createServiceRoleClient();
        const { count, error } = await serviceRoleClient
          .from("coptic_documents")
          .select("id", { count: "exact", head: true });

        if (error) {
          vectorDbNote = error.message;
        } else {
          vectorDbHealthy = true;
          chunkCount = count ?? 0;
        }
      } catch (error) {
        vectorDbNote =
          error instanceof Error ? error.message : "Unknown DB error";
      }
    }

    const knowledgeBaseHealthy = vectorDbHealthy && chunkCount > 0;
    const [dictionaryJsonRag, grammarJsonRag] = await Promise.all([
      getDictionaryJsonStatus(),
      getGrammarJsonStatus(),
    ]);

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      chunkCount,
      statuses: {
        llm: {
          healthy: llmConfigured,
          label: "LLM model",
          note: getAvailableProviderLabel(),
        },
        embeddingModel: {
          healthy: embeddingConfigured,
          label: "Embedding model",
          note: embeddingConfigured
            ? "Provider token available"
            : "No provider token found",
        },
        dictionaryJsonRag,
        grammarJsonRag,
        vectorDb: {
          healthy: vectorDbHealthy,
          label: "Vector database",
          note: vectorDbHealthy ? "Supabase pgvector online" : vectorDbNote,
        },
        knowledgeBase: {
          healthy: knowledgeBaseHealthy,
          label: "Knowledge base",
          note:
            chunkCount > 0
              ? `${new Intl.NumberFormat("en-US").format(chunkCount)} chunks indexed`
              : "No chunks indexed yet",
        },
      },
    } satisfies RagStatusResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Could not load RAG status.",
      },
      { status: 500 },
    );
  }
}
