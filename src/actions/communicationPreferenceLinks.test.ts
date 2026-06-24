import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadPreferenceAction(options?: {
  contactExists?: boolean;
  rateLimitOk?: boolean;
}) {
  vi.resetModules();

  const createAudiencePreferenceRequestMock = vi.fn().mockResolvedValue(
    options?.contactExists === false
      ? null
      : {
          contact: { full_name: "Reader" },
          request: { id: "request_123" },
          token: "private-token",
        },
  );
  const consumeRateLimitMock = vi.fn().mockResolvedValue({
    ok: options?.rateLimitOk ?? true,
    remaining: 2,
    resetAt: Date.now() + 60_000,
    retryAfterMs: 60_000,
  });
  const queueLoggedNotificationEmailMock = vi.fn().mockResolvedValue({
    eventId: "event_123",
    jobId: "job_123",
    success: true,
  });

  vi.doMock("next/navigation", () => ({ redirect: vi.fn() }));
  vi.doMock("@/features/communications/lib/server/audience", () => ({
    applyAudiencePreferences: vi.fn(),
    COMMUNICATIONS_POLICY_VERSION: "privacy-2026-06-22",
  }));
  vi.doMock("@/features/communications/lib/server/optInRequests", () => ({
    confirmAudienceOptInRequest: vi.fn(),
  }));
  vi.doMock("@/features/communications/lib/server/preferenceRequests", () => ({
    applyAudiencePreferenceRequest: vi.fn(),
    buildAudiencePreferenceUrl: vi.fn(
      () =>
        "https://example.com/en/communications/preferences?token=private-token",
    ),
    createAudiencePreferenceRequest: createAudiencePreferenceRequestMock,
  }));
  vi.doMock("@/features/profile/lib/server/queries", () => ({
    getProfile: vi.fn(),
  }));
  vi.doMock("@/lib/notifications/events", () => ({
    queueLoggedNotificationEmail: queueLoggedNotificationEmailMock,
  }));
  vi.doMock("@/lib/rateLimit", () => ({
    consumeRateLimit: consumeRateLimitMock,
    getClientRateLimitIdentifier: vi.fn().mockResolvedValue("client-hash"),
    getSensitiveRateLimitIdentifier: vi.fn(() => "email-hash"),
    hasAvailableRateLimitProtection: vi.fn(() => true),
  }));
  vi.doMock("@/lib/supabase/auth", () => ({
    getAuthenticatedServerContext: vi.fn(),
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseServiceRoleEnv: vi.fn(() => true),
  }));

  const mod = await import("./communications");
  return {
    ...mod,
    consumeRateLimitMock,
    createAudiencePreferenceRequestMock,
    queueLoggedNotificationEmailMock,
  };
}

function createRequestForm(email: string) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("locale", "en");
  return formData;
}

describe("public communication preference link action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the same response for present and absent contacts", async () => {
    const present = await loadPreferenceAction({ contactExists: true });
    const presentResult = await present.requestAudiencePreferenceLink(
      null,
      createRequestForm("reader@example.com"),
    );
    expect(present.queueLoggedNotificationEmailMock).toHaveBeenCalledOnce();

    const absent = await loadPreferenceAction({ contactExists: false });
    const absentResult = await absent.requestAudiencePreferenceLink(
      null,
      createRequestForm("unknown@example.com"),
    );
    expect(absent.queueLoggedNotificationEmailMock).not.toHaveBeenCalled();
    expect(absentResult).toEqual(presentResult);
  });

  it("rate limits by both client and normalized email hash", async () => {
    const {
      consumeRateLimitMock,
      createAudiencePreferenceRequestMock,
      requestAudiencePreferenceLink,
    } = await loadPreferenceAction({ rateLimitOk: false });

    await expect(
      requestAudiencePreferenceLink(
        null,
        createRequestForm(" READER@Example.com "),
      ),
    ).resolves.toMatchObject({ success: true });

    expect(consumeRateLimitMock).toHaveBeenCalledTimes(2);
    expect(consumeRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "client-hash",
        namespace: "audience-preferences-client",
      }),
    );
    expect(consumeRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "email-hash",
        namespace: "audience-preferences-email",
      }),
    );
    expect(createAudiencePreferenceRequestMock).not.toHaveBeenCalled();
  });
});
