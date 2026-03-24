from typing import Dict, Set, Optional
from datetime import datetime, timezone
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        # topic → set of websockets (used for broadcast topics like "tasks")
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # user_key (e.g. "student:uuid") → set of websockets (used for direct delivery)
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        # user_key → last seen datetime (updated on connect and disconnect)
        self.last_seen: Dict[str, datetime] = {}

    async def connect(self, websocket: WebSocket, topic: str):
        await websocket.accept()
        if topic not in self.active_connections:
            self.active_connections[topic] = set()
        self.active_connections[topic].add(websocket)

    def disconnect(self, websocket: WebSocket, topic: str):
        if topic in self.active_connections:
            self.active_connections[topic].discard(websocket)
            if not self.active_connections[topic]:
                del self.active_connections[topic]

    async def broadcast(self, topic: str, message: dict):
        if topic in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[topic]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)

            # Remove disconnected connections
            for connection in disconnected:
                self.disconnect(connection, topic)

    # ── Per-user chat connections ─────────────────────────────────────────────

    def connect_user(self, websocket: WebSocket, user_key: str):
        """Register a websocket for a specific user (chat). Accepts already done."""
        if user_key not in self.user_connections:
            self.user_connections[user_key] = set()
        self.user_connections[user_key].add(websocket)
        self.last_seen[user_key] = datetime.now(timezone.utc)

    def disconnect_user(self, websocket: WebSocket, user_key: str):
        if user_key in self.user_connections:
            self.user_connections[user_key].discard(websocket)
            if not self.user_connections[user_key]:
                del self.user_connections[user_key]
        self.last_seen[user_key] = datetime.now(timezone.utc)

    def get_last_seen(self, user_key: str) -> Optional[datetime]:
        return self.last_seen.get(user_key)

    async def send_to_user(self, user_key: str, message: dict):
        """Send a message to all active connections of a specific user."""
        if user_key not in self.user_connections:
            return
        disconnected = set()
        for ws in self.user_connections[user_key]:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            self.disconnect_user(ws, user_key)

    def is_user_online(self, user_key: str) -> bool:
        return user_key in self.user_connections and len(self.user_connections[user_key]) > 0


manager = ConnectionManager()
