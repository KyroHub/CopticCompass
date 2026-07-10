import { beforeEach, describe, expect, it, vi } from "vitest";

type ResendWebhookModule =
  typeof import("@/features/communications/lib/server/resendWebhooks");

const baseEnv = {
  RESEND_API_KEY_FULL_ACCESS: "re_full",
  RESEND_BOOKS_TOPIC_ID: "topic_books",
  RESEND_GENERAL_TOPIC_ID: "topic_general",
  RESEND_LESSONS_TOPIC_ID: "topic_lessons",
  RESEND_WEBHOOK_SECRET: "whsec_test",
};

const audienceContact = {
  books_opt_in: true,
  consented_at: "2026-06-24T10:00:00.000Z",
  created_at: "2026-06-24T10:00:00.000Z",
  email: "reader@example.com",
  full_name: "Reader Name",
  general_updates_opt_in: true,
  id: "audience_123",
  lessons_opt_in: true,
  locale: "en",
  profile_id: null,
  source: "dashboard",
  unsubscribed_at: null,
  updated_at: "2026-06-24T10:00:00.000Z",
};

function createWebhookRequest(body: Record<string, unknown> = {}) {
  return new Request("https://www.copticcompass.com/api/resend/webhook", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_webhook_123",
      "svix-signature": "v1,test",
      "svix-timestamp": "1780000000",
    },
    method: "POST",
  });
}

function createContactUpdatedEvent(overrides?: Record<string, unknown>) {
  return {
    created_at: "2026-06-24T10:30:00.000Z",
    data: {
      audience_id: "audience_provider",
      created_at: "2026-06-24T10:00:00.000Z",
      email: "reader@example.com",
      first_name: "Reader",
      id: "provider_contact_123",
      last_name: "Name",
      segment_ids: [],
      unsubscribed: false,
      updated_at: "2026-06-24T10:30:00.000Z",
      ...overrides,
    },
    type: "contact.updated",
  };
}

function createEmailEvent(type: string, data?: Record<string, unknown>) {
  return {
    created_at: "2026-06-24T10:30:00.000Z",
    data: {
      created_at: "2026-06-24T10:30:00.000Z",
      email_id: "email_123",
      from: "Coptic Compass <updates@example.com>",
      subject: "Update",
      to: ["reader@example.com"],
      ...data,
    },
    type,
  };
}

