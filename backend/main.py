"""Canonical compatibility entrypoint for the repository-root launch command.

The production application lives in ``app.backend``.  This shim keeps the
natural ``uvicorn backend.main:app`` command pointed at that same application
instead of the obsolete minimal API that previously masked all analytics
routes.
"""

from app.backend.main import app

__all__ = ["app"]
