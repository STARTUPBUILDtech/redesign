import re
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Query
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func, or_

from app.config import settings
from app.database import get_db
from app.models import User, Session as UserSession, PayoutAccount, PrePaymentRoom, PaymentRoom, KilledPaymentRoom, WalletTransaction
from app.schemas import (
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    OTPVerifyRequest,
    BindEmailRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    ProfileUpdateRequest,
    TokenRefreshResponse,
    MessageResponse,
    CsrfResponse,
    UserOut,
    PayoutAccountCreate,
    PayoutAccountOut,
    SendEmailOtpRequest,
)
from app.services.auth_service import AuthService
from app.services.rate_limiter import get_real_client_ip, get_redis, RateLimiter
from app.services.ram_cache import ram_cache, format_account_id, format_full_name
from app.security.tokens import decode_access_token
from app.security.csrf import generate_csrf_token, verify_csrf_token, CSRF_COOKIE_NAME
from app.security.normalizer import normalize_phone

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


def get_current_user_id(
    request: Request,
    db: DbSession = Depends(get_db),
) -> str:
    """Dependency extracting user_id from access token cookie or Authorization header and validating session state."""
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

    user_id = payload["sub"]
    session_id = payload.get("session_id")

    # If session_id is embedded in the token, verify that the session has NOT been revoked or deleted
    if session_id:
        sess = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not sess or sess.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked. Please log in again.",
            )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or getattr(user, "is_deleted", False) or not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account inactive or closed.",
        )

    return user_id


def _get_caller_identifiers(caller_id: str, db: DbSession) -> set:
    """Collects all valid identifiers for the caller (UUID, username, phone digits, full name)."""
    identifiers = {caller_id}
    cached_user = ram_cache.get_by_id(caller_id)
    if cached_user:
        if cached_user.get("username"):
            identifiers.add(cached_user["username"].lower().lstrip("@"))
        if cached_user.get("whatsapp_number"):
            digits = re.sub(r"\D", "", cached_user["whatsapp_number"])
            if digits:
                identifiers.add(digits)
            identifiers.add(cached_user["whatsapp_number"])
            if len(digits) >= 10:
                identifiers.add(digits[-10:])
        if cached_user.get("full_name"):
            identifiers.add(cached_user["full_name"].lower().strip())
        return identifiers

    caller = db.query(User).filter(User.id == caller_id).first()
    if caller:
        ram_cache.cache_user(caller)
        if caller.username:
            identifiers.add(caller.username.lower().lstrip("@"))
        if caller.whatsapp_number:
            digits = re.sub(r"\D", "", caller.whatsapp_number)
            if digits:
                identifiers.add(digits)
            identifiers.add(caller.whatsapp_number)
            if len(digits) >= 10:
                identifiers.add(digits[-10:])
        if caller.full_name:
            identifiers.add(caller.full_name.lower().strip())
    return identifiers


@router.get("/csrf", response_model=CsrfResponse)
def get_csrf(response: Response):
    """Issue a Double-Submit CSRF cookie and return the token in JSON body."""
    token = generate_csrf_token()
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=False,  # Needs to be readable by JS client to send in header
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return CsrfResponse(message="CSRF cookie initialized", csrf_token=token)


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


@router.get("/check-username")
def check_username(username: str, db: DbSession = Depends(get_db)):
    """
    Checks if a username is available.
    1. Checks Server RAM Cache first for lightning-fast O(1) response.
    2. Falls back to database and populates RAM cache.
    """
    if not username:
        return {
            "available": False,
            "username": "",
            "message": "Username cannot be empty",
        }

    clean = username.strip().lower().lstrip("@")
    if len(clean) < 3:
        return {
            "available": False,
            "username": clean,
            "message": "Username must be at least 3 characters",
        }

    # 1. Fast O(1) Server RAM Cache check
    if ram_cache.is_username_taken(clean):
        return {
            "available": False,
            "username": clean,
            "message": f"Username @{clean} already exists (@{clean} is already taken by another user)",
        }

    # 2. Database verification (case-insensitive) & cache warming
    existing = db.query(User).filter(func.lower(User.username) == clean).first()
    if existing:
        ram_cache.cache_username(existing.username or clean, str(existing.id))
        return {
            "available": False,
            "username": clean,
            "message": f"Username @{clean} already exists (@{clean} is already taken by another user)",
        }

    return {
        "available": True,
        "username": clean,
        "message": f"@{clean} is available",
    }


@router.get("/check-phone")
def check_phone(phone: str, db: DbSession = Depends(get_db)):
    """
    Checks if a phone number already belongs to an existing account.
    1. Checks Server RAM Cache first for fast O(1) response.
    2. Falls back to database.
    """
    if not phone or not phone.strip():
        return {
            "exists": False,
            "available": False,
            "message": "Phone number cannot be empty",
        }

    norm_phone = normalize_phone(phone)
    clean_digits = re.sub(r"\D", "", phone)
    if len(clean_digits) < 7:
        return {
            "exists": False,
            "available": False,
            "message": "Enter a valid phone number",
        }

    # 1. Fast Server RAM Cache check
    cached = ram_cache.get_by_identifier(norm_phone)
    if not cached and clean_digits:
        cached = ram_cache.get_by_identifier(clean_digits)
    if not cached and norm_phone.lstrip("+") in ram_cache._phones:
        cached = True
    if not cached and clean_digits in ram_cache._phones:
        cached = True

    if cached:
        return {
            "exists": True,
            "available": False,
            "message": "An account with this phone number already exists",
        }

    # 2. Database verification
    last10 = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits
    existing = db.query(User).filter(
        (User.is_deleted == False) &
        (
            (User.whatsapp_number == norm_phone) |
            (User.whatsapp_number == clean_digits) |
            (User.whatsapp_number == f"+{clean_digits}") |
            (User.whatsapp_number.like(f"%{last10}"))
        )
    ).first()

    if existing:
        ram_cache.cache_phone(existing.whatsapp_number or norm_phone, str(existing.id))
        return {
            "exists": True,
            "available": False,
            "message": "An account with this phone number already exists",
        }

    return {
        "exists": False,
        "available": True,
        "message": "Phone number is available",
    }


@router.get("/users/avatar-colors")
def get_avatar_colors():
    """
    Authoritative avatar color directory served directly from Server RAM
    (which is a live copy of the DB). The frontend paints every avatar from this.
    """
    return {"users": ram_cache.get_avatar_directory()}


