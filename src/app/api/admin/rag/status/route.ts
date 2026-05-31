import { handleAdminRagStatusGet } from "@/features/admin/lib/server/ragStatusRoute";

export const runtime = "nodejs";

export function GET() {
  return handleAdminRagStatusGet();
}
