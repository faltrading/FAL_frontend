"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { GalleryFile } from "@/lib/types";
import {
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  Trash2,
  FolderOpen,
  Loader2,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

type Category = "all" | "images" | "videos" | "documents";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPublicUrl(filePath: string) {
  return supabase.storage.from("gallery").getPublicUrl(filePath).data.publicUrl;
}

/* ─── Upload item tracking ────────────────────────────────────────────────── */

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  retries: number;
}

const MAX_RETRIES = 3;

function uploadFileWithProgress(
  file: File,
  token: string | null,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/gallery");

    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Connessione persa durante l'upload")),
    );
    xhr.addEventListener("timeout", () =>
      reject(new Error("Upload timeout")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload annullato")));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.timeout = 5 * 60 * 1000; // 5 min

    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

/* ─── Upload Progress Panel ───────────────────────────────────────────────── */

function UploadProgressPanel({
  items,
  onRetry,
  onDismiss,
}: {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: () => void;
}) {
  if (items.length === 0) return null;

  const allDone = items.every(
    (i) => i.status === "success" || i.status === "error",
  );

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 card border border-surface-700 shadow-2xl max-h-72 flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-surface-100">
          Upload ({items.filter((i) => i.status === "success").length}/
          {items.length})
        </span>
        {allDone && (
          <button
            onClick={onDismiss}
            className="text-surface-400 hover:text-surface-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {/* status icon */}
            <div className="shrink-0">
              {item.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : item.status === "error" ? (
                <AlertTriangle className="h-4 w-4 text-error-400" />
              ) : (
                <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
              )}
            </div>

            {/* name + bar */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-surface-200 truncate">
                {item.file.name}
              </p>
              {(item.status === "uploading" || item.status === "pending") && (
                <div className="mt-1 h-1.5 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "error" && (
                <p className="text-xs text-error-400 truncate mt-0.5">
                  {item.error}
                </p>
              )}
            </div>

            {/* progress text / retry */}
            <div className="shrink-0 text-xs text-surface-400 w-10 text-right">
              {item.status === "uploading" && `${item.progress}%`}
              {item.status === "error" && (
                <button
                  onClick={() => onRetry(item.id)}
                  className="text-brand-400 hover:text-brand-300"
                  title="Riprova"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Media Viewer Modal ──────────────────────────────────────────────────── */

function MediaViewer({
  file,
  files,
  onClose,
  onNavigate,
}: {
  file: GalleryFile;
  files: GalleryFile[];
  onClose: () => void;
  onNavigate: (file: GalleryFile) => void;
}) {
  const currentIndex = files.findIndex((f) => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;
  const url = getPublicUrl(file.file_path);

  /* keyboard navigation */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev)
        onNavigate(files[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext)
        onNavigate(files[currentIndex + 1]);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNavigate, files, currentIndex, hasPrev, hasNext]);

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const isImage = file.file_type.startsWith("image/");
  const isVideo = file.file_type.startsWith("video/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10">
        <p className="text-sm text-white truncate max-w-[60%]">
          {file.file_name}
        </p>
        <div className="flex items-center gap-3">
          <a
            href={url}
            download={file.file_name}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* prev / next */}
      {hasPrev && (
        <button
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors touch-target"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(files[currentIndex - 1]);
          }}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors touch-target"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(files[currentIndex + 1]);
          }}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* content */}
      <div
        className="relative max-w-[95vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={url}
            alt={file.file_name}
            className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
            draggable={false}
          />
        )}
        {isVideo && (
          <video
            src={url}
            controls
            autoPlay
            preload="metadata"
            playsInline
            className="max-w-full max-h-[85vh] rounded-lg"
          />
        )}
        {!isImage && !isVideo && (
          <div className="bg-surface-800 rounded-xl p-8 sm:p-12 text-center max-w-sm">
            <FileText className="h-16 w-16 text-surface-400 mx-auto mb-4" />
            <p className="text-surface-100 font-medium mb-1">
              {file.file_name}
            </p>
            <p className="text-surface-400 text-sm mb-4">
              {formatFileSize(file.file_size)}
            </p>
            <a
              href={url}
              download={file.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        )}
      </div>

      {/* bottom info */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
        <span className="text-xs text-white/60">
          {currentIndex + 1} / {files.length} — {formatFileSize(file.file_size)}
        </span>
      </div>
    </div>
  );
}

/* ─── File Card ───────────────────────────────────────────────────────────── */

function FileCard({
  file,
  isAdmin,
  onDelete,
  onClick,
}: {
  file: GalleryFile;
  isAdmin: boolean;
  onDelete: (file: GalleryFile) => void;
  onClick: (file: GalleryFile) => void;
}) {
  const { locale } = useI18n();
  const [deleting, setDeleting] = useState(false);

  const thumbnailUrl = useMemo(() => {
    if (file.file_type.startsWith("image/")) {
      return getPublicUrl(file.file_path);
    }
    return null;
  }, [file.file_path, file.file_type]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(file);
    setDeleting(false);
  };

  return (
    <div
      className="card group relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-500/50 transition-all"
      onClick={() => onClick(file)}
    >
      <div className="aspect-video rounded-lg overflow-hidden bg-surface-900 mb-3 flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.file_name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : file.file_type.startsWith("video/") ? (
          <div className="flex flex-col items-center gap-1">
            <Video className="h-10 w-10 text-surface-500" />
            <span className="text-xs text-surface-500">Video</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <FileText className="h-10 w-10 text-surface-500" />
            <span className="text-xs text-surface-500">
              {file.file_name.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p
        className="text-sm font-medium text-surface-100 truncate"
        title={file.file_name}
      >
        {file.file_name}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-surface-500">
          {formatFileSize(file.file_size)}
        </span>
        <span className="text-xs text-surface-500">
          {formatDate(file.created_at, locale)}
        </span>
      </div>
      {isAdmin && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-900/80 text-error-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-600 hover:text-white disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Gallery Page ────────────────────────────────────────────────────────── */

export default function GalleryPage() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [loading, setLoading] = useState(true);
  const [viewerFile, setViewerFile] = useState<GalleryFile | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("fal_token");
  }, []);

  /* ── fetch files ─────────────────────────────────────────────────────── */
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/gallery", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFiles((await res.json()) as GalleryFile[]);
      }
    } catch {
      /* network issue — silent for listing */
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  /* ── filtered files ──────────────────────────────────────────────────── */
  const filteredFiles = useMemo(() => {
    if (selectedCategory === "all") return files;
    return files.filter((file) => {
      if (selectedCategory === "images")
        return file.file_type.startsWith("image/");
      if (selectedCategory === "videos")
        return file.file_type.startsWith("video/");
      if (selectedCategory === "documents")
        return (
          !file.file_type.startsWith("image/") &&
          !file.file_type.startsWith("video/")
        );
      return true;
    });
  }, [files, selectedCategory]);

  /* ── delete ──────────────────────────────────────────────────────────── */
  const handleDelete = async (file: GalleryFile) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/gallery/${file.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok || res.status === 204) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      }
    } catch {
      /* silent */
    }
  };

  /* ── robust upload with progress + retry ─────────────────────────────── */
  const processUpload = useCallback(
    async (item: UploadItem) => {
      const token = getToken();

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "uploading" as const, progress: 0 } : u,
        ),
      );

      try {
        const res = await uploadFileWithProgress(
          item.file,
          token,
          (pct) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, progress: pct } : u,
              ),
            );
          },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || `Errore upload (${res.status})`,
          );
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, status: "success" as const, progress: 100 }
              : u,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";

        if (item.retries < MAX_RETRIES) {
          // auto-retry with exponential backoff
          const delay = Math.min(1000 * 2 ** item.retries, 8000);
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? {
                    ...u,
                    status: "pending" as const,
                    progress: 0,
                    retries: u.retries + 1,
                    error: `Tentativo ${u.retries + 1}/${MAX_RETRIES}…`,
                  }
                : u,
            ),
          );
          await new Promise((r) => setTimeout(r, delay));
          await processUpload({ ...item, retries: item.retries + 1 });
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? { ...u, status: "error" as const, error: message }
                : u,
            ),
          );
        }
      }
    },
    [getToken],
  );

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0 || !user) return;

      const newItems: UploadItem[] = Array.from(selectedFiles).map(
        (file) => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          file,
          progress: 0,
          status: "pending" as const,
          retries: 0,
        }),
      );

      setUploads((prev) => [...prev, ...newItems]);

      // reset file input immediately
      if (fileInputRef.current) fileInputRef.current.value = "";

      // process uploads sequentially to avoid overwhelming the server
      for (const item of newItems) {
        await processUpload(item);
      }

      await fetchFiles();
    },
    [user, processUpload, fetchFiles],
  );

  const handleRetry = useCallback(
    async (id: string) => {
      const item = uploads.find((u) => u.id === id);
      if (!item) return;
      await processUpload({ ...item, retries: 0, status: "pending", progress: 0 });
      await fetchFiles();
    },
    [uploads, processUpload, fetchFiles],
  );

  const dismissUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const uploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "pending",
  );

  /* ── categories ──────────────────────────────────────────────────────── */
  const categories: { key: Category; label: string; icon: typeof ImageIcon }[] =
    [
      { key: "all", label: t("gallery.all"), icon: FolderOpen },
      { key: "images", label: t("gallery.images"), icon: ImageIcon },
      { key: "videos", label: t("gallery.videos"), icon: Video },
      { key: "documents", label: t("gallery.documents"), icon: FileText },
    ];

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            {t("gallery.title")}
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {t("gallery.subtitle")}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              onChange={handleUpload}
              className="hidden"
              id="gallery-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? t("gallery.uploading") : t("gallery.upload")}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={cn(
              "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
              selectedCategory === cat.key
                ? "bg-brand-500 text-white"
                : "bg-surface-800 text-surface-300 hover:bg-surface-700",
            )}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="card text-center py-16">
          <FolderOpen className="h-12 w-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-400">{t("gallery.noFiles")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onClick={setViewerFile}
            />
          ))}
        </div>
      )}

      {/* ── Upload progress panel ────────────────────────────────────────── */}
      <UploadProgressPanel
        items={uploads}
        onRetry={handleRetry}
        onDismiss={dismissUploads}
      />

      {/* ── Media viewer modal ───────────────────────────────────────────── */}
      {viewerFile && (
        <MediaViewer
          file={viewerFile}
          files={filteredFiles}
          onClose={() => setViewerFile(null)}
          onNavigate={setViewerFile}
        />
      )}
    </div>
  );
}
