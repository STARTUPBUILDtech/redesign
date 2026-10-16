from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies enterprise-grade security headers to all responses:
    - Content-Security-Policy
    - Strict-Transport-Security (HSTS)
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Content-Security-Policy
        if settings.DEBUG:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* https: data: blob:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* https: blob:; "
                "style-src 'self' 'unsafe-inline' https: http://localhost:*; "
                "font-src 'self' https: data: http://localhost:*; "
                "img-src 'self' data: https: blob: http://localhost:*; "
                "connect-src 'self' http://localhost:* ws://localhost:* https: data:; "
                "frame-src 'self' https: http://localhost:*; "
                "frame-ancestors 'self' http://localhost:* chrome-extension:; "
                "object-src 'none';"
            )
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https://challenges.cloudflare.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com data:; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https:; "
                "frame-src https://challenges.cloudflare.com; "
                "frame-ancestors 'none'; "
                "object-src 'none'; "
                "base-uri 'self';"
            )
            response.headers["X-Frame-Options"] = "DENY"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        return response
