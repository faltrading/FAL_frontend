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
import { InviteUserModal } from "@/components/chat/InviteUserModal";
import { X, ArrowLeft, LogIn, UserPlus, Link2 } from "lucide-react";

const WS_CHAT_URL = process.env.NEXT_PUBLIC_WS_CHAT_URL || "";

export default function ChatPage() {
  const { token, isAdmin } = useAuth();
  const { t } = useI18n();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [, setMembers] = useState<GroupMember[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  useEffect(() => {
    api
      .get<{ groups: ChatGroup[]; total: number }>("/api/v1/chat/groups")
      .then((res) => setGroups(Array.isArray(res) ? res : res.groups ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setMembers([]);
      return;
    }
    api
      .get<{ messages: ChatMessage[]; has_more: boolean }>(`/api/v1/chat/groups/${selectedGroupId}/messages?limit=50`)
      .then((res) => setMessages(Array.isArray(res) ? res : res.messages ?? []))
      .catch(() => {});
    api
      .get<GroupMember[]>(`/api/v1/chat/groups/${selectedGroupId}/members`)
      .then((res) => setMembers(Array.isArray(res) ? res : res))
      .catch(() => {});
  }, [selectedGroupId]);

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
    }
  }, []);

  const { connected, send } = useWebSocket({
    url: `${WS_CHAT_URL}/api/v1/ws/chat/${selectedGroupId}`,
    token,
    onMessage: handleWsMessage,
    enabled: !!selectedGroupId,
  });

  const handleSendMessage = (content: string, replyToId?: string) => {
    send({ action: "send_message", content, reply_to_id: replyToId || null });
  };

  const handleEditMessage = (id: string, content: string) => {
    send({ action: "edit_message", message_id: id, content });
  };

  const handleDeleteMessage = (id: string) => {
    send({ action: "delete_message", message_id: id });
  };

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    setMobileShowMessages(true);
  };

  const handleJoinByCode = async () => {
    try {
      const group = await api.post<ChatGroup>("/api/v1/chat/groups/join", {
        invite_code: inviteCode,
      });
      setGroups((prev) => [...prev, group]);
      setSelectedGroupId(group.id);
      setShowJoinModal(false);
      setInviteCode("");
    } catch {
      // silent
    }
  };

  const handleGroupCreated = (group: ChatGroup) => {
    setGroups((prev) => [...prev, group]);
    setSelectedGroupId(group.id);
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

  const handleShareInviteLink = () => {
    if (!selectedGroup || !selectedGroup.invite_code) return;
    // Find the default (public) group to send the message in
    const defaultGroup = groups.find((g) => g.is_default);
    if (!defaultGroup) return;

    const joinLink = `${window.location.origin}/chat?join=${selectedGroup.invite_code}`;
    const linkMessage = `📩 ${t("chat.inviteLinkMessage")} "${selectedGroup.name}": ${joinLink}`;

    // If we're currently in the default group, just send via WS
    if (selectedGroupId === defaultGroup.id) {
      send({ action: "send_message", content: linkMessage });
    } else {
      // Post via REST to the default group
      api.post(`/api/v1/chat/groups/${defaultGroup.id}/messages`, {
        content: linkMessage,
      }).catch(() => {});
    }
  };

  // Auto-join via URL parameter
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) {
      api.post<ChatGroup>("/api/v1/chat/groups/join", { invite_code: joinCode })
        .then((group) => {
          setGroups((prev) => {
            if (prev.find((g) => g.id === group.id)) return prev;
            return [...prev, group];
          });
          setSelectedGroupId(group.id);
          setMobileShowMessages(true);
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
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
          onJoinClick={() => setShowJoinModal(true)}
          onDeleteGroup={handleDeleteGroup}
          isAdmin={isAdmin}
        />
      </div>

      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileShowMessages ? "block" : "hidden md:flex"
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700 bg-surface-900">
          <button
            onClick={() => setMobileShowMessages(false)}
            className="p-1 rounded text-surface-400 hover:text-surface-100 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-surface-200 truncate flex-1">
            {selectedGroup?.name || t("chat.title")}
          </span>
          {connected && (
            <span className="h-2 w-2 rounded-full bg-success-400 shrink-0" />
          )}
          {/* Admin actions for non-default groups */}
          {isAdmin && selectedGroup && !selectedGroup.is_default && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-1.5 rounded text-surface-400 hover:text-brand-400 hover:bg-surface-800 transition-colors"
                title={t("chat.inviteUser")}
              >
                <UserPlus className="h-4 w-4" />
              </button>
              <button
                onClick={handleShareInviteLink}
                className="p-1.5 rounded text-surface-400 hover:text-brand-400 hover:bg-surface-800 transition-colors"
                title={t("chat.shareInviteLink")}
              >
                <Link2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <MessageArea
          messages={messages}
          groupId={selectedGroupId}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
        />
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">
                {t("chat.joinByCode")}
              </h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode("");
                }}
                className="text-surface-400 hover:text-surface-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("chat.inviteCodePlaceholder")}
              className="input-field w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setInviteCode("");
                }}
                className="btn-ghost"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleJoinByCode}
                disabled={!inviteCode.trim()}
                className="btn-primary"
              >
                <LogIn className="h-4 w-4 mr-1" />
                {t("chat.join")}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateGroupModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleGroupCreated}
      />

      {selectedGroup && (
        <InviteUserModal
          open={showInviteModal}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
