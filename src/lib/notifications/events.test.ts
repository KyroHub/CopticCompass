import { beforeEach, describe, expect, it, vi } from "vitest";

type NotificationsEventsModuleContext = {
  createServiceRoleClientMock: ReturnType<typeof vi.fn>;
  dispatchLoggedNotificationEmail: typeof import("./events").dispatchLoggedNotificationEmail;
  enqueueNotificationEmailJobRpcMock: ReturnType<typeof vi.fn>;
  getNotificationEmailEnvMock: ReturnType<typeof vi.fn>;
  hasSupabaseServiceRoleEnvMock: ReturnType<typeof vi.fn>;
  wakeNotificationEmailWorkerMock: ReturnType<typeof vi.fn>;
  notificationDeliveriesInsertMock: ReturnType<typeof vi.fn>;
  notificationEventsInsertMock: ReturnType<typeof vi.fn>;
  notificationEventsUpdateEqMock: ReturnType<typeof vi.fn>;
  queueLoggedNotificationEmail: typeof import("./events").queueLoggedNotificationEmail;
  queueLoggedOwnerAlertEmail: typeof import("./events").queueLoggedOwnerAlertEmail;
  sendNotificationEmailMock: ReturnType<typeof vi.fn>;
};

async function loadNotificationsEventsModule(options?: {
  hasServiceRoleEnv?: boolean;
  invokeWorkerResult?:
    | { data: Record<string, unknown> | null; status: number; success: true }
    | { error: string; status: number; success: false };
  notificationEmailEnv?: {
    notificationFromEmail: string;
    ownerAlertEmail: string | null;
    resendApiKey: string;
  } | null;
  sendNotificationResult?:
    | { error: string; success: false }
    | { id: string | null; success: true };
}) {
  vi.resetModules();

  const notificationEventsInsertMock = vi.fn().mockResolvedValue({
    data: { id: "event_123" },
    error: null,
  });
  const notificationDeliveriesInsertMock = vi.fn().mockResolvedValue({
    error: null,
  });
  const enqueueNotificationEmailJobRpcMock = vi.fn().mockResolvedValue({
    data: [
      {
        event_id: "event_123",
        event_status: "queued",
        job_already_existed: false,
        job_id: "job_123",
        job_status: "queued",
      },
    ],
    error: null,
  });
  const notificationEventsUpdateEqMock = vi.fn().mockResolvedValue({
    error: null,
  });
  const createServiceRoleClientMock = vi.fn().mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "notification_events") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: notificationEventsInsertMock,
            })),
          })),
          update: vi.fn(() => ({
            eq: notificationEventsUpdateEqMock,
          })),
        };
      }

      if (table === "notification_deliveries") {
        return {
          insert: notificationDeliveriesInsertMock,
        };
      }

      throw new Error(`Unexpected notification table: ${table}`);
    }),
    rpc: vi.fn((functionName: string, args: Record<string, unknown>) => {
      if (functionName === "enqueue_notification_email_job") {
        return enqueueNotificationEmailJobRpcMock(args);
      }

      throw new Error(`Unexpected notification RPC: ${functionName}`);
    }),
  });
  const hasSupabaseServiceRoleEnvMock = vi
    .fn()
    .mockReturnValue(options?.hasServiceRoleEnv ?? true);
  const sendNotificationEmailMock = vi
    .fn()
    .mockResolvedValue(
      options?.sendNotificationResult ?? { success: true, id: "email_123" },
    );
  const wakeNotificationEmailWorkerMock = vi.fn().mockResolvedValue(
    options?.invokeWorkerResult ?? {
      data: { jobId: "job_123", queued: true, success: true },
      status: 202,
      success: true,
    },
  );
  const getNotificationEmailEnvMock = vi.fn().mockReturnValue(
    options?.notificationEmailEnv ?? {
      notificationFromEmail: "notifications@example.com",
      ownerAlertEmail: "owner@example.com",
      resendApiKey: "re_123",
    },
  );

  vi.doMock("@/lib/notifications/config", () => ({
    getNotificationEmailEnv: getNotificationEmailEnvMock,
  }));
  vi.doMock("@/lib/notifications/email", () => ({
    sendNotificationEmail: sendNotificationEmailMock,
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseServiceRoleEnv: hasSupabaseServiceRoleEnvMock,
  }));
  vi.doMock("@/lib/supabase/serviceRole", () => ({
    createServiceRoleClient: createServiceRoleClientMock,
  }));
  vi.doMock("@/lib/notifications/worker", () => ({
    wakeNotificationEmailWorker: wakeNotificationEmailWorkerMock,
  }));

  const mod = await import("./events");

  return {
    ...mod,
    createServiceRoleClientMock,
    enqueueNotificationEmailJobRpcMock,
    getNotificationEmailEnvMock,
    hasSupabaseServiceRoleEnvMock,
    wakeNotificationEmailWorkerMock,
    notificationDeliveriesInsertMock,
    notificationEventsInsertMock,
    notificationEventsUpdateEqMock,
    sendNotificationEmailMock,
  } satisfies NotificationsEventsModuleContext;
}

