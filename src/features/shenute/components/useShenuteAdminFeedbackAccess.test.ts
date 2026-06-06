import { describe, expect, it, vi } from "vitest";

import type { ProfileRole } from "@/types/profile";

import {
  isShenuteAdminFeedbackRole,
  loadShenuteAdminFeedbackAccess,
  type ShenuteAdminFeedbackAccessClient,
} from "./useShenuteAdminFeedbackAccess";

function createAccessClient(options: {
  role?: ProfileRole | null;
  shouldThrow?: boolean;
}) {
  const maybeSingle = vi.fn(async () => {
    if (options.shouldThrow) {
      throw new Error("profiles query failed");
    }

    return {
      data:
        typeof options.role === "undefined"
          ? null
          : {
              role: options.role,
            },
    };
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from } satisfies ShenuteAdminFeedbackAccessClient,
    eq,
    from,
    maybeSingle,
    select,
  };
}

describe("Shenute admin feedback access", () => {
  it("allows only admin profile roles", () => {
    expect(isShenuteAdminFeedbackRole("admin")).toBe(true);
    expect(isShenuteAdminFeedbackRole("student")).toBe(false);
    expect(isShenuteAdminFeedbackRole(null)).toBe(false);
  });

  it("loads admin access from the profiles role query", async () => {
    const { client, eq, from, maybeSingle, select } = createAccessClient({
      role: "admin",
    });

    await expect(
      loadShenuteAdminFeedbackAccess({
        createSupabaseClient: () => client,
        userId: "user-1",
      }),
    ).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("role");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("denies non-admin, missing-client, and failed profile lookups", async () => {
    const studentClient = createAccessClient({ role: "student" });
    const failingClient = createAccessClient({ shouldThrow: true });

    await expect(
      loadShenuteAdminFeedbackAccess({
        createSupabaseClient: () => studentClient.client,
        userId: "user-1",
      }),
    ).resolves.toBe(false);
    await expect(
      loadShenuteAdminFeedbackAccess({
        createSupabaseClient: () => null,
        userId: "user-1",
      }),
    ).resolves.toBe(false);
    await expect(
      loadShenuteAdminFeedbackAccess({
        createSupabaseClient: () => failingClient.client,
        userId: "user-1",
      }),
    ).resolves.toBe(false);
  });
});
