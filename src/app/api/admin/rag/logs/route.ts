import { handleAdminRagLogsGet } from "@/features/admin/lib/server/ragLogsRoute";

export const runtime = "nodejs";

export function GET(request: Request) {
  return handleAdminRagLogsGet(request);
}
