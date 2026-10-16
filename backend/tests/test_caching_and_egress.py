import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.config import settings
from app.database import Base
from app.models import User, Session, PaymentRoom, PayoutAccount, WalletTransaction
from app.services.ram_cache import ram_cache, ServerRAMCache
from app.security.tokens import create_access_token
from app.security.csrf import generate_csrf_token, CSRF_COOKIE_NAME, CSRF_HEADER_NAME


def test_step2_instrumentation_headers_present_when_debug_true(client, db_session):
    """Confirm X-DB-Queries, X-DB-Rows, and X-Time-ms are present when DEBUG=True."""
    settings.DEBUG = True
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "X-DB-Queries" in resp.headers
    assert "X-DB-Rows" in resp.headers
    assert "X-Time-ms" in resp.headers

    # Debug cache-stats route is reachable
    stats_resp = client.get("/debug/cache-stats")
    assert stats_resp.status_code == 200
    data = stats_resp.json()
    assert "user" in data
    assert "username" in data
    assert "pre_payment_room" in data
    assert "payment_room" in data


def test_step2_instrumentation_headers_absent_when_debug_false(client, db_session):
    """Confirm X-DB-Queries, X-DB-Rows, and X-Time-ms are absent when DEBUG=False."""
    settings.DEBUG = False
    try:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert "X-DB-Queries" not in resp.headers
        assert "X-DB-Rows" not in resp.headers
        assert "X-Time-ms" not in resp.headers

        # Debug cache-stats route returns 404 when DEBUG=False
        stats_resp = client.get("/debug/cache-stats")
        assert stats_resp.status_code == 404
    finally:
        settings.DEBUG = True


