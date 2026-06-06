import { describe, expect, it, vi } from "vitest";

import { getCopticDocumentVectorStatus } from "./copticDocumentVectorStatus";

import type { AppSupabaseClient } from "./queryTypes";

const fakeSupabase = {} as AppSupabaseClient;

describe("Coptic document vector status primitive", () => {
  it("reports a missing service-role environment without creating a client", async () => {
    const createServiceRoleClient = vi.fn(() => fakeSupabase);

    await expect(
      getCopticDocumentVectorStatus({
        createServiceRoleClient,
        hasServiceRoleEnv: () => false,
      }),
    ).resolves.toEqual({
      chunkCount: 0,
      healthy: false,
      note: "Service role key is missing",
    });
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("reports a healthy vector table count", async () => {
    await expect(
      getCopticDocumentVectorStatus({
        countDocuments: async () => ({ count: 42, error: null }),
        createServiceRoleClient: () => fakeSupabase,
        hasServiceRoleEnv: () => true,
      }),
    ).resolves.toEqual({
      chunkCount: 42,
      healthy: true,
    });
  });

  it("normalizes null counts to zero when the vector query succeeds", async () => {
    await expect(
      getCopticDocumentVectorStatus({
        countDocuments: async () => ({ count: null, error: null }),
        createServiceRoleClient: () => fakeSupabase,
        hasServiceRoleEnv: () => true,
      }),
    ).resolves.toEqual({
      chunkCount: 0,
      healthy: true,
    });
  });

  it("reports Supabase count errors as unhealthy", async () => {
    await expect(
      getCopticDocumentVectorStatus({
        countDocuments: async () => ({
          count: null,
          error: { message: "relation does not exist" },
        }),
        createServiceRoleClient: () => fakeSupabase,
        hasServiceRoleEnv: () => true,
      }),
    ).resolves.toEqual({
      chunkCount: 0,
      healthy: false,
      note: "relation does not exist",
    });
  });

  it("reports thrown vector status errors as unhealthy", async () => {
    await expect(
      getCopticDocumentVectorStatus({
        countDocuments: async () => {
          throw new Error("network unavailable");
        },
        createServiceRoleClient: () => fakeSupabase,
        hasServiceRoleEnv: () => true,
      }),
    ).resolves.toEqual({
      chunkCount: 0,
      healthy: false,
      note: "network unavailable",
    });
  });
});
