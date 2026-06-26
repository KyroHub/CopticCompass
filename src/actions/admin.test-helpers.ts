import { vi } from "vitest";

type AdminModuleContext = {
  contactUpdateEqMock: ReturnType<typeof vi.fn>;
  contentReleaseDeleteEqMock: ReturnType<typeof vi.fn>;
  contentReleaseItemInsertMock: ReturnType<typeof vi.fn>;
  contentReleaseUpdateEqMock: ReturnType<typeof vi.fn>;
  createContentReleaseDraft: typeof import("./admin").createContentReleaseDraft;
  deleteContentReleaseDraft: typeof import("./admin").deleteContentReleaseDraft;
  deleteSubmission: typeof import("./admin").deleteSubmission;
  dispatchLoggedNotificationEmailMock: ReturnType<typeof vi.fn>;
  getAdminServerContextMock: ReturnType<typeof vi.fn>;
  invokeSupabaseEdgeFunctionMock: ReturnType<typeof vi.fn>;
  profileMaybeSingleMock: ReturnType<typeof vi.fn>;
  queueLoggedNotificationEmailMock: ReturnType<typeof vi.fn>;
  revalidatePathMock: ReturnType<typeof vi.fn>;
  reportUpdateEqMock: ReturnType<typeof vi.fn>;
  sendContentRelease: typeof import("./admin").sendContentRelease;
  sendContentReleasePreview: typeof import("./admin").sendContentReleasePreview;
  submissionSelectMock: ReturnType<typeof vi.fn>;
  submissionUpdateEqMock: ReturnType<typeof vi.fn>;
  submissionUpdateMock: ReturnType<typeof vi.fn>;
  submitFeedback: typeof import("./admin").submitFeedback;
  syncAudienceContactsWithResend: typeof import("./admin").syncAudienceContactsWithResend;
  syncStoredAudienceContactToResendMock: ReturnType<typeof vi.fn>;
  updateContactMessageStatus: typeof import("./admin").updateContactMessageStatus;
  updateContentReleaseStatus: typeof import("./admin").updateContentReleaseStatus;
  updateEntryReportStatus: typeof import("./admin").updateEntryReportStatus;
};

type AdminHarnessOptions = {
  audienceContacts?: AudienceContactFixture[];
  contactUpdateError?: { message?: string } | null;
  existingReleaseEvents?: {
    payload?: object | null;
    recipient: string;
    status?: string;
  }[];
  contentReleaseDeleteResult?: {
    data: { id: string } | null;
    error: { message?: string } | null;
  };
  contentReleaseInsertError?: { message?: string } | null;
  contentReleaseItems?: ContentReleaseItemFixture[];
  contentReleaseItemsInsertError?: { message?: string } | null;
  contentReleaseUpdateError?: { message?: string } | null;
  feedbackNotificationResult?:
    | { error: string; success: false }
    | { eventId: string; jobId: string; success: true };
  hasEnv?: boolean;
  hasResendBroadcastEnv?: boolean;
  hasResendAudienceEnv?: boolean;
  invokeWorkerResult?:
    | { data?: Record<string, unknown> | null; status: number; success: true }
    | { error: string; status: number; success: false };
  isAdmin?: boolean;
  profile?: { email: string | null; full_name: string | null } | null;
  release?: ContentReleaseFixture | null;
  releaseNotificationResult?:
    | { error: string; success: false }
    | { id: string | null; success: true };
  reportUpdateError?: { message?: string } | null;
  resendAudienceSyncResult?:
    | {
        contact: Record<string, unknown>;
        success: true;
        syncState?: Record<string, unknown> | null;
      }
    | {
        contact: Record<string, unknown>;
        error: string;
        success: false;
        syncState?: Record<string, unknown> | null;
      };
  submission?: SubmissionFixture | null;
  submissionUpdateError?: { message?: string } | null;
  user?: { id: string } | null;
};

type SubmissionFixture = {
  exercise_id: string | null;
  lesson_slug: string;
  rating: number | null;
  submitted_language: "en" | "nl" | null;
  user_id: string;
};