async function loadWebhookModule(options?: {
  audienceContact?: typeof audienceContact | null;
  contentReleaseTargetProviderStatus?: string | null;
  duplicateProviderEvent?: boolean;
  event?: Record<string, unknown>;
  notificationDeliveryStatus?: string;
  notificationEventStatus?: string;
  topicSubscriptions?: Array<{
    id: string;
    subscription: "opt_in" | "opt_out";
  }>;
  verifyThrows?: boolean;
}) {
  vi.resetModules();

  vi.doMock("@/features/communications/lib/server/audience", () => ({
    COMMUNICATIONS_POLICY_VERSION: "privacy-2026-06-22",
  }));
  vi.doMock("@/lib/supabase/serviceRole", () => ({
    createServiceRoleClient: vi.fn(),
  }));

  const providerEventInsertSingleMock = vi.fn().mockResolvedValue(
    options?.duplicateProviderEvent
      ? {
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint",
          },
        }
      : {
          data: { id: "provider_event_row_123" },
          error: null,
        },
  );
  const providerEventInsertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: providerEventInsertSingleMock,
    })),
  }));
  const providerEventUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
  const providerEventUpdateMock = vi.fn(() => ({
    eq: providerEventUpdateEqMock,
  }));

  const audienceContactMaybeSingleMock = vi.fn().mockResolvedValue({
    data:
      options?.audienceContact === undefined
        ? audienceContact
        : options.audienceContact,
    error: null,
  });
  const audienceContactSelectMock = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: audienceContactMaybeSingleMock,
    })),
  }));

  const notificationDeliveryUpdateEqMock = vi
    .fn()
    .mockResolvedValue({ error: null });
  const notificationDeliverySelectEqMock = vi.fn().mockResolvedValue({
    data: [
      {
        event_id: "event_123",
        id: "delivery_123",
        status: options?.notificationDeliveryStatus ?? "accepted",
      },
    ],
    error: null,
  });
  const notificationDeliverySelectMock = vi.fn(() => ({
    eq: notificationDeliverySelectEqMock,
  }));
  const notificationDeliveryUpdateMock = vi.fn(() => ({
    eq: notificationDeliveryUpdateEqMock,
  }));

  const notificationEventUpdateEqMock = vi
    .fn()
    .mockResolvedValue({ error: null });
  const notificationEventSelectInMock = vi.fn().mockResolvedValue({
    data: [
      {
        id: "event_123",
        status: options?.notificationEventStatus ?? "accepted",
      },
    ],
    error: null,
  });
  const notificationEventSelectMock = vi.fn(() => ({
    in: notificationEventSelectInMock,
  }));
  const notificationEventUpdateMock = vi.fn(() => ({
    eq: notificationEventUpdateEqMock,
  }));

  const contentReleaseTargetUpdateEqMock = vi
    .fn()
    .mockResolvedValue({ error: null });
  const contentReleaseTargetUpdateMock = vi.fn(() => ({
    eq: contentReleaseTargetUpdateEqMock,
  }));
  const contentReleaseTargetMaybeSingleMock = vi.fn().mockResolvedValue({
    data: {
      accepted_at: "2026-06-24T10:00:00.000Z",
      id: "release_target_123",
      last_provider_status: options?.contentReleaseTargetProviderStatus ?? null,
    },
    error: null,
  });
  const contentReleaseTargetSelectMock = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: contentReleaseTargetMaybeSingleMock,
    })),
  }));

  const audienceSuppressionInsertMock = vi
    .fn()
    .mockResolvedValue({ error: null });
  const consentEventInsertMock = vi.fn().mockResolvedValue({ error: null });
  const rpcMock = vi.fn().mockResolvedValue({
    data: {
      ...audienceContact,
      books_opt_in: false,
      general_updates_opt_in: false,
      lessons_opt_in: false,
    },
    error: null,
  });

  const fromMock = vi.fn((table: string) => {
    if (table === "provider_webhook_events") {
      return {
        insert: providerEventInsertMock,
        update: providerEventUpdateMock,
      };
    }

    if (table === "audience_contacts") {
      return {
        select: audienceContactSelectMock,
      };
    }

    if (table === "notification_deliveries") {
      return {
        select: notificationDeliverySelectMock,
        update: notificationDeliveryUpdateMock,
      };
    }

    if (table === "notification_events") {
      return {
        select: notificationEventSelectMock,
        update: notificationEventUpdateMock,
      };
    }

    if (table === "audience_suppressions") {
      return {
        insert: audienceSuppressionInsertMock,
      };
    }

    if (table === "audience_consent_events") {
      return {
        insert: consentEventInsertMock,
      };
    }

    if (table === "content_release_targets") {
      return {
        select: contentReleaseTargetSelectMock,
        update: contentReleaseTargetUpdateMock,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
  const supabase = {
    from: fromMock,
    rpc: rpcMock,
  };

  const verifyMock = vi.fn(() => {
    if (options?.verifyThrows) {
      throw new Error("invalid signature");
    }

    return options?.event ?? createContactUpdatedEvent();
  });
  const topicsListMock = vi.fn().mockResolvedValue({
    data: {
      data: options?.topicSubscriptions ?? [
        { id: "topic_lessons", subscription: "opt_in" },
        { id: "topic_books", subscription: "opt_in" },
        { id: "topic_general", subscription: "opt_in" },
      ],
    },
    error: null,
  });
  const resend = {
    contacts: {
      topics: {
        list: topicsListMock,
      },
    },
    webhooks: {
      verify: verifyMock,
    },
  };

  const mod: ResendWebhookModule = await import("./resendWebhooks");

  return {
    ...mod,
    audienceContactMaybeSingleMock,
    audienceSuppressionInsertMock,
    consentEventInsertMock,
    contentReleaseTargetUpdateEqMock,
    contentReleaseTargetUpdateMock,
    createResend: vi.fn(() => resend),
    createSupabase: vi.fn(() => supabase),
    fromMock,
    notificationDeliveryUpdateEqMock,
    notificationDeliveryUpdateMock,
    notificationEventUpdateEqMock,
    providerEventInsertMock,
    providerEventUpdateEqMock,
    rpcMock,
    topicsListMock,
    verifyMock,
  };
}

describe("Resend webhook handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing or invalid signatures before storage", async () => {
    const { createResend, createSupabase, handleResendWebhookRequest } =
      await loadWebhookModule({ verifyThrows: true });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: baseEnv,
    });

    expect(response.status).toBe(400);
    expect(createSupabase).not.toHaveBeenCalled();
  });

  it("captures verified events without side effects while processing is disabled", async () => {
    const {
      createResend,
      createSupabase,
      handleResendWebhookRequest,
      providerEventInsertMock,
      providerEventUpdateEqMock,
      rpcMock,
    } = await loadWebhookModule({
      event: createEmailEvent("email.delivered"),
    });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: baseEnv,
    });
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      captured: true,
      processingEnabled: false,
      success: true,
    });
    expect(providerEventInsertMock).toHaveBeenCalled();
    expect(providerEventUpdateEqMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("treats duplicate provider event IDs as idempotent success", async () => {
    const { createResend, createSupabase, handleResendWebhookRequest } =
      await loadWebhookModule({
        duplicateProviderEvent: true,
        event: createEmailEvent("email.delivered"),
      });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: {
        ...baseEnv,
        RESEND_WEBHOOK_PROCESSING_ENABLED: "true",
      },
    });

    await expect(response.json()).resolves.toMatchObject({
      duplicate: true,
      success: true,
    });
  });

  it("applies provider global unsubscribe restrictively and records suppression", async () => {
    const {
      audienceSuppressionInsertMock,
      consentEventInsertMock,
      createResend,
      createSupabase,
      handleResendWebhookRequest,
      rpcMock,
    } = await loadWebhookModule({
      event: createContactUpdatedEvent({ unsubscribed: true }),
    });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: {
        ...baseEnv,
        RESEND_WEBHOOK_PROCESSING_ENABLED: "true",
      },
    });

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith(
      "apply_audience_preferences",
      expect.objectContaining({
        p_actor: "provider",
        p_books_opt_in: false,
        p_general_updates_opt_in: false,
        p_lessons_opt_in: false,
        p_source: "resend_webhook",
      }),
    );
    expect(audienceSuppressionInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "resend",
        reason: "provider_unsubscribe",
      }),
    );
    expect(consentEventInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "suppressed",
        topic: "all",
      }),
    );
  });

  it("applies provider Topic opt-outs without opting other topics in", async () => {
    const {
      createResend,
      createSupabase,
      handleResendWebhookRequest,
      rpcMock,
    } = await loadWebhookModule({
      event: createContactUpdatedEvent(),
      topicSubscriptions: [
        { id: "topic_lessons", subscription: "opt_in" },
        { id: "topic_books", subscription: "opt_out" },
        { id: "topic_general", subscription: "opt_in" },
      ],
    });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: {
        ...baseEnv,
        RESEND_WEBHOOK_PROCESSING_ENABLED: "true",
      },
    });

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith(
      "apply_audience_preferences",
      expect.objectContaining({
        p_books_opt_in: false,
        p_general_updates_opt_in: true,
        p_lessons_opt_in: true,
      }),
    );
  });

  it("updates delivery lifecycle and suppresses hard bounces", async () => {
    const {
      audienceSuppressionInsertMock,
      createResend,
      createSupabase,
      handleResendWebhookRequest,
      notificationDeliveryUpdateEqMock,
      notificationEventUpdateEqMock,
      rpcMock,
    } = await loadWebhookModule({
      event: createEmailEvent("email.bounced", {
        bounce: {
          message: "Mailbox does not exist.",
          subType: "NoEmail",
          type: "Permanent",
        },
      }),
    });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: {
        ...baseEnv,
        RESEND_WEBHOOK_PROCESSING_ENABLED: "true",
      },
    });

    expect(response.status).toBe(200);
    expect(notificationDeliveryUpdateEqMock).toHaveBeenCalledWith(
      "id",
      "delivery_123",
    );
    expect(notificationEventUpdateEqMock).toHaveBeenCalledWith(
      "id",
      "event_123",
    );
    expect(rpcMock).toHaveBeenCalledWith(
      "apply_audience_preferences",
      expect.objectContaining({
        p_books_opt_in: false,
        p_general_updates_opt_in: false,
        p_lessons_opt_in: false,
      }),
    );
    expect(audienceSuppressionInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "hard_bounce",
      }),
    );
  });

  it("matches broadcast webhooks to release targets with sanitized delivery feedback", async () => {
    const {
      contentReleaseTargetUpdateEqMock,
      contentReleaseTargetUpdateMock,
      createResend,
      createSupabase,
      handleResendWebhookRequest,
      notificationDeliveryUpdateMock,
    } = await loadWebhookModule({
      event: createEmailEvent("email.delivered", {
        broadcast_id: "broadcast_123",
      }),
    });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: {
        ...baseEnv,
        RESEND_WEBHOOK_PROCESSING_ENABLED: "true",
      },
    });

    expect(response.status).toBe(200);
    expect(notificationDeliveryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: null,
        status: "delivered",
      }),
    );
    expect(contentReleaseTargetUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        delivered_at: "2026-06-24T10:30:00.000Z",
        last_provider_error: null,
        last_provider_event_id: "msg_webhook_123",
        last_provider_status: "delivered",
        provider_status_updated_at: "2026-06-24T10:30:00.000Z",
      }),
    );
    expect(contentReleaseTargetUpdateEqMock).toHaveBeenCalledWith(
      "id",
      "release_target_123",
    );
  });

  it("does not downgrade release target delivery feedback from out-of-order webhooks", async () => {
    const {
      contentReleaseTargetUpdateMock,
      createResend,
      createSupabase,
      handleResendWebhookRequest,
      notificationDeliveryUpdateMock,
    } = await loadWebhookModule({
      contentReleaseTargetProviderStatus: "delivered",
      event: createEmailEvent("email.delivery_delayed", {
        broadcast_id: "broadcast_123",
      }),
      notificationDeliveryStatus: "delivered",
      notificationEventStatus: "delivered",
    });

    const response = await handleResendWebhookRequest(createWebhookRequest(), {
      createResend,
      createSupabase,
      env: {
        ...baseEnv,
        RESEND_WEBHOOK_PROCESSING_ENABLED: "true",
      },
    });

    expect(response.status).toBe(200);
    expect(notificationDeliveryUpdateMock).not.toHaveBeenCalled();
    expect(contentReleaseTargetUpdateMock).not.toHaveBeenCalled();
  });
});