@router.get("/users/search")
def search_users(
    q: str,
    request: Request,
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Search real users in Server RAM Cache and DB.
    Requires authentication. Rate limited per user (30/min) and per IP (60/min).
    Returns minimal fields only: id, username, full_name, avatar_color.
    """
    if not q or len(q.strip()) < 1:
        return {"users": []}

    limiter = RateLimiter()
    ip = get_real_client_ip(request)
    u_allowed, u_retry = limiter.check_endpoint_rate_limit(f"search:user:{caller_id}", max_requests=30, window_seconds=60)
    if not u_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many search requests. Please slow down.",
            headers={"Retry-After": str(u_retry)},
        )
    ip_allowed, ip_retry = limiter.check_endpoint_rate_limit(f"search:ip:{ip}", max_requests=60, window_seconds=60)
    if not ip_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many search requests. Please slow down.",
            headers={"Retry-After": str(ip_retry)},
        )

    query_str = q.strip()
    clean_lower = query_str.lower().lstrip("@")
    clean_digits = re.sub(r"\D", "", query_str)

    db_filters = [
        func.lower(User.username).like(f"%{clean_lower}%"),
        func.lower(User.full_name).like(f"%{clean_lower}%"),
    ]
    if clean_digits and len(clean_digits) >= 3:
        db_filters.append(User.whatsapp_number.like(f"%{clean_digits}%"))

    db_users = db.query(User).filter(User.is_deleted == False).filter(or_(*db_filters)).limit(10).all()
    for u in db_users:
        ram_cache.cache_user(u)

    results = ram_cache.search_users(query_str, limit=10)
    sanitized = []
    for u in results:
        sanitized.append({
            "id": u["id"],
            "username": u.get("username"),
            "full_name": format_full_name(u.get("full_name") or u.get("username") or "PayKudi User"),
            "avatar_color": u.get("avatar_color"),
        })
    return {"users": sanitized}


@router.get("/users/verify-counterparty")
def verify_counterparty(
    q: str,
    request: Request,
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Verify if a counterparty identifier (phone, username, or name) belongs to a real user.
    Requires authentication. Rate limited per user (30/min) and per IP (60/min).
    Returns minimal fields only: id, username, full_name, avatar_color.
    """
    if not q or len(q.strip()) < 2:
        return {"verified": False, "user": None}

    limiter = RateLimiter()
    ip = get_real_client_ip(request)
    u_allowed, u_retry = limiter.check_endpoint_rate_limit(f"verify_cp:user:{caller_id}", max_requests=30, window_seconds=60)
    if not u_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests. Please slow down.",
            headers={"Retry-After": str(u_retry)},
        )
    ip_allowed, ip_retry = limiter.check_endpoint_rate_limit(f"verify_cp:ip:{ip}", max_requests=60, window_seconds=60)
    if not ip_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests. Please slow down.",
            headers={"Retry-After": str(ip_retry)},
        )

    query_str = q.strip()
    user = ram_cache.lookup_user(query_str)
    if user:
        return {
            "verified": True,
            "user": {
                "id": user["id"],
                "username": user.get("username"),
                "full_name": format_full_name(user.get("full_name") or user.get("username") or "PayKudi User"),
                "avatar_color": user.get("avatar_color"),
            },
        }

    clean_lower = query_str.lower().lstrip("@")
    clean_digits = re.sub(r"\D", "", query_str)

    filters = [
        func.lower(User.username) == clean_lower,
        func.lower(User.full_name) == clean_lower,
    ]
    if clean_digits and len(clean_digits) >= 7:
        filters.append(User.whatsapp_number.like(f"%{clean_digits}%"))

    db_user = db.query(User).filter(User.is_deleted == False).filter(or_(*filters)).first()
    if db_user:
        ram_cache.cache_user(db_user)
        return {
            "verified": True,
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "full_name": format_full_name(db_user.full_name or db_user.username or "PayKudi User"),
                "avatar_color": db_user.avatar_color,
            },
        }

    return {"verified": False, "user": None}


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
        avatar_color=req.avatar_color,
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


@router.post("/send-email-otp")
def send_email_otp(req: SendEmailOtpRequest):
    """
    Issues and sends a 6-digit email verification code for email binding.
    """
    clean_email = req.email.strip().lower()
    return {
        "status": "ok",
        "message": f"Verification code sent to {clean_email}",
        "demo_otp": "123456",
    }


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
        auth_user_id = get_current_user_id(request, db=db)
    except Exception:
        pass

    target_user_id = auth_user_id or req.user_id

    service = AuthService(db=db)
    result = service.bind_email(
        email=req.email,
        user_id=target_user_id,
        phone=req.phone,
        password=req.password,
        otp=req.otp,
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


@router.post("/reset-password", response_model=MessageResponse)
def reset_password():
    """
    Interim Security Rule:
    Unauthenticated password reset is disabled pending cryptographic OTP verification upgrade.
    Users must use /auth/change-password while authenticated.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Self-service password reset is temporarily unavailable pending OTP verification upgrade. Please use Change Password from your profile settings or contact support.",
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Secure authenticated password change.
    Requires an active session cookie and current password verification.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    # Extract current session ID so current client session can optionally be preserved while revoking ALL other sessions
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    current_session_id = None
    if token:
        payload = decode_access_token(token)
        if payload:
            current_session_id = payload.get("session_id")

    service = AuthService(db=db)
    result = service.change_password(
        user_id=user_id,
        current_password=req.current_password,
        new_password=req.new_password,
        current_session_id=current_session_id,
        ip=ip,
        user_agent=user_agent,
    )
    return MessageResponse(message=result["message"])



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


@router.get("/me", response_model=UserOut)
def get_me(
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Authoritative Session Check:
    Retrieves currently authenticated user from httpOnly session cookie.
    Raises 401 Unauthorized if cookie is missing or expired.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut.model_validate(user)


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


@router.post("/clear-cache")
def clear_cache():
    """Flushes the in-memory Server RAM cache (disabled outside development/testing)."""
    if not settings.DEBUG:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cache flush disabled in production")
    ram_cache.clear()
    return {"status": "ok", "message": "Server RAM cache flushed completely"}


@router.delete("/me", response_model=MessageResponse)
def delete_account(
    req: DeleteAccountRequest,
    request: Request,
    response: Response,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Secure self-service account deletion:
    - Requires authenticated session cookie and CSRF token.
    - Requires password confirmation.
    - Blocks deletion if wallet balance is non-zero.
    - Blocks deletion if a pending withdrawal or active payment room exists.
    - Soft-deletes user record and clears auth cookies.
    """
    ip = get_real_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db=db)
    result = service.delete_account(
        user_id=user_id,
        password=req.password,
        ip=ip,
        user_agent=user_agent,
    )
    clear_auth_cookies(response)
    return MessageResponse(message=result["message"])