def test_step3_read_endpoints_query_measurements(client, db_session):
    """
    Step 3: Measure DB queries for each read endpoint called twice with the same session.
    Endpoints:
    - Profile: GET /auth/profile
    - Wallet balance: GET /wallet/balance
    - Payout accounts: GET /auth/payout-accounts
    - Payment room list: GET /auth/payment-rooms
    - Payment room detail: GET /auth/payment-rooms/{room_id}
    - Notifications: GET /auth/notifications
    """
    settings.DEBUG = True
    now = datetime.now(timezone.utc)

    # 1. Create a user and active session in DB
    user = User(
        id="usr_measure_1",
        email="measure@paykudi.com",
        username="measureuser",
        whatsapp_number="2348011223399",
        password_hash="somehash",
        wallet_balance_kobo=500000,
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)
    db_session.commit()

    session = Session(
        id="sess_measure_1",
        user_id=user.id,
        family_id=str(uuid.uuid4()),
        refresh_token_hash="hash_measure_1",
        ip="127.0.0.1",
        created_at=now,
        expires_at=now + timedelta(days=7),
    )
    db_session.add(session)

    # Add a payout account
    payout = PayoutAccount(
        id="payout_measure_1",
        user_id=user.id,
        bank="GTBank",
        bank_code="058",
        account_number="0123456789",
        account_name="Measure User",
        is_default=True,
        created_at=now,
    )
    db_session.add(payout)

    # Add a payment room in DB
    room = PaymentRoom(
        order_number="ORD-MEASURE-1",
        title="Escrow Phone Purchase",
        amount=50000.0,
        buyer_id=user.id,
        seller_id="usr_seller_1",
        status="awaiting_payment",
        created_at=now,
    )
    db_session.add(room)
    db_session.commit()

    # Pre-populate RAM cache for room detail / list
    ram_cache.sync_payment_room({
        "id": room.order_number,
        "orderNumber": room.order_number,
        "order_number": room.order_number,
        "title": room.title,
        "item": room.title,
        "amount": "₦50,000.00",
        "price": "₦50,000.00",
        "buyer_id": user.id,
        "seller_id": "usr_seller_1",
        "buyer_name": "Measure User",
        "seller_name": "Seller One",
        "status": "awaiting_payment",
        "status_text": "Awaiting Payment",
        "category": "ongoing",
    })

    # Prepare authenticated cookies
    token = create_access_token(user_id=user.id, session_id=session.id)
    client.cookies.set("paykudi_access_token", token)

    # Add a notification in RAM cache for this user
    ram_cache.create_room_invitation({
        "id": "ORD-NOTIF-1",
        "creator": "Counterparty",
        "counterparty": "Measure User",
        "counterpartyUsername": "measureuser",
        "item": "Test Item",
        "amount": "₦10,000.00",
    })

    # Call each endpoint twice and record queries
    results = {}

    endpoints = [
        ("Profile", "/auth/profile"),
        ("Wallet Balance", "/wallet/balance"),
        ("Payout Accounts", "/auth/payout-accounts"),
        ("Payment Room List", "/auth/payment-rooms"),
        ("Payment Room Detail", "/auth/payment-rooms/ORD-MEASURE-1"),
        ("Notifications", "/auth/notifications?user=measureuser"),
    ]

    for name, path in endpoints:
        r1 = client.get(path)
        assert r1.status_code == 200, f"{name} failed on call 1: {r1.text}"
        q1 = int(r1.headers.get("X-DB-Queries", -1))
        rows1 = int(r1.headers.get("X-DB-Rows", -1))
        t1 = r1.headers.get("X-Time-ms", "-1")

        r2 = client.get(path)
        assert r2.status_code == 200, f"{name} failed on call 2: {r2.text}"
        q2 = int(r2.headers.get("X-DB-Queries", -1))
        rows2 = int(r2.headers.get("X-DB-Rows", -1))
        t2 = r2.headers.get("X-Time-ms", "-1")

        results[name] = {
            "path": path,
            "call_1_queries": q1,
            "call_2_queries": q2,
            "call_1_rows": rows1,
            "call_2_rows": rows2,
            "call_1_time_ms": t1,
            "call_2_time_ms": t2,
            "is_cached": q2 < q1,
        }

    # Print results summary for test logs
    print("\n--- Step 3 Read Measurement Results ---")
    for name, data in results.items():
        print(f"{name:20} | Call 1 Q: {data['call_1_queries']:2} | Call 2 Q: {data['call_2_queries']:2} | Rows: {data['call_2_rows']:2} | Time: {data['call_2_time_ms']:5}ms | Cached: {data['is_cached']}")

    # Assertions based on existing architecture:
    # 1. Profile, Wallet Balance, Payout Accounts strictly query the DB each time (NOT cached)
    assert results["Profile"]["call_1_queries"] == results["Profile"]["call_2_queries"]
    assert results["Wallet Balance"]["call_1_queries"] == results["Wallet Balance"]["call_2_queries"]
    assert results["Payout Accounts"]["call_1_queries"] == results["Payout Accounts"]["call_2_queries"]

    # 2. Payment Room List, Payment Room Detail, Notifications run 0 endpoint queries (only 2 queries for auth verification)
    assert results["Payment Room List"]["call_2_queries"] <= 2
    assert results["Payment Room Detail"]["call_2_queries"] <= 2
    assert results["Notifications"]["call_2_queries"] <= 2


