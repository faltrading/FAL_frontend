import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

/**
 * GET /api/gallery/folders/[id]/breadcrumb
 * Returns the folder path from root to this folder (for breadcrumbs).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Walk up the tree to build the breadcrumb path
    const breadcrumb: { id: string; name: string }[] = [];
    let currentId: string | null = id;

    while (currentId) {
      const { data: folder, error } = await supabase
        .from("gallery_folders")
        .select("id, name, parent_id")
        .eq("id", currentId)
        .single();

      if (error || !folder) break;

      breadcrumb.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id;
    }

    return NextResponse.json(breadcrumb);
  } catch (err) {
    console.error("[gallery/folders/[id]/breadcrumb GET] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
