"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, UserPlus, Loader2, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface InviteUserModalProps {
  open: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
}

interface UserResult {
  id: string;
  username: string;
}

export function InviteUserModal({ open, groupId, groupName, onClose }: InviteUserModalProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setInvitedIds(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get<UserResult[]>(`/api/v1/users/search?q=${encodeURIComponent(query.trim())}`);
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleInvite = async (user: UserResult) => {
    setInvitingId(user.id);
    try {
      await api.post(`/api/v1/chat/groups/${groupId}/members`, {
        user_id: user.id,
        username: user.username,
      });
      setInvitedIds((prev) => new Set(prev).add(user.id));
    } catch {
      // silent — user may already be a member
    } finally {
      setInvitingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-surface-100 truncate">
              {t("chat.inviteUser")}
            </h2>
            <p className="text-xs text-surface-500 truncate">{groupName}</p>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("chat.searchUserPlaceholder")}
            className="input-field w-full pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          {searching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 text-surface-500 animate-spin" />
            </div>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-6 text-surface-500 text-sm">
              {t("chat.noUsersFound")}
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-1">
              {results.map((user) => {
                const isInvited = invitedIds.has(user.id);
                const isInviting = invitingId === user.id;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-medium text-surface-300 shrink-0">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-surface-200 truncate">{user.username}</span>
                    </div>
                    <button
                      onClick={() => handleInvite(user)}
                      disabled={isInvited || isInviting}
                      className={cn(
                        "shrink-0 p-1.5 rounded-md text-sm transition-colors",
                        isInvited
                          ? "text-success-400 cursor-default"
                          : "text-surface-400 hover:text-brand-400 hover:bg-surface-700"
                      )}
                    >
                      {isInviting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isInvited ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!searching && query.trim().length < 2 && (
            <div className="text-center py-6 text-surface-500 text-sm">
              {t("chat.searchUserHint")}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 mt-3 border-t border-surface-700">
          <button onClick={onClose} className="btn-ghost">
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
