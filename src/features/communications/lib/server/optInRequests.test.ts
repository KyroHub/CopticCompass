import { beforeEach, describe, expect, it, vi } from "vitest";

type OptInModuleContext = {
  buildAudienceOptInConfirmationUrl: typeof import("./optInRequests").buildAudienceOptInConfirmationUrl;
  confirmAudienceOptInRequest: typeof import("./optInRequests").confirmAudienceOptInRequest;
  createAudienceOptInRequest: typeof import("./optInRequests").createAudienceOptInRequest;
  createServiceRoleClientMock: ReturnType<typeof vi.fn>;
  getAudienceOptInRequestPreview: typeof import("./optInRequests").getAudienceOptInRequestPreview;
  rpcMock: ReturnType<typeof vi.fn>;
  syncAudienceContactByIdToProviderMock: ReturnType<typeof vi.fn>;
};

async function loadOptInModule(options?: {
  confirmedRequest?: Record<string, unknown> | null;
  existingRequestByEmail?: Record<string, unknown> | null;
  insertData?: Record<string, unknown>;
  rpcResult?: Record<string, unknown>;
  tokenLookupRequest?: Record<string, unknown> | null;
  updateResponses?: Array<Record<string, unknown>>;
}) {
  vi.resetModules();

  const syncAudienceContactByIdToProviderMock = vi.fn().mockResolvedValue({
    id: "audience_123",
  });

  const selectEqMock = vi.fn((column: string) => ({
    maybeSingle: vi.fn().mockResolvedValue({
      data: (() => {
        if (column === "email") {
          return options?.existingRequestByEmail ?? null;
        }

        if (column === "token_hash") {
          return options?.tokenLookupRequest ?? null;
        }

        if (column === "id") {
          return options?.confirmedRequest ?? null;
        }

        return null;
      })(),
      error: null,
    }),
  }));

  const selectMock = vi.fn(() => ({ eq: selectEqMock }));
  const updateSingleMock = vi.fn().mockImplementation(() =>
    Promise.resolve({
      data: options?.updateResponses?.shift() ?? null,
      error: null,
    }),
  );
  const updateMock = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: updateSingleMock })),
    })),
  }));
  const insertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({
        data: options?.insertData ?? null,
        error: null,
      }),
    })),
  }));
  const rpcMock = vi.fn().mockResolvedValue({
    data: [
      options?.rpcResult ?? {
        audience_contact_id: null,
        request_id: null,
        status: "invalid",
      },
    ],
    error: null,
  });

  const createServiceRoleClientMock = vi.fn().mockReturnValue({
    from: vi.fn(() => ({
      insert: insertMock,
      select: selectMock,
      update: updateMock,
    })),
    rpc: rpcMock,
  });

  vi.doMock("@/features/communications/lib/server/audience", () => ({
    COMMUNICATIONS_POLICY_VERSION: "privacy-2026-06-22",
    syncAudienceContactByIdToProvider: syncAudienceContactByIdToProviderMock,
  }));
  vi.doMock("@/lib/supabase/serviceRole", () => ({
    createServiceRoleClient: createServiceRoleClientMock,
  }));

  const mod = await import("./optInRequests");
  return {
    ...mod,
    createServiceRoleClientMock,
    rpcMock,
    syncAudienceContactByIdToProviderMock,
  } satisfies OptInModuleContext;
}

const pendingRequest = {
  books_requested: true,
  confirmed_at: null,
  created_at: "2026-03-29T00:00:00.000Z",
  email: "reader@example.com",
  expires_at: "2099-04-05T00:00:00.000Z",
  full_name: "Reader Name",
  general_updates_requested: false,
  id: "request_2",
  lessons_requested: true,
  locale: "nl",
  source: "contact_form",
  token_hash: "hashed",
  updated_at: "2026-03-29T00:00:00.000Z",
};

describe("opt-in request helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a localized confirmation URL", async () => {
    const { buildAudienceOptInConfirmationUrl } = await loadOptInModule();
    expect(buildAudienceOptInConfirmationUrl("nl", "abc123")).toBe(
      "https://www.copticcompass.com/nl/communications/confirm?token=abc123",
    );
  });

  it("creates a pending request with exactly the selected topics", async () => {
    const { createAudienceOptInRequest, createServiceRoleClientMock } =
      await loadOptInModule({ insertData: pendingRequest });

    const result = await createAudienceOptInRequest({
      booksRequested: true,
      email: " READER@Example.com ",
      fullName: "  Reader Name ",
      generalUpdatesRequested: false,
      lessonsRequested: true,
      locale: "nl",
      source: "contact_form",
    });

    expect(result.request).toEqual(pendingRequest);
    expect(result.token.length).toBeGreaterThan(10);
    const supabase = createServiceRoleClientMock.mock.results[0]?.value;
    expect(supabase.from).toHaveBeenCalledWith("audience_opt_in_requests");
  });

  it("refreshes an existing pending request for the same email", async () => {
    const updatedRequest = { ...pendingRequest, token_hash: "new_hash" };
    const { createAudienceOptInRequest } = await loadOptInModule({
      existingRequestByEmail: pendingRequest,
      updateResponses: [updatedRequest],
    });

    const result = await createAudienceOptInRequest({
      booksRequested: true,
      email: "reader@example.com",
      fullName: "Reader Name",
      generalUpdatesRequested: false,
      lessonsRequested: true,
      locale: "nl",
      source: "contact_form",
    });

    expect(result.request).toEqual(updatedRequest);
  });

  it("previews a valid token without calling a mutation RPC", async () => {
    const { getAudienceOptInRequestPreview, rpcMock } = await loadOptInModule({
      tokenLookupRequest: pendingRequest,
    });

    await expect(
      getAudienceOptInRequestPreview("scanner-prefetched-token"),
    ).resolves.toEqual({
      request: pendingRequest,
      status: "pending",
      success: true,
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects malformed confirmation POSTs before database access", async () => {
    const { confirmAudienceOptInRequest, rpcMock } = await loadOptInModule();
    await expect(confirmAudienceOptInRequest("  ")).resolves.toEqual({
      request: null,
      status: "invalid",
      success: false,
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("confirms through the atomic RPC and then syncs the committed contact", async () => {
    const confirmedRequest = {
      ...pendingRequest,
      confirmed_at: "2026-03-29T12:00:00.000Z",
    };
    const {
      confirmAudienceOptInRequest,
      rpcMock,
      syncAudienceContactByIdToProviderMock,
    } = await loadOptInModule({
      confirmedRequest,
      rpcResult: {
        audience_contact_id: "audience_123",
        request_id: "request_2",
        status: "confirmed",
      },
    });

    await expect(confirmAudienceOptInRequest("valid-token")).resolves.toEqual({
      request: confirmedRequest,
      status: "confirmed",
      success: true,
    });
    expect(rpcMock).toHaveBeenCalledWith(
      "confirm_audience_opt_in_request",
      expect.objectContaining({
        p_policy_version: "privacy-2026-06-22",
      }),
    );
    expect(syncAudienceContactByIdToProviderMock).toHaveBeenCalledWith(
      "audience_123",
    );
  });
});
