import { NextResponse } from "next/server";
import { getRagIngestionLogs } from "@/features/admin/lib/ragIngestion";
import { getProfileRole } from "@/features/profile/lib/server/queries";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        {
          success: false,
          error: "RAG ingestion logs are unavailable right now.",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to view RAG logs.",
        },
        { status: 401 },
      );
    }

    const role = await getProfileRole(supabase, user.id);
    if (role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can view RAG logs.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const ingestId = searchParams.get("ingestId")?.trim();
    const prefix = searchParams.get("prefix") === "1";

    if (!ingestId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing ingestId query parameter.",
        },
        { status: 400 },
      );
    }

    const logs = getRagIngestionLogs({ ingestId, prefix });

    return NextResponse.json({
      success: true,
      ingestId,
      prefix,
      logs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Could not load RAG logs.",
      },
      { status: 500 },
    );
  }
}
