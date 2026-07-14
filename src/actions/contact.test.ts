import { beforeEach, describe, expect, it, vi } from "vitest";

type ContactModuleContext = {
  buildAudienceOptInConfirmationUrlMock: ReturnType<typeof vi.fn>;
  consumeRateLimitMock: ReturnType<typeof vi.fn>;
  createAudienceOptInRequestMock: ReturnType<typeof vi.fn>;
  createServiceRoleClientMock: ReturnType<typeof vi.fn>;
  getClientRateLimitIdentifierMock: ReturnType<typeof vi.fn>;
  hasSupabaseServiceRoleEnvMock: ReturnType<typeof vi.fn>;
  insertMock: ReturnType<typeof vi.fn>;
  insertSingleMock: ReturnType<typeof vi.fn>;
  queueLoggedNotificationEmailMock: ReturnType<typeof vi.fn>;
  sendContactEmail: typeof import("./contact").sendContactEmail;
};

const ORIGINAL_ENV = {
  CONTACT_EMAIL: process.env.CONTACT_EMAIL,
};

function createContactFormData(
  overrides?: Partial<
    Record<
      "email" | "inquiryType" | "locale" | "message" | "name" | "website",
      string
    > & {
      booksUpdates: boolean;
      generalUpdates: boolean;
      lessonsUpdates: boolean;
    }
  >,
) {
  const formData = new FormData();
  formData.set("name", overrides?.name ?? "Kyrillos Wannes");
  formData.set("email", overrides?.email ?? "sender@example.com");
  formData.set("inquiryType", overrides?.inquiryType ?? "dictionary_feedback");
  formData.set("locale", overrides?.locale ?? "en");
  formData.set("message", overrides?.message ?? "Hello from the test suite.");

  if (overrides?.website !== undefined) {
    formData.set("website", overrides.website);
  }

  if (overrides?.booksUpdates) {
    formData.set("updates_books", "true");
  }

  if (overrides?.generalUpdates) {
    formData.set("updates_general", "true");
  }

  if (overrides?.lessonsUpdates) {
    formData.set("updates_lessons", "true");
  }

  return formData;
}

async function loadContactModule(options?: {
  contactEmail?: string | null;
  hasRateLimitProtection?: boolean;
  hasStorageEnv?: boolean;
  insertError?: {
    code?: string;
    details?: string | null;
    hint?: string | null;
    message?: string;
  } | null;
  notificationResult?:
    | { error: string; success: false }
    | { eventId: string; jobId: string; success: true };
  rateLimitOk?: boolean;
}) {
  vi.resetModules();

  if (options?.contactEmail === null) {
    delete process.env.CONTACT_EMAIL;
  } else {
    process.env.CONTACT_EMAIL = options?.contactEmail ?? "owner@example.com";
  }

  const consumeRateLimitMock = vi.fn().mockResolvedValue({
    ok: options?.rateLimitOk ?? true,
    remaining: 1,
    resetAt: Date.now() + 60_000,
    retryAfterMs: 60_000,
  });
  const getClientRateLimitIdentifierMock = vi
    .fn()
    .mockResolvedValue("client-fingerprint");
  const insertSingleMock = vi.fn().mockResolvedValue({
    data: { id: "contact_123" },
    error: options?.insertError ?? null,
  });
  const insertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: insertSingleMock,
    })),
  }));
  const createServiceRoleClientMock = vi.fn().mockReturnValue({
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  });
  const buildAudienceOptInConfirmationUrlMock = vi
    .fn()
    .mockReturnValue(
      "https://example.com/en/communications/confirm?token=test-token",
    );
  const createAudienceOptInRequestMock = vi.fn().mockResolvedValue({
    request: {
      id: "opt_in_123",
    },
    token: "test-token",
  });
  const hasSupabaseServiceRoleEnvMock = vi
    .fn()
    .mockReturnValue(options?.hasStorageEnv ?? true);
  const queueLoggedNotificationEmailMock = vi.fn().mockResolvedValue(
    options?.notificationResult ?? {
      eventId: "event_123",
      jobId: "job_123",
      success: true,
    },
  );

  vi.doMock("@/lib/rateLimit", () => ({
    consumeRateLimit: consumeRateLimitMock,
    getClientRateLimitIdentifier: getClientRateLimitIdentifierMock,
    hasAvailableRateLimitProtection: vi.fn(
      () => options?.hasRateLimitProtection ?? true,
    ),
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseServiceRoleEnv: hasSupabaseServiceRoleEnvMock,
  }));
  vi.doMock("@/lib/supabase/serviceRole", () => ({
    createServiceRoleClient: createServiceRoleClientMock,
  }));
  vi.doMock("@/features/communications/lib/server/optInRequests", () => ({
    buildAudienceOptInConfirmationUrl: buildAudienceOptInConfirmationUrlMock,
    createAudienceOptInRequest: createAudienceOptInRequestMock,
  }));
  vi.doMock("@/lib/notifications/events", () => ({
    queueLoggedNotificationEmail: queueLoggedNotificationEmailMock,
  }));

  const mod = await import("./contact");

  return {
    ...mod,
    buildAudienceOptInConfirmationUrlMock,
    consumeRateLimitMock,
    createAudienceOptInRequestMock,
    createServiceRoleClientMock,
    getClientRateLimitIdentifierMock,
    hasSupabaseServiceRoleEnvMock,
    insertMock,
    insertSingleMock,
    queueLoggedNotificationEmailMock,
  } satisfies ContactModuleContext;
}

