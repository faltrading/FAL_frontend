"use client";

import { useEffect } from "react";

export default function JournalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ChunkLoadError = stale cache after redeployment — force a hard reload once
    if (
      error.name === "ChunkLoadError" ||
      error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module")
    ) {
      console.warn("[Journal] ChunkLoadError detected — forcing hard reload");
      const reloaded = sessionStorage.getItem("chunk_reload");
      if (!reloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
      } else {
        // Second attempt still failed — clear flag so next visit retries
        sessionStorage.removeItem("chunk_reload");
      }
      return;
    }
    console.error("[Journal] Runtime error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <p className="text-surface-300 text-sm">Si è verificato un errore nel caricamento della pagina.</p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            sessionStorage.removeItem("chunk_reload");
            reset();
          }}
          className="btn-secondary text-sm"
        >
          Riprova
        </button>
        <button
          onClick={() => {
            sessionStorage.removeItem("chunk_reload");
            window.location.reload();
          }}
          className="btn-primary text-sm"
        >
          Ricarica pagina
        </button>
      </div>
    </div>
  );
}
