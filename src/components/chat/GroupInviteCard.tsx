"use client";

import { useState } from "react";
import { Globe, Lock, Users, LogIn, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ChatGroup, ChatMessage } from "@/lib/types";

interface GroupInviteCardProps {
  message: ChatMessage;
  onGroupJoined: (group: ChatGroup) => void;
}

export function GroupInviteCard({ message, onGroupJoined }: GroupInviteCardProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const meta = message.metadata as {
    group_invite?: boolean;
    target_group_id?: string;
    target_group_name?: string;
    target_group_description?: string;
    is_public?: boolean;
    invited_user_ids?: string[];
    invite_code?: string;
  };

  if (!meta?.group_invite) return null;

  const isPublicGroup = meta.is_public === true;
  const isInvited = meta.invited_user_ids?.includes(user?.id ?? "") ?? false;

  // For private groups, only show the join button to invited users
  const canJoin = isPublicGroup || isInvited;
  // Hide the card entirely for private groups if user is not invited
  const isVisible = isPublicGroup || isInvited;

  if (!isVisible) return null;

  const handleJoin = async () => {
    if (!meta.target_group_id) return;
    setLoading(true);
    try {
      // For public groups, join directly. For private, user is already a member.
      if (isPublicGroup) {
        const group = await api.post<ChatGroup>(
          `/api/v1/chat/groups/${meta.target_group_id}/join`
        );
        onGroupJoined(group);
      } else {
        // Private group: user was already added as member, just navigate
        onGroupJoined({
          id: meta.target_group_id,
          name: meta.target_group_name ?? "",
          description: meta.target_group_description ?? "",
          is_default: false,
          is_public: false,
          member_count: 0,
          invite_code: null,
          created_by: message.sender_id,
          created_at: message.created_at,
        });
      }
      setJoined(true);
    } catch {
      // User may already be a member
      setJoined(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto my-2">
      <div
        className={cn(
          "rounded-xl border overflow-hidden transition-all",
          isPublicGroup
            ? "border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-brand-600/5"
            : "border-surface-600 bg-gradient-to-br from-surface-800 to-surface-800/80"
        )}
      >
        {/* Header strip */}
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2",
            isPublicGroup ? "bg-brand-500/15" : "bg-surface-700/50"
          )}
        >
          {isPublicGroup ? (
            <Globe className="h-4 w-4 text-brand-400" />
          ) : (
            <Lock className="h-4 w-4 text-surface-400" />
          )}
          <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">
            {isPublicGroup ? t("chat.newPublicGroup") : t("chat.privateInvite")}
          </span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          <h3 className="text-sm font-semibold text-surface-100 truncate">
            {meta.target_group_name}
          </h3>
          {meta.target_group_description && (
            <p className="text-xs text-surface-400 line-clamp-2">
              {meta.target_group_description}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-surface-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t("chat.createdBy")} {message.sender_username ?? t("chat.unknownUser")}
            </span>

            {canJoin && (
              <button
                onClick={handleJoin}
                disabled={loading || joined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  joined
                    ? "bg-success-500/20 text-success-400 cursor-default"
                    : loading
                      ? "bg-surface-700 text-surface-400"
                      : "bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
                )}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : joined ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t("chat.joined")}
                  </>
                ) : (
                  <>
                    <LogIn className="h-3.5 w-3.5" />
                    {t("chat.joinGroup")}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
