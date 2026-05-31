import { beforeEach, describe, expect, it, vi } from "vitest";

type CommunicationsModuleContext = {
  getAuthenticatedServerContextMock: ReturnType<typeof vi.fn>;
  getProfileMock: ReturnType<typeof vi.fn>;
  hasSupabaseServiceRoleEnvMock: ReturnType<typeof vi.fn>;
  revalidatePathMock: ReturnType<typeof vi.fn>;
  syncAudienceContactMock: ReturnType<typeof vi.fn>;
  updateCommunicationPreferences: typeof import("./communications").updateCommunicationPreferences;
};

function createCommunicationFormData(
  overrides?: Partial<
    Record<"locale", string> & {
      booksOptIn: boolean;
      generalUpdatesOptIn: boolean;
      lessonsOptIn: boolean;
    }
  >,
) {
  const formData = new FormData();
  formData.set("locale", overrides?.locale ?? "en");

  if (overrides?.booksOptIn) {
    formData.set("books_opt_in", "true");
  }

  if (overrides?.generalUpdatesOptIn) {
    formData.set("general_updates_opt_in", "true");
  }

  if (overrides?.lessonsOptIn) {
    formData.set("lessons_opt_in", "true");
  }

  return formData;
}

async function loadCommunicationsModule(options?: {
  authContext?: {
    supabase: object;
    user: {
      email?: string | null;
      id: string;
      user_metadata?: Record<string, unknown>;
    };
  } | null;
  hasStorageEnv?: boolean;
  profile?: { email: string | null; full_name: string | null } | null;
}) {
  vi.resetModules();

  const revalidatePathMock = vi.fn();
  const syncAudienceContactMock = vi.fn().mockResolvedValue({
    id: "audience_123",
  });
  const getAuthenticatedServerContextMock = vi.fn().mockResolvedValue(
    options?.authContext === undefined
      ? {
          supabase: {},
          user: {
            email: "user@example.com",
            id: "user-1",
            user_metadata: {
              full_name: "Kyrillos Wannes",
            },
          },
        }
      : options.authContext,
  );
  const getProfileMock = vi.fn().mockResolvedValue(
    options?.profile === undefined
      ? {
          email: "user@example.com",
          full_name: "Kyrillos Wannes",
        }
      : options.profile,
  );
  const hasSupabaseServiceRoleEnvMock = vi
    .fn()
    .mockReturnValue(options?.hasStorageEnv ?? true);

  vi.doMock("next/cache", () => ({
    revalidatePath: revalidatePathMock,
  }));
  vi.doMock("@/features/communications/lib/server/audience", () => ({
    syncAudienceContact: syncAudienceContactMock,
  }));
  vi.doMock("@/lib/supabase/auth", () => ({
    getAuthenticatedServerContext: getAuthenticatedServerContextMock,
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseServiceRoleEnv: hasSupabaseServiceRoleEnvMock,
  }));
  vi.doMock("@/features/profile/lib/server/queries", () => ({
    getProfile: getProfileMock,
  }));

  const mod = await import("./communications");

  return {
    ...mod,
    getAuthenticatedServerContextMock,
    getProfileMock,
    hasSupabaseServiceRoleEnvMock,
    revalidatePathMock,
    syncAudienceContactMock,
  } satisfies CommunicationsModuleContext;
}

describe("communication preferences action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a friendly error when audience storage is unavailable", async () => {
    const {
      getAuthenticatedServerContextMock,
      syncAudienceContactMock,
      updateCommunicationPreferences,
    } = await loadCommunicationsModule({
      hasStorageEnv: false,
    });

    await expect(
      updateCommunicationPreferences(createCommunicationFormData()),
    ).resolves.toEqual({
      message:
        "Could not update your communication preferences right now. Please try again later.",
      success: false,
    });

    expect(getAuthenticatedServerContextMock).not.toHaveBeenCalled();
    expect(syncAudienceContactMock).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    const { syncAudienceContactMock, updateCommunicationPreferences } =
      await loadCommunicationsModule({
        authContext: null,
      });

    await expect(
      updateCommunicationPreferences(createCommunicationFormData()),
    ).resolves.toEqual({
      message: "You must be logged in to update communication preferences.",
      success: false,
    });

    expect(syncAudienceContactMock).not.toHaveBeenCalled();
  });

  it("syncs selected topics and revalidates the dashboard", async () => {
    const {
      revalidatePathMock,
      syncAudienceContactMock,
      updateCommunicationPreferences,
    } = await loadCommunicationsModule();

    await expect(
      updateCommunicationPreferences(
        createCommunicationFormData({
          booksOptIn: true,
          lessonsOptIn: true,
          locale: "nl",
        }),
      ),
    ).resolves.toEqual({
      message: "Communicatievoorkeuren bijgewerkt.",
      success: true,
    });

    expect(syncAudienceContactMock).toHaveBeenCalledWith({
      booksOptIn: true,
      email: "user@example.com",
      fullName: "Kyrillos Wannes",
      generalUpdatesOptIn: false,
      lessonsOptIn: true,
      locale: "nl",
      profileId: "user-1",
      source: "dashboard",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/nl/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin");
  });
});
