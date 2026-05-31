import { handleAdminRagJsonSourcesPost } from "@/features/admin/lib/server/ragJsonSourcesRoute";

export const maxDuration = 300;
export const runtime = "nodejs";

export function POST(request: Request) {
  return handleAdminRagJsonSourcesPost(request);
}
