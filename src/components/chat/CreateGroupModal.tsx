"use client";

import { useState, useEffect, useRef } from "react";
import { X, Lock, Globe, Search, UserPlus, Loader2, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ChatGroup } from "@/lib/types";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (group: ChatGroup) => void;
}

interface UserResult {
  id: string;
  username: string;
}

export function CreateGroupModal({ open, onClose, onCreated }: CreateGroupModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  // User search for private groups
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsPublic(true);
    setUserQuery("");
    setUserResults([]);
    setSelectedUsers([]);
  };

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (userQuery.trim().length < 2) {
      setUserResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get<UserResult[]>(
          `/api/v1/users/search?q=${encodeURIComponent(userQuery.trim())}`
        );
        setUserResults(Array.isArray(data) ? data : []);
      } catch {
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userQuery]);

  const addUser = (user: UserResult) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setUserQuery("");
    setUserResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!isPublic && selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const group = await api.post<ChatGroup>("/api/v1/chat/groups", {
        name: name.trim(),
        description: description.trim() || "",
        is_public: isPublic,
        invited_user_ids: isPublic ? [] : selectedUsers.map((u) => u.id),
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
      <div className="card max-w-md w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="h-5 w-5 text-brand-400" />
            ) : (
              <Lock className="h-5 w-5 text-brand-400" />
            )}
            <h2 className="text-lg font-semibold text-surface-100">
              {t("chat.createGroup")}
            </h2>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="text-surface-400 hover:text-surface-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
          {/* Public / Private toggle */}
          <div className="flex rounded-lg overflow-hidden border border-surface-700">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isPublic
                  ? "bg-brand-500/20 text-brand-400 border-r border-brand-500/30"
                  : "bg-surface-800 text-surface-400 border-r border-surface-700 hover:text-surface-200"
              )}
            >
              <Globe className="h-4 w-4" />
              {t("chat.publicGroup")}
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                !isPublic
                  ? "bg-brand-500/20 text-brand-400"
                  : "bg-surface-800 text-surface-400 hover:text-surface-200"
              )}
            >
              <Lock className="h-4 w-4" />
              {t("chat.privateGroup")}
            </button>
          </div>

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

          {/* User selection for private groups */}
          {!isPublic && (
            <div>
              <label className="label">{t("chat.selectMembers")}</label>

              {/* Selected users chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 bg-brand-500/20 text-brand-300 text-xs font-medium px-2 py-1 rounded-full"
                    >
                      {u.username}
                      <button
                        type="button"
                        onClick={() => removeUser(u.id)}
                        className="text-brand-400 hover:text-brand-200"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={t("chat.searchUserPlaceholder")}
                  className="input-field w-full pl-9"
                />
              </div>

              {/* Search results dropdown */}
              {(searching || userResults.length > 0) && (
                <div className="mt-1 border border-surface-700 rounded-lg bg-surface-800 max-h-32 overflow-y-auto">
                  {searching ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 text-surface-500 animate-spin" />
                    </div>
                  ) : (
                    userResults
                      .filter((u) => !selectedUsers.find((s) => s.id === u.id))
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => addUser(u)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-surface-700 transition-colors"
                        >
                          <div className="h-6 w-6 rounded-full bg-surface-600 flex items-center justify-center text-[10px] font-medium text-surface-300">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-surface-200">{u.username}</span>
                          <UserPlus className="h-3.5 w-3.5 text-surface-500 ml-auto" />
                        </button>
                      ))
                  )}
                </div>
              )}

              {!isPublic && selectedUsers.length === 0 && (
                <p className="text-xs text-surface-500 mt-1">{t("chat.selectMembersHint")}</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || (!isPublic && selectedUsers.length === 0)}
              className="btn-primary"
            >
              {loading ? t("common.loading") : t("chat.createGroup")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
