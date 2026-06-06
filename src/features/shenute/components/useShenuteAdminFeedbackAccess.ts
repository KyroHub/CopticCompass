import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/types/profile";

export type ShenuteAdminFeedbackAccessClient = {
  from: (table: "profiles") => {
    select: (columns: "role") => {
      eq: (
        column: "id",
        userId: string,
      ) => {
        maybeSingle: () => Promise<{
          data: { role: ProfileRole | null } | null;
        }>;
      };
    };
  };
};

type CreateShenuteAdminFeedbackAccessClient =
  () => ShenuteAdminFeedbackAccessClient | null;

type LoadShenuteAdminFeedbackAccessOptions = {
  createSupabaseClient?: CreateShenuteAdminFeedbackAccessClient;
  userId: string;
};

type UseShenuteAdminFeedbackAccessOptions = {
  isAuthenticated: boolean;
  userId?: string | null;
};

export function isShenuteAdminFeedbackRole(role: ProfileRole | null) {
  return role === "admin";
}

export async function loadShenuteAdminFeedbackAccess({
  createSupabaseClient = createClient as CreateShenuteAdminFeedbackAccessClient,
  userId,
}: LoadShenuteAdminFeedbackAccessOptions) {
  const supabase = createSupabaseClient();
  if (!supabase) {
    return false;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    return isShenuteAdminFeedbackRole(data?.role ?? null);
  } catch {
    return false;
  }
}

export function useShenuteAdminFeedbackAccess({
  isAuthenticated,
  userId,
}: UseShenuteAdminFeedbackAccessOptions) {
  const [adminFeedbackAccess, setAdminFeedbackAccess] = useState<{
    canSubmitAdminFeedback: boolean;
    userId: string | null;
  }>({
    canSubmitAdminFeedback: false,
    userId: null,
  });

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }

    let isMounted = true;
    void loadShenuteAdminFeedbackAccess({ userId }).then(
      (canSubmitFeedback) => {
        if (isMounted) {
          setAdminFeedbackAccess({
            canSubmitAdminFeedback: canSubmitFeedback,
            userId,
          });
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, userId]);

  return Boolean(
    isAuthenticated &&
    userId &&
    adminFeedbackAccess.userId === userId &&
    adminFeedbackAccess.canSubmitAdminFeedback,
  );
}
