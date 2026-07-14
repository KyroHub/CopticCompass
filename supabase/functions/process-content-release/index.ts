import { deliverReleaseByBroadcast } from "./broadcasts.ts";
import {
  getProcessContentReleaseEnv,
  getResendBroadcastEnv,
  jsonResponse,
} from "./config.ts";
import {
  claimQueuedRelease,
  finalizeRelease,
  loadRelease,
} from "./supabaseRest.ts";
import {
  getContentReleaseDeliverySummary,
  parseContentReleaseInvocationPayload,
  type ContentReleaseRecord,
} from "../_shared/contentReleaseDelivery.ts";
import { hasExpectedBearerToken } from "../_shared/requestAuth.ts";

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare const EdgeRuntime:
  | {
      waitUntil(promise: Promise<unknown>): void;
    }
  | undefined;

type ReleaseDeliveryOptions = {
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  serviceRoleKey: string;
  supabaseUrl: string;
};

/**
 * Delivers a release through Resend Broadcasts only. Missing Segment, Topic, or
 * full-access API configuration fails closed before any direct Email API send.
 */
async function deliverReleaseBatch(options: ReleaseDeliveryOptions) {
  const broadcastEnv = getResendBroadcastEnv();
  if (!broadcastEnv) {
    await finalizeRelease({
      cursor: null,
      lastDeliveryError:
        "Resend Broadcast delivery requires full-access API, Segment, and Topic configuration.",
      releaseId: options.release.id,
      serviceRoleKey: options.serviceRoleKey,
      status: "approved",
      summary: getContentReleaseDeliverySummary(options.release),
      supabaseUrl: options.supabaseUrl,
    });
    return;
  }

  await deliverReleaseByBroadcast({
    broadcastEnv,
    notificationFromEmail: options.notificationFromEmail,
    release: options.release,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Parses the worker invocation JSON and returns a ready-made response when the
 * request body is malformed or missing a release id.
 */
async function parseReleaseInvocationRequest(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse content release worker payload.", error);
    return {
      invocation: null,
      response: jsonResponse(400, { error: "Invalid JSON payload." }),
    };
  }

  const invocation = parseContentReleaseInvocationPayload(payload);
  if (!invocation) {
    return {
      invocation: null,
      response: jsonResponse(400, { error: "A valid releaseId is required." }),
    };
  }

  return {
    invocation,
    response: null,
  };
}

/**
 * Claims the queued release for processing, or returns the correct webhook
 * response when the release is missing or no longer eligible to run.
 */
async function claimReleaseForProcessing(options: {
  releaseId: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const claimedRelease = await claimQueuedRelease(options);
  if (claimedRelease) {
    return {
      release: claimedRelease,
      response: null,
    };
  }

  const currentRelease = await loadRelease(options);
  if (!currentRelease) {
    return {
      release: null,
      response: jsonResponse(404, { error: "Release draft not found." }),
    };
  }

  if (currentRelease.status === "sending" || currentRelease.status === "sent") {
    return {
      release: null,
      response: jsonResponse(202, {
        releaseId: options.releaseId,
        success: true,
      }),
    };
  }

  return {
    release: null,
    response: jsonResponse(409, {
      error: "Only queued releases can be processed.",
    }),
  };
}

/**
 * Finalizes the release back into an approved state when the background worker
 * crashes unexpectedly.
 */
async function handleUnexpectedWorkerFailure(options: {
  error: unknown;
  release: ContentReleaseRecord;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  console.error("Unexpected content release worker failure.", options.error);

  await finalizeRelease({
    cursor: null,
    lastDeliveryError:
      options.error instanceof Error
        ? options.error.message
        : "The release worker failed unexpectedly.",
    releaseId: options.release.id,
    serviceRoleKey: options.serviceRoleKey,
    status: "approved",
    summary: getContentReleaseDeliverySummary(options.release),
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Starts the delivery batch and hands it to `waitUntil` when the edge runtime
 * supports background execution.
 */
async function scheduleReleaseBatch(options: {
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const backgroundTask = deliverReleaseBatch(options).catch((error) =>
    handleUnexpectedWorkerFailure({
      error,
      release: options.release,
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
    }),
  );

  if (
    typeof EdgeRuntime !== "undefined" &&
    typeof EdgeRuntime.waitUntil === "function"
  ) {
    EdgeRuntime.waitUntil(backgroundTask);
    return;
  }

  await backgroundTask;
}

/**
 * Validates the worker request, claims the queued release, and starts the
 * background delivery chain.
 */
async function handleProcessContentReleaseRequest(request: Request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const env = getProcessContentReleaseEnv();
  if (!env) {
    console.error("Missing one or more content release delivery secrets.");
    return jsonResponse(500, {
      error: "Content release delivery is not configured.",
    });
  }

  if (!hasExpectedBearerToken(request, env.serviceRoleKey)) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const parsedRequest = await parseReleaseInvocationRequest(request);
  if (parsedRequest.response) {
    return parsedRequest.response;
  }

  const claimedReleaseResult = await claimReleaseForProcessing({
    releaseId: parsedRequest.invocation.releaseId,
    serviceRoleKey: env.serviceRoleKey,
    supabaseUrl: env.supabaseUrl,
  });
  if (claimedReleaseResult.response) {
    return claimedReleaseResult.response;
  }

  const claimedRelease = claimedReleaseResult.release;

  await scheduleReleaseBatch({
    notificationFromEmail: env.notificationFromEmail,
    release: claimedRelease,
    serviceRoleKey: env.serviceRoleKey,
    supabaseUrl: env.supabaseUrl,
  });

  return jsonResponse(202, {
    queued: true,
    releaseId: claimedRelease.id,
    success: true,
  });
}

Deno.serve(handleProcessContentReleaseRequest);
