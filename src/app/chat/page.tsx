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
import { X, ArrowLeft, LogIn } from "lucide-react";

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
  const [mobileShowMessages, setMobileShowMessages] = useState(false);

  useEffect(() => {
    api
      .get<ChatGroup[]>("/api/v1/chat/groups")
      .then(setGroups)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      setMembers([]);
      return;
    }
    api
      .get<ChatMessage[]>(`/api/v1/chat/groups/${selectedGroupId}/messages?limit=50`)
      .then(setMessages)
      .catch(() => {});
    api
      .get<GroupMember[]>(`/api/v1/chat/groups/${selectedGroupId}/members`)
      .then(setMembers)
      .catch(() => {});
  }, [selectedGroupId]);

  const handleWsMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; payload: ChatMessage };
    if (msg.type === "new_message") {
      setMessages((prev) => [...prev, msg.payload]);
    } else if (msg.type === "message_edited") {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.payload.id ? msg.payload : m))
      );
    } else if (msg.type === "message_deleted") {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.payload.id ? msg.payload : m))
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
    send({ type: "send_message", payload: { content, reply_to_id: replyToId || null } });
  };

  const handleEditMessage = (id: string, content: string) => {
    send({ type: "edit_message", payload: { message_id: id, content } });
  };

  const handleDeleteMessage = (id: string) => {
    send({ type: "delete_message", payload: { message_id: id } });
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
          isAdmin={isAdmin}
        />
      </div>

      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileShowMessages ? "block" : "hidden md:flex"
        }`}
      >
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-surface-700 bg-surface-900">
          <button
            onClick={() => setMobileShowMessages(false)}
            className="p-1 rounded text-surface-400 hover:text-surface-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-surface-200">
            {groups.find((g) => g.id === selectedGroupId)?.name || t("chat.title")}
          </span>
          {connected && (
            <span className="ml-auto h-2 w-2 rounded-full bg-success-400" />
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
    </div>
  );
}
