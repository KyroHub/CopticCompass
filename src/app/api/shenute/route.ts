import { handleShenuteChatPost } from "@/features/shenute/lib/server/chatRoute";

export const maxDuration = 300;
export const runtime = "nodejs";

/**
 * Delegates Shenute chat orchestration to the feature-owned server module while
 * preserving the public API route contract.
 */
export async function POST(request: Request) {
  return handleShenuteChatPost(request);
}
