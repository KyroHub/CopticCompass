import { describe, expect, it, vi } from "vitest";

import {
  resolveAdminRagRouteAccess,
  type AdminRagRouteAccessDependencies,
  type AdminRagRouteAccessFailureResponses,
} from "./ragRouteAccess";

type FakeClient = {
  id: string;
};

type FakePayload = {
  error: string;
  success: false;
};

const failureResponses = {
  forbidden: {
    init: { status: 403 },
    payload: { success: false, error: "Forbidden." },
  },
  runtimeUnavailable: {
    init: { status: 503 },
    payload: { success: false, error: "Runtime unavailable." },
  },
  unauthenticated: {
    init: { status: 401 },
    payload: { success: false, error: "Unauthenticated." },
  },
} satisfies AdminRagRouteAccessFailureResponses<FakePayload>;

function createDependencies(
  overrides: Partial<AdminRagRouteAccessDependencies<FakeClient>> = {},
): AdminRagRouteAccessDependencies<FakeClient> {
  return {
    createClient: vi.fn(async () => ({ id: "client-1" })),
    getAuthenticatedUser: vi.fn(async () => ({ id: "user-1" })),
    getProfileRole: vi.fn(async () => "admin"),
    hasSupabaseRuntimeEnv: vi.fn(() => true),
    ...overrides,
  };
}

describe("admin RAG route access resolver", () => {
  it("returns the runtime-unavailable response before creating a client", async () => {
    const dependencies = createDependencies({
      hasSupabaseRuntimeEnv: vi.fn(() => false),
    });

    await expect(
      resolveAdminRagRouteAccess({
        dependencies,
        failureResponses,
      }),
    ).resolves.toEqual({
      response: failureResponses.runtimeUnavailable,
      success: false,
    });
    expect(dependencies.createClient).not.toHaveBeenCalled();
  });

  it("returns the unauthenticated response when no user is loaded", async () => {
    const dependencies = createDependencies({
      getAuthenticatedUser: vi.fn(async () => null),
    });

    await expect(
      resolveAdminRagRouteAccess({
        dependencies,
        failureResponses,
      }),
    ).resolves.toEqual({
      response: failureResponses.unauthenticated,
      success: false,
    });
    expect(dependencies.getProfileRole).not.toHaveBeenCalled();
  });

  it("returns the forbidden response for non-admin users", async () => {
    const dependencies = createDependencies({
      getProfileRole: vi.fn(async () => "user"),
    });

    await expect(
      resolveAdminRagRouteAccess({
        dependencies,
        failureResponses,
      }),
    ).resolves.toEqual({
      response: failureResponses.forbidden,
      success: false,
    });
    expect(dependencies.getProfileRole).toHaveBeenCalledWith(
      { id: "client-1" },
      "user-1",
    );
  });

  it("returns the authenticated admin user", async () => {
    const dependencies = createDependencies();

    await expect(
      resolveAdminRagRouteAccess({
        dependencies,
        failureResponses,
      }),
    ).resolves.toEqual({
      success: true,
      user: { id: "user-1" },
    });
  });
});
