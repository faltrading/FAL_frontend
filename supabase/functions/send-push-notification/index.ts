// Deno Edge Function: send-push-notification
// Generalized push notification service for FAL Trading.
//
// Handles three notification types:
//   "news" — High-impact market news  (triggered by pg_cron + pg_net)
//   "chat" — New chat messages         (triggered by chat service via HTTP)
//   "call" — New call rooms            (triggered by call service via HTTP)
//
// Environment variables (set in Supabase Dashboard > Edge Functions > Secrets):
//   SUPABASE_URL              - Project URL
//   SUPABASE_SERVICE_ROLE_KEY - Service role key
//   VAPID_PUBLIC_KEY          - Base64url-encoded VAPID public key
//   VAPID_PRIVATE_KEY         - Base64url-encoded VAPID private key
//   VAPID_SUBJECT             - mailto: URI for VAPID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  preferences: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// VAPID / Web Push helpers
// ---------------------------------------------------------------------------

function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const raw = atob(b64 + "=".repeat(pad));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

/** Create HKDF-derived key material (RFC 5869). */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const hmacKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, ikm));
  const infoKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const t = new Uint8Array(await crypto.subtle.sign("HMAC", infoKey, concatUint8(info, new Uint8Array([1]))));
  return t.slice(0, length);
}

/** Build the encrypted Web Push payload (RFC 8291 / aes128gcm). */
async function encryptPayload(
  plaintext: Uint8Array,
  p256dhB64: string,
  authB64: string,
): Promise<{ ciphertext: Uint8Array; localPublicKeyBytes: Uint8Array; salt: Uint8Array }> {
  const clientPublicBytes = base64urlToUint8Array(p256dhB64);
  const clientAuth = base64urlToUint8Array(authB64);

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: await crypto.subtle.importKey("raw", clientPublicBytes, { name: "ECDH", namedCurve: "P-256" }, false, []) },
      localKeyPair.privateKey,
      256,
    ),
  );

  const enc = new TextEncoder();
  const ikm = await hkdf(clientAuth, sharedSecret, concatUint8(enc.encode("WebPush: info\0"), clientPublicBytes, localPublicKeyBytes), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const contentKey = await crypto.subtle.importKey("raw", prk, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = concatUint8(new Uint8Array([2, 0]), plaintext); // 2-byte padding header
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, contentKey, padded));

  // aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, 4096);
  const header = concatUint8(salt, new Uint8Array(rs.buffer), new Uint8Array([65]), localPublicKeyBytes);
  return { ciphertext: concatUint8(header, encrypted), localPublicKeyBytes, salt };
}

/** Sign a VAPID JWT (ES256 over the push endpoint origin). */
async function signVapid(endpoint: string): Promise<{ authorization: string; cryptoKey: string }> {
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: expiry, sub: vapidSubject };

  const enc = new TextEncoder();
  const jwtUnsigned =
    uint8ArrayToBase64url(enc.encode(JSON.stringify(header))) +
    "." +
    uint8ArrayToBase64url(enc.encode(JSON.stringify(payload)));

  // Import VAPID private key (raw 32-byte scalar)
  const rawPrivate = base64urlToUint8Array(vapidPrivate);
  const rawPublic = base64urlToUint8Array(vapidPublic);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64url(rawPublic.slice(1, 33)),
    y: uint8ArrayToBase64url(rawPublic.slice(33, 65)),
    d: uint8ArrayToBase64url(rawPrivate),
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(jwtUnsigned)));

  // Convert DER-like signature to raw r||s (each 32 bytes)
  const r = sig.slice(0, 32);
  const s = sig.slice(32, 64);
  const rawSig = concatUint8(r, s);

  const jwt = jwtUnsigned + "." + uint8ArrayToBase64url(rawSig);
  return {
    authorization: `vapid t=${jwt}, k=${vapidPublic}`,
    cryptoKey: `p256ecdsa=${vapidPublic}`,
  };
}

