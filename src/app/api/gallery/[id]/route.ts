import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

/**
 * DELETE /api/gallery/[id] — delete a gallery file (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();
    if (!isAdminToken(req)) return forbidden();

    const supabase = getSupabaseAdmin();
    const { id } = await params;

    // 1. Get the file record to know the storage path
    const { data: file, error: fetchError } = await supabase
      .from("gallery_files")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 2. Remove from storage
    await supabase.storage.from("gallery").remove([file.file_path]);

    // 3. Delete metadata row
    const { error: deleteError } = await supabase
      .from("gallery_files")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[gallery DELETE] DB delete error:", deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[gallery DELETE] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
