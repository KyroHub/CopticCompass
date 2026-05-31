import { beforeEach, describe, expect, it, vi } from "vitest";

type ProfileModuleContext = {
  updateProfile: typeof import("./profile").updateProfile;
  eqMock: ReturnType<typeof vi.fn>;
  fromMock: ReturnType<typeof vi.fn>;
  getAuthenticatedServerContextMock: ReturnType<typeof vi.fn>;
  getSupabaseRuntimeEnvMock: ReturnType<typeof vi.fn>;
  hasSupabaseRuntimeEnvMock: ReturnType<typeof vi.fn>;
  revalidatePathMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
};

function createProfileFormData(
  overrides?: Partial<Record<"avatar_url" | "full_name", string>>,
) {
  const formData = new FormData();

  if (overrides?.full_name !== undefined) {
    formData.set("full_name", overrides.full_name);
  } else {
    formData.set("full_name", "  Kyrillos   Wannes  ");
  }

  if (overrides?.avatar_url !== undefined) {
    formData.set("avatar_url", overrides.avatar_url);
  }

  return formData;
}

async function loadProfileModule(options?: {
  authContext?: {
    supabase: { from: ReturnType<typeof vi.fn> };
    user: { id: string };
  } | null;
  hasEnv?: boolean;
  updateError?: { message: string } | null;
}) {
  vi.resetModules();

  const revalidatePathMock = vi.fn();
  const eqMock = vi
    .fn()
    .mockResolvedValue({ error: options?.updateError ?? null });
  const updateMock = vi.fn().mockReturnValue({
    eq: eqMock,
  });
  const fromMock = vi.fn().mockReturnValue({
    update: updateMock,
  });
  const getAuthenticatedServerContextMock = vi.fn().mockResolvedValue(
    options?.authContext === undefined
      ? {
          supabase: {
            from: fromMock,
          },
          user: { id: "user-1" },
        }
      : options.authContext,
  );
  const hasSupabaseRuntimeEnvMock = vi.fn(() => options?.hasEnv ?? true);
  const getSupabaseRuntimeEnvMock = vi.fn(() => ({
    url: "https://project.supabase.co",
    anonKey: "anon-key",
  }));

  vi.doMock("next/cache", () => ({
    revalidatePath: revalidatePathMock,
  }));
  vi.doMock("@/lib/supabase/auth", () => ({
    getAuthenticatedServerContext: getAuthenticatedServerContextMock,
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    getSupabaseRuntimeEnv: getSupabaseRuntimeEnvMock,
    hasSupabaseRuntimeEnv: hasSupabaseRuntimeEnvMock,
  }));

  const mod = await import("./profile");

  return {
    ...mod,
    eqMock,
    fromMock,
    getAuthenticatedServerContextMock,
    getSupabaseRuntimeEnvMock,
    hasSupabaseRuntimeEnvMock,
    revalidatePathMock,
    updateMock,
  } satisfies ProfileModuleContext;
}

describe("profile action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes the full name and accepts avatar URLs from the current user's folder", async () => {
    const { eqMock, revalidatePathMock, updateProfile, updateMock } =
      await loadProfileModule();
    const avatarUrl =
      "https://project.supabase.co/storage/v1/object/public/avatars/user-1/avatar.png";

    await expect(
      updateProfile(
        createProfileFormData({
          avatar_url: avatarUrl,
        }),
      ),
    ).resolves.toEqual({ success: true });

    expect(updateMock).toHaveBeenCalledWith({
      avatar_url: avatarUrl,
      full_name: "Kyrillos Wannes",
    });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/nl/dashboard");
  });

  it("updates only the full name when no avatar URL is provided", async () => {
    const { updateProfile, updateMock } = await loadProfileModule();

    await expect(updateProfile(createProfileFormData())).resolves.toEqual({
      success: true,
    });

    expect(updateMock).toHaveBeenCalledWith({
      full_name: "Kyrillos Wannes",
    });
  });

  it("rejects avatar URLs outside the current user's avatar folder", async () => {
    const { updateProfile, updateMock } = await loadProfileModule();

    await expect(
      updateProfile(
        createProfileFormData({
          avatar_url:
            "https://project.supabase.co/storage/v1/object/public/avatars/user-2/avatar.png",
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Avatar URL is invalid.",
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects overlong full names before updating the profile", async () => {
    const { updateProfile, updateMock } = await loadProfileModule();

    await expect(
      updateProfile(
        createProfileFormData({
          full_name: "a".repeat(121),
        }),
      ),
    ).resolves.toEqual({
      success: false,
      error: "Full name must be 120 characters or fewer.",
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not return raw storage errors to the profile UI", async () => {
    const { updateProfile } = await loadProfileModule({
      updateError: {
        message:
          "raw database constraint failure: SUPABASE_SERVICE_ROLE_KEY missing",
      },
    });

    const result = await updateProfile(createProfileFormData());

    expect(result).toEqual({
      success: false,
      error: "Could not update your profile right now.",
    });
    expect(JSON.stringify(result)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(JSON.stringify(result)).not.toContain("raw database");
  });

  it("returns localized unavailable copy when profile storage is disabled", async () => {
    const { updateProfile } = await loadProfileModule({ hasEnv: false });
    const formData = createProfileFormData();
    formData.set("locale", "nl");

    await expect(updateProfile(formData)).resolves.toEqual({
      success: false,
      error:
        "Profielinstellingen zijn tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    });
  });
});
