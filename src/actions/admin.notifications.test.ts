import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadAdminNotificationsAction(options?: {
  retryRpcResult?:
    | {
        data: Array<{ event_id: string; job_id: string; job_status: string }>;
        error: null;
      }
    | {
        data: null;
        error: { code?: string; message: string };
      };
  workerResult?:
    | { data: Record<string, unknown> | null; status: number; success: true }
    | { error: string; status: number; success: false };
}) {
  vi.resetModules();

  const retryNotificationEmailJobRpcMock = vi.fn().mockResolvedValue(
    options?.retryRpcResult ?? {
      data: [
        {
          event_id: "event_123",
          job_id: "job_123",
          job_status: "queued",
        },
      ],
      error: null,
    },
  );
  const wakeNotificationEmailWorkerMock = vi.fn().mockResolvedValue(
    options?.workerResult ?? {
      data: { jobId: "job_123", queued: true, success: true },
      status: 202,
      success: true,
    },
  );
  const revalidateAdminPathsMock = vi.fn();

  vi.doMock("@/actions/admin/shared", () => ({
    getValidatedAdminContext: vi.fn().mockResolvedValue({
      supabase: {
        rpc: vi.fn((functionName: string, args: Record<string, unknown>) => {
          if (functionName === "retry_notification_email_job") {
            return retryNotificationEmailJobRpcMock(args);
          }

          throw new Error(`Unexpected admin RPC: ${functionName}`);
        }),
      },
      user: { id: "admin_123" },
    }),
  }));
  vi.doMock("@/lib/server/revalidation", () => ({
    revalidateAdminPaths: revalidateAdminPathsMock,
  }));
  vi.doMock("@/lib/notifications/worker", () => ({
    wakeNotificationEmailWorker: wakeNotificationEmailWorkerMock,
  }));

  const mod = await import("./admin/notifications");

  return {
    ...mod,
    retryNotificationEmailJobRpcMock,
    revalidateAdminPathsMock,
    wakeNotificationEmailWorkerMock,
  };
}

describe("admin notification retry actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an explicit retry reason", async () => {
    const { retryNotificationEmailJob, retryNotificationEmailJobRpcMock } =
      await loadAdminNotificationsAction();
    const formData = new FormData();
    formData.set("job_id", "job_123");
    formData.set("reason", "short");

    await expect(retryNotificationEmailJob(null, formData)).resolves.toEqual({
      message: "Add a retry reason with at least 8 characters.",
      success: false,
    });
    expect(retryNotificationEmailJobRpcMock).not.toHaveBeenCalled();
  });

  it("queues an audited retry and wakes the worker", async () => {
    const {
      retryNotificationEmailJob,
      retryNotificationEmailJobRpcMock,
      revalidateAdminPathsMock,
      wakeNotificationEmailWorkerMock,
    } = await loadAdminNotificationsAction();
    const formData = new FormData();
    formData.set("job_id", "job_123");
    formData.set("reason", "Provider outage resolved.");

    await expect(retryNotificationEmailJob(null, formData)).resolves.toEqual({
      message: "Notification retry queued.",
      success: true,
    });

    expect(retryNotificationEmailJobRpcMock).toHaveBeenCalledWith({
      p_job_id: "job_123",
      p_reason: "Provider outage resolved.",
    });
    expect(wakeNotificationEmailWorkerMock).toHaveBeenCalledWith({
      jobId: "job_123",
    });
    expect(revalidateAdminPathsMock).toHaveBeenCalledOnce();
  });

  it("keeps the retry queued when the worker wake-up fails", async () => {
    const { retryNotificationEmailJob } = await loadAdminNotificationsAction({
      workerResult: {
        error: "Edge function unavailable",
        status: 503,
        success: false,
      },
    });
    const formData = new FormData();
    formData.set("job_id", "job_123");
    formData.set("reason", "Worker outage recovered.");

    await expect(retryNotificationEmailJob(null, formData)).resolves.toEqual({
      message:
        "Notification retry queued. The scheduled worker can still pick it up.",
      success: true,
    });
  });
});
