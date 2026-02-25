"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Pencil, Trash2, Reply, X, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn, formatTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

interface MessageAreaProps {
  messages: ChatMessage[];
  groupId: string | null;
  onSendMessage: (content: string, replyToId?: string) => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
}

export function MessageArea({
  messages,
  groupId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
}: MessageAreaProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replyToMessage = messages.find((m) => m.id === replyToId);

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
                  "max-w-[75%] rounded-lg px-3 py-2 relative group",
                  isOwn ? "bg-brand-500/20" : "bg-surface-700"
                )}
              >
                {msg.reply_to_content && (
                  <div className="bg-surface-800 border-l-2 border-surface-500 rounded px-2 py-1 text-xs mb-1">
                    <span className="text-surface-400 font-medium">
                      {msg.reply_to_username}
                    </span>
                    <p className="text-surface-500 truncate">{msg.reply_to_content}</p>
                  </div>
                )}

                {!isOwn && (
                  <p className="text-xs font-medium text-brand-400 mb-0.5">
                    {msg.sender_username}
                  </p>
                )}

                {msg.is_deleted ? (
                  <p className="text-sm text-surface-500 italic">
                    {t("chat.messageDeleted")}
                  </p>
                ) : (
                  <p className="text-sm text-surface-200 break-words">{msg.content}</p>
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
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                    {isOwn && (
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
        <div className="px-4 py-2 bg-surface-800 border-t border-surface-700 flex items-center gap-2">
          <div className="flex-1 text-xs text-surface-400 truncate">
            {editingId ? (
              <span>{t("chat.editing")}</span>
            ) : (
              <span>
                {t("chat.replyingTo")}{" "}
                <span className="text-brand-400">{replyToMessage?.sender_username}</span>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (editingId) cancelEdit();
              else setReplyToId(null);
            }}
            className="text-surface-400 hover:text-surface-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-surface-700 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.messagePlaceholder")}
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="btn-primary p-2"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
