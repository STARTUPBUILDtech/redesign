import json
import pytest
from app.config import settings
from app.models import User, PayoutAccount, WalletTransaction
from app.security.hasher import password_hasher
from app.services.ram_cache import ram_cache
from fastapi.routing import APIRoute


def get_user_auth_cookies(client, user_obj, password, csrf_context):
    """Helper to log in and retrieve session cookies."""
    res = client.post(
        "/auth/login",
        json={"identifier": user_obj.whatsapp_number, "password": password},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    return {
        **csrf_context["cookies"],
        "paykudi_access_token": res.cookies.get("paykudi_access_token"),
        "paykudi_refresh_token": res.cookies.get("paykudi_refresh_token"),
    }


# =====================================================================
# 1. AUTHENTICATION ENFORCEMENT: 401 ON UNPROTECTED REQUESTS
# =====================================================================

def test_endpoints_return_401_without_session(client, csrf_context):
    """
    Verifies that all hardened endpoints return 401 Unauthorized when
    called without an active session cookie or auth header.
    """
    headers = csrf_context["headers"]
    cookies = csrf_context["cookies"]

    # Session check & delete
    assert client.get("/auth/me").status_code == 401
    assert client.request("DELETE", "/auth/me", json={"password": "any"}, headers=headers, cookies=cookies).status_code == 401

    # Change password
    assert client.post(
        "/auth/change-password",
        json={"current_password": "old", "new_password": "new"},
        headers=headers,
        cookies=cookies,
    ).status_code == 401

    # Payout accounts
    assert client.get("/auth/payout-accounts").status_code == 401
    assert client.post(
        "/auth/payout-accounts",
        json={"bank": "Kuda", "account_number": "1234567890", "account_name": "Test User"},
        headers=headers,
        cookies=cookies,
    ).status_code == 401
    assert client.delete("/auth/payout-accounts/some-acc-id", headers=headers, cookies=cookies).status_code == 401
    assert client.post("/auth/payout-accounts/some-acc-id/default", headers=headers, cookies=cookies).status_code == 401

    # Profile
    assert client.get("/auth/profile").status_code == 401
    assert client.post(
        "/auth/profile",
        json={"full_name": "Unauthorized Attempt"},
        headers=headers,
        cookies=cookies,
    ).status_code == 401


# =====================================================================
# 1B. CSRF SERVER ENFORCEMENT: 403 ON MISSING OR INVALID CSRF
# =====================================================================

def test_csrf_server_enforcement(client, create_test_user):
    """
    Verifies that state-changing POST/DELETE requests without valid CSRF
    tokens return 403 Forbidden under production enforcement.
    """
    user = create_test_user(
        whatsapp_number="+2348099887766",
        password="CsrfPassword123!",
        known_ip="testclient",
    )
    old_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"

        # 1. POST /auth/login with NO CSRF header or cookie -> 403
        res_no_csrf = client.post(
            "/auth/login",
            json={"identifier": "+2348099887766", "password": "CsrfPassword123!"},
        )
        assert res_no_csrf.status_code == 403
        assert "csrf token missing" in res_no_csrf.json()["detail"].lower()

        # 2. POST /auth/login with MISMATCHED CSRF token -> 403
        res_mismatch = client.post(
            "/auth/login",
            json={"identifier": "+2348099887766", "password": "CsrfPassword123!"},
            cookies={"paykudi_csrf_token": "token_a_1234567890abcdef1234567890abcdef"},
            headers={"x-csrf-token": "token_b_mismatched_attacker_token_here"},
        )
        assert res_mismatch.status_code == 403
        assert "invalid csrf token" in res_mismatch.json()["detail"].lower()
    finally:
        settings.ENVIRONMENT = old_env


# =====================================================================
# 2. INTERIM RESET PASSWORD RULE: 503 SERVICE UNAVAILABLE
# =====================================================================


def test_reset_password_interim_disabled_503(client, csrf_context):
    """
    Verifies the interim rule: unauthenticated reset_password MUST NOT be left open.
    Returns 503 Service Unavailable explaining OTP upgrade is pending.
    """
    res = client.post(
        "/auth/reset-password",
        json={"phone": "+2348012345678", "new_password": "HackedPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert res.status_code == 503
    assert "temporarily unavailable" in res.json()["detail"].lower()


# =====================================================================
# 3. AUTHENTICATED CHANGE PASSWORD
# =====================================================================

def test_authenticated_change_password(client, create_test_user, csrf_context):
    """
    Verifies that changing password requires a valid session and the correct current password.
    After changing, the old password fails and the new password succeeds.
    """
    user = create_test_user(
        whatsapp_number="+2348099112233",
        password="OldSecurePassword1!",
        known_ip="testclient",
    )
    auth_cookies = get_user_auth_cookies(client, user, "OldSecurePassword1!", csrf_context)

    # 1. Wrong current password -> 400
    res_wrong = client.post(
        "/auth/change-password",
        json={"current_password": "WrongPassword!", "new_password": "NewSecurePassword1!"},
        cookies=auth_cookies,
        headers=csrf_context["headers"],
    )
    assert res_wrong.status_code == 400
    assert "current password is incorrect" in res_wrong.json()["detail"].lower()

    # 2. Correct current password -> 200
    res_ok = client.post(
        "/auth/change-password",
        json={"current_password": "OldSecurePassword1!", "new_password": "NewSecurePassword1!"},
        cookies=auth_cookies,
        headers=csrf_context["headers"],
    )
    assert res_ok.status_code == 200
    assert "changed successfully" in res_ok.json()["message"].lower()

    # 3. Old password login now fails
    login_old = client.post(
        "/auth/login",
        json={"identifier": "+2348099112233", "password": "OldSecurePassword1!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert login_old.status_code == 401

    # 4. New password login succeeds
    login_new = client.post(
        "/auth/login",
        json={"identifier": "+2348099112233", "password": "NewSecurePassword1!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert login_new.status_code == 200


# =====================================================================
# 4. PAYOUT ACCOUNTS: IDOR PREVENTED & USER ISOLATION
# =====================================================================

def test_payout_account_user_isolation_and_idor(client, create_test_user, db_session, csrf_context):
    """
    Verifies that User A cannot read, delete, or set default on User B's payout account.
    Deleting User B's payout account returns 404 (preventing probing) and leaves it intact.
    """
    user_a = create_test_user(
        email="usera@paykudi.com",
        whatsapp_number="+2348011111111",
        password="PasswordA123!",
        known_ip="testclient",
    )
    user_b = create_test_user(
        email="userb@paykudi.com",
        whatsapp_number="+2348022222222",
        password="PasswordB123!",
        known_ip="testclient",
    )

    auth_a = get_user_auth_cookies(client, user_a, "PasswordA123!", csrf_context)
    auth_b = get_user_auth_cookies(client, user_b, "PasswordB123!", csrf_context)

    # User B creates a payout account
    res_b_create = client.post(
        "/auth/payout-accounts",
        json={
            "bank": "Access Bank",
            "bank_code": "044",
            "account_number": "0123456789",
            "account_name": "User B Account",
            "is_default": True,
        },
        cookies=auth_b,
        headers=csrf_context["headers"],
    )
    assert res_b_create.status_code == 200
    b_acc_id = res_b_create.json()["id"]

    # 1. User A lists payout accounts -> must NOT see User B's account
    res_a_list = client.get("/auth/payout-accounts", cookies=auth_a)
    assert res_a_list.status_code == 200
    a_accounts = res_a_list.json()
    assert not any(acc["id"] == b_acc_id for acc in a_accounts)

    # 2. User A attempts to set default on User B's account -> 404 Not Found
    res_a_default = client.post(
        f"/auth/payout-accounts/{b_acc_id}/default",
        cookies=auth_a,
        headers=csrf_context["headers"],
    )
    assert res_a_default.status_code == 404

    # 3. User A attempts to delete User B's account -> 404 Not Found
    res_a_delete = client.delete(
        f"/auth/payout-accounts/{b_acc_id}",
        cookies=auth_a,
        headers=csrf_context["headers"],
    )
    assert res_a_delete.status_code == 404

    # 4. Verify User B's account was NOT deleted and is still in the database
    db_session.expire_all()
    b_acc_db = db_session.query(PayoutAccount).filter(PayoutAccount.id == b_acc_id).first()
    assert b_acc_db is not None
    assert b_acc_db.user_id == user_b.id

    # 5. User B deletes their own payout account -> 200 OK
    res_b_delete = client.delete(
        f"/auth/payout-accounts/{b_acc_id}",
        cookies=auth_b,
        headers=csrf_context["headers"],
    )
    assert res_b_delete.status_code == 200
    assert db_session.query(PayoutAccount).filter(PayoutAccount.id == b_acc_id).first() is None


def test_payout_account_delete_blocked_when_withdrawal_pending(client, create_test_user, db_session, csrf_context):
    """
    Verifies that a user cannot delete a payout account if they have a pending withdrawal.
    """
    user = create_test_user(
        whatsapp_number="+2348033334444",
        password="Password123!",
        known_ip="testclient",
    )
    auth = get_user_auth_cookies(client, user, "Password123!", csrf_context)

    # Create payout account
    res = client.post(
        "/auth/payout-accounts",
        json={"bank": "Kuda", "account_number": "2001122334", "account_name": "Test Holder"},
        cookies=auth,
        headers=csrf_context["headers"],
    )
    acc_id = res.json()["id"]

    # Simulate pending withdrawal for this user with non-null balance fields
    tx = WalletTransaction(
        user_id=user.id,
        amount_kobo=500000,
        balance_before_kobo=500000,
        balance_after_kobo=0,
        type="withdrawal",
        status="pending",
        reference="WTH-TEST-001",
    )
    db_session.add(tx)
    db_session.commit()

    # Attempt to delete payout account -> must be blocked
    del_res = client.delete(
        f"/auth/payout-accounts/{acc_id}",
        cookies=auth,
        headers=csrf_context["headers"],
    )
    assert del_res.status_code == 400
    assert "withdrawal is pending" in del_res.json()["detail"].lower()


# =====================================================================
# 5. PROFILE UPDATE: EXTRA FORBIDDEN, USER BINDING & VALIDATION
# =====================================================================

def test_profile_update_strictness_and_user_binding(client, create_test_user, db_session, csrf_context):
    """
    Verifies that:
    1. Profile update rejects unknown / forbidden fields (e.g. id, phone, wallet_balance_kobo).
    2. Profile update updates the authenticated session user, not spoofed IDs.
    3. Username uniqueness is strictly enforced.
    """
    user_a = create_test_user(
        email="alice@profile.com",
        whatsapp_number="+2348055555555",
        password="AlicePassword1!",
        known_ip="testclient",
    )
    user_b = create_test_user(
        email="bob@profile.com",
        whatsapp_number="+2348066666666",
        password="BobPassword1!",
        known_ip="testclient",
    )
    user_b.username = "bob_official"
    db_session.commit()

    auth_a = get_user_auth_cookies(client, user_a, "AlicePassword1!", csrf_context)

    # 1. Sending forbidden fields (id, phone, wallet_balance_kobo) triggers Pydantic 422
    forbidden_payload = {
        "id": user_b.id,
        "phone": "+2348099999999",
        "wallet_balance_kobo": 100000000,
        "full_name": "Hacker Alice",
    }
    res_forbidden = client.post(
        "/auth/profile",
        json=forbidden_payload,
        cookies=auth_a,
        headers=csrf_context["headers"],
    )
    assert res_forbidden.status_code == 422

    # 2. Trying to claim an existing username fails with 400
    taken_payload = {
        "username": "bob_official",
        "full_name": "Alice In Wonderland",
    }
    res_taken = client.post(
        "/auth/profile",
        json=taken_payload,
        cookies=auth_a,
        headers=csrf_context["headers"],
    )
    assert res_taken.status_code == 400
    assert "already taken" in res_taken.json()["detail"].lower()

    # 3. Valid update succeeds and applies to User A
    valid_payload = {
        "username": "alice_star",
        "full_name": "Alice Star",
        "avatar_color": "#FF5733",
    }
    res_valid = client.post(
        "/auth/profile",
        json=valid_payload,
        cookies=auth_a,
        headers=csrf_context["headers"],
    )
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["username"] == "alice_star"
    assert data["full_name"] == "Alice Star"
    assert data["id"] == user_a.id


# =====================================================================
# 6. ACCOUNT DELETION: DELETE /auth/me GUARDRAILS
# =====================================================================

def test_delete_account_me_guardrails(client, create_test_user, db_session, csrf_context):
    """
    Verifies that:
    1. DELETE /auth/me requires correct current password.
    2. Deletion is blocked if user has a non-zero wallet balance.
    3. Soft deletion marks user is_deleted=True, is_active=False, sets deleted_at,
       revokes sessions, and prevents future login.
    """
    user = create_test_user(
        whatsapp_number="+2348077777777",
        password="DeleteMePass123!",
        known_ip="testclient",
    )
    auth = get_user_auth_cookies(client, user, "DeleteMePass123!", csrf_context)

    # 1. Wrong password -> 400
    res_wrong_pw = client.request(
        "DELETE",
        "/auth/me",
        json={"password": "WrongPassword!"},
        cookies=auth,
        headers=csrf_context["headers"],
    )
    assert res_wrong_pw.status_code == 400
    assert "password confirmation is incorrect" in res_wrong_pw.json()["detail"].lower()

    # 2. Blocked if balance > 0
    user.wallet_balance_kobo = 250000  # ₦2,500.00
    db_session.commit()

    res_balance = client.request(
        "DELETE",
        "/auth/me",
        json={"password": "DeleteMePass123!"},
        cookies=auth,
        headers=csrf_context["headers"],
    )
    assert res_balance.status_code == 400
    assert "balance" in res_balance.json()["detail"].lower()

    # 3. Empty balance -> Successful soft deletion
    user.wallet_balance_kobo = 0
    db_session.commit()

    res_success = client.request(
        "DELETE",
        "/auth/me",
        json={"password": "DeleteMePass123!"},
        cookies=auth,
        headers=csrf_context["headers"],
    )
    assert res_success.status_code == 200
    assert "successfully closed and deleted" in res_success.json()["message"].lower()

    # 4. Check DB record: user is soft deleted, not hard wiped
    db_session.expire_all()
    user_db = db_session.query(User).filter(User.id == user.id).first()
    assert user_db is not None
    assert user_db.is_deleted is True
    assert user_db.is_active is False
    assert user_db.deleted_at is not None

    # 5. Subsequent login with this account is rejected
    res_relogin = client.post(
        "/auth/login",
        json={"identifier": "+2348077777777", "password": "DeleteMePass123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert res_relogin.status_code in (401, 403)


# =====================================================================
# 7. ROUTE COVERAGE TEST: GUARDRAILS FOR ALL API ROUTES
# =====================================================================

def test_route_coverage_auth_dependencies():
    """
    Crawls all routes in the application and asserts that any route not on the
    explicit public allowlist requires authentication (e.g. get_current_user_id).
    """
    from app.main import app
    from app.routers.auth import get_current_user_id

    # Allowlist of routes explicitly intended to be public
    PUBLIC_ALLOWLIST = {
        # System & Health
        "/health",
        "/docs",
        "/docs/oauth2-redirect",
        "/openapi.json",

        # Public Auth Endpoints
        "/auth/csrf",
        "/auth/login",
        "/auth/register",
        "/auth/send-email-otp",
        "/auth/bind-email",
        "/auth/reset-password",  # Interim 503 endpoint
        "/auth/verify-otp",
        "/auth/refresh",
        "/auth/logout",
        "/auth/check-username",
        "/auth/check-phone",
        "/auth/users/avatar-colors",
        "/auth/users/search",
        "/auth/users/verify-counterparty",

        # Dev / Cache tools (clear-cache and /debug/cache-stats are protected by DEBUG flag check)
        "/auth/cache-stats",
        "/auth/reset-rate-limits",
        "/auth/clear-cache",
        "/debug/cache-stats",

        # Webhook endpoints (validated via signature)
        "/webhooks/payment",

        # Pre-payment handshake/invitation routes (occur prior to user authentication)
        "/auth/rooms/invite",
        "/auth/rooms/{room_id}/accept",
        "/auth/rooms/{room_id}/status",
        "/auth/notifications",
        "/auth/pre-payment-rooms",
        "/auth/pre-payment-rooms/{room_id}",
        "/auth/pre-payment-rooms/{room_id}/kill",
        "/auth/pre-payment-rooms/{room_id}/resend",
        "/auth/pre-payment-rooms/{room_id}/proceed",
        "/auth/pre-payment-rooms/{room_id}/accept",
        "/auth/payment-rooms",
        "/auth/payment-rooms/{room_id}",
    }

    all_routes = []

    def crawl_routes(routes):
        for route in routes:
            if isinstance(route, APIRoute):
                all_routes.append(route)
            elif hasattr(route, "original_router") and hasattr(route.original_router, "routes"):
                crawl_routes(route.original_router.routes)
            elif hasattr(route, "routes"):
                crawl_routes(route.routes)

    crawl_routes(app.routes)

    unprotected_routes = []
    for route in all_routes:
        if route.path in PUBLIC_ALLOWLIST:
            continue

        # Check if route has an auth dependency
        deps = [d.call for d in route.dependant.dependencies if hasattr(d, "call")]
        has_auth = get_current_user_id in deps or any("auth" in getattr(d, "__name__", "").lower() for d in deps)

        if not has_auth:
            unprotected_routes.append((route.methods, route.path))

    assert len(unprotected_routes) == 0, (
        f"Found {len(unprotected_routes)} route(s) lacking an authentication dependency: {unprotected_routes}"
    )


# =====================================================================
# 8. MULTI-CLIENT SESSION REVOCATION ON PASSWORD CHANGE
# =====================================================================

def test_change_password_revokes_other_sessions(client, create_test_user, csrf_context):
    """
    Verifies that when a user logs in on two separate clients (Client 1 and Client 2),
    and Client 1 changes their password, Client 2's session is immediately revoked
    and Client 2 receives 401 Unauthorized on its next request.
    """
    user = create_test_user(
        whatsapp_number="+2348088990011",
        password="OriginalPassword123!",
        known_ip="testclient",
    )

    # 1. Client 1 logs in
    login_1 = client.post(
        "/auth/login",
        json={"identifier": "+2348088990011", "password": "OriginalPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert login_1.status_code == 200
    cookies_client_1 = {
        **csrf_context["cookies"],
        "paykudi_access_token": login_1.cookies.get("paykudi_access_token"),
    }

    # 2. Client 2 logs in
    login_2 = client.post(
        "/auth/login",
        json={"identifier": "+2348088990011", "password": "OriginalPassword123!"},
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert login_2.status_code == 200
    cookies_client_2 = {
        **csrf_context["cookies"],
        "paykudi_access_token": login_2.cookies.get("paykudi_access_token"),
    }

    # Verify both clients are initially authenticated
    assert client.get("/auth/me", cookies=cookies_client_1).status_code == 200
    assert client.get("/auth/me", cookies=cookies_client_2).status_code == 200

    # 3. Client 1 changes password
    res_change = client.post(
        "/auth/change-password",
        json={"current_password": "OriginalPassword123!", "new_password": "BrandNewPassword456!"},
        cookies=cookies_client_1,
        headers=csrf_context["headers"],
    )
    assert res_change.status_code == 200

    # 4. Client 1's own session remains valid
    assert client.get("/auth/me", cookies=cookies_client_1).status_code == 200

    # 5. Client 2 MUST be rejected with 401 Unauthorized on its next request
    res_client_2 = client.get("/auth/me", cookies=cookies_client_2)
    assert res_client_2.status_code == 401
    assert "revoked" in res_client_2.json()["detail"].lower()


# =====================================================================
# 9. REDIS-DOWN BEHAVIOR: FAIL-CLOSED RATE LIMITING
# =====================================================================

def test_rate_limiter_fails_closed_when_redis_offline(client, create_test_user, csrf_context):
    """
    Verifies that if Redis becomes unreachable / throws connection errors,
    the RateLimiter fails closed into strict in-memory limiting, counting
    attempts and blocking the IP upon exceeding threshold rather than failing open.
    """
    from app.services.rate_limiter import RateLimiter, set_redis

    class BrokenRedis:
        """Simulates a crashed or unreachable Redis connection."""
        def pipeline(self):
            raise ConnectionError("Redis server connection refused: 6379 offline")
        def ttl(self, key):
            raise ConnectionError("Redis server connection refused: 6379 offline")
        def get(self, key):
            raise ConnectionError("Redis server connection refused: 6379 offline")

    old_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        set_redis(BrokenRedis())

        limiter = RateLimiter()
        test_ip = "198.51.100.99"

        # Even with Redis down, attempts are tracked in RAM and enforced
        allowed_count = 0
        blocked = False
        for i in range(15):
            allowed, remaining, retry_after = limiter.check_ip_rate_limit(test_ip)
            if allowed:
                allowed_count += 1
            else:
                blocked = True
                break

        # Must not fail open! It must block at max 10 attempts
        assert allowed_count == settings.MAX_LOGIN_ATTEMPTS_PER_IP
        assert blocked is True
    finally:
        settings.ENVIRONMENT = old_env
        from app.services.rate_limiter import _fallback_redis
        set_redis(_fallback_redis)


# =====================================================================
# 10. PROXY IP SPOOFING PROTECTION (X-FORWARDED-FOR)
# =====================================================================

def test_proxy_ip_spoofing_prevented():
    """
    Verifies that X-Forwarded-For is strictly ignored if the direct connection
    is from an untrusted peer, preventing attackers from spoofing their IP.
    """
    from app.services.rate_limiter import get_real_client_ip
    from starlette.datastructures import Headers, Address

    class MockRequest:
        def __init__(self, client_ip: str, headers: dict):
            self.client = Address(client_ip, 12345)
            self.headers = Headers(headers)

    # 1. Untrusted direct peer trying to spoof an IP via X-Forwarded-For
    untrusted_req = MockRequest(
        client_ip="203.0.113.195",
        headers={"x-forwarded-for": "10.0.0.1, 127.0.0.1, 8.8.8.8"},
    )
    # MUST return the actual physical peer IP, ignoring the spoofed header
    real_ip = get_real_client_ip(untrusted_req)
    assert real_ip == "203.0.113.195"

    # 2. Trusted proxy (e.g. 127.0.0.1) forwarding real client traffic
    trusted_req = MockRequest(
        client_ip="127.0.0.1",
        headers={"x-forwarded-for": "198.51.100.42"},
    )
    extracted_ip = get_real_client_ip(trusted_req)
    assert extracted_ip == "198.51.100.42"


# =====================================================================
# 11. RE-REGISTRATION POLICY AFTER SOFT DELETION
# =====================================================================

def test_account_deletion_allows_immediate_re_registration(client, create_test_user, db_session, csrf_context):
    """
    Verifies that when a user deletes their account, their phone, email,
    and username are anonymized so that the user (or a recycled number)
    can immediately re-register cleanly without collision errors.
    """
    phone = "+2348099334455"
    username = "re_register_user"
    email = "reregister@paykudi.com"

    user = create_test_user(
        whatsapp_number=phone,
        email=email,
        password="Password123!",
        known_ip="testclient",
    )
    user.username = username
    db_session.commit()

    auth = get_user_auth_cookies(client, user, "Password123!", csrf_context)

    # Delete account
    res_del = client.request(
        "DELETE",
        "/auth/me",
        json={"password": "Password123!"},
        cookies=auth,
        headers=csrf_context["headers"],
    )
    assert res_del.status_code == 200

    # User re-registers immediately with the same phone and username
    res_reg = client.post(
        "/auth/register",
        json={
            "phone": phone,
            "password": "NewFreshPassword123!",
            "email": email,
            "username": username,
            "full_name": "Re-registered User",
        },
        cookies=csrf_context["cookies"],
        headers=csrf_context["headers"],
    )
    assert res_reg.status_code == 200
    assert res_reg.json()["status"] == "success"
    assert res_reg.json()["user"]["whatsapp_number"] == phone
    assert res_reg.json()["user"]["username"] == username


# =====================================================================
# 12. ACTIVE ROOM STATUSES BLOCKING DELETION (DISPUTED, AWAITING_PAYOUT)
# =====================================================================

def test_delete_account_blocked_on_disputed_or_awaiting_payout_room(client, create_test_user, db_session, csrf_context):
    """
    Verifies that active rooms in disputed or awaiting_payout states
    block account deletion for both buyer and seller.
    """
    from app.models import PaymentRoom
    from datetime import datetime, timezone

    buyer = create_test_user(email="buyer_dispute@paykudi.com", whatsapp_number="+2348099556677", password="Pass123!", known_ip="testclient")
    seller = create_test_user(email="seller_dispute@paykudi.com", whatsapp_number="+2348099556688", password="Pass123!", known_ip="testclient")

    auth_buyer = get_user_auth_cookies(client, buyer, "Pass123!", csrf_context)

    # Room in disputed status
    disputed_room = PaymentRoom(
        order_number="ORD-DISPUTE-TEST",
        title="Disputed iPhone",
        amount=500000.0,
        currency="NGN",
        buyer_id=buyer.id,
        seller_id=seller.id,
        status="disputed",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(disputed_room)
    db_session.commit()

    # Buyer tries to delete account -> MUST be blocked
    res_del = client.request(
        "DELETE",
        "/auth/me",
        json={"password": "Pass123!"},
        cookies=auth_buyer,
        headers=csrf_context["headers"],
    )
    assert res_del.status_code == 400
    assert "active payment room" in res_del.json()["detail"].lower()
    assert "disputed" in res_del.json()["detail"].lower()

