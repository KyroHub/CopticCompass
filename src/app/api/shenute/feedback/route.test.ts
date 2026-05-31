import { beforeEach, describe, expect, it, vi } from "vitest";

type LoadFeedbackRouteOptions = {
  hasEnv?: boolean;
  insertError?: unknown;
  ragError?: unknown;
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
  const ingestShenuteFeedbackLearningSignalMock = vi.fn(async () => {
    if (options?.ragError) {
      throw options.ragError;
    }
  });

  vi.doMock("@/features/profile/lib/server/queries", () => ({
    getProfileRole: getProfileRoleMock,
  }));
  vi.doMock("@/features/shenute/lib/server/feedbackIngestion", () => ({
    ingestShenuteFeedbackLearningSignal:
      ingestShenuteFeedbackLearningSignalMock,
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
    fromMock,
    getAuthenticatedUserMock,
    getProfileRoleMock,
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
    const { POST } = await loadFeedbackRoute({
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
    expect(JSON.stringify(payload)).not.toContain("vector store exploded");
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