type ContentReleaseFixture = {
  audience_segment: "books" | "general" | "lessons";
  body_en: string | null;
  body_nl: string | null;
  created_at: string;
  delivery_cursor: string | null;
  delivery_finished_at: string | null;
  delivery_requested_at: string | null;
  delivery_requested_by: string | null;
  delivery_started_at: string | null;
  delivery_summary: Record<string, unknown>;
  id: string;
  last_delivery_error: string | null;
  locale_mode: "en_only" | "localized" | "nl_only";
  release_type: "lesson" | "mixed" | "publication";
  sent_at: string | null;
  status: "approved" | "cancelled" | "draft" | "queued" | "sending" | "sent";
  subject_en: string | null;
  subject_nl: string | null;
  updated_at: string;
};

type ContentReleaseItemFixture = {
  created_at?: string;
  id?: string;
  item_id: string;
  item_type: "lesson" | "publication";
  release_id: string;
  title_snapshot: string;
  url_snapshot: string;
};

type AudienceContactFixture = {
  books_opt_in: boolean;
  consented_at: string | null;
  created_at: string;
  email: string;
  full_name: string | null;
  general_updates_opt_in: boolean;
  id: string;
  lessons_opt_in: boolean;
  locale: "en" | "nl";
  profile_id: string | null;
  source: "contact_form" | "dashboard" | "signup";
  unsubscribed_at: string | null;
  updated_at: string;
};

export function createAdminFormData(
  overrides?: Partial<Record<"feedback" | "rating" | "submission_id", string>>,
) {
  const formData = new FormData();
  formData.set(
    "submission_id",
    overrides?.submission_id ?? "11111111-1111-4111-8111-111111111111",
  );
  formData.set("rating", overrides?.rating ?? "5");
  formData.set("feedback", overrides?.feedback ?? "Well done.");
  return formData;
}

export function createSubmissionDeletionFormData(
  overrides?: Partial<
    Record<"deletion_reason" | "lesson_slug" | "submission_id", string>
  >,
) {
  const formData = new FormData();
  formData.set(
    "submission_id",
    overrides?.submission_id ?? "11111111-1111-4111-8111-111111111111",
  );
  formData.set("lesson_slug", overrides?.lesson_slug ?? "lesson-1");
  formData.set(
    "deletion_reason",
    overrides?.deletion_reason ?? "duplicate_submission",
  );
  return formData;
}

export function createEntryReportAdminFormData(
  overrides?: Partial<Record<"report_id" | "status", string>>,
) {
  const formData = new FormData();
  formData.set(
    "report_id",
    overrides?.report_id ?? "22222222-2222-4222-8222-222222222222",
  );
  formData.set("status", overrides?.status ?? "reviewed");
  return formData;
}

export function createContactMessageAdminFormData(
  overrides?: Partial<Record<"contact_message_id" | "status", string>>,
) {
  const formData = new FormData();
  formData.set(
    "contact_message_id",
    overrides?.contact_message_id ?? "33333333-3333-4333-8333-333333333333",
  );
  formData.set("status", overrides?.status ?? "answered");
  return formData;
}

export function createContentReleaseDraftFormData(
  overrides?: Partial<
    Record<
      | "audience_segment"
      | "body_en"
      | "body_nl"
      | "locale_mode"
      | "subject_en"
      | "subject_nl",
      string
    > & {
      releaseItems: string[];
    }
  >,
) {
  const formData = new FormData();
  formData.set("audience_segment", overrides?.audience_segment ?? "lessons");
  formData.set("locale_mode", overrides?.locale_mode ?? "localized");
  formData.set("subject_en", overrides?.subject_en ?? "New lesson available");
  formData.set("subject_nl", overrides?.subject_nl ?? "Nieuwe les beschikbaar");
  formData.set(
    "body_en",
    overrides?.body_en ?? "A new lesson has been published.",
  );
  formData.set(
    "body_nl",
    overrides?.body_nl ?? "Er is een nieuwe les gepubliceerd.",
  );

  for (const releaseItem of overrides?.releaseItems ?? ["lesson:lesson-1"]) {
    formData.append("release_item", releaseItem);
  }

  return formData;
}

