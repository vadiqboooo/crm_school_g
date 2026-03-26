import { useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "../types/api";

export interface WsNewMessage {
  type: "new_message";
  message: ChatMessage;
}
export interface WsTyping {
  type: "typing";
  room_id: string;
  sender_id: string;
  sender_name: string;
}
export interface WsReadReceipt {
  type: "read_receipt";
  room_id: string;
  reader_id: string;
  read_at: string;
}
export interface WsMessageDeleted {
  type: "message_deleted";
  message_id: string;
  room_id: string;
}
export interface WsPong {
  type: "pong";
}
export interface WsKeyDistributionNeeded {
  type: "key_distribution_needed";
  room_id: string;
}

export type ChatWsEvent = WsNewMessage | WsTyping | WsReadReceipt | WsMessageDeleted | WsPong | WsKeyDistributionNeeded;

interface UseChatWebSocketOptions {
  wsUrl: string;
  onEvent: (event: ChatWsEvent) => void;
  enabled?: boolean;
}

export function useChatWebSocket({ wsUrl, onEvent, enabled = true }: UseChatWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const pingRef = useRef<ReturnType<typeof setInterval>>();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Start heartbeat ping
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30_000);
    };

    ws.onmessage = (e) => {
      try {
        const data: ChatWsEvent = JSON.parse(e.data);
        onEventRef.current(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      // handled by onclose
    };

    ws.onclose = () => {
      clearInterval(pingRef.current);
      // Reconnect with backoff
      reconnectRef.current = setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [wsUrl, enabled]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect, enabled]);

  const sendTyping = useCallback((roomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", room_id: roomId }));
    }
  }, []);

  const sendRead = useCallback((roomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "read", room_id: roomId }));
    }
  }, []);

  return { sendTyping, sendRead };
}
