import {
  type ContentReleaseDeliverySummary,
  type ContentReleaseItemRecord,
  type ContentReleaseRecord,
  type ContentReleaseTargetRecord,
} from "../_shared/contentReleaseDelivery.ts";

/**
 * Builds the REST headers used for direct Supabase calls from the worker,
 * using the service-role key for both bearer auth and the `apikey` header.
 */
export function buildSupabaseRestHeaders(serviceRoleKey: string) {
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
  };
}

/**
 * Issues a JSON-based REST request against Supabase and returns the parsed
 * payload plus status information instead of throwing on non-2xx responses.
 */
async function fetchSupabaseJson<T>(options: {
  method?: "GET" | "PATCH" | "POST";
  path: string;
  preferRepresentation?: boolean;
  serviceRoleKey: string;
  supabaseUrl: string;
  body?: Record<string, unknown>;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/${options.path}`,
    {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        ...buildSupabaseRestHeaders(options.serviceRoleKey),
        ...(options.preferRepresentation
          ? { Prefer: "return=representation" }
          : {}),
      },
      method: options.method ?? "GET",
    },
  );

  if (!response.ok) {
    return {
      data: null,
      error: await response.text(),
      status: response.status,
    };
  }

  const responseText = await response.text();
  if (!responseText) {
    return {
      data: null,
      error: null,
      status: response.status,
    };
  }

  return {
    data: JSON.parse(responseText) as T,
    error: null,
    status: response.status,
  };
}

/**
 * Loads the release row the worker should operate on. Errors are logged and
 * surfaced as `null` so the caller can decide whether to stop or retry later.
 */
export async function loadRelease(options: {
  releaseId: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const result = await fetchSupabaseJson<ContentReleaseRecord[]>({
    path: `content_releases?id=eq.${encodeURIComponent(options.releaseId)}&select=*`,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (result.error) {
    console.error("Failed to load content release.", {
      error: result.error,
      releaseId: options.releaseId,
      status: result.status,
    });
    return null;
  }

  return result.data?.[0] ?? null;
}

/**
 * Atomically claims a queued release for delivery by transitioning it to the
 * sending state. A null result means the release could not be claimed cleanly.
 */
export async function claimQueuedRelease(options: {
  releaseId: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const now = new Date().toISOString();
  const result = await fetchSupabaseJson<ContentReleaseRecord[]>({
    body: {
      delivery_finished_at: null,
      delivery_started_at: now,
      last_delivery_error: null,
      status: "sending",
      updated_at: now,
    },
    method: "PATCH",
    path: `content_releases?id=eq.${encodeURIComponent(options.releaseId)}&status=eq.queued&select=*`,
    preferRepresentation: true,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (result.error) {
    console.error("Failed to claim queued content release.", {
      error: result.error,
      releaseId: options.releaseId,
      status: result.status,
    });
    return null;
  }

  return result.data?.[0] ?? null;
}

/**
 * Loads the snapshotted items attached to a release in creation order so the
 * worker can build a stable email payload for every recipient batch.
 */
export async function loadReleaseItems(options: {
  releaseId: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const result = await fetchSupabaseJson<ContentReleaseItemRecord[]>({
    path: `content_release_items?release_id=eq.${encodeURIComponent(options.releaseId)}&select=item_id,item_type,title_snapshot,url_snapshot&order=created_at.asc`,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (result.error) {
    console.error("Failed to load content release items.", {
      error: result.error,
      releaseId: options.releaseId,
      status: result.status,
    });
    return null;
  }

  return result.data ?? [];
}

/**
 * Loads durable Broadcast targets for a release. Cancelled targets are excluded
 * from delivery summaries and processing.
 */
export async function loadReleaseTargets(options: {
  releaseId: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const result = await fetchSupabaseJson<ContentReleaseTargetRecord[]>({
    path: `content_release_targets?release_id=eq.${encodeURIComponent(options.releaseId)}&status=neq.cancelled&select=*&order=created_at.asc`,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (result.error) {
    console.error("Failed to load content release targets.", {
      error: result.error,
      releaseId: options.releaseId,
      status: result.status,
    });
    return null;
  }

  return result.data ?? [];
}

/**
 * Updates one durable content release target. Returns false when the target
 * state could not be persisted, which lets the caller stop before sending an
 * untracked provider Broadcast.
 */
export async function updateContentReleaseTarget(options: {
  payload: Record<string, unknown>;
  serviceRoleKey: string;
  supabaseUrl: string;
  targetId: string;
}) {
  const result = await fetchSupabaseJson<ContentReleaseTargetRecord[]>({
    body: {
      ...options.payload,
      updated_at: new Date().toISOString(),
    },
    method: "PATCH",
    path: `content_release_targets?id=eq.${encodeURIComponent(options.targetId)}&select=id`,
    preferRepresentation: true,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (result.error) {
    console.error("Failed to update content release target.", {
      error: result.error,
      status: result.status,
      targetId: options.targetId,
    });
    return false;
  }

  return true;
}

/**
 * Writes the terminal delivery state for a release, including the final cursor,
 * summary, error message, and sent timestamp when delivery fully succeeded.
 */
export async function finalizeRelease(options: {
  cursor: string | null;
  lastDeliveryError: string | null;
  releaseId: string;
  serviceRoleKey: string;
  status: ContentReleaseRecord["status"];
  summary: ContentReleaseDeliverySummary;
  supabaseUrl: string;
}) {
  const now = new Date().toISOString();
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/content_releases?id=eq.${encodeURIComponent(options.releaseId)}`,
    {
      body: JSON.stringify({
        delivery_cursor: options.cursor,
        delivery_finished_at: now,
        delivery_summary: options.summary,
        last_delivery_error: options.lastDeliveryError,
        sent_at: options.status === "sent" ? now : null,
        status: options.status,
        updated_at: now,
      }),
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    console.error("Failed to finalize content release delivery.", {
      error: await response.text(),
      releaseId: options.releaseId,
      status: response.status,
    });
  }
}
