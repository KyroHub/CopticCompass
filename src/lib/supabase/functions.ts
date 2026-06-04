import "server-only";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/config";
import type { Json } from "@/types/supabase";

type InvokeSupabaseEdgeFunctionResult<T = unknown> =
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

/**
 * Invokes a Supabase Edge Function with the service-role key and returns a
 * non-throwing success/error envelope for callers.
 */
export async function invokeSupabaseEdgeFunction<T = unknown>(
  functionName: string,
  payload?: Json,
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

  let response: Response;
  try {
    response = await fetch(`${env.url}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to reach the Supabase Edge Function.",
      status: 500,
      success: false,
    };
  }

  const responseText = await response.text();
  const responseJson = responseText ? safeParseJson(responseText) : null;

  if (!response.ok) {
    const responseError =
      responseJson && typeof responseJson.error === "string"
        ? responseJson.error
        : responseText || "Supabase Edge Function invocation failed.";

    return {
      error: responseError,
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
