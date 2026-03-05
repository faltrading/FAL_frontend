"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Pencil, Trash2, Reply, X, MessageSquare, CornerDownRight, Pin, Mic, Loader2, Paperclip, Camera, FileDown, StopCircle, Play, Pause } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn, formatTime } from "@/lib/utils";
import type { ChatGroup, ChatMessage } from "@/lib/types";
import { GroupInviteCard } from "@/components/chat/GroupInviteCard";
import { api } from "@/lib/api";

function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play(); }
    setPlaying((p) => !p);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setCurrent(Number(e.target.value));
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 w-[180px] sm:w-[220px] mt-1">
      <button
        type="button"
        onClick={toggle}
        className="h-8 w-8 rounded-full bg-brand-500/20 hover:bg-brand-500/30 flex items-center justify-center text-brand-400 hover:text-brand-300 transition-colors shrink-0"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={current}
          onChange={seek}
          className="w-full h-1 accent-brand-400 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-surface-500 tabular-nums">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
      />
    </div>
  );
}

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
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<{ url: string; file_name: string; file_size: number; mime_type: string }>(
        "/api/v1/chat/media/upload",
        formData
      );
      const type = res.mime_type.startsWith("image/")
        ? "image"
        : res.mime_type.startsWith("audio/")
        ? "audio"
        : res.mime_type.startsWith("video/")
        ? "video"
        : "file";
      onSendMessage(res.url, undefined, type, {
        file_name: res.file_name,
        file_size: res.file_size,
        mime_type: res.mime_type,
      });
    } catch (err) {
      console.error("[Chat] File upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        await handleFileUpload(file);
        setRecordingDuration(0);
      };
      mr.start();
      setRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      // user denied mic or not available
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
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
                  <button
                    onClick={() => setLightbox({ url: msg.content, type: "image", name: (msg.metadata?.file_name as string) || "image" })}
                    className="block"
                  >
                    <img
                      src={msg.content}
                      alt={(msg.metadata?.file_name as string) || "image"}
                      className="max-w-[240px] max-h-[320px] rounded-lg object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </button>
                ) : msg.message_type === "audio" ? (
                  <AudioPlayer src={msg.content} />
                ) : msg.message_type === "video" ? (
                  <button
                    onClick={() => setLightbox({ url: msg.content, type: "video", name: (msg.metadata?.file_name as string) || "video" })}
                    className="block relative group/video"
                  >
                    <video
                      src={msg.content}
                      className="max-w-[240px] rounded-lg mt-1 pointer-events-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover/video:opacity-100 transition-opacity">
                      <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="ml-1 border-t-[8px] border-b-[8px] border-l-[14px] border-t-transparent border-b-transparent border-l-white" />
                      </div>
                    </div>
                  </button>
                ) : msg.message_type === "file" ? (
                  <a
                    href={msg.content}
                    download={(msg.metadata?.file_name as string) || true}
                    className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2 mt-1"
                  >
                    <FileDown className="h-4 w-4 shrink-0" />
                    <span className="truncate max-w-[200px]">
                      {(msg.metadata?.file_name as string) || "File"}
                    </span>
                  </a>
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
                    {isOwn && (
                      <>
                        {msg.message_type === "text" && (
                          <button
                            onClick={() => startEdit(msg)}
                            className="p-1 text-surface-400 hover:text-surface-100 rounded"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
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
        className="px-3 sm:px-4 py-3 border-t border-surface-700 flex items-center gap-1.5 sm:gap-2 safe-bottom"
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          aria-label="Allega file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          aria-label="Fotocamera"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />

        {/* Allega file (qualunque tipo) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || recording}
          className="p-2 touch-target text-surface-400 hover:text-surface-100 rounded-lg hover:bg-surface-700 transition-colors shrink-0"
          title="Allega file (immagine, video, PDF, CSV…)"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Fotocamera (foto o video diretto) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || recording}
          className="p-2 touch-target text-surface-400 hover:text-surface-100 rounded-lg hover:bg-surface-700 transition-colors shrink-0"
          title="Fotocamera (foto o video)"
        >
          <Camera className="h-5 w-5" />
        </button>

        {/* Microfono — registrazione live */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          className={cn(
            "p-2 rounded-lg transition-colors shrink-0",
            recording
              ? "text-error-400 hover:text-error-300 bg-error-400/10 hover:bg-error-400/20"
              : "text-surface-400 hover:text-surface-100 hover:bg-surface-700"
          )}
          title={recording ? "Ferma registrazione" : "Registra audio"}
        >
          {recording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {recording ? (
          <div className="flex-1 flex items-center gap-2.5 px-3 h-10 bg-error-500/10 border border-error-500/25 rounded-lg">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error-500" />
            </span>
            <span className="text-[11px] font-bold tracking-widest text-error-400 uppercase shrink-0">Rec</span>
            <span className="text-sm font-mono tabular-nums text-surface-200 shrink-0">
              {String(Math.floor(recordingDuration / 60)).padStart(2, "0")}:{String(recordingDuration % 60).padStart(2, "0")}
            </span>
            <span className="flex-1 text-xs text-surface-500 truncate">Premi stop per inviare</span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.messagePlaceholder")}
            className="input-field flex-1"
            disabled={uploading}
          />
        )}
        <button
          type="submit"
          disabled={(!input.trim() && !recording) || uploading}
          className="btn-primary p-2 shrink-0"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>

      {/* Lightbox modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-surface-800/80 text-surface-200 hover:text-white hover:bg-surface-700 transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Chiudi"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.type === "image" ? (
              <img
                src={lightbox.url}
                alt={lightbox.name}
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              />
            ) : (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
