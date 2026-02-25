"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseWebSocketOptions {
  url: string;
  token?: string | null;
  onMessage?: (data: unknown) => void;
  enabled?: boolean;
}

export function useWebSocket({ url, token, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !url) return;

    const fullUrl = token ? `${url}?token=${token}` : url;
    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 3000);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch {
        // silent
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url, token, enabled]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
