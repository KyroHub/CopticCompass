import { beforeEach, describe, expect, it, vi } from "vitest";

type LoadFeedbackRouteOptions = {
  hasEnv?: boolean;
  hasRateLimitProtection?: boolean;
  insertError?: unknown;
  ragError?: unknown;
  rateLimitOk?: boolean;
  role?: "admin" | "student";
  user?: { id: string } | null;
};

function createFeedbackRequest(overrides?: Record<string, unknown>) {
  return new Request("https://www.copticcompass.com/api/shenute/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantMessageId: "assistant-1",
      assistantResponse: "Here is a useful answer.",
      inferenceProvider: "thoth",
      prompt: "Explain this Coptic form.",
      signal: "like",
      userMessageId: "user-message-1",
      ...overrides,
    }),
  });
}

async function loadFeedbackRoute(options?: LoadFeedbackRouteOptions) {
  vi.resetModules();

  const insertMock = vi.fn().mockResolvedValue({
    error: options?.insertError ?? null,
  });
  const fromMock = vi.fn((table: string) => {
    if (table !== "chat_feedback_events") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      insert: insertMock,
    };
  });
  const getAuthenticatedUserMock = vi
    .fn()
    .mockResolvedValue(
      options?.user === undefined ? { id: "user-1" } : options.user,
    );
  const getProfileRoleMock = vi
    .fn()
    .mockResolvedValue(options?.role ?? "student");
  const consumeRateLimitMock = vi.fn().mockResolvedValue({
    ok: options?.rateLimitOk ?? true,
    retryAfterMs: 60_000,
  });
  const getUserRateLimitIdentifierMock = vi.fn(
    (userId: string) => `hashed-${userId}`,
  );
  const ingestShenuteFeedbackLearningSignalMock = vi.fn(async () => {
    if (options?.ragError) {
      throw options.ragError;
    }
  });

  vi.doMock("@/lib/supabase/profileRole", () => ({
    getProfileRole: getProfileRoleMock,
  }));
  vi.doMock("@/features/shenute/lib/server/feedbackIngestion", () => ({
    ingestShenuteFeedbackLearningSignal:
      ingestShenuteFeedbackLearningSignalMock,
  }));
  vi.doMock("@/lib/rateLimit", () => ({
    consumeRateLimit: consumeRateLimitMock,
    getUserRateLimitIdentifier: getUserRateLimitIdentifierMock,
    hasAvailableRateLimitProtection: vi.fn(
      () => options?.hasRateLimitProtection ?? true,
    ),
  }));
  vi.doMock("@/lib/supabase/authQueries", () => ({
    getAuthenticatedUser: getAuthenticatedUserMock,
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseRuntimeEnv: vi.fn(() => options?.hasEnv ?? true),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({ from: fromMock }),
  }));

  const mod = await import("./route");

  return {
    ...mod,
    consumeRateLimitMock,
    fromMock,
    getAuthenticatedUserMock,
    getProfileRoleMock,
    getUserRateLimitIdentifierMock,
    ingestShenuteFeedbackLearningSignalMock,
    insertMock,
  };
}

describe("Shenute feedback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public validation copy for invalid feedback signals", async () => {
    const { insertMock, POST } = await loadFeedbackRoute();

    const response = await POST(createFeedbackRequest({ signal: "confusing" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      code: "validation_failed",
      error: "Could not read this feedback. Please try again.",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns stable auth codes without storing anonymous feedback", async () => {
    const { insertMock, POST } = await loadFeedbackRoute({ user: null });

    const response = await POST(createFeedbackRequest());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      code: "auth_required",
      error: "Please sign in to send feedback.",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("hides storage details when the feedback table is unavailable", async () => {
    const { POST } = await loadFeedbackRoute({
      insertError: {
        code: "42P01",
        message: "relation chat_feedback_events does not exist",
      },
    });

    const response = await POST(createFeedbackRequest());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      success: false,
      code: "storage_unavailable",
      error: "Feedback is temporarily unavailable. Please try again later.",
    });
    expect(payload.requestId).toMatch(/^feedback_/);
    expect(JSON.stringify(payload)).not.toContain(
      "relation chat_feedback_events does not exist",
    );
  });

  it("saves feedback when RAG learning warns and reports only a soft warning", async () => {
    const { consumeRateLimitMock, POST } = await loadFeedbackRoute({
      ragError: new Error("vector store exploded"),
    });

    const response = await POST(createFeedbackRequest({ signal: "dislike" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ragIngested: false,
      ragWarning: true,
      success: true,
    });
    expect(consumeRateLimitMock).toHaveBeenCalledWith({
      identifier: "hashed-user-1",
      limit: 20,
      namespace: "shenute:feedback",
      windowMs: 60 * 60 * 1000,
    });
    expect(JSON.stringify(payload)).not.toContain("vector store exploded");
  });

  it("rate limits authenticated feedback before storage or RAG ingestion", async () => {
    const {
      getProfileRoleMock,
      ingestShenuteFeedbackLearningSignalMock,
      insertMock,
      POST,
    } = await loadFeedbackRoute({
      rateLimitOk: false,
    });

    const response = await POST(createFeedbackRequest());
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(payload).toEqual({
      success: false,
      code: "rate_limited",
      error: "Too many attempts. Please wait a moment and try again.",
    });
    expect(getProfileRoleMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(ingestShenuteFeedbackLearningSignalMock).not.toHaveBeenCalled();
  });

  it("keeps admin feedback allowed but bounded by the same user rate limit", async () => {
    const { consumeRateLimitMock, insertMock, POST } = await loadFeedbackRoute({
      role: "admin",
    });

    const response = await POST(
      createFeedbackRequest({
        feedbackText: "This answer should cite a stronger source.",
        signal: "admin_feedback",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ragIngested: true,
      success: true,
    });
    expect(consumeRateLimitMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("returns public permission copy for non-admin written feedback", async () => {
    const { insertMock, POST } = await loadFeedbackRoute({ role: "student" });

    const response = await POST(
      createFeedbackRequest({
        feedbackText: "This answer should cite a stronger source.",
        signal: "admin_feedback",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      code: "permission_denied",
      error: "You do not have permission to send this feedback.",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
