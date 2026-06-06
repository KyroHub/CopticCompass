import "server-only";

import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { getProfileRole } from "@/lib/supabase/profileRole";
import { createClient } from "@/lib/supabase/server";

import {
  resolveAdminRagRouteAccess,
  type AdminRagRouteAccessFailureResponses,
} from "./ragRouteAccess";

export function requireAdminRagRouteAccess<TPayload>(
  failureResponses: AdminRagRouteAccessFailureResponses<TPayload>,
) {
  return resolveAdminRagRouteAccess({
    dependencies: {
      createClient,
      getAuthenticatedUser,
      getProfileRole,
      hasSupabaseRuntimeEnv,
    },
    failureResponses,
  });
}
