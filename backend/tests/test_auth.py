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

    # Verify that the logged-out session's access token is now rejected with 401
    verify_revoked = client.get(
        "/auth/me",
        cookies={**csrf_context["cookies"], "paykudi_access_token": access_token},
    )
    assert verify_revoked.status_code == 401

    # Log in again to test logout-all across all devices
    login_again = client.post(
        "/auth/login",
        json={"identifier": "frank@paykudi.com", "password": "FrankPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert login_again.status_code == 200
    new_access_token = login_again.cookies.get("paykudi_access_token")

    # Test logout-all with active session
    logout_all_resp = client.post(
        "/auth/logout-all",
        cookies={**csrf_context["cookies"], "paykudi_access_token": new_access_token},
        headers=csrf_context["headers"],
    )
    assert logout_all_resp.status_code == 200
    assert logout_all_resp.json()["message"] == "All sessions revoked"



def test_bind_email_saves_and_cannot_be_edited(client, create_test_user, db_session, csrf_context):
    """Test user signs up skipping email, updates email in profile DB, and cannot edit it afterwards."""
    # User signs up with phone only, email is None
    user = create_test_user(
        whatsapp_number="+2348099990001",
        email=None,
        password="Password123!",
        known_ip="testclient",
    )
    assert user.email is None

    # Update/bind email later in profile
    bind_resp = client.post(
        "/auth/bind-email",
        json={"email": "first_email@paykudi.com", "user_id": user.id},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert bind_resp.status_code == 200
    assert bind_resp.json()["user"]["email"] == "first_email@paykudi.com"

    # Verify saved directly in database
    db_session.refresh(user)
    assert user.email == "first_email@paykudi.com"

    # Attempt to edit or change email should fail
    edit_resp = client.post(
        "/auth/bind-email",
        json={"email": "new_email@paykudi.com", "user_id": user.id},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert edit_resp.status_code == 400
    assert "cannot be edited" in edit_resp.json()["detail"].lower()


def test_send_email_otp_and_bind(client, create_test_user, db_session, csrf_context):
    user = create_test_user(
        whatsapp_number="+2348077777777",
        email=None,
        password="Password123!",
    )
    assert user.email is None

    # Request OTP for email binding
    send_otp_resp = client.post(
        "/auth/send-email-otp",
        json={"email": "otp_verified@paykudi.com"},
    )
    assert send_otp_resp.status_code == 200
    otp_data = send_otp_resp.json()
    assert otp_data["status"] == "ok"
    assert otp_data["demo_otp"] == "123456"

    # Bind email with OTP
    bind_resp = client.post(
        "/auth/bind-email",
        json={
            "email": "otp_verified@paykudi.com",
            "user_id": user.id,
            "otp": otp_data["demo_otp"],
        },
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert bind_resp.status_code == 200
    assert bind_resp.json()["user"]["email"] == "otp_verified@paykudi.com"

    db_session.refresh(user)
    assert user.email == "otp_verified@paykudi.com"


def test_username_uniqueness_and_ram_cache(client, csrf_context, db_session):
    """Test that usernames are cached in Server RAM, check-username endpoint works, and duplicates are blocked."""
    from app.services.ram_cache import ram_cache

    # 1. Initially 'david_crypto' is available
    res1 = client.get("/auth/check-username?username=david_crypto")
    assert res1.status_code == 200
    assert res1.json()["available"] is True

    # 2. Register first user with username 'david_crypto'
    reg_resp = client.post(
        "/auth/register",
        json={
            "phone": "+2348011223344",
            "password": "SecurePassword123!",
            "full_name": "David Crypto",
            "username": "david_crypto",
        },
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert reg_resp.status_code == 200
    assert reg_resp.json()["user"]["username"] == "david_crypto"

    # 3. Check that username is now in Server RAM cache!
    assert ram_cache.is_username_taken("david_crypto") is True
    assert ram_cache.is_username_taken("David_Crypto") is True
    assert ram_cache.is_username_taken("@david_crypto") is True

    # 4. Check endpoint now reports unavailable
    res2 = client.get("/auth/check-username?username=david_crypto")
    assert res2.status_code == 200
    assert res2.json()["available"] is False
    assert "@david_crypto is already taken" in res2.json()["message"]

    # Also case-insensitive check
    res3 = client.get("/auth/check-username?username=@David_Crypto")
    assert res3.status_code == 200
    assert res3.json()["available"] is False

    # 5. Attempting to register another user with the same username must fail with 409
    dup_resp = client.post(
        "/auth/register",
        json={
            "phone": "+2348099887766",
            "password": "AnotherPassword123!",
            "full_name": "Another User",
            "username": "david_crypto",
        },
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert dup_resp.status_code == 409
    assert "already taken by another user" in dup_resp.json()["detail"]


def test_counterparty_search_and_matching_in_ram(client, csrf_context, db_session):
    """Test searching and matching real users in Server RAM and DB by phone, username, and full name."""
    from app.services.ram_cache import ram_cache

    # 1. Register a real user
    client.post(
        "/auth/register",
        json={
            "phone": "+2349033705741",
            "password": "Password123!",
            "full_name": "Benedicta James",
            "username": "benedicta001",
        },
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )

    # 2. Search by Name
    search_name = client.get("/auth/users/search?q=Benedicta")
    assert search_name.status_code == 200
    users = search_name.json()["users"]
    assert any(u["username"] == "benedicta001" for u in users)

    # 3. Search by Username
    search_un = client.get("/auth/users/search?q=@benedicta")
    assert search_un.status_code == 200
    users_un = search_un.json()["users"]
    assert any(u["username"] == "benedicta001" for u in users_un)

    # 4. Search by Phone number (local format 09033705741)
    search_phone = client.get("/auth/users/search?q=09033705741")
    assert search_phone.status_code == 200
    users_phone = search_phone.json()["users"]
    assert any(u["username"] == "benedicta001" for u in users_phone)

    # 5. Verify Counterparty exact match
    verify_res = client.get("/auth/users/verify-counterparty?q=benedicta001")
    assert verify_res.status_code == 200
    assert verify_res.json()["verified"] is True
    assert verify_res.json()["user"]["full_name"] == "Benedicta James"

    verify_phone = client.get("/auth/users/verify-counterparty?q=+2349033705741")
    assert verify_phone.status_code == 200
    assert verify_phone.json()["verified"] is True


def _authenticate_client_as(client, db_session, user_id="usr_howard_1", username="howard001", full_name="Howard Ukah", phone="2348032001585"):
    now = datetime.now(timezone.utc)
    user = db_session.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            username=username,
            full_name=full_name,
            whatsapp_number=phone,
            email=f"{username}@paykudi.com",
            password_hash="testhash",
            is_active=True,
            is_verified=True,
            created_at=now,
        )
        db_session.add(user)
        db_session.commit()

    session_id = f"sess_{user_id}"
    sess = db_session.query(Session).filter(Session.id == session_id).first()
    if not sess:
        sess = Session(
            id=session_id,
            user_id=user.id,
            family_id=f"fam_{user_id}",
            refresh_token_hash=f"hash_{user_id}",
            ip="127.0.0.1",
            created_at=now,
            expires_at=now + timedelta(days=7),
        )
        db_session.add(sess)
        db_session.commit()

    ram_cache.cache_user(user)
    from app.security.tokens import create_access_token
    token = create_access_token(user_id=user.id, session_id=sess.id)
    client.cookies.set("paykudi_access_token", token)
    return user


def test_room_invitation_and_acceptance_lifecycle(client, db_session):
    """Test creating real payment room invitation, notifying counterparty, and accepting invite."""
    howard = _authenticate_client_as(client, db_session, user_id="usr_howard_1", username="howard001", full_name="Howard Ukah", phone="2348032001585")
    room_payload = {
        "id": "ORD-998877",
        "orderNumber": "ORD-998877",
        "creator": "Howard Ukah",
        "counterparty": "Benedicta James",
        "counterpartyUsername": "benedicta001",
        "counterpartyPhone": "+2349033705741",
        "item": "Macbook Pro M3",
        "amount": "₦1,850,000",
    }

    # 1. Send Invitation
    inv_res = client.post("/auth/rooms/invite", json=room_payload)
    assert inv_res.status_code == 200
    data = inv_res.json()
    assert data["status"] == "success"
    assert data["invitation"]["id"] == "ORD-998877"
    assert data["invitation"]["counterparty_joined"] is False

    # 2. Check Room Status before acceptance (caller is creator Howard)
    st_res = client.get("/auth/rooms/ORD-998877/status")
    assert st_res.status_code == 200
    assert st_res.json()["counterparty_joined"] is False

    # 3. Check Counterparty notifications (caller is Benedicta)
    benedicta = _authenticate_client_as(client, db_session, user_id="usr_bene_1", username="benedicta001", full_name="Benedicta James", phone="2349033705741")
    notif_res = client.get("/auth/notifications")
    assert notif_res.status_code == 200
    notifs = notif_res.json()["notifications"]
    assert len(notifs) >= 1
    assert notifs[0]["room_id"] == "ORD-998877"
    assert "Macbook Pro M3" in notifs[0]["message"]

    # 4. Counterparty Accepts Invitation
    acc_res = client.post("/auth/rooms/ORD-998877/accept", json={"user": "Benedicta James"})
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "success"
    assert acc_res.json()["room"]["counterparty_joined"] is True

    # 5. Check Room Status after acceptance
    st_after = client.get("/auth/rooms/ORD-998877/status")
    assert st_after.status_code == 200
    assert st_after.json()["counterparty_joined"] is True


def test_pre_payment_rooms_table(client, db_session):
    """
    Test pre_payment_rooms table: creating, listing, and retrieving
    rooms that are still in invite status.
    """
    _authenticate_client_as(client, db_session, user_id="usr_howard_1", username="howard001", full_name="Howard Ukah", phone="2348032001585")
    payload = {
        "id": "ORD-PRE-112233",
        "orderNumber": "ORD-PRE-112233",
        "item": "Sony PlayStation 5",
        "amount": "₦650,000",
        "creator": "Howard Ukah",
        "counterparty": "Benedicta James",
        "counterpartyUsername": "benedicta001",
        "counterpartyPhone": "09033705741",
        "role": "Buying",
    }
    # 1. Create pre-payment room
    create_res = client.post("/auth/pre-payment-rooms", json=payload)
    assert create_res.status_code == 200
    res_data = create_res.json()
    assert res_data["status"] == "success"
    assert res_data["room"]["item"] == "Sony PlayStation 5"
    assert res_data["room"]["status"] == "pending_invite"

    # 2. List pre-payment rooms
    list_res = client.get("/auth/pre-payment-rooms")
    assert list_res.status_code == 200
    rooms = list_res.json()["rooms"]
    assert any(r["id"] == "ORD-PRE-112233" for r in rooms)

    # 3. Get specific pre-payment room
    get_res = client.get("/auth/pre-payment-rooms/ORD-PRE-112233")
    assert get_res.status_code == 200
    assert get_res.json()["room"]["item"] == "Sony PlayStation 5"

    # 4. Counterparty accepts invitation via modal endpoint
    acc_res = client.post("/auth/pre-payment-rooms/ORD-PRE-112233/accept", json={"user": "Benedicta James"})
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "success"
    assert acc_res.json()["room"]["counterparty_joined"] is True


def test_kill_and_resend_payment_room_lifecycle(client, db_session):
    """
    Test that when the countdown timer expires:
    1. Pre-payment room is killed/deactivated.
    2. Counterparty acceptance is rejected while killed.
    3. Room remains killed until user presses Resend.
    4. Upon Resend, the room is reactivated and counterparty can accept.
    """
    _authenticate_client_as(client, db_session, user_id="usr_howard_1", username="howard001", full_name="Howard Ukah", phone="2348032001585")
    payload = {
        "id": "ORD-KILL-TEST-1",
        "orderNumber": "ORD-KILL-TEST-1",
        "item": "DJI Drone Mavic 3",
        "amount": "₦1,200,000",
        "creator": "Howard Ukah",
        "counterparty": "Benedicta James",
        "counterpartyUsername": "benedicta001",
        "counterpartyPhone": "09033705741",
        "role": "Selling",
    }
    # 1. Create room
    create_res = client.post("/auth/pre-payment-rooms", json=payload)
    assert create_res.status_code == 200

    # 2. Timer expires: Kill pre-payment room
    kill_res = client.post("/auth/pre-payment-rooms/ORD-KILL-TEST-1/kill")
    assert kill_res.status_code == 200
    assert kill_res.json()["status"] == "success"

    # 3. Verify status is expired in both get and accept
    get_res = client.get("/auth/pre-payment-rooms/ORD-KILL-TEST-1")
    assert get_res.status_code == 200
    assert get_res.json()["room"]["status"] == "expired"

    # 4. Acceptance must fail while room is killed
    acc_fail = client.post("/auth/pre-payment-rooms/ORD-KILL-TEST-1/accept", json={"user": "Benedicta James"})
    assert acc_fail.status_code == 400
    assert "timed out" in acc_fail.json()["detail"].lower()

    # 5. User presses Resend: Room reactivated and timer restarted
    resend_res = client.post("/auth/pre-payment-rooms/ORD-KILL-TEST-1/resend")
    assert resend_res.status_code == 200
    assert resend_res.json()["room"]["status"] == "pending_invite"

    # 6. Now counterparty can accept
    acc_success = client.post("/auth/pre-payment-rooms/ORD-KILL-TEST-1/accept", json={"user": "Benedicta James"})
    assert acc_success.status_code == 200
    assert acc_success.json()["room"]["counterparty_joined"] is True


def test_db_to_ram_cache_automatic_synchronization(db_session):
    """
    Verifies that any insert, update, or delete made to the database
    is automatically and immediately synchronized with the Server RAM Cache in real time.
    """
    from app.services.ram_cache import ram_cache
    from app.models import User, PrePaymentRoom
    import uuid

    user_id = str(uuid.uuid4())
    test_user = User(
        id=user_id,
        email="sync_test@paykudi.com",
        whatsapp_number="+2348011223344",
        username="synctester",
        full_name="Sync Tester",
        password_hash="test_hash_123",
        is_verified=True,
    )

    # 1. DB Insert -> Automatic RAM Cache sync
    db_session.add(test_user)
    db_session.commit()

    cached_u = ram_cache.get_user_by_id(user_id)
    assert cached_u is not None
    assert cached_u["email"] == "sync_test@paykudi.com"
    assert cached_u["username"] == "synctester"
    assert ram_cache.get_by_identifier("synctester") is not None
    assert ram_cache.get_by_identifier("2348011223344") is not None

    # 2. DB Update -> Automatic RAM Cache sync
    test_user.full_name = "Updated Tester Name"
    db_session.commit()

    cached_u_updated = ram_cache.get_user_by_id(user_id)
    assert cached_u_updated is not None
    assert cached_u_updated["full_name"] == "Updated Tester Name"

    # 3. PrePaymentRoom DB Insert -> Automatic RAM Cache sync
    room_id = "ORD-SYNC-999"
    test_room = PrePaymentRoom(
        id=room_id,
        order_number=room_id,
        title="Macbook M3 Pro",
        item="Macbook M3 Pro",
        amount="₦2,500,000",
        price="₦2,500,000",
        role="Selling",
        creator="Howard Ukah",
        counterparty="Benedicta James",
        counterparty_username="benedicta",
        counterparty_phone="+2348099887766",
        counterparty_account_id="8099887766",
        counterparty_joined=False,
        status="pending_invite",
        status_text="Invite Sent",
        category="pre_payment",
    )
    db_session.add(test_room)
    db_session.commit()

    cached_room = ram_cache.get_pre_payment_room(room_id)
    assert cached_room is not None
    assert cached_room["title"] == "Macbook M3 Pro"
    assert cached_room["status"] == "pending_invite"

    # 4. PrePaymentRoom DB Update -> Automatic RAM Cache sync
    test_room.status = "accepted"
    test_room.counterparty_joined = True
    db_session.commit()

    cached_room_updated = ram_cache.get_pre_payment_room(room_id)
    assert cached_room_updated is not None
    assert cached_room_updated["status"] == "accepted"
    assert cached_room_updated["counterparty_joined"] is True

    # 5. PrePaymentRoom DB Delete -> Automatic RAM Cache removal
    db_session.delete(test_room)
    db_session.commit()

    cached_room_deleted = ram_cache.get_pre_payment_room(room_id)
    assert cached_room_deleted is None


def test_user_cannot_invite_himself(client):
    """
    Verifies that a user cannot create a pre-payment room where the counterparty is themselves.
    """
    payload_same_username = {
        "id": "ORD-SELF-TEST-1",
        "creator": "Howard Ukah",
        "creatorUsername": "howard001",
        "creatorPhone": "08032001585",
        "counterparty": "Howard Ukah",
        "counterpartyUsername": "howard001",
        "counterpartyPhone": "09012345678",
        "item": "Test Item",
        "amount": "₦50,000",
    }
    res1 = client.post("/auth/pre-payment-rooms", json=payload_same_username)
    assert res1.status_code == 400
    assert "cannot invite himself" in res1.json()["detail"].lower()

    payload_same_phone = {
        "id": "ORD-SELF-TEST-2",
        "creator": "Howard Ukah",
        "creatorUsername": "howard001",
        "creatorPhone": "08032001585",
        "counterparty": "Another User",
        "counterpartyUsername": "anotheruser",
        "counterpartyPhone": "08032001585",
        "item": "Test Item",
        "amount": "₦50,000",
    }
    res2 = client.post("/auth/pre-payment-rooms", json=payload_same_phone)
    assert res2.status_code == 400
    assert "cannot invite himself" in res2.json()["detail"].lower()


def test_pre_payment_room_timer_synchronization(client, db_session):
    """
    Verifies that when a counterparty logs in late (e.g. 89 seconds after creation),
    the pre-payment room's remaining countdown timer is synchronized to the exact wall-clock
    remaining time (31 seconds) rather than restarting from 120 seconds.
    """
    _authenticate_client_as(client, db_session, user_id="usr_howard_1", username="howard001", full_name="Howard Ukah", phone="2348032001585")
    now = datetime.now(timezone.utc)
    now_ms = int(now.timestamp() * 1000)
    # Simulate room created 89 seconds ago -> 31 seconds remaining
    created_at_ms = now_ms - 89_000
    expires_at_ms = created_at_ms + 120_000
    expires_at_iso = datetime.fromtimestamp(expires_at_ms / 1000, tz=timezone.utc).isoformat()
    created_at_iso = datetime.fromtimestamp(created_at_ms / 1000, tz=timezone.utc).isoformat()

    room_payload = {
        "id": "ORD-SYNC-TIMER-1",
        "creator": "Howard Ukah",
        "creatorUsername": "howard001",
        "creatorPhone": "08032001585",
        "counterparty": "Benedicta James",
        "counterpartyUsername": "benedicta001",
        "counterpartyPhone": "09033705741",
        "item": "Iphone 18 Pro Max",
        "amount": "₦1,200,000",
        "created_at": created_at_iso,
        "expires_at": expires_at_iso,
        "created_at_ms": created_at_ms,
        "expires_at_ms": expires_at_ms,
    }

    create_res = client.post("/auth/pre-payment-rooms", json=room_payload)
    assert create_res.status_code == 200

    # Counterparty queries pre-payment rooms: should have ~31s remaining (allow 1s tolerance for test execution)
    get_res = client.get("/auth/pre-payment-rooms/ORD-SYNC-TIMER-1")
    assert get_res.status_code == 200
    room = get_res.json()["room"]
    assert room["seconds_left"] in [30, 31, 32]
    assert room["secondsLeft"] in [30, 31, 32]
    assert room["is_expired"] is False

    # Resending restarts the timer to 120s
    resend_res = client.post("/auth/pre-payment-rooms/ORD-SYNC-TIMER-1/resend")
    assert resend_res.status_code == 200
    resend_room = ram_cache.get_pre_payment_room("ORD-SYNC-TIMER-1")
    assert resend_room["seconds_left"] in [119, 120]
    assert resend_room["is_expired"] is False


def test_approved_pre_payment_room_moved_out_of_prepayment_table(client, db_session):
    """
    Verifies that when a pre-payment room invitation is approved/accepted by the counterparty:
    1. It is moved OUT of the pre_payment_rooms table (deleted from DB and RAM cache).
    2. It is moved INTO the payment_rooms table (persisted in DB and RAM cache).
    3. The pre-payment list no longer returns the room.
    4. The payment-rooms list returns the room.
    """
    from app.models import PrePaymentRoom, PaymentRoom

    howard = _authenticate_client_as(client, db_session, user_id="usr_howard_1", username="howard001", full_name="Howard Ukah", phone="2348032001585")

    room_id = "ORD-APPROVE-MOVE-1"
    room_payload = {
        "id": room_id,
        "creator": "Howard Ukah",
        "creatorUsername": "howard001",
        "creatorPhone": "08032001585",
        "counterparty": "Benedicta James",
        "counterpartyUsername": "benedicta001",
        "counterpartyPhone": "09033705741",
        "item": "Samsung Galaxy S24 Ultra",
        "amount": "₦850,000",
        "role": "Buying",
    }

    # 1. Create pre-payment room
    create_res = client.post("/auth/pre-payment-rooms", json=room_payload)
    assert create_res.status_code == 200

    # Verify present in PrePaymentRoom table and RAM cache
    pre_db = db_session.query(PrePaymentRoom).filter(PrePaymentRoom.id == room_id).first()
    assert pre_db is not None
    assert pre_db.title == "Samsung Galaxy S24 Ultra"

    # 2. Counterparty approves / accepts invitation
    accept_res = client.post(
        f"/auth/pre-payment-rooms/{room_id}/accept",
        json={"user": "Benedicta James"}
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "success"

    # Creator finishes specifications and proceeds
    proceed_res = client.post(
        f"/auth/pre-payment-rooms/{room_id}/proceed",
        json={"specifications": ["Color: Black"]}
    )
    assert proceed_res.status_code == 200

    # 3. VERIFY MOVED OUT OF PRE-PAYMENT TABLE
    db_session.expire_all()
    pre_db_after = db_session.query(PrePaymentRoom).filter(PrePaymentRoom.id == room_id).first()
    assert pre_db_after is None, "PrePaymentRoom record must be deleted/moved out of pre_payment_rooms table once approved"

    cached_pre = ram_cache.get_pre_payment_room(room_id)
    assert cached_pre is None, "PrePaymentRoom must be removed from pre-payment RAM cache once approved"

    # Pre-payment list endpoint must not list this room
    list_pre = client.get("/auth/pre-payment-rooms?phone=09033705741")
    assert list_pre.status_code == 200
    rooms = list_pre.json()["rooms"]
    assert not any(r.get("id") == room_id for r in rooms)

    # 4. VERIFY PRESENT IN PAYMENT ROOM TABLE
    p_room_db = db_session.query(PaymentRoom).filter(PaymentRoom.id == room_id).first()
    assert p_room_db is not None, "PaymentRoom record must exist in payment_rooms table once approved"
    assert p_room_db.status == "awaiting_payment"
    assert p_room_db.buyer_name == "Howard Ukah"
    assert p_room_db.seller_name == "Benedicta James"

    cached_payment = ram_cache.get_payment_room(room_id)
    assert cached_payment is not None, "PaymentRoom must exist in payment_rooms RAM cache once approved"

    # Payment-rooms list endpoint returns the room
    list_p = client.get("/auth/payment-rooms")
    assert list_p.status_code == 200
    payment_rooms = list_p.json()["rooms"]
    assert any(r.get("id") == room_id for r in payment_rooms)


