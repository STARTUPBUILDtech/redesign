from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.database import get_db
from app.schemas import (
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    OTPVerifyRequest,
    BindEmailRequest,
    TokenRefreshResponse,
    MessageResponse,
    UserOut,
)
from app.services.auth_service import AuthService
from app.services.rate_limiter import get_real_client_ip, get_redis, RateLimiter
from app.services.ram_cache import ram_cache
from app.security.tokens import decode_access_token
from app.security.csrf import generate_csrf_token, verify_csrf_token, CSRF_COOKIE_NAME

router = APIRouter(prefix="/auth", tags=["Authentication"])

ACCESS_COOKIE_NAME = "paykudi_access_token"
REFRESH_COOKIE_NAME = "paykudi_refresh_token"


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
):
    """Sets secure httpOnly cookies for access and refresh tokens."""
    # 15-minute access token cookie
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    # 7-day rotating refresh token cookie
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def clear_auth_cookies(response: Response):
    """Deletes access and refresh cookies upon logout."""
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")


def get_current_user_id(request: Request) -> str:
    """Dependency extracting user_id from access token cookie or Authorization header."""
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    return payload["sub"]


@router.get("/csrf", response_model=MessageResponse)
def get_csrf(response: Response):
    """Issue a Double-Submit CSRF cookie."""
    token = generate_csrf_token()
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=False,  # Needs to be readable by JS client to send in header
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return MessageResponse(message="CSRF cookie initialized")


@router.post("/login", response_model=LoginResponse)
def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Login with email or WhatsApp phone number + password.
    Enforces rate limits, Turnstile, lockout doubling, and 2-step OTP.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db=db)
    result = service.login(
        raw_identifier=req.identifier,
        password=req.password,
        ip=ip,
        user_agent=user_agent,
        turnstile_token=req.turnstile_token,
    )

    if result.get("otp_required"):
        return LoginResponse(
            status="otp_required",
            message=result["message"],
            otp_required=True,
            user_id=result["user_id"],
        )

    # Login succeeded immediately (known device)
    set_auth_cookies(
        response=response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )

    return LoginResponse(
        status="success",
        message="Login successful",
        otp_required=False,
        user=UserOut.model_validate(result["user"]),
        user_id=result["user_id"],
    )


@router.post("/register", response_model=LoginResponse)
def register(
    req: RegisterRequest,
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Registers a new user with phone/email and Argon2id password hash.
    Sets secure session cookies and returns user details.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db=db)
    result = service.register(
        phone=req.phone,
        password=req.password,
        email=req.email,
        full_name=req.full_name,
        username=req.username,
        ip=ip,
        user_agent=user_agent,
    )

    set_auth_cookies(
        response=response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )

    return LoginResponse(
        status="success",
        message="Account created successfully",
        otp_required=False,
        user=UserOut.model_validate(result["user"]),
        user_id=result["user_id"],
    )


@router.post("/bind-email", response_model=LoginResponse)
def bind_email(
    req: BindEmailRequest,
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Binds an email address to a user account, enabling email login.
    Updates the database and Server RAM Cache immediately.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    auth_user_id = None
    try:
        auth_user_id = get_current_user_id(request)
    except Exception:
        pass

    target_user_id = req.user_id or auth_user_id

    service = AuthService(db=db)
    result = service.bind_email(
        email=req.email,
        user_id=target_user_id,
        phone=req.phone,
        ip=ip,
        user_agent=user_agent,
    )

    set_auth_cookies(
        response=response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )

    return LoginResponse(
        status="success",
        message=result["message"],
        otp_required=False,
        user=UserOut.model_validate(result["user"]),
        user_id=result["user_id"],
    )


@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(
    req: OTPVerifyRequest,
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Validates 6-digit WhatsApp OTP issued on unfamiliar device/IP login.
    On success, stores device and sets session cookies.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db=db)
    result = service.verify_whatsapp_otp(
        user_id=req.user_id,
        otp_input=req.otp,
        ip=ip,
        user_agent=user_agent,
    )

    set_auth_cookies(
        response=response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
    )

    return LoginResponse(
        status="success",
        message="Verification successful. Logged in.",
        otp_required=False,
        user=UserOut.model_validate(result["user"]),
        user_id=result["user_id"],
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Rotate 7-day refresh token and issue new 15-minute access token.
    Detects refresh token reuse and immediately revokes entire session family.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)

    service = AuthService(db=db)
    new_access, new_refresh = service.refresh_session(
        raw_refresh_token=raw_refresh,
        ip=ip,
        user_agent=user_agent,
    )

    set_auth_cookies(response=response, access_token=new_access, refresh_token=new_refresh)
    return TokenRefreshResponse()


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """Revokes the current session and clears cookies."""
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)

    service = AuthService(db=db)
    service.logout(raw_refresh_token=raw_refresh, ip=ip, user_agent=user_agent)
    clear_auth_cookies(response)
    return MessageResponse(message="Successfully logged out")


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    request: Request,
    response: Response,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """Revokes all active sessions across all devices for this user."""
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db=db)
    service.logout_all(user_id=user_id, ip=ip, user_agent=user_agent)
    clear_auth_cookies(response)
    return MessageResponse(message="All sessions revoked")


@router.get("/cache-stats")
def cache_stats():
    """Returns telemetry of the in-memory server RAM cache."""
    return ram_cache.stats()


@router.post("/reset-rate-limits")
def reset_rate_limits(request: Request):
    """Resets rate limiting counters and blocks for development."""
    ip = get_real_client_ip(request)
    limiter = RateLimiter()
    limiter.reset_all_for_ip(ip)
    limiter.reset_all_for_ip("127.0.0.1")
    return {"status": "ok", "message": f"Rate limits reset for IP {ip} and 127.0.0.1"}
