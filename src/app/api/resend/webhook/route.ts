import { handleResendWebhookRequest } from "@/features/communications/lib/server/resendWebhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleResendWebhookRequest(request);
}
