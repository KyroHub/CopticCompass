import { handleShenuteFeedbackPost } from "@/features/shenute/lib/server/feedbackRoute";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleShenuteFeedbackPost(request);
}
