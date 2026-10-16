import time
import contextvars
from typing import Optional, Dict, Any
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.config import settings

# Per-request context variable holding telemetry metrics
_request_metrics: contextvars.ContextVar[Optional[Dict[str, Any]]] = contextvars.ContextVar(
    "request_metrics", default=None
)


class StrategyWrapper:
    """
    Wraps SQLAlchemy cursor fetch strategy to intercept rows returned by SELECT queries.
    """
    def __init__(self, original, on_rows):
        self._orig = original
        self._on_rows = on_rows

    def fetchall(self, result, dbapi_cursor):
        rows = self._orig.fetchall(result, dbapi_cursor)
        self._on_rows(len(rows))
        return rows

    def fetchmany(self, result, dbapi_cursor, size=None):
        rows = self._orig.fetchmany(result, dbapi_cursor, size=size)
        self._on_rows(len(rows))
        return rows

    def fetchone(self, result, dbapi_cursor, hard_close=False):
        row = self._orig.fetchone(result, dbapi_cursor, hard_close=hard_close)
        if row is not None:
            self._on_rows(1)
        return row

    def __getattr__(self, name):
        return getattr(self._orig, name)


def _on_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    if not getattr(settings, "DEBUG", False):
        return
    metrics = _request_metrics.get()
    if metrics is not None:
        metrics["queries"] += 1
        conn.info["_query_start"] = time.perf_counter()


def _on_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    if not getattr(settings, "DEBUG", False):
        return
    metrics = _request_metrics.get()
    if metrics is not None:
        start = conn.info.pop("_query_start", None)
        if start is not None:
            metrics["db_elapsed_ms"] += (time.perf_counter() - start) * 1000.0

        def _add_rows(n: int):
            m = _request_metrics.get()
            if m is not None:
                m["rows"] += n

        if context and hasattr(context, "cursor_fetch_strategy") and context.cursor_fetch_strategy:
            context.cursor_fetch_strategy = StrategyWrapper(context.cursor_fetch_strategy, _add_rows)

        # For non-select DML queries (INSERT, UPDATE, DELETE)
        rc = getattr(cursor, "rowcount", 0)
        stmt_upper = statement.strip().upper() if isinstance(statement, str) else ""
        if rc is not None and rc > 0 and not stmt_upper.startswith("SELECT"):
            metrics["rows"] += rc


_listeners_registered = False


def register_sqlalchemy_query_listeners():
    """Registers SQLAlchemy query cursor listeners globally on Engine."""
    global _listeners_registered
    if not _listeners_registered:
        event.listen(Engine, "before_cursor_execute", _on_before_cursor_execute)
        event.listen(Engine, "after_cursor_execute", _on_after_cursor_execute)
        _listeners_registered = True


class QueryMetricsMiddleware(BaseHTTPMiddleware):
    """
    DEBUG-only middleware recording per-request DB queries, rows returned, and elapsed time.
    Exposes them as X-DB-Queries, X-DB-Rows, and X-Time-ms response headers.
    Completely disabled and silent when settings.DEBUG is False.
    """
    async def dispatch(self, request: Request, call_next):
        if not getattr(settings, "DEBUG", False):
            return await call_next(request)

        metrics = {
            "queries": 0,
            "rows": 0,
            "db_elapsed_ms": 0.0,
            "start_time": time.perf_counter(),
        }
        token = _request_metrics.set(metrics)
        try:
            response: Response = await call_next(request)
            elapsed_ms = (time.perf_counter() - metrics["start_time"]) * 1000.0
            response.headers["X-DB-Queries"] = str(metrics["queries"])
            response.headers["X-DB-Rows"] = str(metrics["rows"])
            response.headers["X-Time-ms"] = f"{elapsed_ms:.2f}"
            return response
        finally:
            _request_metrics.reset(token)