/** Send a single Web Push message. Returns true on success. */
async function sendWebPush(sub: Subscription, payloadJson: string): Promise<boolean> {
  try {
    const { ciphertext } = await encryptPayload(
      new TextEncoder().encode(payloadJson),
      sub.p256dh,
      sub.auth_key,
    );
    const vapid = await signVapid(sub.endpoint);

    const resp = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: vapid.authorization,
        "Crypto-Key": vapid.cryptoKey,
      },
      body: ciphertext,
    });

    if (resp.status === 201 || resp.status === 200) return true;

    // Subscription expired or invalid — caller should clean up
    if (resp.status === 404 || resp.status === 410) {
      console.warn(`Subscription gone (${resp.status}): ${sub.endpoint}`);
      return false;
    }

    console.error(`Push failed ${resp.status} for ${sub.endpoint}: ${await resp.text()}`);
    return false;
  } catch (err) {
    console.error(`Push error for ${sub.endpoint}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Notification builders
// ---------------------------------------------------------------------------

function buildNewsNotification(data: Record<string, string>): string {
  const time = new Date(data.event_date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return JSON.stringify({
    title: `📰 High Impact — ${data.event_country}`,
    body: `${data.event_title}\n🕐 ${time} UTC`,
    url: "/news",
    tag: `news-${data.event_title}-${data.event_date}`,
  });
}

function buildChatNotification(data: Record<string, string>): string {
  const preview = data.message_preview?.length > 80
    ? data.message_preview.slice(0, 77) + "…"
    : data.message_preview || "";
  return JSON.stringify({
    title: `💬 ${data.sender_username}`,
    body: preview || "New message",
    url: "/chat",
    tag: `chat-${data.group_id}-${Date.now()}`,
  });
}

function buildCallNotification(data: Record<string, string>): string {
  return JSON.stringify({
    title: `📞 ${data.creator_username}`,
    body: data.room_name || "New call room",
    url: "/calls",
    tag: `call-${data.call_id}`,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const type: string = body.type || "news"; // backward compat

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- Fetch subscriptions and filter by type + preferences ----
    let query = supabase.from("push_subscriptions").select("*");

    // For chat notifications, only notify group members (excluding sender)
    if (type === "chat" && body.group_id) {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", body.group_id);

      if (!members || members.length === 0) {
        return jsonOk({ sent: 0, message: "No group members" });
      }

      const memberIds = members.map((m: { user_id: string }) => m.user_id)
        .filter((id: string) => id !== body.sender_id);

      if (memberIds.length === 0) {
        return jsonOk({ sent: 0, message: "No other members" });
      }

      query = query.in("user_id", memberIds);
    }

    const { data: allSubs, error } = await query;
    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allSubs || allSubs.length === 0) {
      return jsonOk({ sent: 0, message: "No subscriptions" });
    }

    // Filter by preference toggle and exclude sender/creator
    const excludeUserId = body.sender_id || body.creator_id || "";
    const prefKey = `${type}_enabled`;
    const matching = (allSubs as Subscription[]).filter((sub) => {
      if (sub.user_id === excludeUserId) return false;
      const prefs = sub.preferences || {};
      return prefs[prefKey] !== false; // default true if key missing
    });

    if (matching.length === 0) {
      return jsonOk({ sent: 0, message: "No matching subscriptions" });
    }

    // Build the notification payload
    let notifPayload: string;
    switch (type) {
      case "chat":
        notifPayload = buildChatNotification(body);
        break;
      case "call":
        notifPayload = buildCallNotification(body);
        break;
      default:
        notifPayload = buildNewsNotification(body);
    }

    // Check VAPID keys
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    if (!vapidPublic || !vapidPrivate || !vapidSubject) {
      console.error("VAPID keys not configured");
      return new Response(JSON.stringify({ error: "VAPID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send in parallel with concurrency limit
    const BATCH = 20;
    let sent = 0;
    let failed = 0;
    const toDelete: string[] = [];

    for (let i = 0; i < matching.length; i += BATCH) {
      const batch = matching.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((sub) => sendWebPush(sub, notifPayload)),
      );

      results.forEach((r, idx) => {
        if (r.status === "fulfilled" && r.value) {
          sent++;
        } else {
          failed++;
          // Mark expired subscriptions for cleanup
          toDelete.push(batch[idx].id);
        }
      });
    }

    // Clean up expired subscriptions
    if (toDelete.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", toDelete);
    }

    return jsonOk({ sent, failed, total: matching.length });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function jsonOk(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
