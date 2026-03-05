import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyToken, isAdminToken, unauthorized, forbidden } from "@/lib/api-auth";

/**
 * GET /api/gallery/folders?parent_id=<uuid|null>
 * Lists folders at a given level (null = root).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();

    const parentId = req.nextUrl.searchParams.get("parent_id") || null;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("gallery_folders")
      .select("*")
      .order("name", { ascending: true });

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[gallery/folders GET] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[gallery/folders GET] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/gallery/folders
 * Body: { name: string, parent_id?: string | null }
 * Creates a new folder (admin only).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    if (!user) return unauthorized();
    if (!isAdminToken(req)) return forbidden();

    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }
    if (name.length > 255) {
      return NextResponse.json({ error: "Folder name too long" }, { status: 400 });
    }

    const parentId = body.parent_id || null;
    const supabase = getSupabaseAdmin();

    // Verify parent exists if provided
    if (parentId) {
      const { data: parent, error: parentErr } = await supabase
        .from("gallery_folders")
        .select("id")
        .eq("id", parentId)
        .single();

      if (parentErr || !parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const { data, error } = await supabase
      .from("gallery_folders")
      .insert({ name, parent_id: parentId, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error("[gallery/folders POST] error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[gallery/folders POST] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
