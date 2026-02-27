"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
} from "lucide-react";

type Category = "all" | "images" | "videos" | "documents";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileCard({
  file,
  isAdmin,
  onDelete,
}: {
  file: GalleryFile;
  isAdmin: boolean;
  onDelete: (file: GalleryFile) => void;
}) {
  const { locale } = useI18n();
  const [deleting, setDeleting] = useState(false);

  const thumbnailUrl = useMemo(() => {
    if (file.file_type.startsWith("image/")) {
      const { data } = supabase.storage
        .from("gallery")
        .getPublicUrl(file.file_path);
      return data.publicUrl;
    }
    return null;
  }, [file.file_path, file.file_type]);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(file);
    setDeleting(false);
  };

  return (
    <div className="card group relative overflow-hidden">
      <div className="aspect-video rounded-lg overflow-hidden bg-surface-900 mb-3 flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.file_name}
            className="w-full h-full object-cover"
          />
        ) : file.file_type.startsWith("video/") ? (
          <Video className="h-10 w-10 text-surface-500" />
        ) : (
          <FileText className="h-10 w-10 text-surface-500" />
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

export default function GalleryPage() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("fal_token");
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/gallery", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data as GalleryFile[]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredFiles = useMemo(() => {
    if (selectedCategory === "all") return files;
    return files.filter((file) => {
      if (selectedCategory === "images")
        return file.file_type.startsWith("image/");
      if (selectedCategory === "videos")
        return file.file_type.startsWith("video/");
      if (selectedCategory === "documents")
        return file.file_type.startsWith("application/");
      return true;
    });
  }, [files, selectedCategory]);

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
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;

    setUploading(true);
    try {
      const token = getToken();
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", file);

        await fetch("/api/gallery", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      }
      await fetchFiles();
    } catch {
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const categories: { key: Category; label: string; icon: typeof ImageIcon }[] =
    [
      { key: "all", label: t("gallery.all"), icon: FolderOpen },
      { key: "images", label: t("gallery.images"), icon: ImageIcon },
      { key: "videos", label: t("gallery.videos"), icon: Video },
      { key: "documents", label: t("gallery.documents"), icon: FileText },
    ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
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

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedCategory === cat.key
                ? "bg-brand-500 text-white"
                : "bg-surface-800 text-surface-300 hover:bg-surface-700"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
