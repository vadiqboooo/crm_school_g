from typing import Dict, Set
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

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


manager = ConnectionManager()
