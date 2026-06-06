import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import {
  getAuthUnavailableLoginPath,
  getLoginPath,
  hasSupabaseRuntimeEnv,
} from "@/lib/supabase/config";
import { getProfileRole } from "@/lib/supabase/profileRole";
import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";
import { createClient } from "@/lib/supabase/server";

import type { User } from "@supabase/supabase-js";

type AuthenticatedServerContext = {
  supabase: AppSupabaseClient;
  user: User;
};

/**
 * Returns the authenticated server context used by server actions and pages
 * that need both the current user and the bound Supabase client.
 */
export async function getAuthenticatedServerContext(): Promise<AuthenticatedServerContext | null> {
  if (!hasSupabaseRuntimeEnv()) {
    return null;
  }

  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return null;
  }

  return { supabase, user };
}

/**
 * Returns the authenticated server context only when the current profile role
 * is admin.
 */
export async function getAdminServerContext(): Promise<AuthenticatedServerContext | null> {
  const authContext = await getAuthenticatedServerContext();

  if (!authContext) {
    return null;
  }

  const role = await getProfileRole(authContext.supabase, authContext.user.id);
  return role === "admin" ? authContext : null;
}

/**
 * Ensures a page request has an authenticated user and redirects to the
 * appropriate login flow when auth is unavailable or missing.
 */
export async function requireAuthenticatedPageSession(
  redirectTo: string,
): Promise<AuthenticatedServerContext> {
  if (!hasSupabaseRuntimeEnv()) {
    redirect(getAuthUnavailableLoginPath(redirectTo));
  }

  const authContext = await getAuthenticatedServerContext();

  if (!authContext) {
    redirect(getLoginPath(redirectTo));
  }

  return authContext;
}

/**
 * Ensures the current page session belongs to an admin user and redirects
 * non-admin users back to the dashboard.
 */
export async function requireAdminPageSession(
  redirectTo = "/admin",
): Promise<AuthenticatedServerContext> {
  const authContext = await requireAuthenticatedPageSession(redirectTo);
  const role = await getProfileRole(authContext.supabase, authContext.user.id);

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return authContext;
}
