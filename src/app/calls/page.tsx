"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import type { Call, CallParticipant, JoinCallResponse } from "@/lib/types";
import {
  Phone,
  PhoneOff,
  Plus,
  Users,
  X,
  LogOut,
  Shield,
  UserX,
  Send,
  PanelRightOpen,
  PanelRightClose,
  AlertCircle,
  ExternalLink,
  Trash2,
  Search,
} from "lucide-react";

// Dynamically import JitsiMeet (no SSR - it needs window/document)
const JitsiMeet = dynamic(() => import("@/components/calls/JitsiMeet"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60vh] rounded-xl border border-surface-700 bg-surface-950 flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const WS_CALL_URL = process.env.NEXT_PUBLIC_WS_CALL_URL || "";

interface InCallMessage {
  username: string;
  text: string;
  time: string;
}

export default function CallsPage() {
  const { user, token, isAdmin } = useAuth();
  const { t, locale } = useI18n();

  const [calls, setCalls] = useState<Call[]>([]);
  const [activeCall, setActiveCall] = useState<JoinCallResponse | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showParticipants, setShowParticipants] = useState(true);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchCalls = useCallback(() => {
    api
      .get<{ calls: Call[]; total: number }>("/api/v1/calls/rooms")
      .then((res) => setCalls(Array.isArray(res) ? res : res.calls ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const fetchParticipants = useCallback(() => {
    if (!activeCall) return;
    api
      .get<CallParticipant[]>(
        `/api/v1/calls/rooms/${activeCall.call.id}/participants`
      )
      .then(setParticipants)
      .catch(() => {});
  }, [activeCall]);

  useEffect(() => {
    fetchParticipants();
    if (!activeCall) return;
    const interval = setInterval(fetchParticipants, 15000);
    return () => clearInterval(interval);
  }, [fetchParticipants, activeCall]);

  const handleWsMessage = useCallback((data: unknown) => {
    const msg = data as {
      type: string;
      payload?: { username: string; text: string };
      data?: { sender_username: string; content: string };
    };
    if (msg.type === "chat_message" && msg.payload) {
      setInCallMessages((prev) => [
        ...prev,
        {
          username: msg.payload!.username,
          text: msg.payload!.text,
          time: new Date().toISOString(),
        },
      ]);
    }
    // Also handle legacy backend format
    if (msg.type === "new_message" && msg.data) {
      setInCallMessages((prev) => [
        ...prev,
        {
          username: msg.data!.sender_username,
          text: msg.data!.content,
          time: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const { connected, send } = useWebSocket({
    url: activeCall
      ? `${WS_CALL_URL}/api/v1/ws/call/${activeCall.call.id}`
      : "",
    token,
    onMessage: handleWsMessage,
    enabled: !!activeCall,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inCallMessages]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<JoinCallResponse>("/api/v1/calls/rooms", {
        room_name: newRoomName.trim(),
      });
      // Auto-join: the creator is already a participant, so enter the call view
      setActiveCall(res);
      setInCallMessages([]);
      setShowCreateModal(false);
      setNewRoomName("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create room";
      setError(msg);
      console.error("[Calls] Create room failed:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinCall = async (callId: string) => {
    if (joining) return;
    setJoining(callId);
    setError(null);
    try {
      const response = await api.post<JoinCallResponse>(
        `/api/v1/calls/rooms/${callId}/join`
      );
      setActiveCall(response);
      setInCallMessages([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to join call";
      setError(msg);
      console.error("[Calls] Join call failed:", err);
    } finally {
      setJoining(null);
    }
  };

  const handleLeaveCall = async () => {
    if (!activeCall) return;
    try {
      await api.post(`/api/v1/calls/rooms/${activeCall.call.id}/leave`);
    } catch (err) {
      console.error("[Calls] Leave call failed:", err);
    } finally {
      setActiveCall(null);
      setParticipants([]);
      setInCallMessages([]);
      fetchCalls();
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await api.post(`/api/v1/calls/rooms/${activeCall.call.id}/end`);
    } catch (err) {
      console.error("[Calls] End call failed:", err);
    } finally {
      setActiveCall(null);
      setParticipants([]);
      setInCallMessages([]);
      fetchCalls();
    }
  };

  const handleDeleteCall = async (callId: string) => {
    if (!confirm(t("calls.confirmDelete"))) return;
    try {
      await api.delete(`/api/v1/calls/rooms/${callId}`);
      // If we were in this call, exit the call view
      if (activeCall && activeCall.call.id === callId) {
        setActiveCall(null);
        setParticipants([]);
        setInCallMessages([]);
      }
      fetchCalls();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete call";
      setError(msg);
      console.error("[Calls] Delete call failed:", err);
    }
  };

  const handleKickParticipant = async (participantId: string) => {
    if (!activeCall) return;
    try {
      await api.delete(
        `/api/v1/calls/rooms/${activeCall.call.id}/participants/${participantId}/kick`
      );
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    } catch {
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    send({ type: "chat_message", payload: { text: chatInput.trim() } });
    setInCallMessages((prev) => [
      ...prev,
      {
        username: user?.username || "",
        text: chatInput.trim(),
        time: new Date().toISOString(),
      },
    ]);
    setChatInput("");
  };

  // Called when user hangs up from within the Jitsi UI
  const handleJitsiClose = useCallback(() => {
    handleLeaveCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall]);

  const isModerator =
    activeCall &&
    participants.find(
      (p) => p.user_id === user?.id && p.role === "moderator"
    );

  const canModerate = isAdmin || !!isModerator;

  if (activeCall) {
    const jitsiUrl = activeCall.jitsi_jwt
      ? `https://${activeCall.jitsi_domain}/${activeCall.jitsi_room}?jwt=${activeCall.jitsi_jwt}`
      : `https://${activeCall.jitsi_domain}/${activeCall.jitsi_room}`;

    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700 bg-surface-900">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-brand-400" />
            <h1 className="text-lg font-semibold text-surface-100">
              {activeCall.call.room_name}
            </h1>
            {connected && (
              <span className="h-2 w-2 rounded-full bg-success-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={jitsiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs"
              title="Open call in a new browser tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="btn-ghost md:hidden"
            >
              {showParticipants ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </button>
            {canModerate && (
              <button onClick={handleEndCall} className="btn-danger">
                <PhoneOff className="h-4 w-4" />
                <span className="hidden sm:inline">{t("calls.endCall")}</span>
              </button>
            )}
            <button onClick={handleLeaveCall} className="btn-secondary">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("calls.leave")}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
            <JitsiMeet
              domain={activeCall.jitsi_domain}
              roomName={activeCall.jitsi_room}
              jwt={activeCall.jitsi_jwt || undefined}
              displayName={user?.username || "Guest"}
              onReadyToClose={handleJitsiClose}
            />

            <div className="card flex flex-col flex-1 min-h-[120px]">
              <h3 className="text-sm font-medium text-surface-300 mb-2">
                {t("calls.chat")}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 max-h-40">
                {inCallMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-brand-400">
                      {msg.username}
                    </span>
                    <span className="text-surface-500 mx-1.5 text-xs">
                      {timeAgo(msg.time, locale)}
                    </span>
                    <span className="text-surface-200">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={t("calls.chatPlaceholder")}
                  className="input-field flex-1"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="btn-primary"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "w-64 border-l border-surface-700 bg-surface-900 flex-shrink-0 flex flex-col",
              showParticipants ? "block" : "hidden md:flex"
            )}
          >
            <div className="px-4 py-3 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-surface-400" />
                <span className="text-sm font-medium text-surface-200">
                  {t("calls.participants")} ({participants.length})
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-surface-100 truncate">
                      {p.username}
                    </span>
                    {p.role === "moderator" && (
                      <span className="badge-brand flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {t("calls.moderator")}
                      </span>
                    )}
                  </div>
                  {canModerate && p.user_id !== user?.id && (
                    <button
                      onClick={() => handleKickParticipant(p.id)}
                      className="p-1 rounded text-surface-500 hover:text-error-400 hover:bg-surface-700"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            {t("calls.title")}
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {t("calls.subtitle")}
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          {t("calls.createRoom")}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-error-400 flex-shrink-0" />
          <p className="text-sm text-error-300 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-error-400 hover:text-error-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!loading && calls.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("calls.searchPlaceholder")}
            className="input-field w-full pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : calls.length === 0 ? (
        <div className="card text-center py-16">
          <Phone className="h-12 w-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-400">{t("calls.noRooms")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calls
          .filter((call) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              call.room_name.toLowerCase().includes(q) ||
              call.creator_username.toLowerCase().includes(q)
            );
          })
          .map((call) => (
            <div
              key={call.id}
              className="card animate-fade-in hover:border-surface-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-surface-100 truncate pr-2">
                  {call.room_name}
                </h3>
                <span
                  className={cn(
                    "badge flex-shrink-0",
                    call.status === "active"
                      ? "bg-success-500/15 text-success-400"
                      : "bg-surface-500/15 text-surface-500"
                  )}
                >
                  {call.status}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-surface-400 mb-4">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{call.creator_username}</span>
                </div>
                {call.max_participants && (
                  <div>
                    {t("calls.maxParticipants")}: {call.max_participants}
                  </div>
                )}
                <div>{formatDateTime(call.started_at, locale)}</div>
              </div>
              <div className="flex gap-2">
                {call.status === "active" && (
                  <button
                    onClick={() => handleJoinCall(call.id)}
                    disabled={joining === call.id}
                    className="btn-primary flex-1"
                  >
                    {joining === call.id ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    {t("calls.join")}
                  </button>
                )}
                {(isAdmin || call.created_by === user?.id) && (
                  <button
                    onClick={() => handleDeleteCall(call.id)}
                    className="btn-danger flex-shrink-0"
                    title={t("calls.deleteCall")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-sm w-full mx-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">
                {t("calls.createRoom")}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName("");
                }}
                className="text-surface-400 hover:text-surface-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="label">{t("calls.roomName")}</label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              placeholder={t("calls.roomNamePlaceholder")}
              className="input-field w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName("");
                }}
                className="btn-ghost"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || creating}
                className="btn-primary"
              >
                {creating ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("calls.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