describe("contact action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONTACT_EMAIL = ORIGINAL_ENV.CONTACT_EMAIL;
  });

  it("returns a configuration error when contact storage is unavailable", async () => {
    const { createServiceRoleClientMock, sendContactEmail } =
      await loadContactModule({ hasStorageEnv: false });

    await expect(
      sendContactEmail(null, createContactFormData()),
    ).resolves.toEqual({
      success: false,
      error: "Contact form storage is not configured yet.",
    });

    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without storing or notifying", async () => {
    const {
      createServiceRoleClientMock,
      queueLoggedNotificationEmailMock,
      sendContactEmail,
    } = await loadContactModule();

    await expect(
      sendContactEmail(
        null,
        createContactFormData({ website: "https://spam.example" }),
      ),
    ).resolves.toEqual({
      success: true,
    });

    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
    expect(queueLoggedNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid contact payloads before rate limiting or storing", async () => {
    const {
      consumeRateLimitMock,
      queueLoggedNotificationEmailMock,
      insertMock,
      sendContactEmail,
    } = await loadContactModule();

    await expect(
      sendContactEmail(
        null,
        createContactFormData({
          email: "invalid",
          inquiryType: "not-allowed",
          message: "bad",
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Please complete all fields with valid values.",
    });

    expect(consumeRateLimitMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(queueLoggedNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error when contact submissions are rate limited", async () => {
    const { queueLoggedNotificationEmailMock, insertMock, sendContactEmail } =
      await loadContactModule({
        rateLimitOk: false,
      });

    await expect(
      sendContactEmail(null, createContactFormData()),
    ).resolves.toEqual({
      success: false,
      error:
        "Too many messages were sent from this connection. Please wait a few minutes and try again.",
    });

    expect(insertMock).not.toHaveBeenCalled();
    expect(queueLoggedNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("fails closed when shared rate limiting is unavailable", async () => {
    const { consumeRateLimitMock, insertMock, sendContactEmail } =
      await loadContactModule({
        hasRateLimitProtection: false,
      });

    await expect(
      sendContactEmail(null, createContactFormData()),
    ).resolves.toEqual({
      success: false,
      error:
        "The contact form is temporarily unavailable. Please try again later.",
    });

    expect(consumeRateLimitMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns a configuration error when the contact_messages table is unavailable", async () => {
    const { queueLoggedNotificationEmailMock, sendContactEmail } =
      await loadContactModule({
        insertError: {
          code: "42P01",
          message: 'relation "contact_messages" does not exist',
        },
      });

    await expect(
      sendContactEmail(null, createContactFormData()),
    ).resolves.toEqual({
      success: false,
      error: "Contact form storage is not configured yet.",
    });

    expect(queueLoggedNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("stores normalized contact messages and sends both the owner alert and update confirmation request", async () => {
    const {
      buildAudienceOptInConfirmationUrlMock,
      createAudienceOptInRequestMock,
      queueLoggedNotificationEmailMock,
      insertMock,
      sendContactEmail,
    } = await loadContactModule();

    await expect(
      sendContactEmail(
        null,
        createContactFormData({
          email: " SENDER@Example.com ",
          inquiryType: "publication_inquiry",
          locale: "nl",
          message: "Hello\n\n  Kyrillos  ",
          name: "  Test User  ",
          booksUpdates: true,
          lessonsUpdates: true,
        }),
      ),
    ).resolves.toEqual({
      success: true,
      message:
        "Bericht succesvol verzonden. Controleer uw inbox om e-mailupdates te bevestigen.",
    });

    expect(insertMock).toHaveBeenCalledWith({
      email: "sender@example.com",
      inquiry_type: "publication_inquiry",
      locale: "nl",
      message: "Hello\n\nKyrillos",
      name: "Test User",
      wants_updates: true,
    });
    expect(queueLoggedNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: "contact_123",
        aggregateType: "contact_message",
        eventType: "contact_message_received",
        payload: expect.objectContaining({
          sender_email: "se***@example.com",
        }),
        replyTo: "sender@example.com",
        subject:
          "Coptic Compass contact: Publication / Book Inquiry from Test User",
        text: expect.stringContaining("Wants updates: yes"),
        to: "owner@example.com",
      }),
    );
    expect(createAudienceOptInRequestMock).toHaveBeenCalledWith({
      booksRequested: true,
      email: "sender@example.com",
      fullName: "Test User",
      generalUpdatesRequested: false,
      lessonsRequested: true,
      locale: "nl",
      source: "contact_form",
    });
    expect(buildAudienceOptInConfirmationUrlMock).toHaveBeenCalledWith(
      "nl",
      "test-token",
    );
    expect(queueLoggedNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: "opt_in_123",
        aggregateType: "audience_opt_in_request",
        eventType: "audience_opt_in_requested",
        payload: expect.objectContaining({
          email: "se***@example.com",
        }),
        subject: "Bevestig uw Coptic Compass e-mailupdates",
        to: "sender@example.com",
        text: expect.stringContaining(
          "https://example.com/en/communications/confirm?token=test-token",
        ),
      }),
    );
  });

  it("returns success even if the owner alert email fails after the message is stored", async () => {
    const { queueLoggedNotificationEmailMock, insertMock, sendContactEmail } =
      await loadContactModule({
        notificationResult: {
          success: false,
          error: "Domain not verified",
        },
      });

    await expect(
      sendContactEmail(null, createContactFormData()),
    ).resolves.toEqual({
      success: true,
      message: "Message sent successfully. I'll reply soon!",
    });

    expect(insertMock).toHaveBeenCalledOnce();
    expect(queueLoggedNotificationEmailMock).toHaveBeenCalledOnce();
  });

  it("keeps the inquiry successful even if the update confirmation email cannot be sent", async () => {
    const { queueLoggedNotificationEmailMock, sendContactEmail } =
      await loadContactModule();

    queueLoggedNotificationEmailMock
      .mockResolvedValueOnce({
        eventId: "event_owner_1",
        jobId: "job_owner_1",
        success: true,
      })
      .mockResolvedValueOnce({
        success: false,
        error: "Provider unavailable",
      });

    await expect(
      sendContactEmail(null, createContactFormData({ generalUpdates: true })),
    ).resolves.toEqual({
      success: true,
      message:
        "Message sent successfully, but I could not send the update confirmation email just now.",
    });

    expect(queueLoggedNotificationEmailMock).toHaveBeenCalledTimes(2);
  });
});