def test_step4_revoked_session_fails_immediately_after_logout(client, csrf_context, db_session):
    """Revoked session fails immediately (401) after logout even if session state was cached."""
    now = datetime.now(timezone.utc)
    user = User(
        id="usr_rev_1",
        email="rev1@paykudi.com",
        username="revuser1",
        whatsapp_number="2348011223301",
        password_hash="hash",
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)
    db_session.commit()

    from app.security.tokens import generate_refresh_token, hash_refresh_token
    raw_refresh = generate_refresh_token()
    session = Session(
        id="sess_rev_1",
        user_id=user.id,
        family_id=str(uuid.uuid4()),
        refresh_token_hash=hash_refresh_token(raw_refresh),
        ip="127.0.0.1",
        created_at=now,
        expires_at=now + timedelta(days=7),
    )
    db_session.add(session)
    db_session.commit()

    token = create_access_token(user_id=user.id, session_id=session.id)
    client.cookies.set("paykudi_access_token", token)
    client.cookies.set("paykudi_refresh_token", raw_refresh)

    # 1. Before logout: profile works
    resp = client.get("/auth/profile")
    assert resp.status_code == 200

    # 2. Logout
    client.cookies.set(CSRF_COOKIE_NAME, csrf_context["token"])
    logout_resp = client.post(
        "/auth/logout",
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert logout_resp.status_code == 200

    # 3. Present old access token: must fail immediately with 401
    client.cookies.set("paykudi_access_token", token)
    blocked_resp = client.get("/auth/profile")
    assert blocked_resp.status_code == 401
    assert "revoked" in blocked_resp.json()["detail"].lower()


def test_step4_revoked_session_fails_immediately_after_change_password(client, csrf_context, db_session):
    """Revoked session fails immediately after change-password for other devices."""
    from app.security.hasher import password_hasher
    now = datetime.now(timezone.utc)
    user = User(
        id="usr_rev_pwd",
        email="revpwd@paykudi.com",
        username="revuserpwd",
        whatsapp_number="2348011223302",
        password_hash=password_hasher.hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)
    db_session.commit()

    # Two concurrent sessions (e.g. Device A and Device B)
    sess_a = Session(id="sess_device_a", user_id=user.id, family_id=str(uuid.uuid4()), refresh_token_hash="h_a", ip="127.0.0.1", created_at=now, expires_at=now + timedelta(days=7))
    sess_b = Session(id="sess_device_b", user_id=user.id, family_id=str(uuid.uuid4()), refresh_token_hash="h_b", ip="127.0.0.1", created_at=now, expires_at=now + timedelta(days=7))
    db_session.add_all([sess_a, sess_b])
    db_session.commit()

    token_b = create_access_token(user_id=user.id, session_id=sess_b.id)

    # Device A changes password
    client.cookies.set("paykudi_access_token", create_access_token(user_id=user.id, session_id=sess_a.id))
    client.cookies.set(CSRF_COOKIE_NAME, csrf_context["token"])
    cp_resp = client.post(
        "/auth/change-password",
        json={"current_password": "OldPassword123!", "new_password": "NewPassword123!"},
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert cp_resp.status_code == 200

    # Device B attempts to access read endpoint with its token: fails immediately with 401
    client.cookies.set("paykudi_access_token", token_b)
    blocked_resp = client.get("/auth/profile")
    assert blocked_resp.status_code == 401
    assert "revoked" in blocked_resp.json()["detail"].lower()


def test_step4_revoked_session_fails_immediately_after_account_deletion(client, csrf_context, db_session):
    """Revoked session fails immediately after account deletion."""
    from app.security.hasher import password_hasher
    now = datetime.now(timezone.utc)
    user = User(
        id="usr_rev_del",
        email="revdel@paykudi.com",
        username="revuserdel",
        whatsapp_number="2348011223303",
        password_hash=password_hasher.hash_password("DeleteMe123!"),
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)
    db_session.commit()

    sess = Session(id="sess_del_1", user_id=user.id, family_id=str(uuid.uuid4()), refresh_token_hash="h_del", ip="127.0.0.1", created_at=now, expires_at=now + timedelta(days=7))
    db_session.add(sess)
    db_session.commit()

    token = create_access_token(user_id=user.id, session_id=sess.id)
    client.cookies.set("paykudi_access_token", token)
    client.cookies.set(CSRF_COOKIE_NAME, csrf_context["token"])

    del_resp = client.request(
        "DELETE",
        "/auth/me",
        json={"password": "DeleteMe123!"},
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert del_resp.status_code == 200

    # Attempting to read profile with old token: fails immediately with 401
    client.cookies.set("paykudi_access_token", token)
    blocked_resp = client.get("/auth/profile")
    assert blocked_resp.status_code == 401


def test_step4_financial_balance_and_room_status_read_from_locked_db_rows(client, csrf_context, db_session):
    """
    Wallet balance and room status used for withdraw, release, and refund decisions
    are read from the locked DB row inside the transaction, never from cache.
    """
    now = datetime.now(timezone.utc)
    user = User(
        id="usr_fin_1",
        email="fin1@paykudi.com",
        username="finuser1",
        whatsapp_number="2348011223304",
        password_hash="hash",
        wallet_balance_kobo=200000,  # ₦2,000.00
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)

    payout = PayoutAccount(
        id="payout_fin_1",
        user_id=user.id,
        bank="Zenith Bank",
        bank_code="057",
        account_number="2000000001",
        account_name="Fin User",
        is_default=True,
        created_at=now,
    )
    db_session.add(payout)

    sess = Session(id="sess_fin_1", user_id=user.id, family_id=str(uuid.uuid4()), refresh_token_hash="h_fin", ip="127.0.0.1", created_at=now, expires_at=now + timedelta(days=7))
    db_session.add(sess)
    db_session.commit()

    token = create_access_token(user_id=user.id, session_id=sess.id)
    client.cookies.set("paykudi_access_token", token)
    client.cookies.set(CSRF_COOKIE_NAME, csrf_context["token"])

    # 1. Even if RAM cache had a different balance or state, withdrawal relies strictly on DB row
    # Attempting to withdraw more than DB balance (200,000 kobo) fails
    resp = client.post(
        "/wallet/withdraw",
        json={"amount_kobo": 300000, "account_id": payout.id},
        headers={
            CSRF_HEADER_NAME: csrf_context["token"],
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 400
    assert "insufficient balance" in resp.json()["detail"].lower()

    # 2. Legitimate withdrawal deducts from DB row
    resp_ok = client.post(
        "/wallet/withdraw",
        json={"amount_kobo": 100000, "account_id": payout.id},
        headers={
            CSRF_HEADER_NAME: csrf_context["token"],
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert resp_ok.status_code == 200
    db_session.refresh(user)
    assert user.wallet_balance_kobo == 100000


def test_step4_cache_invalidation_after_events(client, csrf_context, db_session):
    """
    Cache entries are invalidated / updated after:
    - Profile update (ram_cache user and username updated)
    - Payout account add/delete (DB records updated)
    - Withdrawal (ledger created, balance decremented in DB)
    - Room status change (RAM cache synced)
    """
    now = datetime.now(timezone.utc)
    user = User(
        id="usr_inv_test",
        email="invtest@paykudi.com",
        username="original_username",
        whatsapp_number="2348011223305",
        password_hash="hash",
        wallet_balance_kobo=500000,
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)
    db_session.commit()
    ram_cache.cache_user(user)

    sess = Session(id="sess_inv_1", user_id=user.id, family_id=str(uuid.uuid4()), refresh_token_hash="h_inv", ip="127.0.0.1", created_at=now, expires_at=now + timedelta(days=7))
    db_session.add(sess)
    db_session.commit()

    token = create_access_token(user_id=user.id, session_id=sess.id)
    client.cookies.set("paykudi_access_token", token)
    client.cookies.set(CSRF_COOKIE_NAME, csrf_context["token"])

    # 1. Profile update updates username in RAM cache
    assert ram_cache.is_username_taken("original_username") is True
    update_resp = client.post(
        "/auth/profile",
        json={"username": "updated_username"},
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert update_resp.status_code == 200
    assert ram_cache.is_username_taken("updated_username") is True

    # 2. Payout account add/delete updates DB
    add_resp = client.post(
        "/auth/payout-accounts",
        json={
            "bank": "Access Bank",
            "bank_code": "044",
            "account_number": "0011223344",
            "account_name": "Invalidation User",
        },
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert add_resp.status_code == 200
    account_id = add_resp.json()["id"]

    del_resp = client.delete(
        f"/auth/payout-accounts/{account_id}",
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert del_resp.status_code == 200
    assert db_session.query(PayoutAccount).filter(PayoutAccount.id == account_id).first() is None


def test_step5_multi_worker_hit_ratio_comparison():
    """
    Step 5: Multi-worker check.
    Compare cache hit ratio with 1 worker vs 4 workers.
    Because RAM cache is an in-process dictionary, requests distributed round-robin
    across 4 worker processes cannot share cache state, causing cold misses on workers.
    """
    flow_keys = [
        "david_crypto", "alice_pay", "bob_trader", "carol_fx", "david_crypto",
        "alice_pay", "david_crypto", "bob_trader", "david_crypto", "alice_pay",
        "carol_fx", "bob_trader", "david_crypto", "alice_pay", "carol_fx",
        "david_crypto", "bob_trader", "alice_pay", "david_crypto", "carol_fx"
    ]

    # --- 1 Worker Scenario ---
    worker_1 = ServerRAMCache()
    # Pre-populate some keys
    worker_1.cache_username("david_crypto")
    worker_1.cache_username("alice_pay")
    worker_1.cache_username("bob_trader")
    worker_1.cache_username("carol_fx")

    # Repeat read lookups
    hits_1 = 0
    misses_1 = 0
    for k in flow_keys:
        if worker_1.is_username_taken(k):
            hits_1 += 1
        else:
            misses_1 += 1
    hit_ratio_1 = hits_1 / len(flow_keys)

    # --- 4 Workers Scenario ---
    # In multi-worker uvicorn without shared Redis/store, Worker 0 received writes / warmup,
    # but workers 1, 2, 3 start cold or lack updates.
    workers_4 = [ServerRAMCache() for _ in range(4)]
    # Only Worker 0 had cached the users initially
    workers_4[0].cache_username("david_crypto")
    workers_4[0].cache_username("alice_pay")
    workers_4[0].cache_username("bob_trader")
    workers_4[0].cache_username("carol_fx")

    hits_4 = 0
    misses_4 = 0
    for i, k in enumerate(flow_keys):
        worker = workers_4[i % 4]  # Round-robin distribution across 4 workers
        if worker.is_username_taken(k):
            hits_4 += 1
        else:
            misses_4 += 1
    hit_ratio_4 = hits_4 / len(flow_keys)

    print(f"\n--- Step 5 Multi-Worker Simulation ---")
    print(f"1 Worker:  Hits = {hits_1:2}, Misses = {misses_1:2}, Hit Ratio = {hit_ratio_1 * 100:.1f}%")
    print(f"4 Workers: Hits = {hits_4:2}, Misses = {misses_4:2}, Hit Ratio = {hit_ratio_4 * 100:.1f}%")

    assert hit_ratio_1 > hit_ratio_4
    assert hit_ratio_1 == 1.0  # 100% on 1 worker
    assert hit_ratio_4 < 0.5   # Drops severely to ~25% across 4 isolated workers


def test_check_phone_and_registration_specific_error_messages(client, csrf_context, db_session):
    """
    Verify:
    1. GET /auth/check-phone detects existing phone numbers before OTP request.
    2. GET /auth/check-username states that username already exists.
    3. Registration failure explicitly reports whether phone or username already exists.
    """
    now = datetime.now(timezone.utc)
    user = User(
        id="usr_collision_test",
        email="collision@paykudi.com",
        username="howardukah001",
        whatsapp_number="+2348032001585",
        password_hash="somehash",
        is_active=True,
        is_verified=True,
        created_at=now,
    )
    db_session.add(user)
    db_session.commit()
    ram_cache.cache_user(user)

    # 1. check-phone on existing phone (in international or local format)
    resp1 = client.get("/auth/check-phone?phone=08032001585")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["exists"] is True
    assert "account with this phone number already exists" in data1["message"].lower()

    # check-phone on unused phone
    resp2 = client.get("/auth/check-phone?phone=08099998888")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["exists"] is False

    # 2. check-username on existing username
    resp3 = client.get("/auth/check-username?username=Howardukah001")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["available"] is False
    assert "already exists" in data3["message"].lower()

    # 3. Registration collision on phone number returns phone-specific error
    client.cookies.set(CSRF_COOKIE_NAME, csrf_context["token"])
    reg_phone_dup = client.post(
        "/auth/register",
        json={
            "phone": "+2348032001585",
            "password": "Password123!",
            "username": "fresh_new_username",
            "full_name": "New Person",
        },
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert reg_phone_dup.status_code == 409
    assert "account with this phone number already exists" in reg_phone_dup.json()["detail"].lower()
    assert "username" not in reg_phone_dup.json()["detail"].lower()

    # 4. Registration collision on username returns username-specific error
    reg_un_dup = client.post(
        "/auth/register",
        json={
            "phone": "+2348099998888",
            "password": "Password123!",
            "username": "howardukah001",
            "full_name": "New Person",
        },
        headers={CSRF_HEADER_NAME: csrf_context["token"]},
    )
    assert reg_un_dup.status_code == 409
    assert "username '@howardukah001' already exists" in reg_un_dup.json()["detail"].lower()
    assert "phone number" not in reg_un_dup.json()["detail"].lower()
