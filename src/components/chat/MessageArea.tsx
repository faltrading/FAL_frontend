"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Pencil, Trash2, Reply, X, MessageSquare, CornerDownRight, Pin, ImageIcon, Mic, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn, formatTime } from "@/lib/utils";
import type { ChatGroup, ChatMessage } from "@/lib/types";
import { GroupInviteCard } from "@/components/chat/GroupInviteCard";
import { supabase } from "@/lib/supabase";

interface MessageAreaProps {
  messages: ChatMessage[];
  groupId: string | null;
  onSendMessage: (content: string, replyToId?: string, messageType?: string, metadata?: Record<string, unknown>) => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  onPinMessage: (id: string) => void;
  onGroupJoined?: (group: ChatGroup) => void;
}

export function MessageArea({
  messages,
  groupId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onGroupJoined,
}: MessageAreaProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replyToMessage = messages.find((m) => m.id === replyToId);

  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (editingId) {
      onEditMessage(editingId, trimmed);
      setEditingId(null);
    } else {
      onSendMessage(trimmed, replyToId || undefined);
    }
    setInput("");
    setReplyToId(null);
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setInput(msg.content);
    setReplyToId(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setInput("");
  };

  const handleFileUpload = async (file: File, type: "image" | "audio") => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(path);
      onSendMessage(publicUrl, undefined, type, {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });
    } catch (err) {
      console.error("[Chat] File upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const startReply = (msg: ChatMessage) => {
    setReplyToId(msg.id);
    setEditingId(null);
    setInput("");
    inputRef.current?.focus();
  };

  if (!groupId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-900">
        <div className="text-center text-surface-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t("chat.selectGroup")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-900 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const isSystem = msg.message_type === "system";
          const isAnnouncement = msg.message_type === "announcement";

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="text-xs text-surface-500 italic">{msg.content}</span>
              </div>
            );
          }

          if (isAnnouncement) {
            // Group invite cards
            const meta = msg.metadata as Record<string, unknown> | undefined;
            if (meta?.group_invite && onGroupJoined) {
              return (
                <GroupInviteCard
                  key={msg.id}
                  message={msg}
                  onGroupJoined={onGroupJoined}
                />
              );
            }

            return (
              <div
                key={msg.id}
                className="w-full bg-brand-500/10 border-l-2 border-brand-400 rounded px-3 py-2 my-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-brand-400">
                    {msg.sender_username}
                  </span>
                  <span className="text-xs text-surface-500">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm text-surface-200">{msg.content}</p>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn("flex py-0.5", isOwn ? "justify-end" : "justify-start")}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 relative group",
                  isOwn ? "bg-brand-500/20" : "bg-surface-700"
                )}
              >
                {(() => {
                  const replyContent = msg.reply_to_content ?? messagesById.get(msg.reply_to_id ?? "")?.content ?? null;
                  const replyUsername = msg.reply_to_username ?? messagesById.get(msg.reply_to_id ?? "")?.sender_username ?? null;
                  const replyDeleted = msg.reply_to_id ? messagesById.get(msg.reply_to_id)?.is_deleted : false;

                  if (!msg.reply_to_id) return null;

                  return (
                    <div className="flex items-start gap-1.5 bg-surface-800/80 border-l-2 border-brand-400/60 rounded px-2 py-1.5 text-xs mb-1.5 cursor-pointer hover:bg-surface-800 transition-colors">
                      <CornerDownRight className="h-3 w-3 text-brand-400/60 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-brand-400 font-medium text-[11px]">
                          {replyUsername || t("chat.unknownUser")}
                        </span>
                        <p className={cn(
                          "truncate mt-0.5 leading-tight",
                          replyDeleted ? "text-surface-500 italic" : "text-surface-400"
                        )}>
                          {replyDeleted ? t("chat.messageDeleted") : replyContent || "..."}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {!isOwn && (
                  <p className="text-xs font-medium text-brand-400 mb-0.5">
                    {msg.sender_username}
                  </p>
                )}

                {msg.is_deleted ? (
                  <p className="text-sm text-surface-500 italic">
                    {t("chat.messageDeleted")}
                  </p>
                ) : msg.message_type === "image" ? (
                  <a href={msg.content} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.content}
                      alt={(msg.metadata?.file_name as string) || "image"}
                      className="max-w-[240px] max-h-[320px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                ) : msg.message_type === "audio" ? (
                  <audio
                    controls
                    src={msg.content}
                    className="max-w-[260px] w-full mt-1"
                  />
                ) : (
                  <p className="text-sm text-surface-200 break-words">{msg.content}</p>
                )}

                {msg.is_pinned && !msg.is_deleted && (
                  <div className="flex items-center gap-1 mt-1">
                    <Pin className="h-3 w-3 text-brand-400" />
                    <span className="text-[10px] text-brand-400 font-medium">
                      {t("chat.pinnedBy")} {msg.pinned_by}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 mt-1 justify-end">
                  {msg.is_edited && !msg.is_deleted && (
                    <span className="text-[10px] text-surface-500 italic">
                      ({t("chat.edited")})
                    </span>
                  )}
                  <span className="text-[10px] text-surface-500">
                    {formatTime(msg.created_at)}
                  </span>
                </div>

                {hoveredId === msg.id && !msg.is_deleted && (
                  <div
                    className={cn(
                      "absolute -top-3 flex items-center gap-0.5 bg-surface-800 rounded-md border border-surface-600 px-1 py-0.5 shadow",
                      isOwn ? "right-2" : "left-2"
                    )}
                  >
                    <button
                      onClick={() => startReply(msg)}
                      className="p-1 text-surface-400 hover:text-surface-100 rounded"
                      title={t("chat.reply")}
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onPinMessage(msg.id)}
                      className={cn(
                        "p-1 rounded",
                        msg.is_pinned
                          ? "text-brand-400 hover:text-brand-300"
                          : "text-surface-400 hover:text-surface-100"
                      )}
                      title={msg.is_pinned ? t("chat.unpinMessage") : t("chat.pinMessage")}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    {isOwn && msg.message_type === "text" && (
                      <>
                        <button
                          onClick={() => startEdit(msg)}
                          className="p-1 text-surface-400 hover:text-surface-100 rounded"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          className="p-1 text-surface-400 hover:text-error-400 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {(replyToId || editingId) && (
        <div className="px-3 sm:px-4 py-2 bg-surface-800 border-t border-surface-700 flex items-center gap-2">
          <div className="flex-1 min-w-0 text-xs text-surface-400">
            {editingId ? (
              <span>{t("chat.editing")}</span>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <Reply className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                <div className="min-w-0 truncate">
                  <span>{t("chat.replyingTo")}{" "}</span>
                  <span className="text-brand-400 font-medium">{replyToMessage?.sender_username}</span>
                  {replyToMessage && (
                    <span className="text-surface-500 ml-1.5 hidden sm:inline">— {replyToMessage.content}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (editingId) cancelEdit();
              else setReplyToId(null);
            }}
            className="text-surface-400 hover:text-surface-100 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-surface-700 flex items-center gap-2"
      >
        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          aria-label="Carica immagine"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac"
          className="hidden"
          aria-label="Carica audio"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "audio");
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          className="p-2 text-surface-400 hover:text-surface-100 rounded-lg hover:bg-surface-700 transition-colors shrink-0"
          title="Invia immagine"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          disabled={uploading}
          className="p-2 text-surface-400 hover:text-surface-100 rounded-lg hover:bg-surface-700 transition-colors shrink-0"
          title="Invia audio"
        >
          <Mic className="h-5 w-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.messagePlaceholder")}
          className="input-field flex-1"
          disabled={uploading}
        />
        <button
          type="submit"
          disabled={!input.trim() || uploading}
          className="btn-primary p-2 shrink-0"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}
