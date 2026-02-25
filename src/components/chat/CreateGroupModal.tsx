"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { ChatGroup } from "@/lib/types";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (group: ChatGroup) => void;
}

export function CreateGroupModal({ open, onClose, onCreated }: CreateGroupModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(50);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setMaxMembers(50);
    setIsPublic(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await api.post<ChatGroup>("/api/v1/chat/groups", {
        name: name.trim(),
        description: description.trim() || null,
        max_members: maxMembers,
        is_public: isPublic,
      });
      onCreated(group);
      resetForm();
      onClose();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-100">
            {t("chat.createGroup")}
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-surface-400 hover:text-surface-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t("chat.groupName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="label">{t("chat.description")}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="label">{t("chat.maxMembers")}</label>
            <input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              min={2}
              max={500}
              className="input-field w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? "bg-brand-500" : "bg-surface-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-surface-300">{t("chat.publicGroup")}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary">
              {loading ? t("common.saving") : t("chat.createGroup")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
