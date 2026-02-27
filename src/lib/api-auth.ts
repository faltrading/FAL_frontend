import { NextRequest, NextResponse } from "next/server";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "";

interface AuthUser {
  id: string;
  username: string;
  is_active: boolean;
  [key: string]: unknown;
}

/**
 * Verify the Bearer token by calling the user service through the API gateway.
 * Returns the authenticated user or null.
 */
export async function verifyToken(req: NextRequest): Promise<AuthUser | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/v1/users/me`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Check whether the bearer token belongs to an admin user.
 * Decodes the JWT payload client-side (no signature check – the gateway
 * already validated the token in verifyToken).
 */
export function isAdminToken(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    const payload = JSON.parse(atob(auth.split(" ")[1].split(".")[1]));
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
