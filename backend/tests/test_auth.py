import time
from datetime import datetime, timezone, timedelta
import pytest
from app.config import settings
from app.models import User, Session, AuditLog, KnownDevice
from app.security.tokens import hash_refresh_token
from app.services.ram_cache import ram_cache


def test_correct_login_email(client, create_test_user, csrf_context):
    """Test successful login using normalized email from a known IP."""
    create_test_user(
        email="hello@paykudi.com",
        password="ValidPassword123!",
        known_ip="testclient",
    )

    response = client.post(
        "/auth/login",
        json={"identifier": "  HeLLo@PayKudi.COM  ", "password": "ValidPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == "hello@paykudi.com"

    # Verify cookies: access token and rotating refresh token
    assert "paykudi_access_token" in response.cookies
    assert "paykudi_refresh_token" in response.cookies


def test_correct_login_whatsapp(client, create_test_user, csrf_context):
    """Test successful login using WhatsApp phone number normalized to E.164."""
    create_test_user(
        whatsapp_number="+2348012345678",
        password="PhonePassword999!",
        known_ip="testclient",
    )

    response = client.post(
        "/auth/login",
        json={"identifier": " +234 801 234 5678 ", "password": "PhonePassword999!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["user"]["whatsapp_number"] == "+2348012345678"


def test_wrong_password_decrement(client, create_test_user, csrf_context):
    """Test wrong password decrementing remaining attempts."""
    create_test_user(email="alice@paykudi.com", password="CorrectPass123!", known_ip="testclient")

    response = client.post(
        "/auth/login",
        json={"identifier": "alice@paykudi.com", "password": "WrongPassword!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    assert response.status_code == 401
    assert "Incorrect password (4 attempts left)" in response.json()["detail"]


def test_unknown_user_timing_defense(client, csrf_context):
    """Test unknown user returns exact message and runs dummy verify."""
    response = client.post(
        "/auth/login",
        json={"identifier": "nonexistent@paykudi.com", "password": "AnyPassword!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "No account found with these details"


def test_unverified_user(client, create_test_user, csrf_context):
    """Test that unverified user receives 'Verify your WhatsApp number to continue'."""
    create_test_user(
        email="unverified@paykudi.com",
        password="Password123!",
        is_verified=False,
        known_ip="testclient",
    )

    response = client.post(
        "/auth/login",
        json={"identifier": "unverified@paykudi.com", "password": "Password123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Verify your WhatsApp number to continue"


def test_account_lockout_and_doubling(client, create_test_user, db_session, csrf_context, fake_redis_client):
    """Test 5 failed attempts locks for 15 minutes, and repeat lockout doubles to 30 minutes."""
    user = create_test_user(email="bob@paykudi.com", password="SecretPassword!", known_ip="testclient")

    # 4 failed attempts (attempts 4+ require Turnstile token since >=3 failures)
    for i in range(1, 5):
        payload = {"identifier": "bob@paykudi.com", "password": "BadPassword"}
        if i >= 4:
            payload["turnstile_token"] = "valid_token"
        resp = client.post(
            "/auth/login",
            json=payload,
            cookies=csrf_context["cookies"],
            headers=csrf_context["headers"],
        )
        assert resp.status_code == 401
        assert f"({5 - i} attempts left)" in resp.json()["detail"]

    # 5th failed attempt -> locks account for 15 minutes
    resp5 = client.post(
        "/auth/login",
        json={"identifier": "bob@paykudi.com", "password": "BadPassword", "turnstile_token": "valid_token"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert resp5.status_code == 423
    assert "Account locked. Try again in 15 minutes" in resp5.json()["detail"]

    # While locked, even correct password is rejected with locked message
    resp_locked = client.post(
        "/auth/login",
        json={"identifier": "bob@paykudi.com", "password": "SecretPassword!", "turnstile_token": "valid_token"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert resp_locked.status_code == 423
    assert "Account locked" in resp_locked.json()["detail"]

    # Fast forward time past first lock
    db_session.refresh(user)
    user.locked_until = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()
    ram_cache.cache_user(user)

    # Clear IP rate limit key so IP-level limit doesn't preempt the account doubling check
    fake_redis_client.delete("rl:ip:testclient:attempts")

    # Fail 5 more times to trigger second lockout
    for _ in range(4):
        client.post(
            "/auth/login",
            json={"identifier": "bob@paykudi.com", "password": "BadPassword2", "turnstile_token": "valid_token"},
            cookies=csrf_context["cookies"],
            headers=csrf_context["headers"],
        )

    resp_second_lock = client.post(
        "/auth/login",
        json={"identifier": "bob@paykudi.com", "password": "BadPassword2", "turnstile_token": "valid_token"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert resp_second_lock.status_code == 423
    # Doubled to 30 minutes!
    assert "Account locked. Try again in 30 minutes" in resp_second_lock.json()["detail"]


def test_turnstile_required_after_3_failed_attempts(client, create_test_user, csrf_context):
    """Test that after 3 failed login attempts from an IP, Cloudflare Turnstile is required."""
    create_test_user(email="turnstile_user@paykudi.com", password="Password123!", known_ip="testclient")

    # 3 failed attempts
    for _ in range(3):
        client.post(
            "/auth/login",
            json={"identifier": "turnstile_user@paykudi.com", "password": "WrongPassword"},
            cookies=csrf_context["cookies"],
            headers=csrf_context["headers"],
        )

    # 4th attempt without turnstile token should be rejected with 400 Turnstile required
    resp = client.post(
        "/auth/login",
        json={"identifier": "turnstile_user@paykudi.com", "password": "WrongPassword"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert resp.status_code == 400
    assert "Cloudflare Turnstile verification required" in resp.json()["detail"]
    assert resp.headers.get("X-Turnstile-Required") == "true"


def test_ip_rate_limiting(client, create_test_user, csrf_context):
    """Test per-IP rate limiting: max 10 login attempts per 15 minutes returns 429."""
    create_test_user(email="ratelimit@paykudi.com", password="Password123!", known_ip="testclient")

    # 10 attempts allowed (provide turnstile_token after 3 so Turnstile doesn't stop them)
    for i in range(10):
        client.post(
            "/auth/login",
            json={"identifier": "ratelimit@paykudi.com", "password": "WrongPassword", "turnstile_token": "valid_token"},
            cookies=csrf_context["cookies"],
            headers=csrf_context["headers"],
        )

    # 11th attempt must be blocked by IP rate limit
    resp11 = client.post(
        "/auth/login",
        json={"identifier": "ratelimit@paykudi.com", "password": "WrongPassword", "turnstile_token": "valid_token"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert resp11.status_code == 429
    assert resp11.json()["detail"] == "Too many attempts. Try again later"
    assert "Retry-After" in resp11.headers


def test_credential_stuffing_auto_block(client, db_session, csrf_context):
    """Test auto-block IP for 24 hours if it fails logins across 10 or more different accounts."""
    # Attacker attempts 10 distinct non-existent accounts from testclient IP
    # Supplying turnstile_token allows all 10 to proceed through credential stuffing detection
    for i in range(10):
        client.post(
            "/auth/login",
            json={"identifier": f"victim{i}@target.com", "password": "StuffingPassword", "turnstile_token": "token"},
            cookies=csrf_context["cookies"],
            headers=csrf_context["headers"],
        )

    # Next attempt should be blocked for 24 hours
    blocked_resp = client.post(
        "/auth/login",
        json={"identifier": "another_victim@target.com", "password": "StuffingPassword", "turnstile_token": "token"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert blocked_resp.status_code == 429
    assert blocked_resp.json()["detail"] == "Too many attempts. Try again later"
    # Retry-After should be approximately 86400 (24 hours)
    retry_after = int(blocked_resp.headers.get("Retry-After", 0))
    assert retry_after > 86000

    # Verify audit log recorded "ip_blocked"
    audit = db_session.query(AuditLog).filter(AuditLog.event == "ip_blocked").first()
    assert audit is not None
    assert "Credential stuffing" in audit.details


def test_refresh_token_reuse_family_revocation(client, create_test_user, db_session, csrf_context):
    """Test refresh token rotation and token reuse detection revoking the entire session family."""
    user = create_test_user(email="carol@paykudi.com", password="CarolPassword123!", known_ip="testclient")

    # Step 1: Login to get initial cookies
    login_resp = client.post(
        "/auth/login",
        json={"identifier": "carol@paykudi.com", "password": "CarolPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert login_resp.status_code == 200
    token_1 = login_resp.cookies.get("paykudi_refresh_token")
    assert token_1 is not None

    # Step 2: Legitimate refresh - token_1 is rotated to token_2
    refresh_resp_1 = client.post(
        "/auth/refresh",
        cookies={**csrf_context["cookies"], "paykudi_refresh_token": token_1},
        headers=csrf_context["headers"],
    )
    assert refresh_resp_1.status_code == 200
    token_2 = refresh_resp_1.cookies.get("paykudi_refresh_token")
    assert token_2 != token_1

    # Step 3: ATTACK! Attacker replays stolen token_1
    attack_resp = client.post(
        "/auth/refresh",
        cookies={**csrf_context["cookies"], "paykudi_refresh_token": token_1},
        headers=csrf_context["headers"],
    )
    assert attack_resp.status_code == 401
    assert "token reuse detected" in attack_resp.json()["detail"]

    # Step 4: Verify that token_2 is NOW ALSO REVOKED because the whole family was revoked
    subsequent_resp = client.post(
        "/auth/refresh",
        cookies={**csrf_context["cookies"], "paykudi_refresh_token": token_2},
        headers=csrf_context["headers"],
    )
    assert subsequent_resp.status_code == 401

    # Check audit log
    audit = db_session.query(AuditLog).filter(AuditLog.event == "token_reuse_detected").first()
    assert audit is not None


def test_two_step_whatsapp_otp_for_new_device(client, create_test_user, db_session, csrf_context):
    """Test that login from a new device/IP requires WhatsApp OTP before issuing tokens."""
    # Create user with no known devices
    user = create_test_user(
        email="david@paykudi.com",
        password="DavidPassword123!",
        known_ip="192.168.1.100",  # Different from test client's 127.0.0.1
    )

    # Login attempt from new IP (127.0.0.1)
    login_resp = client.post(
        "/auth/login",
        json={"identifier": "david@paykudi.com", "password": "DavidPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    assert login_resp.status_code == 200
    data = login_resp.json()
    assert data["status"] == "otp_required"
    assert data["otp_required"] is True
    # Tokens MUST NOT be issued yet
    assert "paykudi_access_token" not in login_resp.cookies

    # Verify OTP was saved in DB
    from app.models import WhatsAppOTP
    otp_record = db_session.query(WhatsAppOTP).filter(WhatsAppOTP.user_id == user.id).first()
    assert otp_record is not None
    assert otp_record.attempts == 0

    # Wrong OTP verification attempt
    bad_otp_resp = client.post(
        "/auth/verify-otp",
        json={"user_id": user.id, "otp": "000000"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert bad_otp_resp.status_code == 400
    assert "Invalid verification code" in bad_otp_resp.json()["detail"]

    # Test with correct OTP
    # We can fetch the raw generated code if stored or test via hash matching
    from app.security.tokens import hash_otp
    test_otp_code = "123456"
    otp_record.otp_hash = hash_otp(test_otp_code)
    db_session.commit()

    good_otp_resp = client.post(
        "/auth/verify-otp",
        json={"user_id": user.id, "otp": test_otp_code},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert good_otp_resp.status_code == 200
    assert good_otp_resp.json()["status"] == "success"
    # Tokens NOW issued!
    assert "paykudi_access_token" in good_otp_resp.cookies
    assert "paykudi_refresh_token" in good_otp_resp.cookies

    # Device now saved as known device
    device = db_session.query(KnownDevice).filter(
        KnownDevice.user_id == user.id,
        KnownDevice.ip == "testclient",
    ).first()
    assert device is not None


def test_specific_login_errors_toggle(client, create_test_user, csrf_context):
    """Test switching SPECIFIC_LOGIN_ERRORS to False produces generic error message."""
    create_test_user(email="eva@paykudi.com", password="EvaPassword123!", known_ip="testclient")

    settings.SPECIFIC_LOGIN_ERRORS = False
    try:
        resp = client.post(
            "/auth/login",
            json={"identifier": "eva@paykudi.com", "password": "WrongPassword"},
            cookies=csrf_context["cookies"],
            headers=csrf_context["headers"],
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"
    finally:
        settings.SPECIFIC_LOGIN_ERRORS = True


def test_logout_and_logout_all(client, create_test_user, db_session, csrf_context):
    """Test single session logout and logout-all across all devices."""
    user = create_test_user(email="frank@paykudi.com", password="FrankPassword123!", known_ip="testclient")

    # Login
    login_resp = client.post(
        "/auth/login",
        json={"identifier": "frank@paykudi.com", "password": "FrankPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    access_token = login_resp.cookies.get("paykudi_access_token")
    refresh_token = login_resp.cookies.get("paykudi_refresh_token")

    # Logout
    logout_resp = client.post(
        "/auth/logout",
        cookies={**csrf_context["cookies"], "paykudi_refresh_token": refresh_token},
        headers=csrf_context["headers"],
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Successfully logged out"

    # Verify session marked revoked in DB
    ref_hash = hash_refresh_token(refresh_token)
    session = db_session.query(Session).filter(Session.refresh_token_hash == ref_hash).first()
    assert session.revoked_at is not None

    # Test logout-all
    logout_all_resp = client.post(
        "/auth/logout-all",
        cookies={**csrf_context["cookies"], "paykudi_access_token": access_token},
        headers=csrf_context["headers"],
    )
    assert logout_all_resp.status_code == 200
    assert logout_all_resp.json()["message"] == "All sessions revoked"
