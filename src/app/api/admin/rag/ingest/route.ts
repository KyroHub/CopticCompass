import { handleAdminRagIngestPost } from "@/features/admin/lib/server/ragIngestRoute";

export const maxDuration = 300;
export const runtime = "nodejs";

export function POST(request: Request) {
  return handleAdminRagIngestPost(request);
}
