"use client";

import { useState } from "react";
import { X, Lock } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await api.post<ChatGroup>("/api/v1/chat/groups", {
        name: name.trim(),
        description: description.trim() || "",
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
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-surface-100">
              {t("chat.createPrivateGroup")}
            </h2>
          </div>
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
              placeholder={t("chat.groupNamePlaceholder")}
            />
          </div>

          <div>
            <label className="label">
              {t("chat.groupDescription")}
              <span className="text-surface-500 font-normal ml-1">({t("common.optional")})</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full"
              placeholder={t("chat.descriptionPlaceholder")}
            />
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
