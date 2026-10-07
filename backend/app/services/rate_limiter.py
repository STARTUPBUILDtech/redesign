import ipaddress
import time
from typing import Optional, Tuple
import redis
from fastapi import Request, HTTPException, status
from app.config import settings

# Global Redis client instance
redis_client: Optional[redis.Redis] = None


class InMemoryRedisFallback:
    """In-memory RAM fallback when external Redis server is offline."""
    def __init__(self):
        self._store = {}
        self._expires = {}
        self._sets = {}

    def _purge_expired(self, key):
        if key in self._expires and time.time() > self._expires[key]:
            self._store.pop(key, None)
            self._expires.pop(key, None)
            self._sets.pop(key, None)

    def get(self, key):
        self._purge_expired(key)
        return self._store.get(key)

    def set(self, key, value, ex=None):
        self._store[key] = str(value)
        if ex:
            self._expires[key] = time.time() + ex

    def delete(self, key):
        self._store.pop(key, None)
        self._expires.pop(key, None)
        self._sets.pop(key, None)

    def ttl(self, key):
        self._purge_expired(key)
        if key not in self._store and key not in self._sets:
            return -2
        if key not in self._expires:
            return -1
        return max(0, int(self._expires[key] - time.time()))

    def expire(self, key, seconds):
        if key in self._store or key in self._sets:
            self._expires[key] = time.time() + seconds

    def incr(self, key):
        self._purge_expired(key)
        val = int(self._store.get(key, 0)) + 1
        self._store[key] = val
        return val

    def sadd(self, key, val):
        self._purge_expired(key)
        if key not in self._sets:
            self._sets[key] = set()
        self._sets[key].add(str(val))
        return 1

    def scard(self, key):
        self._purge_expired(key)
        return len(self._sets.get(key, set()))

    def pipeline(self):
        class MemoryPipe:
            def __init__(self, parent):
                self.parent = parent
                self.ops = []

            def incr(self, key):
                self.ops.append(lambda: self.parent.incr(key))
                return self

            def ttl(self, key):
                self.ops.append(lambda: self.parent.ttl(key))
                return self

            def expire(self, key, seconds):
                self.ops.append(lambda: self.parent.expire(key, seconds))
                return self

            def sadd(self, key, val):
                self.ops.append(lambda: self.parent.sadd(key, val))
                return self

            def scard(self, key):
                self.ops.append(lambda: self.parent.scard(key))
                return self

            def execute(self):
                return [op() for op in self.ops]

        return MemoryPipe(self)


_fallback_redis = InMemoryRedisFallback()


def get_redis():
    """Returns singleton Redis client connection, or RAM memory fallback if Redis offline."""
    global redis_client
    if redis_client is None:
        try:
            client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1,
                socket_connect_timeout=1,
            )
            # Health check
            client.ping()
            redis_client = client
        except Exception:
            redis_client = _fallback_redis
    return redis_client


def set_redis(client):
    """Allows injecting custom/fake redis client for tests."""
    global redis_client
    redis_client = client


def is_ip_trusted_proxy(ip_str: str) -> bool:
    """Checks whether the direct peer IP belongs to a trusted proxy."""
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        for trusted in settings.TRUSTED_PROXIES:
            try:
                if "/" in trusted:
                    if ip_obj in ipaddress.ip_network(trusted, strict=False):
                        return True
                else:
                    if ip_obj == ipaddress.ip_address(trusted):
                        return True
            except ValueError:
                continue
    except ValueError:
        return False
    return False


def get_real_client_ip(request: Request) -> str:
    """
    Extracts the genuine client IP address.
    Reads X-Forwarded-For ONLY if the immediate peer is in TRUSTED_PROXIES.
    """
    direct_peer = request.client.host if request.client else "127.0.0.1"

    if not is_ip_trusted_proxy(direct_peer):
        return direct_peer

    # If peer is a trusted proxy, inspect X-Forwarded-For
    xff = request.headers.get("X-Forwarded-For")
    if not xff:
        return direct_peer

    # Parse X-Forwarded-For: client, proxy1, proxy2...
    parts = [part.strip() for part in xff.split(",") if part.strip()]
    if not parts:
        return direct_peer

    # Work backwards from the right, finding the first non-trusted IP
    for ip in reversed(parts):
        try:
            ip_obj = ipaddress.ip_address(ip)
            is_trusted = False
            for trusted in settings.TRUSTED_PROXIES:
                try:
                    if "/" in trusted:
                        if ip_obj in ipaddress.ip_network(trusted, strict=False):
                            is_trusted = True
                            break
                    else:
                        if ip_obj == ipaddress.ip_address(trusted):
                            is_trusted = True
                            break
                except ValueError:
                    continue
            if not is_trusted:
                return ip
        except ValueError:
            continue

    # Fallback to the leftmost address in XFF
    return parts[0]


