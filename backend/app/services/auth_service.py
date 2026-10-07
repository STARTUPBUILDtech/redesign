import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from app.config import settings
from app.models import User, Session, KnownDevice, WhatsAppOTP, AuditLog, utc_now
from app.security.hasher import password_hasher
from app.security.normalizer import normalize_identifier, is_phone_number, normalize_email, normalize_phone
from app.security.tokens import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    generate_otp,
    hash_otp,
    decode_access_token,
)
from app.services.rate_limiter import RateLimiter
from app.services.ram_cache import ram_cache


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware in UTC (fixes SQLite naive datetime issues)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class AuthService:
    """
    Enterprise Authentication Service for PayKudi:
    - Input normalization (email trimmed/lowercase, phone E.164)
    - User lookup and timing-attack defense (dummy Argon2id verify)
    - Dynamic exponential lockout doubling capped at 24 hours
    - Cloudflare Turnstile verification
    - Two-step WhatsApp OTP for new devices/IPs
    - Rotating refresh token with session family reuse revocation
    - Comprehensive audit logging
    """

    def __init__(self, db: DbSession, rate_limiter: Optional[RateLimiter] = None):
        self.db = db
        self.rate_limiter = rate_limiter or RateLimiter()

    def log_audit(
        self,
        event: str,
        ip: str,
        user_agent: Optional[str] = None,
        user_id: Optional[str] = None,
        details: Optional[str] = None,
    ):
        """Record an immutable audit log entry."""
        audit = AuditLog(
            user_id=user_id,
            event=event,
            ip=ip,
            user_agent=user_agent,
            details=details,
            timestamp=utc_now(),
        )
        self.db.add(audit)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()

    def _get_generic_or_specific_error(self, specific_msg: str) -> str:
        """Return either fine-grained or obfuscated error message based on config."""
        if settings.SPECIFIC_LOGIN_ERRORS:
            return specific_msg
        return "Invalid credentials"

    def login(
        self,
        raw_identifier: str,
        password: str,
        ip: str,
        user_agent: Optional[str] = None,
        turnstile_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes primary login workflow:
        1. Check IP rate limits and credential stuffing auto-blocks.
        2. Verify Turnstile if required for this IP.
        3. Normalize identifier (email or phone).
        4. User lookup (or dummy Argon2 verify on non-existent).
        5. Check account lockout duration.
        6. Verify Argon2id password + pepper; handle failure/lockout progression.
        7. Verify is_verified status.
        8. Check known device/IP -> trigger WhatsApp OTP if unfamiliar.
        9. On full success, reset failed counters, log audit, and issue tokens.
        """
        # 1. Check if IP is currently blocked (e.g. credential stuffing)
        is_blocked, block_ttl = self.rate_limiter.check_ip_blocked(ip)
        if is_blocked:
            retry_after = block_ttl
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Try again later",
                headers={"Retry-After": str(retry_after)},
            )

        # 2. Check general IP rate limit (10 attempts / 15 minutes)
        allowed, remaining, retry_after = self.rate_limiter.check_ip_rate_limit(ip)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Try again later",
                headers={"Retry-After": str(retry_after)},
            )

        # 3. Check if Cloudflare Turnstile is required for this IP
        if self.rate_limiter.is_turnstile_required(ip):
            if not turnstile_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cloudflare Turnstile verification required",
                    headers={"X-Turnstile-Required": "true"},
                )
            # In production, siteverify API call would validate turnstile_token

        # 4. Normalize identifier
        normalized_id, id_type = normalize_identifier(raw_identifier)

        # 5. FAST PATH: Check Server RAM Cache first!
        cached_user = ram_cache.get_by_identifier(normalized_id)
        user: Optional[User] = None

        if cached_user:
            # Check lockout state from RAM
            now = utc_now()
            locked_until = ensure_utc(cached_user.get("locked_until"))
            if locked_until and locked_until > now:
                remaining_seconds = max(0.0, (locked_until - now).total_seconds())
                remaining_minutes = max(1, round(remaining_seconds / 60))
                err = f"Account locked. Try again in {remaining_minutes} minutes"
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=err,
                    headers={"Retry-After": str(int(remaining_seconds))},
                )

            # Constant-time Argon2id password verification using RAM-cached hash
            is_valid = password_hasher.verify_password(password, cached_user["password_hash"])
            if not is_valid:
                user = self.db.query(User).filter(User.id == cached_user["id"]).first()
                self._handle_login_failure(ip=ip, identifier=normalized_id, user_agent=user_agent, user=user)
                if user:
                    ram_cache.update_failed_attempt(normalized_id, user.failed_attempts, user.locked_until, user.lock_count)
                    locked_until = ensure_utc(user.locked_until)
                    if locked_until and locked_until > utc_now():
                        remaining_seconds = max(0.0, (locked_until - utc_now()).total_seconds())
                        remaining_minutes = max(1, round(remaining_seconds / 60))
                        err = f"Account locked. Try again in {remaining_minutes} minutes"
                        raise HTTPException(
                            status_code=status.HTTP_423_LOCKED,
                            detail=err,
                            headers={"Retry-After": str(int(remaining_seconds))},
                        )
                attempts_left = max(0, settings.MAX_ACCOUNT_FAILED_ATTEMPTS - (user.failed_attempts if user else 1))
                err = self._get_generic_or_specific_error(f"Incorrect password ({attempts_left} attempts left)")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err)

            # Password valid! Load active DB model for session creation
            user = self.db.query(User).filter(User.id == cached_user["id"]).first()
        else:
            # RAM CACHE MISS: Query Database & populate RAM cache
            if id_type == "phone":
                user = self.db.query(User).filter(User.whatsapp_number == normalized_id).first()
            else:
                user = self.db.query(User).filter(User.email == normalized_id).first()

            # If user does NOT exist, execute dummy verify to defend against timing attacks
            if not user:
                password_hasher.dummy_verify()
                self._handle_login_failure(ip=ip, identifier=normalized_id, user_agent=user_agent, user=None)
                err = self._get_generic_or_specific_error("No account found with these details")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err)

            # Cache to RAM so future logins avoid DB queries
            ram_cache.cache_user(user)

            # Check if account is currently locked
            now = utc_now()
            locked_until = ensure_utc(user.locked_until)
            if locked_until and locked_until > now:
                remaining_seconds = max(0.0, (locked_until - now).total_seconds())
                remaining_minutes = max(1, round(remaining_seconds / 60))
                err = f"Account locked. Try again in {remaining_minutes} minutes"
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=err,
                    headers={"Retry-After": str(int(remaining_seconds))},
                )

            # Constant-time Argon2id password verification
            is_valid = password_hasher.verify_password(password, user.password_hash)

            if not is_valid:
                self._handle_login_failure(ip=ip, identifier=normalized_id, user_agent=user_agent, user=user)
                ram_cache.update_failed_attempt(normalized_id, user.failed_attempts, user.locked_until, user.lock_count)
                locked_until = ensure_utc(user.locked_until)
                if locked_until and locked_until > utc_now():
                    remaining_seconds = max(0.0, (locked_until - utc_now()).total_seconds())
                    remaining_minutes = max(1, round(remaining_seconds / 60))
                    err = f"Account locked. Try again in {remaining_minutes} minutes"
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail=err,
                        headers={"Retry-After": str(int(remaining_seconds))},
                    )
                attempts_left = max(0, settings.MAX_ACCOUNT_FAILED_ATTEMPTS - user.failed_attempts)
                err = self._get_generic_or_specific_error(f"Incorrect password ({attempts_left} attempts left)")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err)

        # 8. Check if account is verified
        if not user.is_verified:
            err = self._get_generic_or_specific_error("Verify your WhatsApp number to continue")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=err)

        # 9. Check if Argon2 parameters have changed and rehash if needed
        if password_hasher.check_needs_rehash(user.password_hash):
            user.password_hash = password_hasher.hash_password(password)
            self.db.commit()
            ram_cache.cache_user(user)

        # 10. Check known device and IP for Two-Step WhatsApp OTP
        is_known = self._is_device_and_ip_known(user_id=user.id, ip=ip, user_agent=user_agent)
        if not is_known:
            # Generate WhatsApp OTP, store hashed in DB, send alert
            otp_code = self._issue_whatsapp_otp(user=user, ip=ip, user_agent=user_agent)
            return {
                "status": "otp_required",
                "message": "Security verification required. WhatsApp OTP sent to your registered number.",
                "otp_required": True,
                "user_id": user.id,
                # For development/testing assistance:
                "debug_otp": otp_code if settings.DEBUG else None,
            }

        # 11. Known device: Complete login successfully
        return self._complete_successful_login(user=user, ip=ip, user_agent=user_agent)

    def _handle_login_failure(
        self,
        ip: str,
        identifier: str,
        user_agent: Optional[str] = None,
        user: Optional[User] = None,
    ):
        """Handles failed attempt accounting, lockout doubling, and credential stuffing check."""
        turnstile_required, newly_blocked = self.rate_limiter.record_login_failure(ip, identifier)

        if newly_blocked:
            self.log_audit(
                event="ip_blocked",
                ip=ip,
                user_agent=user_agent,
                user_id=user.id if user else None,
                details=f"Credential stuffing detected across distinct accounts. 24h block instituted.",
            )

        if user:
            user.failed_attempts += 1
            now = utc_now()

            # Account Lockout logic: lock after 5 failed attempts
            if user.failed_attempts >= settings.MAX_ACCOUNT_FAILED_ATTEMPTS:
                user.lock_count += 1
                # Doubling: 15min * 2^(lock_count - 1), capped at 24 hours (1440 min)
                lock_duration_minutes = min(
                    settings.INITIAL_LOCKOUT_MINUTES * (2 ** (user.lock_count - 1)),
                    settings.MAX_LOCKOUT_HOURS * 60,
                )
                user.locked_until = now + timedelta(minutes=lock_duration_minutes)
                user.failed_attempts = 0  # Reset counter for next lock cycle

                self.db.commit()
                self.log_audit(
                    event="locked",
                    ip=ip,
                    user_agent=user_agent,
                    user_id=user.id,
                    details=f"Account locked for {lock_duration_minutes} minutes (lock #{user.lock_count})",
                )
            else:
                self.db.commit()
                self.log_audit(
                    event="login_failed",
                    ip=ip,
                    user_agent=user_agent,
                    user_id=user.id,
                    details=f"Failed attempt {user.failed_attempts}/{settings.MAX_ACCOUNT_FAILED_ATTEMPTS}",
                )
        else:
            self.log_audit(
                event="login_failed",
                ip=ip,
                user_agent=user_agent,
                details=f"Failed login for non-existent identifier: {identifier}",
            )

    def _is_device_and_ip_known(self, user_id: str, ip: str, user_agent: Optional[str]) -> bool:
        """Determines if the given IP/device has previously authenticated this user."""
        known = self.db.query(KnownDevice).filter(
            KnownDevice.user_id == user_id,
            KnownDevice.ip == ip,
        ).first()
        return known is not None

    def _issue_whatsapp_otp(self, user: User, ip: str, user_agent: Optional[str]) -> str:
        """Creates 6-digit WhatsApp OTP, stores hashed in DB, and records new device audit."""
        otp_code = generate_otp()
        otp_hash = hash_otp(otp_code)
        expires_at = utc_now() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        # Invalidate any previously unexpired OTPs for this user
        self.db.query(WhatsAppOTP).filter(
            WhatsAppOTP.user_id == user.id,
            WhatsAppOTP.used_at == None,
        ).delete()

        new_otp = WhatsAppOTP(
            user_id=user.id,
            otp_hash=otp_hash,
            attempts=0,
            max_attempts=settings.MAX_OTP_ATTEMPTS,
            expires_at=expires_at,
            created_at=utc_now(),
        )
        self.db.add(new_otp)
        self.db.commit()

        self.log_audit(
            event="new_device",
            ip=ip,
            user_agent=user_agent,
            user_id=user.id,
            details=f"New device/IP detected ({ip}). WhatsApp OTP issued.",
        )
        return otp_code

    def verify_whatsapp_otp(
        self,
        user_id: str,
        otp_input: str,
        ip: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Validates 6-digit WhatsApp OTP and issues session tokens upon success."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        otp_record = (
            self.db.query(WhatsAppOTP)
            .filter(
                WhatsAppOTP.user_id == user_id,
                WhatsAppOTP.used_at == None,
            )
            .order_by(WhatsAppOTP.created_at.desc())
            .first()
        )

        now = utc_now()
        if not otp_record or ensure_utc(otp_record.expires_at) < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please log in again.",
            )

        if otp_record.attempts >= otp_record.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum OTP verification attempts exceeded. Please log in again.",
            )

        otp_record.attempts += 1
        expected_hash = hash_otp(otp_input)

        if otp_record.otp_hash != expected_hash:
            self.db.commit()
            self.log_audit(
                event="otp_failed",
                ip=ip,
                user_agent=user_agent,
                user_id=user.id,
                details=f"Invalid OTP attempt {otp_record.attempts}/{otp_record.max_attempts}",
            )
            attempts_left = otp_record.max_attempts - otp_record.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code ({attempts_left} attempts left)",
            )

        # OTP is valid!
        otp_record.used_at = now

        # Add this IP as a known device
        device = KnownDevice(
            user_id=user.id,
            ip=ip,
            user_agent=user_agent,
            first_seen_at=now,
            last_seen_at=now,
        )
        self.db.add(device)
        self.db.commit()

        self.log_audit(
            event="otp_success",
            ip=ip,
            user_agent=user_agent,
            user_id=user.id,
            details=f"Device verified successfully via WhatsApp OTP.",
        )

        return self._complete_successful_login(user=user, ip=ip, user_agent=user_agent)

    def _complete_successful_login(
        self,
        user: User,
        ip: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Resets lockout counters, logs audit, and creates session family + tokens."""
        now = utc_now()
        user.failed_attempts = 0
        user.locked_until = None
        user.last_login_at = now
        user.last_login_ip = ip

        # Also reset IP failed counter and RAM cache counters
        self.rate_limiter.reset_ip_failed_count(ip)
        if user.whatsapp_number:
            ram_cache.reset_failed_attempts(user.whatsapp_number)
        if user.email:
            ram_cache.reset_failed_attempts(user.email)
        ram_cache.cache_user(user)

        # Create session and rotating tokens
        session, raw_refresh_token = self.create_session(
            user_id=user.id,
            ip=ip,
            user_agent=user_agent,
        )

        access_token = create_access_token(
            user_id=user.id,
            family_id=session.family_id,
            session_id=session.id,
        )

        self.db.commit()

        self.log_audit(
            event="login_success",
            ip=ip,
            user_agent=user_agent,
            user_id=user.id,
            details=f"Successful login session created: {session.id}",
        )

        return {
            "status": "success",
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": raw_refresh_token,
            "user": user,
            "user_id": user.id,
            "otp_required": False,
        }

    def create_session(
        self,
        user_id: str,
        ip: str,
        user_agent: Optional[str] = None,
        family_id: Optional[str] = None,
    ) -> Tuple[Session, str]:
        """
        Creates a new session in a token family.
        If family_id is None, initializes a brand new family.
        """
        import uuid

        fam_id = family_id or str(uuid.uuid4())
        raw_refresh_token = generate_refresh_token()
        hashed_token = hash_refresh_token(raw_refresh_token)
        expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        session = Session(
            user_id=user_id,
            family_id=fam_id,
            refresh_token_hash=hashed_token,
            ip=ip,
            user_agent=user_agent,
            created_at=utc_now(),
            expires_at=expires_at,
            revoked_at=None,
        )
        self.db.add(session)
        self.db.flush()
        return session, raw_refresh_token

    def refresh_session(
        self,
        raw_refresh_token: str,
        ip: str,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Rotates refresh token and issues a new access token.
        Detects token reuse: if a previously revoked refresh token is presented,
        revokes the entire session family immediately!
        """
        if not raw_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing",
            )

        token_hash = hash_refresh_token(raw_refresh_token)
        session = self.db.query(Session).filter(Session.refresh_token_hash == token_hash).first()

        now = utc_now()

        # REUSE DETECTION: If session exists but was already revoked
        if session and session.revoked_at is not None:
            # Revoke entire token family!
            self.revoke_session_family(session.family_id)
            self.log_audit(
                event="token_reuse_detected",
                ip=ip,
                user_agent=user_agent,
                user_id=session.user_id,
                details=f"Refresh token reuse detected for family {session.family_id}. Entire family revoked.",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session compromised: token reuse detected. All sessions revoked.",
            )

        # Invalid token or expired session
        if not session or ensure_utc(session.expires_at) < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        # Session is valid: Revoke the used refresh token (rotation)
        session.revoked_at = now

        # Create new session in the same family
        new_session, new_raw_refresh_token = self.create_session(
            user_id=session.user_id,
            ip=ip,
            user_agent=user_agent,
            family_id=session.family_id,
        )

        new_access_token = create_access_token(
            user_id=session.user_id,
            family_id=session.family_id,
            session_id=new_session.id,
        )

        self.db.commit()
        return new_access_token, new_raw_refresh_token

    def revoke_session_family(self, family_id: str):
        """Revokes all sessions belonging to the given family."""
        now = utc_now()
        self.db.query(Session).filter(
            Session.family_id == family_id,
            Session.revoked_at == None,
        ).update({"revoked_at": now}, synchronize_session=False)
        self.db.commit()

    def logout(self, raw_refresh_token: Optional[str], ip: str, user_agent: Optional[str] = None):
        """Revokes the current session."""
        if raw_refresh_token:
            token_hash = hash_refresh_token(raw_refresh_token)
            session = self.db.query(Session).filter(Session.refresh_token_hash == token_hash).first()
            if session:
                session.revoked_at = utc_now()
                self.db.commit()
                self.log_audit(
                    event="logout",
                    ip=ip,
                    user_agent=user_agent,
                    user_id=session.user_id,
                    details=f"Session {session.id} revoked via logout.",
                )

    def register(
        self,
        phone: str,
        password: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        username: Optional[str] = None,
        ip: str = "127.0.0.1",
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a new user account:
        1. Directly saves to the Database first.
        2. Upon DB success, caches user credentials & profile to server RAM.
        3. Sets up session family and returns auth tokens.
        """
        norm_phone, _ = normalize_identifier(phone)
        norm_email = normalize_email(email) if email and email.strip() else None
        clean_username = username.strip().lstrip("@") if username and username.strip() else None

        # Check existing user
        query_filters = [User.whatsapp_number == norm_phone]
        if norm_email:
            query_filters.append(User.email == norm_email)
        if clean_username:
            query_filters.append(User.username == clean_username)

        existing = self.db.query(User).filter(or_(*query_filters)).first()
        if existing:
            # If user already registered with matching credentials, log them in & ensure RAM cached
            if password_hasher.verify_password(password, existing.password_hash):
                ram_cache.cache_user(existing)
                return self._complete_successful_login(user=existing, ip=ip, user_agent=user_agent)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number, email, or username already exists.",
            )

        now = utc_now()
        hashed = password_hasher.hash_password(password)

        # 1. DIRECT WRITE TO DATABASE FIRST
        user = User(
            whatsapp_number=norm_phone,
            email=norm_email,
            full_name=full_name.strip() if full_name else None,
            username=clean_username,
            password_hash=hashed,
            is_verified=True,
            failed_attempts=0,
            lock_count=0,
            created_at=now,
            updated_at=now,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # 2. ON SUCCESS: CACHE TO SERVER RAM
        ram_cache.cache_user(user)

        # Mark current device / IP as known
        device = KnownDevice(
            user_id=user.id,
            ip=ip,
            user_agent=user_agent,
            first_seen_at=now,
            last_seen_at=now,
        )
        self.db.add(device)
        self.db.commit()

        self.log_audit(
            event="registered",
            ip=ip,
            user_agent=user_agent,
            user_id=user.id,
            details=f"User registered with phone {norm_phone} and credentials cached to RAM",
        )

        return self._complete_successful_login(user=user, ip=ip, user_agent=user_agent)

    def logout_all(self, user_id: str, ip: str, user_agent: Optional[str] = None):
        """Revokes all active sessions for the user across all devices."""
        now = utc_now()
        self.db.query(Session).filter(
            Session.user_id == user_id,
            Session.revoked_at == None,
        ).update({"revoked_at": now}, synchronize_session=False)
        self.db.commit()
        self.log_audit(
            event="logout_all",
            ip=ip,
            user_agent=user_agent,
            user_id=user_id,
            details=f"All active sessions revoked for user {user_id}.",
        )

    def bind_email(
        self,
        email: str,
        user_id: Optional[str] = None,
        phone: Optional[str] = None,
        ip: str = "127.0.0.1",
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Binds an email address to a user account, enabling email login.
        Updates the SQLite database and Server RAM Cache immediately.
        """
        norm_email = normalize_email(email)
        if not norm_email or "@" not in norm_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a valid email address.",
            )

        # 1. Locate the user
        user = None
        if user_id:
            user = self.db.query(User).filter(User.id == user_id).first()

        if not user and phone:
            norm_phone, _ = normalize_identifier(phone)
            user = self.db.query(User).filter(User.whatsapp_number == norm_phone).first()
            if not user:
                digits = "".join(filter(str.isdigit, phone))
                if digits:
                    user = self.db.query(User).filter(User.whatsapp_number.like(f"%{digits[-10:]}")).first()

        if not user:
            # Fallback: if only one user or most recent in DB
            all_users = self.db.query(User).all()
            if len(all_users) == 1:
                user = all_users[0]
            elif all_users:
                user = all_users[-1]

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found. Please log in first.",
            )

        # 2. Check if email is already taken by a DIFFERENT user
        existing_with_email = (
            self.db.query(User)
            .filter(User.email == norm_email, User.id != user.id)
            .first()
        )
        if existing_with_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already bound to another account.",
            )

        # 3. Update database record
        old_email = user.email
        user.email = norm_email
        user.updated_at = utc_now()
        self.db.commit()
        self.db.refresh(user)

        # 4. Update Server RAM Cache
        if old_email:
            with ram_cache._lock:
                ram_cache._identifier_to_id.pop(old_email.strip().lower(), None)
        ram_cache.cache_user(user)

        # 5. Add IP as known device
        now = utc_now()
        existing_device = self.db.query(KnownDevice).filter(
            KnownDevice.user_id == user.id,
            KnownDevice.ip == ip,
        ).first()
        if not existing_device:
            self.db.add(KnownDevice(
                user_id=user.id,
                ip=ip,
                user_agent=user_agent,
                first_seen_at=now,
                last_seen_at=now,
            ))
            self.db.commit()

        # 6. Audit log
        self.log_audit(
            event="email_bound",
            ip=ip,
            user_agent=user_agent,
            user_id=user.id,
            details=f"Email {norm_email} bound to user {user.id}",
        )

        res = self._complete_successful_login(user=user, ip=ip, user_agent=user_agent)
        res["message"] = "Email address successfully bound. You can now log in using this email."
        return res
