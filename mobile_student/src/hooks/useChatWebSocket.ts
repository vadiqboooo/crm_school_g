import { useEffect, useRef, useCallback, useState } from "react";
import { api, ChatMessage } from "../lib/api";

export type WsIncomingMessage =
  | { type: "new_message"; message: ChatMessage }
  | { type: "typing"; room_id: string; sender_id: string; sender_name: string }
  | { type: "read_receipt"; room_id: string; reader_id: string; read_at: string | null }
  | { type: "message_deleted"; message_id: string }
  | { type: "message_edited"; message: ChatMessage }
  | { type: "pong" }
  | { type: "room_key_updated"; room_id: string };

interface Options {
  onMessage: (msg: WsIncomingMessage) => void;
  onReconnect?: () => void;
  enabled?: boolean;
}

export function useChatWebSocket({ onMessage, onReconnect, enabled = true }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const isFirstConnect = useRef(true);
  const [wsConnected, setWsConnected] = useState(false);

  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  const connect = useCallback(() => {
    if (!isMounted.current || !enabled) return;
    const url = api.getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const wasReconnect = !isFirstConnect.current;
      isFirstConnect.current = false;
      reconnectDelay.current = 1000;
      setWsConnected(true);
      if (wasReconnect) onReconnectRef.current?.();
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsIncomingMessage;
        onMessageRef.current(data);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (!isMounted.current || wsRef.current !== ws) return;
      setWsConnected(false);
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30_000);
      reconnectTimer.current = setTimeout(() => {
        if (!isMounted.current) return;
        api
          .getChatRooms()
          .catch(() => {})
          .finally(() => {
            if (isMounted.current) connect();
          });
      }, delay);
    };

    ws.onerror = () => ws.close();
  }, [enabled]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendTyping = useCallback((roomId: string) => send({ type: "typing", room_id: roomId }), [send]);
  const sendRead = useCallback((roomId: string) => send({ type: "read", room_id: roomId }), [send]);

  useEffect(() => {
    isMounted.current = true;
    isFirstConnect.current = true;
    if (enabled) connect();
    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      wsRef.current?.close();
    };
  }, [enabled, connect]);

  return { sendTyping, sendRead, wsConnected };
}
