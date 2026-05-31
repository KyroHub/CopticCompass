import { beforeEach, describe, expect, it, vi } from "vitest";

type OptInModuleContext = {
  buildAudienceOptInConfirmationUrl: typeof import("./optInRequests").buildAudienceOptInConfirmationUrl;
  confirmAudienceOptInRequest: typeof import("./optInRequests").confirmAudienceOptInRequest;
  createAudienceOptInRequest: typeof import("./optInRequests").createAudienceOptInRequest;
  createServiceRoleClientMock: ReturnType<typeof vi.fn>;
  syncAudienceContactMock: ReturnType<typeof vi.fn>;
};

async function loadOptInModule(options?: {
  existingRequestByEmail?: Record<string, unknown> | null;
  tokenLookupRequest?: Record<string, unknown> | null;
  insertData?: Record<string, unknown>;
  updateResponses?: Array<Record<string, unknown>>;
}) {
  vi.resetModules();

  const syncAudienceContactMock = vi.fn().mockResolvedValue({
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

        return null;
      })(),
      error: null,
    }),
  }));

  const selectMock = vi.fn(() => ({
    eq: selectEqMock,
  }));

  const updateSingleMock = vi.fn().mockImplementation(() =>
    Promise.resolve({
      data: options?.updateResponses?.shift() ?? null,
      error: null,
    }),
  );

  const updateEqMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: updateSingleMock,
    })),
  }));

  const updateMock = vi.fn(() => ({
    eq: updateEqMock,
  }));

  const insertSingleMock = vi.fn().mockResolvedValue({
    data: options?.insertData ?? null,
    error: null,
  });

  const insertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: insertSingleMock,
    })),
  }));

  const createServiceRoleClientMock = vi.fn().mockReturnValue({
    from: vi.fn(() => ({
      insert: insertMock,
      select: selectMock,
      update: updateMock,
    })),
  });

  vi.doMock("@/features/communications/lib/server/audience", () => ({
    syncAudienceContact: syncAudienceContactMock,
  }));
  vi.doMock("@/lib/supabase/serviceRole", () => ({
    createServiceRoleClient: createServiceRoleClientMock,
  }));

  const mod = await import("./optInRequests");

  return {
    ...mod,
    createServiceRoleClientMock,
    syncAudienceContactMock,
  } satisfies OptInModuleContext;
}

describe("opt-in request helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a localized confirmation URL", async () => {
    const { buildAudienceOptInConfirmationUrl } = await loadOptInModule();

    expect(buildAudienceOptInConfirmationUrl("nl", "abc123")).toBe(
      "https://www.copticcompass.com/nl/communications/confirm?token=abc123",
    );
  });

  it("creates a pending opt-in request for a new email", async () => {
    const insertedRequest = {
      id: "request_1",
      email: "reader@example.com",
      full_name: "Reader Name",
      locale: "nl",
      source: "contact_form",
      lessons_requested: true,
      books_requested: true,
      general_updates_requested: true,
      token_hash: "hashed",
      expires_at: "2026-04-05T00:00:00.000Z",
      confirmed_at: null,
      created_at: "2026-03-29T00:00:00.000Z",
      updated_at: "2026-03-29T00:00:00.000Z",
    };
    const { createAudienceOptInRequest, createServiceRoleClientMock } =
      await loadOptInModule({
        insertData: insertedRequest,
      });

    const result = await createAudienceOptInRequest({
      booksRequested: true,
      email: " READER@Example.com ",
      fullName: "  Reader Name ",
      generalUpdatesRequested: true,
      lessonsRequested: true,
      locale: "nl",
      source: "contact_form",
    });

    expect(result.request).toEqual(insertedRequest);
    expect(result.token).toEqual(expect.any(String));
    expect(result.token.length).toBeGreaterThan(10);

    const supabase = createServiceRoleClientMock.mock.results[0]?.value;
    const fromMock = supabase.from as ReturnType<typeof vi.fn>;
    expect(fromMock).toHaveBeenCalledWith("audience_opt_in_requests");
  });

  it("updates an existing pending request for the same email", async () => {
    const existingRequest = {
      id: 3020505508,
      email: "reader@example.com",
      full_name: "Reader Name",
      locale: "en",
      source: "contact_form",
      lessons_requested: false,
      books_requested: false,
      general_updates_requested: false,
      token_hash: "old_hash",
      expires_at: "2026-03-30T00:00:00.000Z",
      confirmed_at: null,
      created_at: "2026-03-28T00:00:00.000Z",
      updated_at: "2026-03-28T00:00:00.000Z",
    };
    const updatedRequest = {
      ...existingRequest,
      books_requested: true,
      general_updates_requested: true,
      lessons_requested: true,
      locale: "nl",
      token_hash: "new_hash",
      updated_at: "2026-03-29T00:00:00.000Z",
    };
    const { createAudienceOptInRequest } = await loadOptInModule({
      existingRequestByEmail: existingRequest,
      updateResponses: [updatedRequest],
    });

    const result = await createAudienceOptInRequest({
      booksRequested: true,
      email: "reader@example.com",
      fullName: "Reader Name",
      generalUpdatesRequested: true,
      lessonsRequested: true,
      locale: "nl",
      source: "contact_form",
    });

    expect(result.request).toEqual(updatedRequest);
    expect(result.token).toEqual(expect.any(String));
  });

  it("rejects invalid confirmation tokens", async () => {
    const { confirmAudienceOptInRequest, syncAudienceContactMock } =
      await loadOptInModule();

    await expect(confirmAudienceOptInRequest("bad-token")).resolves.toEqual({
      request: null,
      status: "invalid",
      success: false,
    });

    expect(syncAudienceContactMock).not.toHaveBeenCalled();
  });

  it("confirms a valid token and only then syncs audience preferences", async () => {
    const tokenLookupRequest = {
      id: "request_2",
      email: "reader@example.com",
      full_name: "Reader Name",
      locale: "nl",
      source: "contact_form",
      lessons_requested: true,
      books_requested: true,
      general_updates_requested: true,
      token_hash: "hashed",
      expires_at: "2099-04-05T00:00:00.000Z",
      confirmed_at: null,
      created_at: "2026-03-29T00:00:00.000Z",
      updated_at: "2026-03-29T00:00:00.000Z",
    };
    const confirmedRequest = {
      ...tokenLookupRequest,
      confirmed_at: "2026-03-29T12:00:00.000Z",
      updated_at: "2026-03-29T12:00:00.000Z",
    };
    const { confirmAudienceOptInRequest, syncAudienceContactMock } =
      await loadOptInModule({
        tokenLookupRequest,
        updateResponses: [confirmedRequest],
      });

    const result = await confirmAudienceOptInRequest("valid-token");

    expect(result).toEqual({
      request: confirmedRequest,
      status: "confirmed",
      success: true,
    });
    expect(syncAudienceContactMock).toHaveBeenCalledWith({
      booksOptIn: true,
      email: "reader@example.com",
      fullName: "Reader Name",
      generalUpdatesOptIn: true,
      lessonsOptIn: true,
      locale: "nl",
      source: "contact_form",
    });
  });
});
