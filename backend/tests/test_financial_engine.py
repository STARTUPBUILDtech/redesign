import pytest
from app.models import User, PayoutAccount, PaymentRoom, WalletTransaction
from app.security.hasher import password_hasher
from app.security.tokens import create_access_token


@pytest.fixture
def test_buyer(db_session):
    u = User(
        email="buyer@test.com",
        whatsapp_number="+2348011111111",
        password_hash=password_hasher.hash_password("password123"),
        is_verified=True,
        full_name="Buyer User",
        username="buyer_user",
        wallet_balance_kobo=1000000,  # ₦10,000.00
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def test_seller(db_session):
    u = User(
        email="seller@test.com",
        whatsapp_number="+2348022222222",
        password_hash=password_hasher.hash_password("password123"),
        is_verified=True,
        full_name="Seller User",
        username="seller_user",
        wallet_balance_kobo=0,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def test_payout_account(db_session, test_buyer):
    acc = PayoutAccount(
        user_id=test_buyer.id,
        bank="Kuda Bank",
        bank_code="kuda",
        account_number="2001948291",
        account_name="Buyer User",
        is_default=True,
    )
    db_session.add(acc)
    db_session.commit()
    db_session.refresh(acc)
    return acc


@pytest.fixture
def test_escrow_room(db_session, test_buyer, test_seller):
    room = PaymentRoom(
        order_number="ORD-TEST-8888",
        title="MacBook Pro M3",
        amount=50000.0,  # ₦50,000.00
        currency="NGN",
        buyer_id=test_buyer.id,
        seller_id=test_seller.id,
        status="delivered",
    )
    db_session.add(room)
    db_session.commit()
    db_session.refresh(room)
    return room


def test_get_wallet_balance(client, test_buyer):
    token = create_access_token(test_buyer.id)
    res = client.get(
        "/wallet/balance",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["wallet_balance_kobo"] == 1000000
    assert data["wallet_balance_naira"] == 10000.0
    assert "₦10,000.00" in data["formatted"]


def test_withdraw_requires_idempotency_key(client, test_buyer, test_payout_account, csrf_context):
    token = create_access_token(test_buyer.id)
    headers = {
        "Authorization": f"Bearer {token}",
        **csrf_context["headers"],
    }
    client.cookies.update(csrf_context["cookies"])
    res = client.post(
        "/wallet/withdraw",
        json={"amount_kobo": 500000, "account_id": test_payout_account.id},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Idempotency-Key" in res.json()["detail"]


def test_withdraw_over_balance_fails(client, test_buyer, test_payout_account, csrf_context):
    token = create_access_token(test_buyer.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "IDEM-OVER-BALANCE-1",
        **csrf_context["headers"],
    }
    client.cookies.update(csrf_context["cookies"])
    res = client.post(
        "/wallet/withdraw",
        json={"amount_kobo": 200000000, "account_id": test_payout_account.id},  # ₦2,000,000 > ₦10,000
        headers=headers,
    )
    assert res.status_code == 400
    assert "Insufficient balance" in res.json()["detail"]


def test_withdraw_successful_and_idempotent(client, test_buyer, test_payout_account, db_session, csrf_context):
    token = create_access_token(test_buyer.id)
    idem_key = "IDEM-WITHDRAW-SUCCESS-1"
    payload = {"amount_kobo": 500000, "account_id": test_payout_account.id}  # ₦5,000
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": idem_key,
        **csrf_context["headers"],
    }
    client.cookies.update(csrf_context["cookies"])

    # 1. First execution
    res1 = client.post(
        "/wallet/withdraw",
        json=payload,
        headers=headers,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["new_balance_kobo"] == 500000
    assert "PO-" in data1["tx_ref"]

    # Verify balance in database
    db_session.refresh(test_buyer)
    assert test_buyer.wallet_balance_kobo == 500000

    # 2. Replay with SAME idempotency key returns exact same response without re-deducting
    res2 = client.post(
        "/wallet/withdraw",
        json=payload,
        headers=headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["tx_ref"] == data1["tx_ref"]

    # Balance must remain 500,000 kobo (not 0)
    db_session.refresh(test_buyer)
    assert test_buyer.wallet_balance_kobo == 500000


def test_escrow_release_non_buyer_rejected(client, test_seller, test_escrow_room, csrf_context):
    token = create_access_token(test_seller.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "IDEM-SELLER-RELEASE-FAIL",
        **csrf_context["headers"],
    }
    client.cookies.update(csrf_context["cookies"])
    res = client.post(
        f"/payment-rooms/{test_escrow_room.order_number}/release",
        headers=headers,
    )
    assert res.status_code == 403
    assert "buyer" in res.json()["detail"]


def test_escrow_release_buyer_success(client, test_buyer, test_seller, test_escrow_room, db_session, csrf_context):
    token = create_access_token(test_buyer.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "IDEM-ESCROW-RELEASE-1",
        **csrf_context["headers"],
    }
    client.cookies.update(csrf_context["cookies"])
    res = client.post(
        f"/payment-rooms/{test_escrow_room.order_number}/release",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["seller_credit_kobo"] > 0

    # Verify seller balance received credit
    db_session.refresh(test_seller)
    assert test_seller.wallet_balance_kobo == data["seller_credit_kobo"]

    # Verify room status is completed
    db_session.refresh(test_escrow_room)
    assert test_escrow_room.status == "completed"

    # Attempting to release a second time is rejected
    headers_repeat = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "IDEM-ESCROW-RELEASE-REPEAT",
        **csrf_context["headers"],
    }
    res_repeat = client.post(
        f"/payment-rooms/{test_escrow_room.order_number}/release",
        headers=headers_repeat,
    )
    assert res_repeat.status_code == 400
