import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ensureGalleryBucket } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

// App Router route segment config — allow up to 5 min for large uploads
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/gallery — list gallery files (authenticated users)
 * Query params:
 *   folder_id=<uuid>  → files in that folder
 *   folder_id=root    → files at root level (folder_id IS NULL)
 *   (omitted)         → all files (backward-compatible)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();

    const folderParam = req.nextUrl.searchParams.get("folder_id");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("gallery_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (folderParam === "root") {
      query = query.is("folder_id", null);
    } else if (folderParam) {
      query = query.eq("folder_id", folderParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[gallery GET] Supabase query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[gallery GET] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/gallery — upload a file (admin only)
 *
 * Expects multipart/form-data with a single "file" field.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();
    if (!isAdminToken(req)) return forbidden();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folder_id") as string) || null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    await ensureGalleryBucket();
    const filePath = `uploads/${Date.now()}_${file.name}`;

    // Convert File to Buffer for reliable server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[gallery POST] Storage upload error:", uploadError.message);
      if (uploadError.message.includes("maximum allowed size")) {
        return NextResponse.json(
          { error: "Il file supera il limite massimo di 50 MB (piano Free di Supabase)." },
          { status: 413 },
        );
      }
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Determine category
    let category = "documents";
    if (file.type.startsWith("image/")) category = "images";
    else if (file.type.startsWith("video/")) category = "videos";

    // 3. Insert metadata row
    const { data, error: insertError } = await supabase
      .from("gallery_files")
      .insert({
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category,
        uploaded_by: user.id,
        folder_id: folderId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[gallery POST] DB insert error:", insertError.message);
      // Rollback storage upload on metadata failure
      await supabase.storage.from("gallery").remove([filePath]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[gallery POST] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
