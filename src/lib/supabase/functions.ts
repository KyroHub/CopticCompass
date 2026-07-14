import "server-only";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/config";
import type { Json } from "@/types/supabase";

export type InvokeSupabaseEdgeFunctionResult<T = unknown> =
  | {
      data: T | null;
      status: number;
      success: true;
    }
  | {
      error: string;
      status: number;
      success: false;
    };

type InvokeSupabaseEdgeFunctionOptions = {
  bearerToken?: string;
};

/**
 * Invokes a Supabase Edge Function and returns a non-throwing success/error
 * envelope for callers. By default it authenticates with the service-role key;
 * callers may provide a narrower function-specific bearer token instead.
 */
export async function invokeSupabaseEdgeFunction<T = unknown>(
  functionName: string,
  payload?: Json,
  options?: InvokeSupabaseEdgeFunctionOptions,
): Promise<InvokeSupabaseEdgeFunctionResult<T>> {
  assertServerOnly("invokeSupabaseEdgeFunction");

  const env = getSupabaseServiceRoleEnv();
  if (!env) {
    return {
      error: "Supabase Edge Functions are not configured in this environment.",
      status: 500,
      success: false,
    };
  }

  const bearerToken = options?.bearerToken ?? env.serviceRoleKey;

  let response: Response;
  try {
    response = await fetch(`${env.url}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch (error) {
    return {
      error: getFetchFailureMessage(error),
      status: 500,
      success: false,
    };
  }

  const responseText = await response.text();
  const responseJson = responseText ? safeParseJson(responseText) : null;

  if (!response.ok) {
    return {
      error: getEdgeFunctionResponseError(responseJson, responseText),
      status: response.status,
      success: false,
    };
  }

  return {
    data: responseJson as T | null,
    status: response.status,
    success: true,
  };
}

function getFetchFailureMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to reach the Supabase Edge Function.";
}

function getEdgeFunctionResponseError(
  responseJson: Record<string, unknown> | null,
  responseText: string,
) {
  if (typeof responseJson?.error === "string") {
    return responseJson.error;
  }

  return responseText || "Supabase Edge Function invocation failed.";
}

/**
 * Parses a JSON response body defensively and returns `null` for invalid JSON.
 */
function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}
