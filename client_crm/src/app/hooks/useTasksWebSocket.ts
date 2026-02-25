import { useEffect, useRef } from "react";
import type { Task } from "../types/api";

interface TaskWebSocketMessage {
  action: "create" | "update" | "delete";
  task?: Task;
  task_id?: string;
}

export function useTasksWebSocket(
  onTaskUpdate: (message: TaskWebSocketMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connect = () => {
      // Get WebSocket URL from environment or construct from current location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const wsUrl = apiUrl.replace(/^http/, "ws").replace(/^https/, "wss");
      const ws = new WebSocket(`${wsUrl}/reports/ws/tasks`);

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const message: TaskWebSocketMessage = JSON.parse(event.data);
          onTaskUpdate(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting...");
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onTaskUpdate]);

  return wsRef.current;
}
