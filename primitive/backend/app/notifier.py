from __future__ import annotations

import asyncio
from typing import Dict, Set
from starlette.websockets import WebSocket


class Notifier:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._subscribers: Dict[str, Set[WebSocket]] = {}

    async def subscribe(self, job_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._subscribers.setdefault(job_id, set()).add(ws)

    async def unsubscribe(self, job_id: str, ws: WebSocket) -> None:
        async with self._lock:
            if job_id in self._subscribers:
                self._subscribers[job_id].discard(ws)
                if not self._subscribers[job_id]:
                    del self._subscribers[job_id]

    async def broadcast(self, job_id: str, data: dict) -> None:
        async with self._lock:
            targets = list(self._subscribers.get(job_id, set()))
        for ws in targets:
            try:
                await ws.send_json(data)
            except Exception:
                # Silently drop failed connections
                pass


notifier = Notifier() 