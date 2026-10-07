import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ServerRAMCache:
    """
    High-performance in-memory RAM cache for PayKudi Authentication Server.
    
    Architecture:
    1. Every signup is saved directly to the database first.
    2. Upon database success, the credentials, security hash, and profile
       are cached directly into the server's RAM.
    3. Authentication (login / verification) checks RAM first to avoid
       expensive DB roundtrips.
    """

    def __init__(self, max_entries: int = 10000):
        self._lock = threading.RLock()
        self.max_entries = max_entries
        # Primary storage: user_id -> user_dict
        self._users_by_id: Dict[str, Dict[str, Any]] = {}
        # Secondary index: identifier (phone / email) -> user_id
        self._identifier_to_id: Dict[str, str] = {}
        # Telemetry
        self.hits: int = 0
        self.misses: int = 0

    def cache_user(self, user) -> Dict[str, Any]:
        """
        Caches a user object or dict into RAM immediately after DB write.
        Accepts SQLAlchemy User model or dictionary.
        """
        with self._lock:
            user_id = str(getattr(user, "id", None) or user.get("id"))
            email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
            whatsapp = getattr(user, "whatsapp_number", None) or (user.get("whatsapp_number") if isinstance(user, dict) else None)
            full_name = getattr(user, "full_name", None) or (user.get("full_name") if isinstance(user, dict) else None)
            username = getattr(user, "username", None) or (user.get("username") if isinstance(user, dict) else None)
            password_hash = getattr(user, "password_hash", None) or (user.get("password_hash") if isinstance(user, dict) else None)
            is_verified = getattr(user, "is_verified", True) if getattr(user, "is_verified", None) is not None else user.get("is_verified", True)
            failed_attempts = getattr(user, "failed_attempts", 0) if getattr(user, "failed_attempts", None) is not None else user.get("failed_attempts", 0)
            lock_count = getattr(user, "lock_count", 0) if getattr(user, "lock_count", None) is not None else user.get("lock_count", 0)
            locked_until = getattr(user, "locked_until", None) or (user.get("locked_until") if isinstance(user, dict) else None)
            last_login_at = getattr(user, "last_login_at", None) or (user.get("last_login_at") if isinstance(user, dict) else None)

            record = {
                "id": user_id,
                "email": email,
                "whatsapp_number": whatsapp,
                "full_name": full_name,
                "username": username,
                "password_hash": password_hash,
                "is_verified": is_verified,
                "failed_attempts": failed_attempts,
                "lock_count": lock_count,
                "locked_until": locked_until,
                "last_login_at": last_login_at,
                "cached_at": utc_now(),
            }

            self._users_by_id[user_id] = record

            if whatsapp:
                self._identifier_to_id[whatsapp.strip().lower()] = user_id
            if email:
                self._identifier_to_id[email.strip().lower()] = user_id
            if username:
                self._identifier_to_id[username.strip().lower()] = user_id

            return record

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Lookup cached user by phone, email, or username directly from RAM."""
        norm = identifier.strip().lower()
        with self._lock:
            user_id = self._identifier_to_id.get(norm)
            if user_id and user_id in self._users_by_id:
                self.hits += 1
                return self._users_by_id[user_id]
            self.misses += 1
            return None

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Lookup cached user by UUID from RAM."""
        with self._lock:
            user = self._users_by_id.get(user_id)
            if user:
                self.hits += 1
                return user
            self.misses += 1
            return None

    def update_failed_attempt(self, identifier: str, failed_attempts: int, locked_until: Optional[datetime], lock_count: int):
        """Update security lock counters in RAM."""
        with self._lock:
            user = self.get_by_identifier(identifier)
            if user:
                user["failed_attempts"] = failed_attempts
                user["locked_until"] = locked_until
                user["lock_count"] = lock_count

    def reset_failed_attempts(self, identifier: str):
        """Reset security counters on successful authentication in RAM."""
        with self._lock:
            user = self.get_by_identifier(identifier)
            if user:
                user["failed_attempts"] = 0
                user["locked_until"] = None
                user["last_login_at"] = utc_now()

    def invalidate(self, identifier: str):
        """Removes a user from RAM cache."""
        norm = identifier.strip().lower()
        with self._lock:
            user_id = self._identifier_to_id.pop(norm, None)
            if user_id:
                self._users_by_id.pop(user_id, None)

    def clear(self):
        """Clears all entries and indices from RAM cache."""
        with self._lock:
            self._users_by_id.clear()
            self._identifier_to_id.clear()
            self.hits = 0
            self.misses = 0

    def stats(self) -> Dict[str, Any]:
        """Telemetry reporting."""
        with self._lock:
            return {
                "cached_users_count": len(self._users_by_id),
                "indexed_identifiers": len(self._identifier_to_id),
                "cache_hits": self.hits,
                "cache_misses": self.misses,
            }


# Singleton RAM cache instance for the server
ram_cache = ServerRAMCache()
