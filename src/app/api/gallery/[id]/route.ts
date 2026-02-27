import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

/**
 * DELETE /api/gallery/[id] — delete a gallery file (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifyToken(req);
  if (!user) return unauthorized();
  if (!isAdminToken(req)) return forbidden();

  const { id } = await params;

  // 1. Get the file record to know the storage path
  const { data: file, error: fetchError } = await supabaseAdmin
    .from("gallery_files")
    .select("file_path")
    .eq("id", id)
    .single();

  if (fetchError || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // 2. Remove from storage
  await supabaseAdmin.storage.from("gallery").remove([file.file_path]);

  // 3. Delete metadata row
  const { error: deleteError } = await supabaseAdmin
    .from("gallery_files")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
