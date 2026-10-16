import pytest
from datetime import datetime, timezone, timedelta
from app.models import User, PaymentRoom, PrePaymentRoom, Session
from app.services.ram_cache import ram_cache
from app.security.tokens import create_access_token


def _create_authenticated_user(client, db_session, user_id, username, full_name, phone, email):
    now = datetime.now(timezone.utc)
    user = db_session.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            username=username,
            full_name=full_name,
            whatsapp_number=phone,
            email=email,
            password_hash="argon2id$testhash",
            is_active=True,
            is_verified=True,
            avatar_color="#0d9488",
            created_at=now,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    sess_id = f"sess_{user_id}"
    sess = db_session.query(Session).filter(Session.id == sess_id).first()
    if not sess:
        sess = Session(
            id=sess_id,
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
    return user


def _set_caller(client, user_id, session_id=None):
    sess_id = session_id or f"sess_{user_id}"
    token = create_access_token(user_id=user_id, session_id=sess_id)
    client.cookies.set("paykudi_access_token", token)


def test_participant_scoping_and_anti_probing_404(client, db_session):
    """
    User A and User B share a room.
    User C cannot list it, open it, read its status, or see its notifications.
    Each returns an empty list or 404 (never 403).
    """
    user_a = _create_authenticated_user(client, db_session, "usr_a", "alice", "Alice Wonder", "+2348011111111", "alice@paykudi.com")
    user_b = _create_authenticated_user(client, db_session, "usr_b", "bob", "Bob Builder", "+2348022222222", "bob@paykudi.com")
    user_c = _create_authenticated_user(client, db_session, "usr_c", "charlie", "Charlie Brown", "+2348033333333", "charlie@paykudi.com")

    # Create a pre-payment room between User A (creator/buyer) and User B (counterparty/seller)
    pre_room_data = {
        "id": "PRE-AB-100",
        "order_number": "PRE-AB-100",
        "orderNumber": "PRE-AB-100",
        "title": "MacBook Pro M3",
        "item": "MacBook Pro M3",
        "amount": "₦1,500,000",
        "price": "₦1,500,000",
        "role": "Buying",
        "creator": "Alice Wonder",
        "creator_id": "usr_a",
        "creator_username": "alice",
        "creator_phone": "+2348011111111",
        "counterparty": "Bob Builder",
        "counterparty_username": "bob",
        "counterparty_phone": "+2348022222222",
        "buyer_id": "usr_a",
        "seller_id": "usr_b",
        "status": "pending_invite",
        "status_text": "Invite Sent",
        "counterparty_joined": False,
    }
    ram_cache.create_pre_payment_room(pre_room_data)

    # Add notification for Bob
    notif_bob = {
        "id": "notif_bob_1",
        "type": "room_invitation",
        "room_id": "PRE-AB-100",
        "title": "Room Invite",
        "message": "Alice invited you",
        "creator": "Alice Wonder",
        "counterparty": "Bob Builder",
        "status": "pending",
        "accepted": False,
    }
    with ram_cache._lock:
        ram_cache._notifications["bob"] = [notif_bob]
        ram_cache._notifications["2348022222222"] = [notif_bob]

    # Create an active payment room between User A and User B
    pay_room_data = {
        "id": "ORD-AB-200",
        "order_number": "ORD-AB-200",
        "orderNumber": "ORD-AB-200",
        "title": "iPhone 16 Pro",
        "item": "iPhone 16 Pro",
        "amount": 1200000,
        "price": "₦1,200,000",
        "buyer_id": "usr_a",
        "seller_id": "usr_b",
        "buyer_name": "Alice Wonder",
        "seller_name": "Bob Builder",
        "status": "awaiting_payment",
        "status_text": "Awaiting Payment",
        "category": "escrow",
    }
    ram_cache.sync_payment_room(pay_room_data)

    # 1. User A lists rooms -> sees both
    _set_caller(client, "usr_a")
    res_a_pre = client.get("/auth/pre-payment-rooms")
    assert res_a_pre.status_code == 200
    assert any(r["id"] == "PRE-AB-100" for r in res_a_pre.json()["rooms"])

    res_a_pay = client.get("/auth/payment-rooms")
    assert res_a_pay.status_code == 200
    assert any(r["order_number"] == "ORD-AB-200" for r in res_a_pay.json()["rooms"])

    # 2. User B (counterparty) opens rooms and sees notification
    _set_caller(client, "usr_b")
    res_b_pre = client.get("/auth/pre-payment-rooms/PRE-AB-100")
    assert res_b_pre.status_code == 200
    assert res_b_pre.json()["room"]["id"] == "PRE-AB-100"

    res_b_pay = client.get("/auth/payment-rooms/ORD-AB-200")
    assert res_b_pay.status_code == 200
    assert res_b_pay.json()["room"]["order_number"] == "ORD-AB-200"

    res_b_status = client.get("/auth/rooms/PRE-AB-100/status")
    assert res_b_status.status_code == 200

    res_b_notif = client.get("/auth/notifications")
    assert res_b_notif.status_code == 200
    assert len(res_b_notif.json()["notifications"]) > 0

    # 3. User C (unauthorized caller) attempts to access User A & B's rooms
    _set_caller(client, "usr_c")

    # Cannot list pre-payment rooms
    res_c_pre_list = client.get("/auth/pre-payment-rooms")
    assert res_c_pre_list.status_code == 200
    assert len(res_c_pre_list.json()["rooms"]) == 0

    # Cannot list payment rooms
    res_c_pay_list = client.get("/auth/payment-rooms")
    assert res_c_pay_list.status_code == 200
    assert len(res_c_pay_list.json()["rooms"]) == 0

    # Cannot open pre-payment room -> MUST return 404 (not 403)
    res_c_pre_detail = client.get("/auth/pre-payment-rooms/PRE-AB-100")
    assert res_c_pre_detail.status_code == 404
    assert res_c_pre_detail.json()["detail"] == "Pre-payment room not found"

    # Cannot open payment room -> MUST return 404 (not 403)
    res_c_pay_detail = client.get("/auth/payment-rooms/ORD-AB-200")
    assert res_c_pay_detail.status_code == 404
    assert res_c_pay_detail.json()["detail"] == "Payment room not found"

    # Cannot check room status -> MUST return 404 (not 403)
    res_c_status = client.get("/auth/rooms/PRE-AB-100/status")
    assert res_c_status.status_code == 404
    assert res_c_status.json()["detail"] == "Room not found"

    # Cannot see notifications for User B
    res_c_notif = client.get("/auth/notifications")
    assert res_c_notif.status_code == 200
    assert len(res_c_notif.json()["notifications"]) == 0


def test_cannot_enumerate_rooms_by_guessing_order_numbers(client, db_session):
    """
    Attempting to guess order numbers or probe room IDs always returns 404.
    """
    _create_authenticated_user(client, db_session, "usr_attacker", "attacker", "Evil Attacker", "+2348099999999", "attacker@evil.com")
    _set_caller(client, "usr_attacker")

    probes = [
        "ORD-000001",
        "ORD-123456",
        "ORD-999999",
        "PRE-NONEXISTENT",
        "00000000-0000-0000-0000-000000000000",
    ]

    for probe in probes:
        r_pay = client.get(f"/auth/payment-rooms/{probe}")
        assert r_pay.status_code == 404

        r_pre = client.get(f"/auth/pre-payment-rooms/{probe}")
        assert r_pre.status_code == 404

        r_status = client.get(f"/auth/rooms/{probe}/status")
        assert r_status.status_code == 404


def test_search_and_verify_counterparty_minimal_fields_only(client, db_session):
    """
    Search results, verify-counterparty, and avatar-colors return minimal fields only:
    id, username, full_name, avatar_color.
    No phone, email, balance, account_id, or hashes.
    """
    target = _create_authenticated_user(
        client, db_session, "usr_target_1", "targetuser", "Target Confidential", "+2348087654321", "confidential@paykudi.com"
    )
    # Give user a balance in DB
    target.wallet_balance_kobo = 500000000
    db_session.commit()
    ram_cache.cache_user(target)

    # Caller
    _create_authenticated_user(client, db_session, "usr_caller_1", "caller01", "Caller One", "+2348011223344", "caller1@paykudi.com")
    _set_caller(client, "usr_caller_1")

    forbidden_fields = {
        "email",
        "whatsapp_number",
        "phone",
        "password_hash",
        "wallet_balance_kobo",
        "balance",
        "account_id",
        "counterparty_account_id",
        "failed_attempts",
        "lock_count",
    }

    # 1. Search Users
    res_search = client.get("/auth/users/search?q=targetuser")
    assert res_search.status_code == 200
    users = res_search.json()["users"]
    assert len(users) >= 1
    for u in users:
        assert "id" in u
        assert "username" in u
        assert "avatar_color" in u
        for field in forbidden_fields:
            assert field not in u, f"Sensitive field '{field}' leaked in search response!"

    # 2. Verify Counterparty
    res_verify = client.get("/auth/users/verify-counterparty?q=targetuser")
    assert res_verify.status_code == 200
    cp_user = res_verify.json()["user"]
    assert cp_user is not None
    assert "id" in cp_user
    assert "username" in cp_user
    assert "avatar_color" in cp_user
    for field in forbidden_fields:
        assert field not in cp_user, f"Sensitive field '{field}' leaked in verify-counterparty response!"

    # 3. Avatar Colors Directory
    res_avatars = client.get("/auth/users/avatar-colors")
    assert res_avatars.status_code == 200
    avatar_list = res_avatars.json()["users"]
    assert len(avatar_list) >= 1
    for item in avatar_list:
        assert "id" in item
        assert "username" in item
        assert "avatar_color" in item
        for field in forbidden_fields:
            assert field not in item, f"Sensitive field '{field}' leaked in avatar-colors response!"


def test_rate_limiting_on_search_and_verify(client, db_session):
    """
    Search and verify-counterparty are rate limited (30 requests/min per user).
    Exceeding limit returns 429 Too Many Requests with Retry-After header.
    """
    _create_authenticated_user(client, db_session, "usr_rate_test", "ratetest", "Rate Tester", "+2348077777777", "rate@paykudi.com")
    _set_caller(client, "usr_rate_test")

    # Send 30 requests -> all should succeed
    for _ in range(30):
        r = client.get("/auth/users/search?q=test")
        assert r.status_code == 200

    # 31st request should be rate limited
    r_blocked = client.get("/auth/users/search?q=test")
    assert r_blocked.status_code == 429
    assert "Retry-After" in r_blocked.headers


def test_pagination_caps_max_page_size(client, db_session):
    """
    Pagination caps results: default 20, max 50. Requests exceeding 50 are rejected or capped.
    Cursor pagination works correctly.
    """
    user = _create_authenticated_user(client, db_session, "usr_pag_1", "paguser", "Pagination User", "+2348066666666", "pag@paykudi.com")
    _set_caller(client, "usr_pag_1")

    # Populate 35 payment rooms in RAM
    for i in range(1, 36):
        order_num = f"ORD-PAG-{i:03d}"
        room = {
            "id": order_num,
            "order_number": order_num,
            "orderNumber": order_num,
            "title": f"Item {i}",
            "amount": 1000 * i,
            "price": f"₦{1000 * i}",
            "buyer_id": "usr_pag_1",
            "seller_id": "usr_other",
            "status": "awaiting_payment",
            "status_text": "Awaiting Payment",
        }
        ram_cache.sync_payment_room(room)

    # 1. Default pagination returns at most 20 items
    r_default = client.get("/auth/payment-rooms")
    assert r_default.status_code == 200
    rooms_default = r_default.json()["rooms"]
    assert len(rooms_default) == 20
    next_cursor = r_default.json()["next_cursor"]
    assert next_cursor is not None

    # 2. Next page with cursor returns remaining 15 items
    r_page2 = client.get(f"/auth/payment-rooms?cursor={next_cursor}")
    assert r_page2.status_code == 200
    rooms_page2 = r_page2.json()["rooms"]
    assert len(rooms_page2) == 15
    assert r_page2.json()["next_cursor"] is None

    # 3. Limit parameter exceeding 50 is rejected with 422 validation error
    r_excess = client.get("/auth/payment-rooms?limit=51")
    assert r_excess.status_code == 422


def test_ram_path_and_db_path_consistency(client, db_session):
    """
    The RAM path and the DB path return identical, correctly scoped results.
    """
    user_me = _create_authenticated_user(client, db_session, "usr_sync_1", "syncuser", "Sync User", "+2348055555555", "sync@paykudi.com")
    user_other = _create_authenticated_user(client, db_session, "usr_sync_other", "syncother", "Other User", "+2348044444444", "other@paykudi.com")

    # Insert 3 rooms into DB:
    # 2 where user_me is participant, 1 where user_me is NOT participant
    r1 = PaymentRoom(
        order_number="DB-ROOM-001",
        title="Escrow Trade 1",
        amount=100000.0,
        buyer_id="usr_sync_1",
        seller_id="usr_sync_other",
        status="active",
    )
    r2 = PaymentRoom(
        order_number="DB-ROOM-002",
        title="Escrow Trade 2",
        amount=250000.0,
        buyer_id="usr_sync_other",
        seller_id="usr_sync_1",
        status="active",
    )
    r3 = PaymentRoom(
        order_number="DB-ROOM-003",
        title="Private Room Other Users",
        amount=500000.0,
        buyer_id="usr_sync_other",
        seller_id="usr_stranger",
        status="active",
    )
    db_session.add_all([r1, r2, r3])
    db_session.commit()

    _set_caller(client, "usr_sync_1")

    # 1. DB path test: RAM cache has no payment rooms
    with ram_cache._lock:
        ram_cache._payment_rooms.clear()

    res_db = client.get("/auth/payment-rooms")
    assert res_db.status_code == 200
    db_results = res_db.json()["rooms"]
    assert len(db_results) == 2
    order_nums_db = {r["order_number"] for r in db_results}
    assert order_nums_db == {"DB-ROOM-001", "DB-ROOM-002"}
    assert "DB-ROOM-003" not in order_nums_db

    # 2. RAM path test: now populated into RAM cache
    res_ram = client.get("/auth/payment-rooms")
    assert res_ram.status_code == 200
    ram_results = res_ram.json()["rooms"]
    assert len(ram_results) == 2
    order_nums_ram = {r["order_number"] for r in ram_results}
    assert order_nums_ram == {"DB-ROOM-001", "DB-ROOM-002"}
    assert "DB-ROOM-003" not in order_nums_ram

    # Compare exact scoping equivalence
    assert order_nums_db == order_nums_ram
    assert [r["order_number"] for r in db_results] == [r["order_number"] for r in ram_results]