describe("logged notification events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email even when the service-role client is unavailable", async () => {
    const {
      createServiceRoleClientMock,
      dispatchLoggedNotificationEmail,
      notificationDeliveriesInsertMock,
      notificationEventsInsertMock,
      sendNotificationEmailMock,
    } = await loadNotificationsEventsModule({
      hasServiceRoleEnv: false,
    });

    await expect(
      dispatchLoggedNotificationEmail({
        aggregateId: "submission_123",
        aggregateType: "submission",
        eventType: "exercise_submission_received",
        subject: "New submission",
        text: "A new submission arrived.",
        to: "owner@example.com",
      }),
    ).resolves.toEqual({
      success: true,
      id: "email_123",
    });

    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
    expect(notificationEventsInsertMock).not.toHaveBeenCalled();
    expect(notificationDeliveriesInsertMock).not.toHaveBeenCalled();
    expect(sendNotificationEmailMock).toHaveBeenCalledOnce();
  });

  it("stores the event and successful delivery when the email sends", async () => {
    const {
      dispatchLoggedNotificationEmail,
      notificationDeliveriesInsertMock,
      notificationEventsInsertMock,
      notificationEventsUpdateEqMock,
      sendNotificationEmailMock,
    } = await loadNotificationsEventsModule();

    await expect(
      dispatchLoggedNotificationEmail({
        aggregateId: "contact_123",
        aggregateType: "contact_message",
        eventType: "contact_message_received",
        payload: {
          inquiry_type: "publication_inquiry",
        },
        subject: "New contact",
        text: "A new contact message arrived.",
        to: "owner@example.com",
      }),
    ).resolves.toEqual({
      success: true,
      id: "email_123",
    });

    expect(notificationEventsInsertMock).toHaveBeenCalledOnce();
    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Coptic Compass"),
        subject: "New contact",
        to: "owner@example.com",
      }),
    );
    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("A new contact message arrived."),
      }),
    );
    expect(notificationDeliveriesInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "event_123",
        provider_message_id: "email_123",
        recipient: "ow***@example.com",
        status: "sent",
      }),
    );
    expect(notificationEventsUpdateEqMock).toHaveBeenCalledWith(
      "id",
      "event_123",
    );
  });

  it("stores a failed delivery when the email send fails", async () => {
    const {
      dispatchLoggedNotificationEmail,
      notificationDeliveriesInsertMock,
      sendNotificationEmailMock,
    } = await loadNotificationsEventsModule({
      sendNotificationResult: {
        success: false,
        error: "Provider unavailable",
      },
    });

    await expect(
      dispatchLoggedNotificationEmail({
        aggregateId: "submission_123",
        aggregateType: "submission",
        eventType: "submission_reviewed",
        subject: "Feedback ready",
        text: "Your feedback is ready.",
        to: "student@example.com",
      }),
    ).resolves.toEqual({
      success: false,
      error: "Provider unavailable",
    });

    expect(sendNotificationEmailMock).toHaveBeenCalledOnce();
    expect(notificationDeliveriesInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Provider unavailable",
        recipient: "st***@example.com",
        status: "failed",
      }),
    );
  });

  it("atomically enqueues the notification job and starts the worker", async () => {
    const {
      enqueueNotificationEmailJobRpcMock,
      notificationEventsInsertMock,
      queueLoggedNotificationEmail,
      wakeNotificationEmailWorkerMock,
    } = await loadNotificationsEventsModule();

    await expect(
      queueLoggedNotificationEmail({
        aggregateId: "contact_123",
        aggregateType: "contact_message",
        eventType: "contact_message_received",
        subject: "New contact",
        text: "A new contact message arrived.",
        to: "owner@example.com",
      }),
    ).resolves.toEqual({
      eventId: "event_123",
      jobId: "job_123",
      success: true,
    });

    expect(notificationEventsInsertMock).not.toHaveBeenCalled();
    expect(enqueueNotificationEmailJobRpcMock).toHaveBeenCalledOnce();
    expect(enqueueNotificationEmailJobRpcMock).toHaveBeenCalledWith(
      expect.objectContaining({
        p_event_type: "contact_message_received",
        p_payload: expect.objectContaining({
          notification_classification: {
            required_transactional: true,
          },
        }),
        p_to_recipients: ["owner@example.com"],
      }),
    );
    expect(wakeNotificationEmailWorkerMock).toHaveBeenCalledWith({
      jobId: "job_123",
    });
  });

  it("queues owner alerts with the configured owner recipient", async () => {
    const {
      enqueueNotificationEmailJobRpcMock,
      getNotificationEmailEnvMock,
      queueLoggedOwnerAlertEmail,
    } = await loadNotificationsEventsModule();

    await expect(
      queueLoggedOwnerAlertEmail({
        aggregateId: "submission_123",
        aggregateType: "submission",
        eventType: "exercise_submission_received",
        subject: "New submission",
        text: "A new submission arrived.",
      }),
    ).resolves.toEqual({
      eventId: "event_123",
      jobId: "job_123",
      success: true,
    });

    expect(getNotificationEmailEnvMock).toHaveBeenCalledOnce();
    expect(enqueueNotificationEmailJobRpcMock).toHaveBeenCalledOnce();
  });
});
