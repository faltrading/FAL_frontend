import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

/**
 * PATCH /api/gallery/folders/[id] — rename a folder (admin only)
 * Body: { name: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();
    if (!isAdminToken(req)) return forbidden();

    const { id } = await params;
    const body = await req.json();
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }
    if (name.length > 255) {
      return NextResponse.json({ error: "Folder name too long" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("gallery_folders")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[gallery/folders PATCH] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[gallery/folders PATCH] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/gallery/folders/[id] — delete a folder and all its contents (admin only)
 * Cascades: DB ON DELETE CASCADE removes sub-folders,
 * but we need to manually clean up storage files.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();
    if (!isAdminToken(req)) return forbidden();

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Recursively collect all folder IDs in the subtree
    const collectFolderIds = async (folderId: string): Promise<string[]> => {
      const ids = [folderId];
      const { data: children } = await supabase
        .from("gallery_folders")
        .select("id")
        .eq("parent_id", folderId);

      if (children) {
        for (const child of children) {
          const childIds = await collectFolderIds(child.id);
          ids.push(...childIds);
        }
      }
      return ids;
    };

    const allFolderIds = await collectFolderIds(id);

    // Get all files in those folders to clean up storage
    const { data: files } = await supabase
      .from("gallery_files")
      .select("file_path")
      .in("folder_id", allFolderIds);

    if (files && files.length > 0) {
      const paths = files.map((f: { file_path: string }) => f.file_path);
      // Supabase storage remove accepts batches of up to 100
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from("gallery").remove(paths.slice(i, i + 100));
      }
    }

    // Delete the root folder — CASCADE removes sub-folders;
    // gallery_files.folder_id ON DELETE SET NULL would orphan files,
    // so we delete the file rows explicitly first.
    if (allFolderIds.length > 0) {
      await supabase
        .from("gallery_files")
        .delete()
        .in("folder_id", allFolderIds);
    }

    const { error } = await supabase
      .from("gallery_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[gallery/folders DELETE] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[gallery/folders DELETE] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
