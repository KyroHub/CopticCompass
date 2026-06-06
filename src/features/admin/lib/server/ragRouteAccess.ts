export type AdminRagRouteJsonResult<TPayload> = {
  init?: ResponseInit;
  payload: TPayload;
};

export type AdminRagRouteAccessUser = {
  id: string;
};

export type AdminRagRouteAccessFailureResponses<TPayload> = {
  forbidden: AdminRagRouteJsonResult<TPayload>;
  runtimeUnavailable: AdminRagRouteJsonResult<TPayload>;
  unauthenticated: AdminRagRouteJsonResult<TPayload>;
};

export type AdminRagRouteAccessDependencies<TClient> = {
  createClient: () => Promise<TClient>;
  getAuthenticatedUser: (
    client: TClient,
  ) => Promise<AdminRagRouteAccessUser | null>;
  getProfileRole: (
    client: TClient,
    userId: string,
  ) => Promise<string | null | undefined>;
  hasSupabaseRuntimeEnv: () => boolean;
};

type AdminRagRouteAccessResult<TPayload> =
  | {
      success: true;
      user: AdminRagRouteAccessUser;
    }
  | {
      response: AdminRagRouteJsonResult<TPayload>;
      success: false;
    };

/**
 * Resolves the shared admin RAG access gate without knowing route-specific
 * payload shapes. Callers provide the exact failure responses they already
 * expose, so centralizing the guard does not change public API behavior.
 */
export async function resolveAdminRagRouteAccess<TClient, TPayload>({
  dependencies,
  failureResponses,
}: {
  dependencies: AdminRagRouteAccessDependencies<TClient>;
  failureResponses: AdminRagRouteAccessFailureResponses<TPayload>;
}): Promise<AdminRagRouteAccessResult<TPayload>> {
  if (!dependencies.hasSupabaseRuntimeEnv()) {
    return {
      response: failureResponses.runtimeUnavailable,
      success: false,
    };
  }

  const client = await dependencies.createClient();
  const user = await dependencies.getAuthenticatedUser(client);

  if (!user) {
    return {
      response: failureResponses.unauthenticated,
      success: false,
    };
  }

  const role = await dependencies.getProfileRole(client, user.id);
  if (role !== "admin") {
    return {
      response: failureResponses.forbidden,
      success: false,
    };
  }

  return {
    success: true,
    user,
  };
}