class RateLimiter:
    """
    Handles:
    1. Per-IP rate limiting: max 10 attempts / 15 minutes.
    2. Cloudflare Turnstile requirement after 3 failed attempts from an IP.
    3. Credential stuffing detection: auto-block IP for 24h if >= 10 distinct accounts failed.
    """

    def __init__(self, r: Optional[redis.Redis] = None):
        self.r = r or get_redis()

    def check_ip_blocked(self, ip: str) -> Tuple[bool, int]:
        """Check if an IP is in the 24-hour credential stuffing auto-block list."""
        if ip in ("127.0.0.1", "::1", "localhost") and settings.ENVIRONMENT == "development":
            return False, 0
        block_key = f"block:ip:{ip}"
        ttl = self.r.ttl(block_key)
        if ttl and ttl > 0:
            return True, ttl
        return False, 0

    def check_ip_rate_limit(self, ip: str) -> Tuple[bool, int, int]:
        """
        Sliding / fixed window limit: max 10 attempts per 15 minutes.
        Returns: (allowed: bool, remaining: int, retry_after: int)
        """
        # In development, exempt local loopback from blocking the developer
        if ip in ("127.0.0.1", "::1", "localhost") and settings.ENVIRONMENT == "development":
            return True, 999, 0

        key = f"rl:ip:{ip}:attempts"
        window_seconds = settings.IP_RATE_LIMIT_WINDOW_MINUTES * 60
        max_attempts = settings.MAX_LOGIN_ATTEMPTS_PER_IP

        pipe = self.r.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        results = pipe.execute()

        count = results[0]
        ttl = results[1]

        # If key was newly created (ttl == -1), set expiry
        if ttl == -1 or ttl is None:
            self.r.expire(key, window_seconds)
            ttl = window_seconds

        if count > max_attempts:
            return False, 0, ttl if ttl > 0 else window_seconds

        return True, max(0, max_attempts - count), 0

    def is_turnstile_required(self, ip: str) -> bool:
        """Returns True if this IP has >= 3 failed logins."""
        if ip in ("127.0.0.1", "::1", "localhost") and settings.ENVIRONMENT == "development":
            return False
        fail_key = f"rl:ip:{ip}:failed_count"
        count = self.r.get(fail_key)
        if count and int(count) >= settings.TURNSTILE_REQUIRED_AFTER_FAILED_ATTEMPTS:
            return True
        return False

    def record_login_failure(self, ip: str, identifier: str) -> Tuple[bool, bool]:
        """
        Record a failed login attempt for the IP.
        - Increments IP failed attempt counter.
        - Adds normalized identifier to distinct failed accounts set.
        - If >= 10 accounts, triggers 24h credential stuffing block.

        Returns: (turnstile_now_required: bool, ip_newly_blocked: bool)
        """
        fail_key = f"rl:ip:{ip}:failed_count"
        stuff_key = f"rl:ip:{ip}:failed_accounts"
        window_seconds = settings.IP_RATE_LIMIT_WINDOW_MINUTES * 60

        pipe = self.r.pipeline()
        pipe.incr(fail_key)
        pipe.expire(fail_key, window_seconds)
        pipe.sadd(stuff_key, identifier)
        pipe.expire(stuff_key, 3600)  # 1 hour window for stuffing detection
        pipe.scard(stuff_key)
        results = pipe.execute()

        ip_failed_count = results[0]
        distinct_accounts_count = results[4]

        turnstile_required = ip_failed_count >= settings.TURNSTILE_REQUIRED_AFTER_FAILED_ATTEMPTS
        ip_newly_blocked = False

        if distinct_accounts_count >= settings.CREDENTIAL_STUFFING_ACCOUNT_THRESHOLD:
            # Auto-block IP for 24 hours
            block_key = f"block:ip:{ip}"
            block_seconds = settings.CREDENTIAL_STUFFING_BLOCK_HOURS * 3600
            self.r.set(block_key, "credential_stuffing_autoblock", ex=block_seconds)
            ip_newly_blocked = True

        return turnstile_required, ip_newly_blocked

    def reset_ip_failed_count(self, ip: str):
        """Reset failed attempt counters upon successful login."""
        fail_key = f"rl:ip:{ip}:failed_count"
        attempts_key = f"rl:ip:{ip}:attempts"
        self.r.delete(fail_key)
        self.r.delete(attempts_key)

    def reset_all_for_ip(self, ip: str):
        """Reset all rate limit counters, failed accounts, and blocks for an IP."""
        self.r.delete(f"rl:ip:{ip}:attempts")
        self.r.delete(f"rl:ip:{ip}:failed_count")
        self.r.delete(f"rl:ip:{ip}:failed_accounts")
        self.r.delete(f"block:ip:{ip}")
