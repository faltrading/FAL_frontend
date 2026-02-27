"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module");

    if (isChunkError) {
      console.warn("[App] ChunkLoadError — clearing SW cache and reloading");

      // Unregister stale service worker and wipe caches, then hard-reload
      const cleanup = async () => {
        try {
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          }
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch (e) {
          console.warn("[App] Cache cleanup error:", e);
        }

        const reloaded = sessionStorage.getItem("chunk_reload");
        if (!reloaded) {
          sessionStorage.setItem("chunk_reload", "1");
          window.location.reload();
        } else {
          sessionStorage.removeItem("chunk_reload");
        }
      };
      cleanup();
      return;
    }

    console.error("[App] Runtime error:", error);
  }, [error]);

  return (
    <html>
      <body style={{ background: "#0f172a", color: "#e2e8f0", fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", textAlign: "center", padding: "24px" }}>
        <p style={{ fontSize: "14px", color: "#94a3b8" }}>
          Si è verificato un errore nel caricamento della pagina.
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => { sessionStorage.removeItem("chunk_reload"); reset(); }}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #334155", background: "transparent", color: "#e2e8f0", cursor: "pointer", fontSize: "14px" }}
          >
            Riprova
          </button>
          <button
            onClick={() => { sessionStorage.removeItem("chunk_reload"); window.location.reload(); }}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontSize: "14px" }}
          >
            Ricarica pagina
          </button>
        </div>
      </body>
    </html>
  );
}
