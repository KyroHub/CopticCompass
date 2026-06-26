import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createContentReleaseDeletionFormData,
  createContentReleaseDraftFormData,
  createContentReleasePreviewFormData,
  createContentReleaseStatusFormData,
  createDefaultRelease,
  loadAdminModule,
} from "./admin.test-helpers";

describe("admin content release actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a content release draft with snapshotted items", async () => {
    const {
      contentReleaseItemInsertMock,
      createContentReleaseDraft,
      revalidatePathMock,
    } = await loadAdminModule();

    await expect(
      createContentReleaseDraft(null, createContentReleaseDraftFormData()),
    ).resolves.toEqual({
      success: true,
    });

    expect(contentReleaseItemInsertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        item_id: "lesson-1",
        item_type: "lesson",
        release_id: "release_123",
        title_snapshot: "Lesson 01",
        url_snapshot: "/grammar/lesson-1",
      }),
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/nl/admin");
  });

  it("rejects content release drafts without selected items", async () => {
    const { contentReleaseItemInsertMock, createContentReleaseDraft } =
      await loadAdminModule();

    await expect(
      createContentReleaseDraft(
        null,
        createContentReleaseDraftFormData({
          releaseItems: [],
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Select at least one lesson or publication for this release.",
    });

    expect(contentReleaseItemInsertMock).not.toHaveBeenCalled();
  });

  it("updates content release status and revalidates admin pages", async () => {
    const {
      contentReleaseUpdateEqMock,
      revalidatePathMock,
      updateContentReleaseStatus,
    } = await loadAdminModule();

    await expect(
      updateContentReleaseStatus(createContentReleaseStatusFormData()),
    ).resolves.toBeUndefined();

    expect(contentReleaseUpdateEqMock).toHaveBeenCalledWith(
      "id",
      "44444444-4444-4444-8444-444444444444",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/nl/admin");
  });

  it("deletes draft content releases and revalidates admin pages", async () => {
    const {
      contentReleaseDeleteEqMock,
      deleteContentReleaseDraft,
      revalidatePathMock,
    } = await loadAdminModule({
      release: createDefaultRelease({
        status: "draft",
      }),
    });

    await expect(
      deleteContentReleaseDraft(null, createContentReleaseDeletionFormData()),
    ).resolves.toEqual({
      message: "Release draft deleted.",
      success: true,
    });

    expect(contentReleaseDeleteEqMock).toHaveBeenCalledWith(
      "id",
      "44444444-4444-4444-8444-444444444444",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/admin");
    expect(revalidatePathMock).toHaveBeenCalledWith("/nl/admin");
  });

  it("rejects deleting content releases that are not drafts or cancelled", async () => {
    const { contentReleaseDeleteEqMock, deleteContentReleaseDraft } =
      await loadAdminModule({
        release: createDefaultRelease({
          delivery_finished_at: "2026-03-28T11:00:10.000Z",
          delivery_requested_at: "2026-03-28T11:00:00.000Z",
          delivery_requested_by: "admin_123",
          delivery_started_at: "2026-03-28T11:00:02.000Z",
          delivery_summary: {
            sent_count: 1,
          },
          sent_at: "2026-03-28T11:00:10.000Z",
          status: "sent",
          updated_at: "2026-03-28T11:00:10.000Z",
        }),
      });

    await expect(
      deleteContentReleaseDraft(null, createContentReleaseDeletionFormData()),
    ).resolves.toEqual({
      message:
        "Only draft or cancelled releases can be deleted. Sent and in-flight releases stay in history.",
      success: false,
    });

    expect(contentReleaseDeleteEqMock).not.toHaveBeenCalled();
  });

  it("returns an actionable error when no release draft is actually deleted", async () => {
    const { deleteContentReleaseDraft } = await loadAdminModule({
      contentReleaseDeleteResult: {
        data: null,
        error: null,
      },
      release: createDefaultRelease({
        status: "draft",
      }),
    });

    await expect(
      deleteContentReleaseDraft(null, createContentReleaseDeletionFormData()),
    ).resolves.toEqual({
      message:
        "This draft could not be deleted yet. Make sure the latest content release permissions migration has been applied.",
      success: false,
    });
  });

  it("queues approved content releases and starts the background worker", async () => {
    const {
      contentReleaseUpdateEqMock,
      invokeSupabaseEdgeFunctionMock,
      revalidatePathMock,
      sendContentRelease,
    } = await loadAdminModule();

    await expect(
      sendContentRelease(null, createContentReleaseStatusFormData()),
    ).resolves.toEqual({
      message: "Release queued. Delivery will continue in the background.",
      success: true,
    });

    expect(contentReleaseUpdateEqMock).toHaveBeenNthCalledWith(
      1,
      "id",
      "44444444-4444-4444-8444-444444444444",
    );
    expect(invokeSupabaseEdgeFunctionMock).toHaveBeenCalledWith(
      "process-content-release",
      {
        releaseId: "44444444-4444-4444-8444-444444444444",
      },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });

  it("blocks release queueing when Broadcast Topic configuration is incomplete", async () => {
    const {
      contentReleaseUpdateEqMock,
      invokeSupabaseEdgeFunctionMock,
      sendContentRelease,
    } = await loadAdminModule({
      hasResendBroadcastEnv: false,
    });

    await expect(
      sendContentRelease(null, createContentReleaseStatusFormData()),
    ).resolves.toEqual({
      message:
        "Resend Broadcast delivery is missing required configuration: RESEND_LESSONS_TOPIC_ID.",
      success: false,
    });

    expect(contentReleaseUpdateEqMock).not.toHaveBeenCalled();
    expect(invokeSupabaseEdgeFunctionMock).not.toHaveBeenCalled();
  });

  it("sends a localized preview email to the admin inbox without marking the release sent", async () => {
    const {
      contentReleaseUpdateEqMock,
      dispatchLoggedNotificationEmailMock,
      sendContentReleasePreview,
    } = await loadAdminModule();

    await expect(
      sendContentReleasePreview(null, createContentReleasePreviewFormData()),
    ).resolves.toEqual({
      message: "Preview sent to owner@example.com.",
      success: true,
    });

    expect(dispatchLoggedNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: "44444444-4444-4444-8444-444444444444",
        aggregateType: "content_release",
        eventType: "content_release_test_sent",
        subject: "[Coptic Compass Preview] Nieuwe les beschikbaar",
        text: expect.stringContaining("In deze release:"),
        to: "owner@example.com",
      }),
    );
    expect(contentReleaseUpdateEqMock).not.toHaveBeenCalled();
  });

  it("rejects release queueing when background delivery is already in progress", async () => {
    const { invokeSupabaseEdgeFunctionMock, sendContentRelease } =
      await loadAdminModule({
        release: createDefaultRelease({
          delivery_cursor: "reader-025@example.com",
          delivery_requested_at: "2026-03-28T11:00:00.000Z",
          delivery_requested_by: "admin_123",
          delivery_started_at: "2026-03-28T11:00:02.000Z",
          status: "sending",
          updated_at: "2026-03-28T11:00:02.000Z",
        }),
      });

    await expect(
      sendContentRelease(null, createContentReleaseStatusFormData()),
    ).resolves.toEqual({
      message: "This release is already being delivered in the background.",
      success: false,
    });

    expect(invokeSupabaseEdgeFunctionMock).not.toHaveBeenCalled();
  });

  it("resumes queued releases without resetting their progress cursor", async () => {
    const {
      contentReleaseUpdateEqMock,
      invokeSupabaseEdgeFunctionMock,
      sendContentRelease,
    } = await loadAdminModule({
      release: createDefaultRelease({
        delivery_cursor: "reader-025@example.com",
        delivery_requested_at: "2026-03-28T11:00:00.000Z",
        delivery_requested_by: "admin_123",
        delivery_summary: {
          item_count: 1,
          processed_recipient_count: 25,
          remaining_recipient_count: 10,
        },
        last_delivery_error:
          "The next delivery batch could not be started automatically.",
        status: "queued",
        updated_at: "2026-03-28T11:05:00.000Z",
      }),
    });

    await expect(
      sendContentRelease(null, createContentReleaseStatusFormData()),
    ).resolves.toEqual({
      message:
        "Queued release resumed. Delivery will continue in the background.",
      success: true,
    });

    expect(contentReleaseUpdateEqMock).not.toHaveBeenCalled();
    expect(invokeSupabaseEdgeFunctionMock).toHaveBeenCalledWith(
      "process-content-release",
      {
        releaseId: "44444444-4444-4444-8444-444444444444",
      },
    );
  });

  it("reverts queued releases when the background worker cannot be started", async () => {
    const { contentReleaseUpdateEqMock, sendContentRelease } =
      await loadAdminModule({
        invokeWorkerResult: {
          error: "Worker unavailable",
          status: 500,
          success: false,
        },
      });

    await expect(
      sendContentRelease(null, createContentReleaseStatusFormData()),
    ).resolves.toEqual({
      message: "The background release worker could not be started right now.",
      success: false,
    });

    expect(contentReleaseUpdateEqMock).toHaveBeenNthCalledWith(
      1,
      "id",
      "44444444-4444-4444-8444-444444444444",
    );
    expect(contentReleaseUpdateEqMock).toHaveBeenNthCalledWith(
      2,
      "id",
      "44444444-4444-4444-8444-444444444444",
    );
  });
});
