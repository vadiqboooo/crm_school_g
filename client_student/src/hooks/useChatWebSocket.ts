import { useEffect, useRef, useCallback, useState } from "react";
import { api, ChatMessage } from "../lib/api";

export type WsIncomingMessage =
  | { type: "new_message"; message: ChatMessage }
  | { type: "typing"; room_id: string; sender_id: string; sender_name: string }
  | { type: "read_receipt"; room_id: string; reader_id: string; read_at: string | null }
  | { type: "pong" };

interface Options {
  onMessage: (msg: WsIncomingMessage) => void;
  onReconnect?: () => void; // called when WS reconnects after a drop
  enabled?: boolean;
}

/**
 * Persistent WebSocket connection to /chat/ws.
 *
 * Key design: onMessage is stored in a ref so the WebSocket is NEVER
 * reconnected when the current room changes — only on mount/unmount or
 * when enabled changes. This prevents message loss during room switches.
 */
export function useChatWebSocket({ onMessage, onReconnect, enabled = true }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const isFirstConnect = useRef(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Always-current refs — no reconnect needed when callbacks change
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);

  const connect = useCallback(() => {
    if (!isMounted.current || !enabled) return;
    const url = api.getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    console.debug("[WS] connecting to", url);
    ws.onopen = () => {
      console.debug("[WS] connected ✓");
      const wasReconnect = !isFirstConnect.current;
      isFirstConnect.current = false;
      reconnectDelay.current = 1000;
      setWsConnected(true);
      // On reconnect (not first connect), fetch missed messages
      if (wasReconnect) {
        onReconnectRef.current?.();
      }
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsIncomingMessage;
        console.debug("[WS] received:", data);
        onMessageRef.current(data); // always calls the latest version
      } catch (e) {
        console.error("[WS] onmessage error:", e);
      }
    };

    ws.onclose = (e) => {
      console.debug("[WS] closed, code:", e.code, "isCurrentWs:", wsRef.current === ws, "isMounted:", isMounted.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      // Guard against stale WebSocket BEFORE setWsConnected — StrictMode fires
      // WS1's onclose after WS2 is already active and connected (wsRef=WS2).
      // Setting wsConnected=false here would incorrectly mark WS2 as disconnected.
      if (!isMounted.current || wsRef.current !== ws) return;
      setWsConnected(false);
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30_000);
      reconnectTimer.current = setTimeout(() => {
        if (!isMounted.current) return;
        // Ping REST before reconnect — auto-refreshes expired token on 401
        api.getChatRooms().catch(() => {}).finally(() => {
          if (isMounted.current) connect();
        });
      }, delay);
    };

    ws.onerror = (e) => { console.error("[WS] error:", e); ws.close(); };
  }, [enabled]); // ← NOT depends on onMessage — stable reference

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendMessage = useCallback(
    (roomId: string, contentEncrypted: string, messageType = "text", replyToId?: string) => {
      send({
        type: "send_message",
        room_id: roomId,
        content_encrypted: contentEncrypted,
        message_type: messageType,
        ...(replyToId ? { reply_to_id: replyToId } : {}),
      });
    },
    [send]
  );

  const sendTyping = useCallback((roomId: string) => {
    send({ type: "typing", room_id: roomId });
  }, [send]);

  const sendRead = useCallback((roomId: string) => {
    send({ type: "read", room_id: roomId });
  }, [send]);

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
  }, [enabled, connect]); // connect is stable (no onMessage dep)

  return { sendMessage, sendTyping, sendRead, wsConnected };
}