export function createContentReleaseStatusFormData(
  overrides?: Partial<Record<"release_id" | "status", string>>,
) {
  const formData = new FormData();
  formData.set(
    "release_id",
    overrides?.release_id ?? "44444444-4444-4444-8444-444444444444",
  );
  formData.set("status", overrides?.status ?? "approved");
  return formData;
}

export function createContentReleaseDeletionFormData(
  overrides?: Partial<Record<"release_id", string>>,
) {
  const formData = new FormData();
  formData.set(
    "release_id",
    overrides?.release_id ?? "44444444-4444-4444-8444-444444444444",
  );
  return formData;
}

export function createContentReleasePreviewFormData(
  overrides?: Partial<Record<"preview_locale" | "release_id", string>>,
) {
  const formData = new FormData();
  formData.set(
    "release_id",
    overrides?.release_id ?? "44444444-4444-4444-8444-444444444444",
  );
  formData.set("preview_locale", overrides?.preview_locale ?? "nl");
  return formData;
}

function createDefaultSubmission(): SubmissionFixture {
  return {
    exercise_id: "grammar.exercise.lesson01.001",
    lesson_slug: "lesson-1",
    rating: 5,
    submitted_language: "en",
    user_id: "student_123",
  };
}

export function createDefaultRelease(
  overrides?: Partial<ContentReleaseFixture>,
): ContentReleaseFixture {
  return {
    audience_segment: "lessons",
    body_en: "A new lesson has been published.",
    body_nl: "Er is een nieuwe les gepubliceerd.",
    created_at: "2026-03-28T10:00:00.000Z",
    delivery_cursor: null,
    delivery_finished_at: null,
    delivery_requested_at: null,
    delivery_requested_by: null,
    delivery_started_at: null,
    delivery_summary: {},
    id: "44444444-4444-4444-8444-444444444444",
    last_delivery_error: null,
    locale_mode: "localized",
    release_type: "lesson",
    sent_at: null,
    status: "approved",
    subject_en: "New lesson available",
    subject_nl: "Nieuwe les beschikbaar",
    updated_at: "2026-03-28T10:00:00.000Z",
    ...overrides,
  };
}

function createDefaultReleaseItems(): ContentReleaseItemFixture[] {
  return [
    {
      created_at: "2026-03-28T10:00:00.000Z",
      id: "item_1",
      item_id: "lesson-1",
      item_type: "lesson",
      release_id: "44444444-4444-4444-8444-444444444444",
      title_snapshot: "Lesson 01",
      url_snapshot: "/grammar/lesson-1",
    },
  ];
}

function createDefaultAudienceContacts(): AudienceContactFixture[] {
  return [
    {
      books_opt_in: false,
      consented_at: "2026-03-28T09:00:00.000Z",
      created_at: "2026-03-28T09:00:00.000Z",
      email: "reader@example.com",
      full_name: "Reader One",
      general_updates_opt_in: true,
      id: "audience_123",
      lessons_opt_in: true,
      locale: "en",
      profile_id: null,
      source: "dashboard",
      unsubscribed_at: null,
      updated_at: "2026-03-28T09:00:00.000Z",
    },
  ];
}

