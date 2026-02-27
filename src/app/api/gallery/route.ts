import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

/**
 * GET /api/gallery — list all gallery files (authenticated users)
 */
export async function GET(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return unauthorized();

  const { data, error } = await supabaseAdmin
    .from("gallery_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/gallery — upload a file (admin only)
 *
 * Expects multipart/form-data with a single "file" field.
 */
export async function POST(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return unauthorized();
  if (!isAdminToken(req)) return forbidden();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filePath = `uploads/${Date.now()}_${file.name}`;

  // 1. Upload to storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from("gallery")
    .upload(filePath, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 2. Determine category
  let category = "documents";
  if (file.type.startsWith("image/")) category = "images";
  else if (file.type.startsWith("video/")) category = "videos";

  // 3. Insert metadata row
  const { data, error: insertError } = await supabaseAdmin
    .from("gallery_files")
    .insert({
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      category,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    // Rollback storage upload on metadata failure
    await supabaseAdmin.storage.from("gallery").remove([filePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
