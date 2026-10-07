import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import jwt
from app.config import settings


def hash_token(raw_token: str) -> str:
    """Hash token using SHA-256 for persistent database storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


hash_refresh_token = hash_token


def hash_otp(raw_otp: str) -> str:
    """Hash a 6-digit WhatsApp OTP using SHA-256."""
    return hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: str,
    family_id: Optional[str] = None,
    session_id: Optional[str] = None,
    custom_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Issue a 15-minute access JWT."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if family_id:
        payload["family_id"] = family_id
    if session_id:
        payload["session_id"] = session_id
    if custom_claims:
        payload.update(custom_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate access JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None


def generate_refresh_token() -> str:
    """Generate a cryptographically secure 64-character URL-safe refresh token."""
    return secrets.token_urlsafe(48)


def generate_otp() -> str:
    """Generate a secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000:06d}"


generate_otp_code = generate_otp
