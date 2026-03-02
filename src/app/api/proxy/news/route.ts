import { NextResponse } from "next/server";

const FOREX_FACTORY_URL =
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

// In-memory cache shared across all requests on the same server instance.
// TTL: 30 minutes — matches the polling interval used by the news page.
const CACHE_TTL_MS = 30 * 60 * 1000;

let cachedData: unknown = null;
let cachedAt: number = 0;

export async function GET() {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedData !== null && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedData, {
      headers: {
        "X-Cache": "HIT",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=60",
      },
    });
  }

  try {
    const res = await fetch(FOREX_FACTORY_URL, {
      headers: { "User-Agent": "FAL-Trading/1.0" },
      signal: AbortSignal.timeout(10_000), // 10 s timeout
    });

    if (!res.ok) {
      // If ForexFactory is down/rate-limiting, serve stale cache if available
      if (cachedData !== null) {
        return NextResponse.json(cachedData, {
          headers: {
            "X-Cache": "STALE",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=60",
          },
        });
      }
      return NextResponse.json(
        { error: "External news service unavailable", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Update cache
    cachedData = data;
    cachedAt = now;

    return NextResponse.json(data, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=60",
      },
    });
  } catch {
    // Network error / timeout — serve stale if available
    if (cachedData !== null) {
      return NextResponse.json(cachedData, {
        headers: {
          "X-Cache": "STALE",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=60",
        },
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch news data" },
      { status: 502 }
    );
  }
}