function createSupabaseMocks(options: AdminHarnessOptions = {}) {
  const submissionUpdateEqMock = vi.fn().mockResolvedValue({
    error: options.submissionUpdateError ?? null,
  });
  const reportUpdateEqMock = vi.fn().mockResolvedValue({
    error: options.reportUpdateError ?? null,
  });
  const contactUpdateEqMock = vi.fn().mockResolvedValue({
    error: options.contactUpdateError ?? null,
  });
  const contentReleaseUpdateEqMock = vi.fn().mockResolvedValue({
    error: options.contentReleaseUpdateError ?? null,
  });
  const contentReleaseDeleteMaybeSingleMock = vi.fn().mockResolvedValue(
    options.contentReleaseDeleteResult ?? {
      data: { id: "44444444-4444-4444-8444-444444444444" },
      error: null,
    },
  );
  const contentReleaseDeleteEqMock = vi.fn(() => ({
    select: vi.fn(() => ({
      maybeSingle: contentReleaseDeleteMaybeSingleMock,
    })),
  }));
  const submissionUpdateMock = vi.fn(() => ({
    eq: submissionUpdateEqMock,
  }));
  const contentReleaseSingleMock = vi.fn().mockResolvedValue({
    data: { id: "release_123" },
    error: options.contentReleaseInsertError ?? null,
  });
  const contentReleaseInsertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: contentReleaseSingleMock,
    })),
  }));
  const contentReleaseItemInsertMock = vi.fn().mockResolvedValue({
    error: options.contentReleaseItemsInsertError ?? null,
  });
  const submissionMaybeSingleMock = vi.fn().mockResolvedValue({
    data: options.submission ?? createDefaultSubmission(),
    error: null,
  });
  const submissionSelectMock = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: submissionMaybeSingleMock,
    })),
  }));
  const profileMaybeSingleMock = vi.fn().mockResolvedValue({
    data: options.profile ?? {
      email: "student@example.com",
      full_name: "Test Student",
    },
    error: null,
  });
  const profileSelectMock = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: profileMaybeSingleMock,
    })),
  }));
  const contentReleaseMaybeSingleMock = vi.fn().mockResolvedValue({
    data: options.release ?? createDefaultRelease(),
    error: null,
  });
  const contentReleaseItemsSelectEqOrderMock = vi.fn().mockResolvedValue({
    data: options.contentReleaseItems ?? createDefaultReleaseItems(),
    error: null,
  });
  const audienceContacts =
    options.audienceContacts ?? createDefaultAudienceContacts();
  const audienceContactsIsMock = vi.fn().mockResolvedValue({
    data: audienceContacts,
    error: null,
  });
  const audienceContactsOrderMock = vi.fn().mockResolvedValue({
    data: audienceContacts,
    error: null,
  });
  const notificationEventsEqStatusMock = vi.fn().mockResolvedValue({
    data:
      options.existingReleaseEvents?.map((event) => ({
        payload: event.payload ?? {},
        recipient: event.recipient,
        status: event.status ?? "sent",
      })) ?? [],
    error: null,
  });

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "submissions") {
        return {
          select: submissionSelectMock,
          update: submissionUpdateMock,
        };
      }

      if (table === "profiles") {
        return {
          select: profileSelectMock,
        };
      }

      if (table === "entry_reports") {
        return {
          update: vi.fn(() => ({
            eq: reportUpdateEqMock,
          })),
        };
      }

      if (table === "contact_messages") {
        return {
          update: vi.fn(() => ({
            eq: contactUpdateEqMock,
          })),
        };
      }

      if (table === "content_releases") {
        return {
          delete: vi.fn(() => ({
            eq: contentReleaseDeleteEqMock,
          })),
          insert: contentReleaseInsertMock,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: contentReleaseMaybeSingleMock,
            })),
          })),
          update: vi.fn(() => ({
            eq: contentReleaseUpdateEqMock,
          })),
        };
      }

      if (table === "content_release_items") {
        return {
          insert: contentReleaseItemInsertMock,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: contentReleaseItemsSelectEqOrderMock,
            })),
          })),
        };
      }

      if (table === "audience_contacts") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: audienceContactsIsMock,
            })),
            order: audienceContactsOrderMock,
          })),
        };
      }

      if (table === "notification_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: notificationEventsEqStatusMock,
                })),
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table requested in test: ${table}`);
    }),
  };

  return {
    contactUpdateEqMock,
    contentReleaseDeleteEqMock,
    contentReleaseItemInsertMock,
    contentReleaseUpdateEqMock,
    profileMaybeSingleMock,
    reportUpdateEqMock,
    submissionSelectMock,
    submissionUpdateEqMock,
    submissionUpdateMock,
    supabase,
  };
}

function mockAdminDependencies(
  options: AdminHarnessOptions,
  mocks: ReturnType<typeof createSupabaseMocks>,
) {
  const revalidatePathMock = vi.fn();
  const dispatchLoggedNotificationEmailMock = vi.fn().mockResolvedValue(
    options.releaseNotificationResult ?? {
      success: true,
      id: "email_789",
    },
  );
  const queueLoggedNotificationEmailMock = vi.fn().mockResolvedValue(
    options.feedbackNotificationResult ?? {
      eventId: "event_123",
      jobId: "job_123",
      success: true,
    },
  );
  const getNotificationEmailEnvMock = vi.fn().mockReturnValue({
    notificationFromEmail: "notifications@example.com",
    ownerAlertEmail: "owner@example.com",
    resendApiKey: "re_123",
  });
  const invokeSupabaseEdgeFunctionMock = vi.fn().mockResolvedValue(
    options.invokeWorkerResult ?? {
      data: { queued: true, releaseId: "44444444-4444-4444-8444-444444444444" },
      status: 202,
      success: true,
    },
  );
  const syncStoredAudienceContactToResendMock = vi.fn().mockImplementation(
    async (contact: Record<string, unknown>) =>
      options.resendAudienceSyncResult ?? {
        contact,
        success: true,
        syncState: null,
      },
  );
  const getAdminServerContextMock = vi.fn().mockResolvedValue(
    options.isAdmin === false || options.user === null
      ? null
      : {
          supabase: mocks.supabase,
          user: options.user ?? { id: "admin_123" },
        },
  );

  vi.doMock("next/cache", () => ({
    revalidatePath: revalidatePathMock,
  }));
  vi.doMock("@/lib/notifications/config", () => ({
    getNotificationEmailEnv: getNotificationEmailEnvMock,
  }));
  vi.doMock("@/lib/supabase/auth", () => ({
    getAdminServerContext: getAdminServerContextMock,
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseRuntimeEnv: vi.fn(() => options.hasEnv ?? true),
  }));
  vi.doMock("@/lib/supabase/functions", () => ({
    invokeSupabaseEdgeFunction: invokeSupabaseEdgeFunctionMock,
  }));
  vi.doMock("@/features/communications/lib/server/resend", () => ({
    getContentReleaseBroadcastConfigurationError: vi.fn(() =>
      options.hasResendBroadcastEnv === false
        ? "Resend Broadcast delivery is missing required configuration: RESEND_LESSONS_TOPIC_ID."
        : null,
    ),
    hasResendAudienceEnv: vi.fn(() => options.hasResendAudienceEnv ?? true),
    syncStoredAudienceContactToResend: syncStoredAudienceContactToResendMock,
  }));
  vi.doMock("@/lib/notifications/events", () => ({
    dispatchLoggedNotificationEmail: dispatchLoggedNotificationEmailMock,
    queueLoggedNotificationEmail: queueLoggedNotificationEmailMock,
  }));

  return {
    dispatchLoggedNotificationEmailMock,
    getAdminServerContextMock,
    invokeSupabaseEdgeFunctionMock,
    queueLoggedNotificationEmailMock,
    revalidatePathMock,
    syncStoredAudienceContactToResendMock,
  };
}

export async function loadAdminModule(
  options: AdminHarnessOptions = {},
): Promise<AdminModuleContext> {
  vi.resetModules();

  const supabaseMocks = createSupabaseMocks(options);
  const dependencyMocks = mockAdminDependencies(options, supabaseMocks);
  const mod = await import("./admin");

  return {
    ...mod,
    ...dependencyMocks,
    contactUpdateEqMock: supabaseMocks.contactUpdateEqMock,
    contentReleaseDeleteEqMock: supabaseMocks.contentReleaseDeleteEqMock,
    contentReleaseItemInsertMock: supabaseMocks.contentReleaseItemInsertMock,
    contentReleaseUpdateEqMock: supabaseMocks.contentReleaseUpdateEqMock,
    deleteContentReleaseDraft: mod.deleteContentReleaseDraft,
    profileMaybeSingleMock: supabaseMocks.profileMaybeSingleMock,
    reportUpdateEqMock: supabaseMocks.reportUpdateEqMock,
    submissionSelectMock: supabaseMocks.submissionSelectMock,
    submissionUpdateEqMock: supabaseMocks.submissionUpdateEqMock,
    submissionUpdateMock: supabaseMocks.submissionUpdateMock,
  } satisfies AdminModuleContext;
}
