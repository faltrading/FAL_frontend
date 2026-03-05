"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";
import type { ChatGroup, ChatMessage, GroupMember } from "@/lib/types";
import { GroupList } from "@/components/chat/GroupList";
import { MessageArea } from "@/components/chat/MessageArea";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { ArrowLeft, LogOut, UserMinus, Users, Pin, ChevronDown, ChevronUp } from "lucide-react";

const WS_CHAT_URL = process.env.NEXT_PUBLIC_WS_CHAT_URL || "";

export default function ChatPage() {
  const { token, isAdmin, user } = useAuth();
  const { t } = useI18n();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  /* ─── Fetch groups ─── */
  const loadGroups = useCallback(() => {
    api
      .get<{ groups: ChatGroup[]; total: number }>("/api/v1/chat/groups")
      .then((res) => setGroups(Array.isArray(res) ? res : res.groups ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  /* ─── Fetch messages + members when group changes ─── */
  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setMembers([]);
      return;
    }
    api
      .get<{ messages: ChatMessage[]; has_more: boolean }>(
        `/api/v1/chat/groups/${selectedGroupId}/messages?limit=50`
      )
      .then((res) => setMessages(Array.isArray(res) ? res : res.messages ?? []))
      .catch(() => {});
    api
      .get<GroupMember[]>(`/api/v1/chat/groups/${selectedGroupId}/members`)
      .then((res) => setMembers(Array.isArray(res) ? res : res))
      .catch(() => {});
  }, [selectedGroupId]);

  /* ─── WebSocket ─── */
  const handleWsMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; data: ChatMessage };
    if (msg.type === "new_message") {
      setMessages((prev) => [...prev, msg.data]);
    } else if (msg.type === "message_edited") {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.data.id ? { ...m, ...msg.data } : m))
      );
    } else if (msg.type === "message_deleted") {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.data.id ? { ...m, ...msg.data } : m))
      );
    } else if (msg.type === "message_pinned") {
      const pinData = msg.data as unknown as { id: string; is_pinned: boolean; pinned_at: string | null; pinned_by: string | null };
      setMessages((prev) =>
        prev.map((m) => (m.id === pinData.id ? { ...m, is_pinned: pinData.is_pinned, pinned_at: pinData.pinned_at, pinned_by: pinData.pinned_by } : m))
      );
    }
  }, []);

  const { connected, send } = useWebSocket({
    url: `${WS_CHAT_URL}/api/v1/ws/chat/${selectedGroupId}`,
    token,
    onMessage: handleWsMessage,
    enabled: !!selectedGroupId,
  });

  /* ─── Message handlers ─── */
  const handleSendMessage = (
    content: string,
    replyToId?: string,
    messageType?: string,
    metadata?: Record<string, unknown>
  ) => {
    send({
      action: "send_message",
      content,
      reply_to_id: replyToId || null,
      message_type: messageType || "text",
      metadata: metadata || {},
    });
  };
  const handleEditMessage = (id: string, content: string) => {
    send({ action: "edit_message", message_id: id, content });
  };
  const handleDeleteMessage = (id: string) => {
    send({ action: "delete_message", message_id: id });
  };
  const handlePinMessage = (id: string) => {
    send({ action: "pin_message", message_id: id });
  };

  /* ─── Group actions ─── */
  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    setMobileShowMessages(true);
    setShowMembersPanel(false);
    setPinnedExpanded(false);
  };

  const handleGroupCreated = (group: ChatGroup) => {
    setGroups((prev) => [...prev, group]);
    setSelectedGroupId(group.id);
    setMobileShowMessages(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.delete(`/api/v1/chat/groups/${groupId}`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setMobileShowMessages(false);
      }
    } catch {
      // silent
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId || selectedGroup?.is_default) return;
    try {
      await api.post(`/api/v1/chat/groups/${selectedGroupId}/leave`);
      setGroups((prev) => prev.filter((g) => g.id !== selectedGroupId));
      setSelectedGroupId(null);
      setMobileShowMessages(false);
    } catch {
      // silent
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!selectedGroupId) return;
    try {
      await api.delete(`/api/v1/chat/groups/${selectedGroupId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
    } catch {
      // silent
    }
  };

  /** Called when user joins a group via the invite card in the chat */
  const handleGroupJoined = (group: ChatGroup) => {
    setGroups((prev) => {
      if (prev.find((g) => g.id === group.id)) return prev;
      return [...prev, group];
    });
    setSelectedGroupId(group.id);
    setMobileShowMessages(true);
    // Reload groups to get fresh data
    loadGroups();
  };

  return (
    <div className="flex -m-3 sm:-m-4 h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-3.5rem)]">
      {/* ── Sidebar ── */}
      <div
        className={`w-full md:w-80 md:block flex-shrink-0 border-r border-surface-700 ${
          mobileShowMessages ? "hidden" : "block"
        }`}
      >
        <GroupList
          groups={groups}
          selectedId={selectedGroupId}
          onSelect={handleSelectGroup}
          onCreateClick={() => setShowCreateModal(true)}
          onDeleteGroup={handleDeleteGroup}
          isAdmin={isAdmin}
        />
      </div>

      {/* ── Main panel ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileShowMessages ? "block" : "hidden md:flex"
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700 bg-surface-900">
          <button
            onClick={() => setMobileShowMessages(false)}
            className="p-2 rounded text-surface-400 hover:text-surface-100 md:hidden touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-surface-200 truncate flex-1">
            {selectedGroup?.name || t("chat.title")}
          </span>
          {connected && (
            <span className="h-2 w-2 rounded-full bg-success-400 shrink-0" />
          )}

          {/* Actions for non-default groups */}
          {selectedGroup && !selectedGroup.is_default && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Members panel toggle */}
              <button
                onClick={() => setShowMembersPanel((v) => !v)}
                className="p-2 rounded text-surface-400 hover:text-brand-400 hover:bg-surface-800 transition-colors touch-target"
                title={t("chat.members")}
              >
                <Users className="h-5 w-5" />
              </button>
              {/* Leave group */}
              <button
                onClick={handleLeaveGroup}
                className="p-2 rounded text-surface-400 hover:text-error-400 hover:bg-surface-800 transition-colors touch-target"
                title={t("chat.leaveGroup")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Pinned messages bar */}
        {(() => {
          const pinned = messages.filter((m) => m.is_pinned && !m.is_deleted);
          if (pinned.length === 0) return null;
          return (
            <div className="border-b border-surface-700 bg-surface-800/50">
              <button
                onClick={() => setPinnedExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-brand-400 hover:bg-surface-800 transition-colors"
              >
                <Pin className="h-3.5 w-3.5" />
                <span className="font-medium">{t("chat.pinnedMessages")} ({pinned.length})</span>
                {pinnedExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
              </button>
              {pinnedExpanded && (
                <div className="max-h-40 overflow-y-auto border-t border-surface-700">
                  {pinned.map((pm) => (
                    <div key={pm.id} className="px-3 py-1.5 hover:bg-surface-800 transition-colors flex items-start gap-2">
                      <Pin className="h-3 w-3 text-brand-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] text-brand-400 font-medium">{pm.sender_username}</span>
                        <p className="text-xs text-surface-300 truncate">{pm.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex-1 flex min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <MessageArea
              messages={messages}
              groupId={selectedGroupId}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onPinMessage={handlePinMessage}
              onGroupJoined={handleGroupJoined}
            />
          </div>

          {/* Members side panel */}
          {showMembersPanel && selectedGroup && !selectedGroup.is_default && (
            <div className="w-56 border-l border-surface-700 bg-surface-900 flex flex-col hidden md:flex">
              <div className="px-3 py-2 border-b border-surface-700">
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
                  {t("chat.members")} ({members.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-surface-800 transition-colors group/member"
                  >
                    <div className="h-7 w-7 rounded-full bg-surface-700 flex items-center justify-center text-[10px] font-medium text-surface-300 shrink-0">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-surface-200 truncate block">
                        {m.username}
                      </span>
                      {m.role === "admin" && (
                        <span className="text-[10px] text-brand-400">Admin</span>
                      )}
                    </div>
                    {/* Kick button for admin (can't kick yourself) */}
                    {isAdmin && m.user_id !== user?.id && m.role !== "admin" && (
                      <button
                        onClick={() => handleKickMember(m.user_id)}
                        className="p-1 text-surface-500 hover:text-error-400 rounded opacity-0 group-hover/member:opacity-100 transition-opacity"
                        title={t("chat.kickMember")}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
