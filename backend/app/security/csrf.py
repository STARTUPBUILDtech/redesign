import secrets
from fastapi import Request, HTTPException, status
from app.config import settings

CSRF_COOKIE_NAME = "paykudi_csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"


def generate_csrf_token() -> str:
    """Generate a high-entropy random CSRF token (hex)."""
    return secrets.token_hex(32)


def verify_csrf_token(request: Request) -> bool:
    """
    Validates CSRF token using the Double-Submit Cookie pattern.
    Compares the header X-CSRF-Token with the cookie paykudi_csrf_token.
    Safe HTTP methods (GET, HEAD, OPTIONS) bypass verification.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return True

    # If CSRF protection is explicitly bypassed via settings (e.g. testing mode)
    if getattr(settings, "DISABLE_CSRF_FOR_TESTS", False):
        return True

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME)

    if not cookie_token or not header_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing in request headers or cookies",
        )

    if not secrets.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )

    return True
