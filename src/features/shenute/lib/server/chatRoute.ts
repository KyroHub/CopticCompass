import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { createShenuteAssistantResponse } from "./assistantResponses";
import { createShenuteErrorResponse } from "./chatErrors";
import { extractMessageText } from "./messageAdapters";
import { toPageContext } from "./pageContext";
import { buildShenuteSystemPrompt } from "./prompts";
import {
  toOptionalInferenceProvider,
  toRagInferenceProvider,
} from "./providerSelection";
import { buildShenuteRagContext } from "./ragContext";
import {
  getShenutePayloadSizeResponse,
  getShenuteRateLimitResponse,
} from "./requestGuards";

import type { ShenuteChatRequestPayload } from "./chatTypes";

export async function handleShenuteChatPost(req: Request) {
  try {
    const payloadSizeResponse = getShenutePayloadSizeResponse(req.headers);
    if (payloadSizeResponse) {
      return payloadSizeResponse;
    }

    if (!hasSupabaseRuntimeEnv()) {
      return createShenuteErrorResponse("external_service_unavailable", 503);
    }

    const supabase = await createClient();
    const authenticatedUser = await getAuthenticatedUser(supabase);

    if (!authenticatedUser) {
      return createShenuteErrorResponse("auth_required", 401);
    }

    const rateLimitResponse = await getShenuteRateLimitResponse(
      authenticatedUser.id,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    let payload: ShenuteChatRequestPayload;

    try {
      payload = (await req.json()) as ShenuteChatRequestPayload;
    } catch {
      return createShenuteErrorResponse("validation_failed", 400);
    }

    const { messages } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return createShenuteErrorResponse("validation_failed", 400);
    }

    const queryProvider = toOptionalInferenceProvider(
      new URL(req.url).searchParams.get("provider"),
    );
    const bodyProvider = toOptionalInferenceProvider(payload.inferenceProvider);
    const inferenceProvider = bodyProvider ?? queryProvider ?? "thoth";
    const ragInferenceProvider = toRagInferenceProvider(inferenceProvider);
    const shenuteSessionId =
      typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : "default";
    const pageContext = toPageContext(payload.pageContext);

    const latestMessage = messages[messages.length - 1];
    const latestMessageText = extractMessageText(latestMessage);
    const contextText = await buildShenuteRagContext({
      inferenceProvider,
      latestMessageText,
      ragInferenceProvider,
    });
    const systemPrompt = buildShenuteSystemPrompt({
      contextText,
      inferenceProvider,
      pageContext,
    });

    return await createShenuteAssistantResponse({
      authenticatedUserId: authenticatedUser.id,
      inferenceProvider,
      latestMessageText,
      messages,
      shenuteSessionId,
      systemPrompt,
    });
  } catch (error: unknown) {
    console.error("AI API Error:", error);

    return createShenuteErrorResponse("external_service_unavailable", 500);
  }
}