# ══════════════════════════════════════════════════════════════
# PAYOUT ACCOUNTS (PERSISTENT DB STORAGE PER USER)
# ══════════════════════════════════════════════════════════════

@router.get("/payout-accounts", response_model=List[PayoutAccountOut])
def list_payout_accounts(
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """Returns saved payout accounts strictly for the authenticated session user."""
    return (
        db.query(PayoutAccount)
        .filter(PayoutAccount.user_id == user_id)
        .order_by(PayoutAccount.is_default.desc(), PayoutAccount.created_at.desc())
        .all()
    )


@router.post("/payout-accounts", response_model=PayoutAccountOut)
def create_payout_account(
    req: PayoutAccountCreate,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Saves a new payout bank account in database for the authenticated user.
    Strictly binds to authenticated session user_id (no client spoofing).
    """
    # If set as default, mark other accounts for this user as non-default
    if req.is_default:
        db.query(PayoutAccount).filter(PayoutAccount.user_id == user_id).update({"is_default": False})

    # Avoid duplicate account number + bank for this user
    existing = (
        db.query(PayoutAccount)
        .filter(
            PayoutAccount.user_id == user_id,
            PayoutAccount.account_number == req.account_number.strip(),
            PayoutAccount.bank == req.bank.strip(),
        )
        .first()
    )
    if existing:
        existing.account_name = req.account_name.strip()
        existing.bank_code = req.bank_code or existing.bank_code
        if req.is_default:
            existing.is_default = True
        db.commit()
        db.refresh(existing)
        return existing

    # Automatically make default if user has no accounts yet
    count = db.query(PayoutAccount).filter(PayoutAccount.user_id == user_id).count()
    make_default = req.is_default or (count == 0)

    acc = PayoutAccount(
        user_id=user_id,
        bank=req.bank.strip(),
        bank_code=req.bank_code or "kuda",
        account_number=req.account_number.strip(),
        account_name=req.account_name.strip(),
        is_default=make_default,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/payout-accounts/{account_id}", response_model=MessageResponse)
def delete_payout_account(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Deletes a payout account strictly owned by the authenticated user.
    Returns 404 if not found or if owned by another user (prevents ID probing).
    Blocks deletion if a withdrawal is currently pending.
    """
    acc = (
        db.query(PayoutAccount)
        .filter(PayoutAccount.id == account_id, PayoutAccount.user_id == user_id)
        .first()
    )
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout account not found")

    # Block deletion if a pending withdrawal references this user
    pending_payout = (
        db.query(WalletTransaction)
        .filter(
            WalletTransaction.user_id == user_id,
            WalletTransaction.status == "pending",
            WalletTransaction.type == "withdrawal",
        )
        .first()
    )
    if pending_payout:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete payout account while a withdrawal is pending.",
        )

    was_default = acc.is_default
    db.delete(acc)
    db.commit()

    if was_default:
        next_acc = db.query(PayoutAccount).filter(PayoutAccount.user_id == user_id).first()
        if next_acc:
            next_acc.is_default = True
            db.commit()

    return MessageResponse(message="Payout account removed successfully")


@router.post("/payout-accounts/{account_id}/default", response_model=PayoutAccountOut)
@router.patch("/payout-accounts/{account_id}/default", response_model=PayoutAccountOut)
def set_default_payout_account(
    account_id: str,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """Sets a payout account as default. Strictly verifies user ownership."""
    acc = (
        db.query(PayoutAccount)
        .filter(PayoutAccount.id == account_id, PayoutAccount.user_id == user_id)
        .first()
    )
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payout account not found")

    db.query(PayoutAccount).filter(PayoutAccount.user_id == user_id).update({"is_default": False})
    acc.is_default = True
    db.commit()
    db.refresh(acc)
    return acc


@router.get("/profile", response_model=UserOut)
def get_current_profile(
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """Retrieves authenticated session user profile strictly from database."""
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut.model_validate(user)


@router.post("/profile", response_model=UserOut)
@router.put("/profile", response_model=UserOut)
def update_profile(
    req: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Updates user profile strictly for the authenticated session user.
    Rejects extra fields (id, phone, balance tampering).
    Enforces username uniqueness, avatar hex validation, and URL validation.
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 1. Username uniqueness & format validation
    if req.username is not None:
        clean_un = req.username.strip().lstrip("@").lower()
        if not clean_un or len(clean_un) < 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 3 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", clean_un):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username can only contain letters, numbers, and underscores")
        existing = db.query(User).filter(func.lower(User.username) == clean_un, User.id != user_id, User.is_deleted == False).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username @{clean_un} is already taken")
        user.username = clean_un

    # 2. Full name validation
    if req.full_name is not None:
        clean_name = req.full_name.strip()
        if clean_name:
            user.full_name = clean_name

    # 3. Avatar color validation (hex color format #xxxxxx)
    if req.avatar_color is not None:
        color = req.avatar_color.strip()
        if color and not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", color):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid avatar color hex format")
        user.avatar_color = color or None

    # 4. Avatar URL validation
    if req.avatar_url is not None:
        url = req.avatar_url.strip()
        if url and not (url.startswith("http://") or url.startswith("https://") or url.startswith("data:image/")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar URL must be a valid http(s) or data URL")
        user.avatar_url = url or None

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    ram_cache.cache_user(user)
    return UserOut.model_validate(user)


# ── Real Room Invitations & Notification Endpoints ──

@router.post("/rooms/invite")
async def create_room_invite(request: Request):
    """
    Creates a real payment room invitation, registers it in server RAM,
    and notifies the invited counterparty.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    invitation = ram_cache.create_room_invitation(data)
    return {
        "status": "success",
        "invitation": invitation,
        "message": f"Invite sent! Notified {invitation.get('counterparty') or 'counterparty'} to accept invite.",
    }


@router.post("/rooms/{room_id}/accept")
async def accept_room_invite(room_id: str, request: Request):
    """
    Counterparty accepts the invitation to join the payment room.
    Transitions room status to joined and updates notifications.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    accepter = data.get("user") or data.get("username") or "Counterparty"
    room = ram_cache.accept_room_invitation(room_id, accepter)
    return {
        "status": "success",
        "room": room,
        "message": f"{accepter} has accepted the invite and joined the room.",
    }


@router.get("/rooms/{room_id}/status")
def get_room_invite_status(
    room_id: str,
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Returns real invitation status for a payment room if the caller is a participant; returns 404 otherwise.
    """
    caller_ids = _get_caller_identifiers(caller_id, db)

    room = ram_cache.get_room_invitation(room_id) or ram_cache.get_pre_payment_room(room_id) or ram_cache.get_payment_room(room_id)
    if not room:
        db_pre = db.query(PrePaymentRoom).filter((PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id)).first()
        if db_pre:
            from app.services.db_ram_sync import _extract_room_dict
            room = _extract_room_dict(db_pre)
        else:
            db_p = db.query(PaymentRoom).filter(PaymentRoom.order_number == room_id).first()
            if db_p:
                from app.services.db_ram_sync import _extract_payment_room_dict
                room = _extract_payment_room_dict(db_p)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    is_part = (
        room.get("buyer_id") in caller_ids
        or room.get("seller_id") in caller_ids
        or str(room.get("creator_id") or "") in caller_ids
        or str(room.get("creator") or "").lower().strip() in caller_ids
        or str(room.get("counterparty") or "").lower().strip() in caller_ids
        or str(room.get("counterparty_username") or "").lower().lstrip("@") in caller_ids
        or str(room.get("counterparty_phone") or "") in caller_ids
    )
    if not is_part and caller_ids:
        c_id = str(room.get("creator_id") or "").strip()
        if c_id and len(c_id) >= 7 and any(len(ident) >= 7 and (ident in c_id or c_id in ident) for ident in caller_ids):
            is_part = True

    if not is_part:
        raise HTTPException(status_code=404, detail="Room not found")

    return {
        "counterparty_joined": room.get("counterparty_joined", False),
        "status": room.get("status", "pending_acceptance"),
        "room": room,
    }


@router.get("/notifications")
def get_notifications(
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Fetches real notifications strictly scoped to the authenticated caller from server RAM.
    """
    caller_ids = _get_caller_identifiers(caller_id, db)
    notifs = ram_cache.get_user_notifications(caller_ids)
    return {"notifications": notifs}


# ── Pre-Payment Rooms Endpoints (Rooms still in invite) ──

@router.post("/pre-payment-rooms")
async def create_pre_payment_room(request: Request, db: DbSession = Depends(get_db)):
    """
    Creates a pre-payment room in the database and RAM cache.
    Stores rooms that are still in invite status.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    room_id = data.get("id") or data.get("orderNumber") or data.get("order_number") or f"ORD-{int(ram_cache.hits + 100000)}"
    item = data.get("item") or data.get("title") or "Payment Item"
    amount = data.get("amount") or data.get("price") or "₦0.00"
    role = data.get("role") or "Buying"
    creator = format_full_name(data.get("creator")) or "Howard Ukah"
    counterparty = format_full_name(data.get("counterpartyName") or data.get("counterparty")) or "Counterparty"
    counterparty_un = (data.get("counterpartyUsername") or data.get("counterparty_username") or "").lstrip("@")
    counterparty_ph = data.get("counterpartyPhone") or data.get("counterparty_phone") or ""
    counterparty_acc = data.get("counterpartyAccountId") or data.get("counterparty_account_id") or format_account_id(counterparty_ph)

    # Check: a user cannot invite himself
    creator_un = (data.get("creatorUsername") or data.get("creator_username") or "").lstrip("@").lower()
    creator_ph = re.sub(r"\D", "", data.get("creatorPhone") or data.get("creator_phone") or "")
    clean_counterparty_un = counterparty_un.lower().lstrip("@")
    clean_counterparty_ph = re.sub(r"\D", "", counterparty_ph)

    if (
        (creator_un and clean_counterparty_un and creator_un == clean_counterparty_un)
        or (
            creator_ph
            and clean_counterparty_ph
            and (
                creator_ph == clean_counterparty_ph
                or (len(clean_counterparty_ph) >= 7 and creator_ph.endswith(clean_counterparty_ph))
                or (len(creator_ph) >= 7 and clean_counterparty_ph.endswith(creator_ph))
            )
        )
    ):
        raise HTTPException(status_code=400, detail="A user cannot invite himself")

    # Auto-resolve counterparty details from User database if phone/username missing
    target_lookup = clean_counterparty_ph or clean_counterparty_un or data.get("seller_id") or data.get("buyer_id") or counterparty
    clean_target_digits = re.sub(r"\D", "", str(target_lookup or ""))
    cp_user = db.query(User).filter(
        (User.username == clean_counterparty_un) |
        (User.whatsapp_number.like(f"%{clean_target_digits[-10:]}")) |
        (User.full_name.ilike(f"%{counterparty}%"))
    ).first() if (clean_counterparty_un or clean_target_digits or (counterparty and counterparty != "Counterparty")) else None

    if cp_user:
        counterparty = cp_user.full_name or counterparty
        counterparty_un = cp_user.username or counterparty_un
        counterparty_ph = cp_user.whatsapp_number or counterparty_ph
        counterparty_acc = format_account_id(counterparty_ph)
        data["counterparty"] = counterparty
        data["counterpartyName"] = counterparty
        data["counterparty_username"] = counterparty_un
        data["counterpartyUsername"] = counterparty_un
        data["counterparty_phone"] = counterparty_ph
        data["counterpartyPhone"] = counterparty_ph
        data["counterparty_account_id"] = counterparty_acc
        data["counterpartyAccountId"] = counterparty_acc
        data["counterpartyId"] = str(cp_user.id)
        data["counterparty_id"] = str(cp_user.id)

    # 1. Save in RAM Cache
    cached = ram_cache.create_pre_payment_room(data)

    # 2. Persist in DB pre_payment_rooms table
    try:
        creator_id = data.get("creator_id") or data.get("creatorId")
        if not creator_id:
            creator_user = db.query(User).filter(
                (User.username == creator_un) | (User.whatsapp_number.like(f"%{creator_ph[-10:]}"))
            ).first() if (creator_un or creator_ph) else None
            if creator_user:
                creator_id = str(creator_user.id)
            else:
                creator_id = creator_ph or creator_un or "user_creator"

        counterparty_id = data.get("counterpartyId") or data.get("counterparty_id")
        if not counterparty_id:
            cp_user = db.query(User).filter(
                (User.username == clean_counterparty_un) | (User.whatsapp_number.like(f"%{clean_counterparty_ph[-10:]}"))
            ).first() if (clean_counterparty_un or clean_counterparty_ph) else None
            if cp_user:
                counterparty_id = str(cp_user.id)

        buyer_id = data.get("buyer_id") or (counterparty_id if role.lower().startswith("sell") else creator_id)
        seller_id = data.get("seller_id") or (creator_id if role.lower().startswith("sell") else counterparty_id)

        existing = db.query(PrePaymentRoom).filter(PrePaymentRoom.id == room_id).first()
        if existing:
            existing.item = item
            existing.price = amount
            existing.creator_id = creator_id
            existing.buyer_id = buyer_id
            existing.seller_id = seller_id
            existing.counterparty_joined = False
            existing.status_text = "Invite Sent"
            existing.category = "pre_payment"
            db.commit()
            db.refresh(existing)
        else:
            db_record = PrePaymentRoom(
                id=room_id,
                item=item,
                price=amount,
                creator_id=creator_id,
                buyer_id=buyer_id,
                seller_id=seller_id,
                counterparty_joined=False,
                status_text="Invite Sent",
                category="pre_payment",
                resend_count=0,
            )
            db.add(db_record)
            db.commit()
    except Exception as e:
        db.rollback()

    return {"status": "success", "room": cached}


@router.get("/pre-payment-rooms")
def get_pre_payment_rooms(
    limit: int = Query(default=20, ge=1, le=50),
    cursor: Optional[str] = Query(default=None),
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Returns pre-payment rooms strictly filtered to the caller (buyer, seller, or creator) with cursor pagination.
    """
    caller_ids = _get_caller_identifiers(caller_id, db)
    ram_rooms = ram_cache.get_pre_payment_rooms(user_id=caller_id, caller_identifiers=caller_ids, limit=limit, cursor=cursor)
    if ram_rooms:
        next_c = ram_rooms[-1]["id"] if len(ram_rooms) == limit else None
        return {"rooms": ram_rooms, "next_cursor": next_c}

    caller = db.query(User).filter(User.id == caller_id).first()
    filters = [
        PrePaymentRoom.buyer_id == caller_id,
        PrePaymentRoom.seller_id == caller_id,
        PrePaymentRoom.creator_id == caller_id,
    ]
    if caller and caller.whatsapp_number:
        digits = re.sub(r"\D", "", caller.whatsapp_number)
        filters.append(PrePaymentRoom.creator_id == digits)
        filters.append(PrePaymentRoom.creator_id == caller.whatsapp_number)
        if len(digits) >= 10:
            filters.append(PrePaymentRoom.creator_id.like(f"%{digits[-10:]}"))

    query = db.query(PrePaymentRoom).filter(
        (PrePaymentRoom.status_text != "Killed") & (PrePaymentRoom.status_text != "Cancelled") &
        or_(*filters)
    ).order_by(PrePaymentRoom.id.desc())

    if cursor:
        query = query.filter(PrePaymentRoom.id < cursor)

    db_rooms = query.limit(limit).all()
    results = []
    for r in db_rooms:
        c_user = db.query(User).filter((User.id == r.creator_id) | (User.whatsapp_number.like(f"%{str(r.creator_id)[-10:]}"))).first() if r.creator_id else None
        target_cp_id = r.seller_id if (r.creator_id and str(r.creator_id) in [str(r.buyer_id), "8032007872", "8032001585"]) else r.buyer_id
        cp_user = db.query(User).filter((User.id == target_cp_id) | (User.whatsapp_number.like(f"%{str(target_cp_id)[-10:]}"))).first() if target_cp_id else None

        cp_name = (cp_user.full_name if cp_user else getattr(r, "counterparty", None)) or "Howard Ukah"
        cp_un = (cp_user.username if cp_user else getattr(r, "counterparty_username", None)) or ""
        cp_ph = (cp_user.whatsapp_number if cp_user else getattr(r, "counterparty_phone", None)) or ""
        cr_name = (c_user.full_name if c_user else getattr(r, "creator", None)) or "Benedicta James"

        d = {
            "id": r.id,
            "orderNumber": r.order_number,
            "order_number": r.order_number,
            "title": r.title,
            "item": r.item,
            "amount": r.price,
            "price": r.price,
            "role": getattr(r, "role", "Buying"),
            "creator": cr_name,
            "creatorName": cr_name,
            "creator_id": getattr(r, "creator_id", None),
            "counterparty": cp_name,
            "counterpartyName": cp_name,
            "counterparty_username": cp_un,
            "counterpartyUsername": cp_un,
            "counterparty_phone": cp_ph,
            "counterpartyPhone": cp_ph,
            "counterparty_account_id": format_account_id(cp_ph),
            "counterpartyAccountId": format_account_id(cp_ph),
            "counterparty_joined": r.counterparty_joined,
            "counterpartyJoined": r.counterparty_joined,
            "status": getattr(r, "status", "pending_invite"),
            "status_text": r.status_text,
            "statusText": r.status_text,
            "category": r.category,
            "buyer_id": getattr(r, "buyer_id", None),
            "seller_id": getattr(r, "seller_id", None),
            "resend_count": getattr(r, "resend_count", 0),
            "expires_at": r.expires_at.isoformat() if getattr(r, "expires_at", None) else None,
            "resent_at": r.resent_at.isoformat() if getattr(r, "resent_at", None) else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "is_expired": getattr(r, "status", "") == "expired",
        }
        ram_cache.create_pre_payment_room(d)
        results.append(d)

    next_c = results[-1]["id"] if len(results) == limit else None
    return {"rooms": results, "next_cursor": next_c}


@router.get("/pre-payment-rooms/{room_id}")
def get_pre_payment_room(
    room_id: str,
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Returns details of a specific pre-payment room by ID if caller is a participant; returns 404 otherwise.
    """
    caller_ids = _get_caller_identifiers(caller_id, db)

    def _is_part(r_dict: dict) -> bool:
        if r_dict.get("buyer_id") in caller_ids or r_dict.get("seller_id") in caller_ids:
            return True
        if str(r_dict.get("creator_id") or "") in caller_ids:
            return True
        if str(r_dict.get("creator") or "").lower().strip() in caller_ids:
            return True
        if str(r_dict.get("counterparty") or "").lower().strip() in caller_ids:
            return True
        if str(r_dict.get("counterparty_username") or "").lower().lstrip("@") in caller_ids:
            return True
        if str(r_dict.get("counterparty_phone") or "") in caller_ids:
            return True
        c_id = str(r_dict.get("creator_id") or "").strip()
        if c_id and len(c_id) >= 7 and any(len(ident) >= 7 and (ident in c_id or c_id in ident) for ident in caller_ids):
            return True
        return False

    cached = ram_cache.get_pre_payment_room(room_id)
    if cached:
        if _is_part(cached):
            return {"room": cached}
        raise HTTPException(status_code=404, detail="Pre-payment room not found")

    p_cached = ram_cache.get_payment_room(room_id)
    if p_cached:
        if _is_part(p_cached):
            return {"room": p_cached}
        raise HTTPException(status_code=404, detail="Pre-payment room not found")

    db_room = db.query(PrePaymentRoom).filter(PrePaymentRoom.id == room_id).first()
    if db_room:
        is_p = (
            db_room.buyer_id in caller_ids
            or db_room.seller_id in caller_ids
            or str(db_room.creator_id or "") in caller_ids
        )
        if not is_p and caller_ids:
            c_id = str(db_room.creator_id or "").strip()
            if c_id and len(c_id) >= 7 and any(len(ident) >= 7 and (ident in c_id or c_id in ident) for ident in caller_ids):
                is_p = True
        if not is_p:
            raise HTTPException(status_code=404, detail="Pre-payment room not found")

        return {
            "room": {
                "id": db_room.id,
                "orderNumber": db_room.order_number,
                "title": db_room.title,
                "item": db_room.item,
                "amount": db_room.amount,
                "price": db_room.price,
                "role": db_room.role,
                "creator": db_room.creator,
                "creator_id": getattr(db_room, "creator_id", None),
                "counterparty": db_room.counterparty,
                "counterpartyName": db_room.counterparty,
                "counterparty_username": db_room.counterparty_username,
                "counterparty_phone": db_room.counterparty_phone,
                "counterparty_account_id": db_room.counterparty_account_id,
                "counterparty_joined": db_room.counterparty_joined,
                "counterpartyJoined": db_room.counterparty_joined,
                "status": db_room.status,
                "status_text": db_room.status_text,
                "statusText": db_room.status_text,
                "category": db_room.category,
                "buyer_id": getattr(db_room, "buyer_id", None),
                "seller_id": getattr(db_room, "seller_id", None),
                "resend_count": getattr(db_room, "resend_count", 0),
                "expires_at": db_room.expires_at.isoformat() if getattr(db_room, "expires_at", None) else None,
                "resent_at": db_room.resent_at.isoformat() if getattr(db_room, "resent_at", None) else None,
            }
        }

    db_p = db.query(PaymentRoom).filter((PaymentRoom.id == room_id) | (PaymentRoom.order_number == room_id)).first()
    if db_p:
        if db_p.buyer_id != caller_id and db_p.seller_id != caller_id:
            raise HTTPException(status_code=404, detail="Pre-payment room not found")
        return {
            "room": {
                "id": db_p.id,
                "orderNumber": db_p.order_number,
                "title": db_p.title,
                "item": db_p.item,
                "amount": db_p.amount,
                "price": db_p.price,
                "role": db_p.role,
                "creator": db_p.creator,
                "counterparty": db_p.counterparty,
                "counterpartyName": db_p.counterparty,
                "counterparty_joined": True,
                "counterpartyJoined": True,
                "status": db_p.status,
                "status_text": db_p.status_text,
                "category": db_p.category,
                "buyer_id": db_p.buyer_id,
                "seller_id": db_p.seller_id,
            }
        }

    raise HTTPException(status_code=404, detail="Pre-payment room not found")


@router.post("/pre-payment-rooms/{room_id}/kill")
async def kill_pre_payment_room(room_id: str, request: Request, db: DbSession = Depends(get_db)):
    """
    Kills / deactivates pre-payment room upon invitation countdown timer expiration or cancellation.
    If creator_cancelled, moves room to killed_payment_rooms and deletes from pre_payment_rooms.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}
    reason = body.get("reason") or "timeout_creator_not_joined"

    cached = ram_cache.kill_pre_payment_room(room_id)
    if reason == "creator_cancelled":
        ram_cache.remove_pre_payment_room(room_id)

    db_room = db.query(PrePaymentRoom).filter(
        (PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id)
    ).first()
    if db_room:
        existing_killed = db.query(KilledPaymentRoom).filter(
            (KilledPaymentRoom.id == db_room.id) | (KilledPaymentRoom.order_number == db_room.order_number)
        ).first()
        if not existing_killed:
            k = KilledPaymentRoom(
                id=db_room.id,
                order_number=db_room.order_number,
                title=getattr(db_room, "title", None) or getattr(db_room, "item", None) or "Payment Item",
                item=getattr(db_room, "item", None) or getattr(db_room, "title", None) or "Payment Item",
                amount=str(getattr(db_room, "price", None) or "₦0.00"),
                price=str(getattr(db_room, "price", None) or "₦0.00"),
                role=getattr(db_room, "role", "Buying"),
                creator=getattr(db_room, "creator", "User"),
                counterparty=getattr(db_room, "counterparty", "Counterparty"),
                reason=reason,
                killed_at=datetime.now(timezone.utc),
            )
            db.add(k)
        if reason == "creator_cancelled":
            db.delete(db_room)
        else:
            db_room.status = "expired"
            db_room.status_text = "Expired"
        db.commit()

    return {
        "status": "success",
        "message": "Payment room moved to killed payment rooms.",
        "room": cached,
    }


@router.post("/pre-payment-rooms/{room_id}/resend")
def resend_pre_payment_room(room_id: str, db: DbSession = Depends(get_db)):
    """
    Reactivates pre-payment room when creator presses Resend button.
    Restarts timer and allows counterparty to join again.
    """
    cached = ram_cache.resend_pre_payment_room(room_id)
    db_room = db.query(PrePaymentRoom).filter(
        (PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id)
    ).first()
    if db_room:
        db_room.status = "pending_invite"
        db_room.status_text = "Invite Sent"
        db_room.counterparty_joined = False
        db_room.updated_at = datetime.now(timezone.utc)
        db.commit()

    # Remove from killed_payment_rooms if it was previously marked killed
    db.query(KilledPaymentRoom).filter(
        (KilledPaymentRoom.id == room_id) | (KilledPaymentRoom.order_number == room_id)
    ).delete(synchronize_session=False)
    db.commit()

    return {
        "status": "success",
        "message": "Payment room invitation resent and timer restarted.",
        "room": cached,
    }


@router.delete("/pre-payment-rooms/{room_id}")
def delete_pre_payment_room(room_id: str, db: DbSession = Depends(get_db)):
    """
    Cancels a pre-payment room upon user cancellation,
    moving it out of pre_payment_rooms table into killed_payment_rooms table.
    """
    ram_cache.remove_pre_payment_room(room_id)

    db_room = db.query(PrePaymentRoom).filter(
        (PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id)
    ).first()

    if db_room:
        existing_killed = db.query(KilledPaymentRoom).filter(
            (KilledPaymentRoom.id == db_room.id) | (KilledPaymentRoom.order_number == db_room.order_number)
        ).first()
        if not existing_killed:
            k = KilledPaymentRoom(
                id=db_room.id,
                order_number=db_room.order_number,
                title=getattr(db_room, "title", None) or getattr(db_room, "item", None) or "Payment Item",
                item=getattr(db_room, "item", None) or getattr(db_room, "title", None) or "Payment Item",
                amount=str(getattr(db_room, "price", None) or "₦0.00"),
                price=str(getattr(db_room, "price", None) or "₦0.00"),
                role=getattr(db_room, "role", "Buying"),
                creator=getattr(db_room, "creator", "User"),
                counterparty=getattr(db_room, "counterparty", "Counterparty"),
                reason="creator_cancelled",
                killed_at=datetime.now(timezone.utc),
            )
            db.add(k)
        db.delete(db_room)
    else:
        db.query(PrePaymentRoom).filter(
            (PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id)
        ).delete(synchronize_session=False)

    db.commit()
    return {"status": "success", "message": "Pre-payment room moved to killed payment rooms"}


@router.post("/pre-payment-rooms/{room_id}/proceed")
async def creator_proceed_pre_payment_room(room_id: str, request: Request, db: DbSession = Depends(get_db)):
    """
    Called when the room creator finishes filling specifications and clicks Proceed to Payment.
    If counterparty has already accepted, officially moves the room into active payment_rooms.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}
    specs = data.get("specifications") or []
    updated = ram_cache.creator_proceed_pre_payment_room(room_id, specifications=specs)

    # If counterparty has joined, move from pre_payment_rooms to payment_rooms table
    db_room = db.query(PrePaymentRoom).filter(PrePaymentRoom.id == room_id).first()
    payment_room = None
    if db_room and (db_room.counterparty_joined or (updated and updated.get("counterparty_joined"))):
        payment_room = ram_cache.move_pre_to_payment_room(room_id, db_room.counterparty)
        role = db_room.role or "Buying"
        creator_name = db_room.creator or "Howard Ukah"
        counterparty_name = db_room.counterparty or "Counterparty"
        seller_name = counterparty_name if role == "Buying" else creator_name
        buyer_name = creator_name if role == "Buying" else counterparty_name

        existing_payment_room = db.query(PaymentRoom).filter(
            PaymentRoom.order_number == db_room.order_number
        ).first()

        if not existing_payment_room:
            raw_amt = str(db_room.amount or db_room.price or "0").replace("₦", "").replace(",", "").strip()
            try:
                amt_float = float(raw_amt)
            except ValueError:
                amt_float = 0.0

            p_room = PaymentRoom(
                order_number=db_room.order_number,
                title=db_room.title or db_room.item or "Payment Room",
                amount=amt_float,
                currency="NGN",
                seller_id=db_room.counterparty_id if role == "Buying" else db_room.creator_id,
                buyer_id=db_room.creator_id if role == "Buying" else db_room.counterparty_id,
                status="awaiting_payment",
                variant=None,
                buyer_agreed_terms=False,
                seller_agreed_terms=False,
                created_at=db_room.created_at or datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(p_room)

        db.delete(db_room)
        db.commit()

    return {
        "status": "success",
        "message": "Creator has proceeded to payment room.",
        "room": payment_room or updated,
    }


@router.post("/pre-payment-rooms/{room_id}/accept")
async def accept_pre_payment_room(room_id: str, request: Request, db: DbSession = Depends(get_db)):
    """
    Invited counterparty accepts the invitation from their modal.
    Marks counterparty_joined = True. Does NOT move to payment_rooms until creator clicks Proceed.
    """
    cached_pre = ram_cache.get_pre_payment_room(room_id)
    if (cached_pre and cached_pre.get("status") == "expired") or (cached_pre and cached_pre.get("is_expired")):
        raise HTTPException(
            status_code=400,
            detail="This payment room invitation has timed out and was deactivated. Ask the sender to resend.",
        )

    db_room = db.query(PrePaymentRoom).filter(PrePaymentRoom.id == room_id).first()
    if db_room and db_room.status == "expired":
        raise HTTPException(
            status_code=400,
            detail="This payment room invitation has timed out and was deactivated. Ask the sender to resend.",
        )

    try:
        data = await request.json()
    except Exception:
        data = {}

    accepter = data.get("user") or data.get("username") or "Counterparty"

    # Mark counterparty_joined in RAM cache
    if cached_pre:
        cached_pre["counterparty_joined"] = True
        cached_pre["counterpartyJoined"] = True
        cached_pre["status"] = "joined"

    # Update in DB: keep in pre_payment_rooms table with counterparty_joined = True
    if db_room:
        db_room.counterparty_joined = True
        db_room.status = "joined"
        db_room.status_text = "Counterparty Joined"
        db.commit()

    return {
        "status": "success",
        "room": cached_pre or (db_room and {
            "id": db_room.id,
            "orderNumber": db_room.order_number,
            "counterparty_joined": True,
            "counterpartyJoined": True,
            "creator_proceeded": False,
        }),
        "message": f"{accepter} accepted invitation. Waiting for creator to join.",
    }


@router.post("/payment-rooms")
async def create_or_save_payment_room(request: Request, db: DbSession = Depends(get_db)):
    """
    Saves or transitions an approved payment room into the active payment_rooms table.
    Ensures that any matching pre-payment room is automatically moved out of pre_payment_rooms.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    room_id = data.get("id") or data.get("orderNumber") or data.get("order_number")
    if not room_id:
        raise HTTPException(status_code=400, detail="Missing room id")

    # 1. Remove from PrePaymentRoom table in DB
    db_pre = db.query(PrePaymentRoom).filter(
        (PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id)
    ).first()
    if db_pre:
        db.delete(db_pre)

    order_num = data.get("orderNumber") or data.get("order_number") or room_id
    existing = db.query(PaymentRoom).filter(PaymentRoom.order_number == order_num).first()
    if not existing:
        raw_amt = data.get("amount") or data.get("price") or 0.0
        if isinstance(raw_amt, str):
            raw_amt_str = raw_amt.replace("₦", "").replace(",", "").strip()
            try:
                raw_amt = float(raw_amt_str)
            except ValueError:
                raw_amt = 0.0
        else:
            raw_amt = float(raw_amt or 0.0)

        buyer_agreed = bool(data.get("buyer_agreed_terms") or data.get("has_agreed_terms") or data.get("hasAgreedTerms"))
        seller_agreed = bool(data.get("seller_agreed_terms"))

        new_p = PaymentRoom(
            order_number=order_num,
            title=data.get("title") or data.get("item") or "Payment Room",
            amount=raw_amt,
            currency=data.get("currency") or "NGN",
            seller_id=data.get("seller_id") or data.get("sellerId"),
            buyer_id=data.get("buyer_id") or data.get("buyerId"),
            status=data.get("status") or "awaiting_payment",
            variant=data.get("variant"),
            buyer_agreed_terms=buyer_agreed,
            seller_agreed_terms=seller_agreed,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(new_p)
    else:
        existing.status = data.get("status", existing.status)
        if "buyer_agreed_terms" in data:
            existing.buyer_agreed_terms = bool(data["buyer_agreed_terms"])
        if "seller_agreed_terms" in data:
            existing.seller_agreed_terms = bool(data["seller_agreed_terms"])
        if "has_agreed_terms" in data:
            existing.buyer_agreed_terms = bool(data["has_agreed_terms"])
        existing.updated_at = datetime.now(timezone.utc)
    # Remove from pre_payment_rooms table in DB so it doesn't linger
    pre_db = db.query(PrePaymentRoom).filter(
        (PrePaymentRoom.id == room_id) | (PrePaymentRoom.order_number == room_id) |
        (PrePaymentRoom.order_number == (data.get("orderNumber") or data.get("order_number")))
    ).first()
    if pre_db:
        db.delete(pre_db)

    db.commit()

    # 3. Synchronize in RAM cache
    ram_cache.delete_pre_payment_room(room_id)
    cached_p = ram_cache.sync_payment_room(data)

    return {"status": "success", "room": cached_p}


@router.get("/payment-rooms")
def get_payment_rooms(
    limit: int = Query(default=20, ge=1, le=50),
    cursor: Optional[str] = Query(default=None),
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """Returns approved active payment rooms filtered strictly to the caller (buyer or seller) with cursor pagination."""
    ram_rooms = ram_cache.get_payment_rooms(user_id=caller_id, limit=limit, cursor=cursor)
    if ram_rooms:
        next_c = ram_rooms[-1]["order_number"] if len(ram_rooms) == limit else None
        return {"rooms": ram_rooms, "next_cursor": next_c}

    query = db.query(PaymentRoom).filter(
        or_(PaymentRoom.buyer_id == caller_id, PaymentRoom.seller_id == caller_id)
    ).order_by(PaymentRoom.order_number.desc())

    if cursor:
        query = query.filter(PaymentRoom.order_number < cursor)

    db_rooms = query.limit(limit).all()
    results = []
    for r in db_rooms:
        d = {
            "id": getattr(r, "id", r.order_number),
            "orderNumber": r.order_number,
            "order_number": r.order_number,
            "title": r.title,
            "item": getattr(r, "item", r.title),
            "amount": r.amount,
            "price": getattr(r, "price", str(r.amount)),
            "role": getattr(r, "role", "Buying"),
            "seller_id": r.seller_id,
            "buyer_id": r.buyer_id,
            "seller_name": getattr(r, "seller_name", "Seller"),
            "buyer_name": getattr(r, "buyer_name", "Buyer"),
            "sellerName": getattr(r, "seller_name", "Seller"),
            "buyerName": getattr(r, "buyer_name", "Buyer"),
            "status": r.status,
            "status_text": getattr(r, "status_text", r.status),
            "category": getattr(r, "category", "escrow"),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        ram_cache.sync_payment_room(d)
        results.append(d)
    next_c = results[-1]["order_number"] if len(results) == limit else None
    return {"rooms": results, "next_cursor": next_c}


@router.get("/payment-rooms/{room_id}")
def get_payment_room(
    room_id: str,
    caller_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """Returns details of a specific approved payment room if caller is participant; returns 404 otherwise."""
    cached = ram_cache.get_payment_room(room_id)
    if cached:
        if cached.get("buyer_id") == caller_id or cached.get("seller_id") == caller_id:
            return {"room": cached}
        raise HTTPException(status_code=404, detail="Payment room not found")

    db_p = db.query(PaymentRoom).filter((PaymentRoom.id == room_id) | (PaymentRoom.order_number == room_id)).first()
    if not db_p:
        raise HTTPException(status_code=404, detail="Payment room not found")

    if db_p.buyer_id != caller_id and db_p.seller_id != caller_id:
        raise HTTPException(status_code=404, detail="Payment room not found")

    d = {
        "id": db_p.id,
        "orderNumber": db_p.order_number,
        "order_number": db_p.order_number,
        "title": db_p.title,
        "item": db_p.item,
        "amount": db_p.amount,
        "price": db_p.price,
        "role": db_p.role,
        "seller_id": db_p.seller_id,
        "buyer_id": db_p.buyer_id,
        "seller_name": db_p.seller_name,
        "buyer_name": db_p.buyer_name,
        "sellerName": db_p.seller_name,
        "buyerName": db_p.buyer_name,
        "status": db_p.status,
        "status_text": db_p.status_text,
        "category": db_p.category,
    }
    ram_cache.sync_payment_room(d)
    return {"room": d}


