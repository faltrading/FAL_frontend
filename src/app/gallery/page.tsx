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
import type { GalleryFile, GalleryFolder } from "@/lib/types";
import {
  Image as ImageIcon,
  Video,
  FileText,
  Upload,
  Trash2,
  FolderOpen,
  Folder,
  FolderPlus,
  Loader2,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronSeparator,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Home,
  Pencil,
  MoreVertical,
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
  folderId: string | null,
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
    if (folderId) fd.append("folder_id", folderId);
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

/* ─── Create / Rename Folder Modal ────────────────────────────────────────── */

function FolderModal({
  mode,
  initialName,
  onSubmit,
  onClose,
  t,
}: {
  mode: "create" | "rename";
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [name, setName] = useState(initialName || "");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    await onSubmit(trimmed);
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card w-full max-w-md border border-surface-700 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
          {mode === "create" ? t("gallery.createFolder") : t("gallery.renameFolder")}
        </h3>
        <label className="block text-sm text-surface-400 mb-1">
          {t("gallery.folderName")}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("gallery.folderNamePlaceholder")}
          maxLength={255}
          className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
          >
            {t("gallery.cancel")}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="btn-primary disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "create" ? (
              t("gallery.create")
            ) : (
              t("gallery.rename")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Folder Context Menu ─────────────────────────────────────────────────── */

function FolderContextMenu({
  folder,
  onRename,
  onDelete,
  onClose,
  t,
}: {
  folder: GalleryFolder;
  onRename: (folder: GalleryFolder) => void;
  onDelete: (folder: GalleryFolder) => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute top-2 right-2 z-20 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-1 min-w-[140px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onRename(folder); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        {t("gallery.renameFolder")}
      </button>
      <button
        onClick={() => { onDelete(folder); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-400 hover:bg-surface-700 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("gallery.deleteFolder")}
      </button>
    </div>
  );
}

/* ─── Folder Card ─────────────────────────────────────────────────────────── */

function FolderCard({
  folder,
  isAdmin,
  onClick,
  onRename,
  onDelete,
  t,
}: {
  folder: GalleryFolder;
  isAdmin: boolean;
  onClick: (folder: GalleryFolder) => void;
  onRename: (folder: GalleryFolder) => void;
  onDelete: (folder: GalleryFolder) => void;
  t: (key: string) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="card group relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-500/50 transition-all"
      onClick={() => onClick(folder)}
    >
      <div className="aspect-video rounded-lg overflow-hidden bg-surface-900 mb-3 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Folder className="h-12 w-12 text-brand-400" />
        </div>
      </div>
      <p
        className="text-sm font-medium text-surface-100 truncate"
        title={folder.name}
      >
        {folder.name}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-surface-500">
          {formatDate(folder.created_at, "it")}
        </span>
      </div>
      {isAdmin && (
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="p-1.5 rounded-lg bg-surface-900/80 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-700 hover:text-surface-200"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <FolderContextMenu
              folder={folder}
              onRename={onRename}
              onDelete={onDelete}
              onClose={() => setShowMenu(false)}
              t={t}
            />
          )}
        </div>
      )}
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

/* ─── Breadcrumb ──────────────────────────────────────────────────────────── */

interface BreadcrumbItem {
  id: string;
  name: string;
}

function Breadcrumb({
  items,
  onNavigate,
  t,
}: {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  t: (key: string) => string;
}) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-1 mb-4">
      <button
        onClick={() => onNavigate(null)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md transition-colors whitespace-nowrap",
          items.length === 0
            ? "text-surface-100 font-medium"
            : "text-surface-400 hover:text-surface-200 hover:bg-surface-800",
        )}
      >
        <Home className="h-4 w-4" />
        {t("gallery.root")}
      </button>
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-1">
          <ChevronSeparator className="h-3.5 w-3.5 text-surface-600 shrink-0" />
          <button
            onClick={() => onNavigate(item.id)}
            className={cn(
              "px-2 py-1 rounded-md transition-colors whitespace-nowrap truncate max-w-[150px]",
              idx === items.length - 1
                ? "text-surface-100 font-medium"
                : "text-surface-400 hover:text-surface-200 hover:bg-surface-800",
            )}
            title={item.name}
          >
            {item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}

/* ─── Delete Confirmation Modal ───────────────────────────────────────────── */

function ConfirmDeleteModal({
  message,
  onConfirm,
  onClose,
  t,
}: {
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm border border-surface-700 shadow-2xl"
      >
        <AlertTriangle className="h-10 w-10 text-error-400 mx-auto mb-3" />
        <p className="text-sm text-surface-200 text-center mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
          >
            {t("gallery.cancel")}
          </button>
          <button
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
              setDeleting(false);
              onClose();
            }}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm bg-error-600 text-white hover:bg-error-500 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("gallery.delete")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Gallery Page ────────────────────────────────────────────────────────── */

export default function GalleryPage() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();

  /* ── state ───────────────────────────────────────────────────────────── */
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [loading, setLoading] = useState(true);
  const [viewerFile, setViewerFile] = useState<GalleryFile | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "rename";
    folder?: GalleryFolder;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("fal_token");
  }, []);

  /* ── fetch folders ───────────────────────────────────────────────────── */
  const fetchFolders = useCallback(
    async (folderId: string | null) => {
      try {
        const token = getToken();
        const params = new URLSearchParams();
        if (folderId) params.set("parent_id", folderId);
        const res = await fetch(`/api/gallery/folders?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setFolders((await res.json()) as GalleryFolder[]);
        }
      } catch {
        /* silent */
      }
    },
    [getToken],
  );

  /* ── fetch breadcrumb ────────────────────────────────────────────────── */
  const fetchBreadcrumb = useCallback(
    async (folderId: string | null) => {
      if (!folderId) {
        setBreadcrumb([]);
        return;
      }
      try {
        const token = getToken();
        const res = await fetch(`/api/gallery/folders/${folderId}/breadcrumb`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setBreadcrumb((await res.json()) as BreadcrumbItem[]);
        }
      } catch {
        setBreadcrumb([]);
      }
    },
    [getToken],
  );

  /* ── fetch files ─────────────────────────────────────────────────────── */
  const fetchFiles = useCallback(
    async (folderId: string | null) => {
      try {
        const token = getToken();
        const params = new URLSearchParams();
        params.set("folder_id", folderId || "root");
        const res = await fetch(`/api/gallery?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setFiles((await res.json()) as GalleryFile[]);
        }
      } catch {
        /* silent */
      }
    },
    [getToken],
  );

  /* ── load current folder contents ────────────────────────────────────── */
  const loadFolder = useCallback(
    async (folderId: string | null) => {
      setLoading(true);
      await Promise.all([
        fetchFolders(folderId),
        fetchFiles(folderId),
        fetchBreadcrumb(folderId),
      ]);
      setLoading(false);
    },
    [fetchFolders, fetchFiles, fetchBreadcrumb],
  );

  /* ── navigate into a folder ──────────────────────────────────────────── */
  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setSelectedCategory("all");
      loadFolder(folderId);
    },
    [loadFolder],
  );

  useEffect(() => {
    loadFolder(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /* ── create folder ───────────────────────────────────────────────────── */
  const createFolder = useCallback(
    async (name: string) => {
      try {
        const token = getToken();
        const res = await fetch("/api/gallery/folders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name, parent_id: currentFolderId }),
        });
        if (res.ok) {
          setFolderModal(null);
          await fetchFolders(currentFolderId);
        }
      } catch {
        /* silent */
      }
    },
    [getToken, currentFolderId, fetchFolders],
  );

  /* ── rename folder ───────────────────────────────────────────────────── */
  const renameFolder = useCallback(
    async (name: string) => {
      const folder = folderModal?.folder;
      if (!folder) return;
      try {
        const token = getToken();
        const res = await fetch(`/api/gallery/folders/${folder.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          setFolderModal(null);
          await fetchFolders(currentFolderId);
        }
      } catch {
        /* silent */
      }
    },
    [getToken, currentFolderId, fetchFolders, folderModal],
  );

  /* ── delete folder ───────────────────────────────────────────────────── */
  const deleteFolder = useCallback(
    async (folder: GalleryFolder) => {
      try {
        const token = getToken();
        const res = await fetch(`/api/gallery/folders/${folder.id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok || res.status === 204) {
          await fetchFolders(currentFolderId);
          await fetchFiles(currentFolderId);
        }
      } catch {
        /* silent */
      }
    },
    [getToken, currentFolderId, fetchFolders, fetchFiles],
  );

  /* ── delete file ─────────────────────────────────────────────────────── */
  const handleDeleteFile = useCallback(
    async (file: GalleryFile) => {
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
    },
    [getToken],
  );

  /* ── robust upload with progress + retry ─────────────────────────────── */
  const processUpload = useCallback(
    async (item: UploadItem, folderId: string | null) => {
      const token = getToken();

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: "uploading" as const, progress: 0 }
            : u,
        ),
      );

      try {
        const res = await uploadFileWithProgress(
          item.file,
          token,
          folderId,
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
          throw new Error(body?.error || `Errore upload (${res.status})`);
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
          await processUpload(
            { ...item, retries: item.retries + 1 },
            folderId,
          );
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
      if (fileInputRef.current) fileInputRef.current.value = "";

      const folderId = currentFolderId;
      for (const item of newItems) {
        await processUpload(item, folderId);
      }

      await fetchFiles(folderId);
    },
    [user, processUpload, fetchFiles, currentFolderId],
  );

  const handleRetry = useCallback(
    async (id: string) => {
      const item = uploads.find((u) => u.id === id);
      if (!item) return;
      await processUpload(
        { ...item, retries: 0, status: "pending", progress: 0 },
        currentFolderId,
      );
      await fetchFiles(currentFolderId);
    },
    [uploads, processUpload, fetchFiles, currentFolderId],
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

  const isEmpty = folders.length === 0 && filteredFiles.length === 0;

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFolderModal({ mode: "create" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-surface-800 text-surface-200 hover:bg-surface-700 transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              {t("gallery.newFolder")}
            </button>
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

      {/* Breadcrumb */}
      <Breadcrumb
        items={breadcrumb}
        onNavigate={navigateToFolder}
        t={t}
      />

      {/* Category filter */}
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isEmpty ? (
        <div className="card text-center py-16">
          <FolderOpen className="h-12 w-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-400">
            {currentFolderId
              ? t("gallery.noFilesInFolder")
              : t("gallery.noFiles")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Folders first (only when showing "all" category) */}
          {selectedCategory === "all" &&
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isAdmin={isAdmin}
                onClick={(f) => navigateToFolder(f.id)}
                onRename={(f) => setFolderModal({ mode: "rename", folder: f })}
                onDelete={(f) =>
                  setDeleteConfirm({
                    message: t("gallery.deleteFolderConfirm"),
                    onConfirm: () => deleteFolder(f),
                  })
                }
                t={t}
              />
            ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              isAdmin={isAdmin}
              onDelete={handleDeleteFile}
              onClick={setViewerFile}
            />
          ))}
        </div>
      )}

      {/* Upload progress panel */}
      <UploadProgressPanel
        items={uploads}
        onRetry={handleRetry}
        onDismiss={dismissUploads}
      />

      {/* Media viewer modal */}
      {viewerFile && (
        <MediaViewer
          file={viewerFile}
          files={filteredFiles}
          onClose={() => setViewerFile(null)}
          onNavigate={setViewerFile}
        />
      )}

      {/* Create / Rename folder modal */}
      {folderModal && (
        <FolderModal
          mode={folderModal.mode}
          initialName={folderModal.folder?.name}
          onSubmit={folderModal.mode === "create" ? createFolder : renameFolder}
          onClose={() => setFolderModal(null)}
          t={t}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <ConfirmDeleteModal
          message={deleteConfirm.message}
          onConfirm={deleteConfirm.onConfirm}
          onClose={() => setDeleteConfirm(null)}
          t={t}
        />
      )}
    </div>
  );
}
