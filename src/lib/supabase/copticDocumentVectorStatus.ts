import { assertServerOnly } from "@/lib/server/assertServerOnly";
import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";

type CountCopticDocumentsResult = {
  count: number | null;
  error: { message: string } | null;
};

export type CopticDocumentVectorStatus = {
  chunkCount: number;
  healthy: boolean;
  note?: string;
};

type CopticDocumentVectorStatusDependencies = {
  countDocuments: (
    supabase: AppSupabaseClient,
  ) => Promise<CountCopticDocumentsResult>;
  createServiceRoleClient: () => AppSupabaseClient;
  hasServiceRoleEnv: () => boolean;
};

async function getDefaultHasServiceRoleEnv() {
  const { hasSupabaseServiceRoleEnv } = await import("./config");

  return hasSupabaseServiceRoleEnv;
}

async function getDefaultVectorStatusDependencies() {
  const [{ countCopticDocuments }, { createServiceRoleClient }] =
    await Promise.all([import("./copticDocuments"), import("./serviceRole")]);

  return {
    countDocuments: countCopticDocuments,
    createServiceRoleClient,
  };
}

function toVectorStatusErrorNote(error: unknown) {
  return error instanceof Error ? error.message : "Unknown DB error";
}

async function resolveHasServiceRoleEnv(
  dependencies: Partial<CopticDocumentVectorStatusDependencies>,
) {
  return (
    dependencies.hasServiceRoleEnv ?? (await getDefaultHasServiceRoleEnv())
  );
}

async function resolveVectorStatusDependencies(
  dependencies: Partial<CopticDocumentVectorStatusDependencies>,
) {
  if (dependencies.countDocuments && dependencies.createServiceRoleClient) {
    return {
      countDocuments: dependencies.countDocuments,
      createServiceRoleClient: dependencies.createServiceRoleClient,
    };
  }

  const defaults = await getDefaultVectorStatusDependencies();

  return {
    countDocuments: dependencies.countDocuments ?? defaults.countDocuments,
    createServiceRoleClient:
      dependencies.createServiceRoleClient ?? defaults.createServiceRoleClient,
  };
}

function getMissingServiceRoleVectorStatus(): CopticDocumentVectorStatus {
  return {
    chunkCount: 0,
    healthy: false,
    note: "Service role key is missing",
  };
}

function toVectorCountStatus(
  count: number | null,
  error: CountCopticDocumentsResult["error"],
): CopticDocumentVectorStatus {
  if (error) {
    return {
      chunkCount: 0,
      healthy: false,
      note: error.message,
    };
  }

  return {
    chunkCount: count ?? 0,
    healthy: true,
  };
}

export async function getCopticDocumentVectorStatus(
  dependencies: Partial<CopticDocumentVectorStatusDependencies> = {},
): Promise<CopticDocumentVectorStatus> {
  assertServerOnly("getCopticDocumentVectorStatus");

  const hasServiceRoleEnv = await resolveHasServiceRoleEnv(dependencies);

  if (!hasServiceRoleEnv()) {
    return getMissingServiceRoleVectorStatus();
  }

  try {
    const { countDocuments, createServiceRoleClient } =
      await resolveVectorStatusDependencies(dependencies);
    const serviceRoleClient = createServiceRoleClient();
    const { count, error } = await countDocuments(serviceRoleClient);

    return toVectorCountStatus(count, error);
  } catch (error) {
    return {
      chunkCount: 0,
      healthy: false,
      note: toVectorStatusErrorNote(error),
    };
  }
}
