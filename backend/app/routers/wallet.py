import hmac
import hashlib
import random
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, Header, status
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import text

from app.config import settings
from app.database import get_db, engine
from app.models import (
    User,
    PayoutAccount,
    WalletTransaction,
    AuditLog,
    ProviderEvent,
    PaymentRoom,
    utc_now,
)
from app.schemas import (
    WalletBalanceOut,
    WithdrawRequest,
    WithdrawResponse,
    MessageResponse,
)
from app.routers.auth import get_current_user_id
from app.security.csrf import verify_csrf_token
from app.services.idempotency import check_idempotency, record_idempotency
from app.services.ram_cache import ram_cache

router = APIRouter(tags=["Financial & Wallet Engine"])

# Configured payout limits (in kobo: 1 NGN = 100 kobo)
MAX_PER_TX_KOBO = 5_000_000 * 100  # ₦5,000,000
MIN_PER_TX_KOBO = 100 * 100        # ₦100
DEFAULT_PAYOUT_FEE_KOBO = 50 * 100 # ₦50 standard interbank fee


def format_naira(kobo: int) -> str:
    naira = (kobo or 0) / 100.0
    return f"₦{naira:,.2f}"


# ──────────────────────────────────────────────────────────────
# 1. GET /wallet/balance & /auth/wallet/balance
# ──────────────────────────────────────────────────────────────
@router.get("/wallet/balance", response_model=WalletBalanceOut)
@router.get("/auth/wallet/balance", response_model=WalletBalanceOut)
def get_wallet_balance(
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
):
    """
    Returns the authenticated user's verified server balance.
    Server is the single source of truth (users.wallet_balance_kobo).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    kobo = int(user.wallet_balance_kobo or 0)
    return WalletBalanceOut(
        wallet_balance_kobo=kobo,
        wallet_balance_naira=kobo / 100.0,
        formatted=format_naira(kobo),
    )


# ──────────────────────────────────────────────────────────────
# 2. POST /wallet/withdraw & /auth/wallet/withdraw (Two-Stage Payout)
# ──────────────────────────────────────────────────────────────
@router.post("/wallet/withdraw", response_model=WithdrawResponse)
@router.post("/auth/wallet/withdraw", response_model=WithdrawResponse)
def withdraw_funds(
    req: WithdrawRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user_id: str = Depends(get_current_user_id),
    db: DbSession = Depends(get_db),
    _csrf: bool = Depends(verify_csrf_token),
):
    """
    Stage 1 Payout:
    - Enforces Idempotency-Key to prevent double-payouts
    - Verifies account ownership and cooling period
    - Acquires row-level database lock
    - Atomically deducts user wallet balance
    - Writes immutable 'pending' withdrawal ledger entry
    Stage 2 is completed asynchronously via payment provider webhook.
    """
    # 1. Idempotency replay check
    cached = check_idempotency(
        db=db,
        key=idempotency_key,
        user_id=user_id,
        endpoint="/wallet/withdraw",
        request_data=req.model_dump(),
    )
    if cached:
        status_code, body = cached
        return WithdrawResponse(**body)

    # 2. Amount validations
    if req.amount_kobo <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal amount must be greater than zero.",
        )
    if req.amount_kobo < MIN_PER_TX_KOBO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum withdrawal amount is {format_naira(MIN_PER_TX_KOBO)}.",
        )
    if req.amount_kobo > MAX_PER_TX_KOBO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Withdrawal amount exceeds per-transaction limit of {format_naira(MAX_PER_TX_KOBO)}.",
        )

    # 3. Payout account checks & cooling period
    account = (
        db.query(PayoutAccount)
        .filter(PayoutAccount.id == req.account_id, PayoutAccount.user_id == user_id)
        .first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designated payout account does not exist or does not belong to your account.",
        )

    now = utc_now()
    if account.usable_after and now < account.usable_after:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout account is in a security cooling period. Please try again later.",
        )

    # 4. Atomic balance reservation with row lock
    is_sqlite = engine.url.drivername.startswith("sqlite")
    if is_sqlite:
        # SQLite immediate lock
        try:
            db.execute(text("BEGIN IMMEDIATE"))
        except Exception:
            pass
        user = db.query(User).filter(User.id == user_id).first()
    else:
        # Postgres row-level lock
        user = db.query(User).filter(User.id == user_id).with_for_update().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    balance_before = int(user.wallet_balance_kobo or 0)
    if balance_before < req.amount_kobo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {format_naira(balance_before)}, Requested: {format_naira(req.amount_kobo)}.",
        )

    # 5. Deduct balance & create pending ledger entry
    fee = DEFAULT_PAYOUT_FEE_KOBO if req.amount_kobo > DEFAULT_PAYOUT_FEE_KOBO else 0
    net_payout = req.amount_kobo - fee
    balance_after = balance_before - req.amount_kobo
    user.wallet_balance_kobo = balance_after

    ref = f"PO-{random.randint(100000, 999999)}"
    # Ensure reference uniqueness
    while db.query(WalletTransaction).filter(WalletTransaction.reference == ref).first():
        ref = f"PO-{random.randint(100000, 999999)}"

    ledger_entry = WalletTransaction(
        user_id=user.id,
        type="withdrawal",
        amount_kobo=req.amount_kobo,
        balance_before_kobo=balance_before,
        balance_after_kobo=balance_after,
        reference=ref,
        payout_account_id=account.id,
        status="pending",
        created_at=now,
    )
    db.add(ledger_entry)

    # 6. Audit Log
    ip = request.client.host if request.client else "127.0.0.1"
    audit = AuditLog(
        user_id=user.id,
        actor_id=user.id,
        actor_role="user",
        action="withdrawal_requested",
        target=ref,
        event="withdraw",
        ip=ip,
        details=f"Withdrawal {format_naira(req.amount_kobo)} to {account.bank} ({account.account_number})",
        timestamp=now,
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    # In development or if mock mode is on, finalize withdrawal immediately
    # so local developers can test full end-to-end cycle
    if settings.DEBUG or settings.ENVIRONMENT == "development":
        ledger_entry.status = "successful"
        db.commit()

    resp_data = {
        "status": "pending" if ledger_entry.status == "pending" else "successful",
        "message": "Withdrawal request submitted for bank disbursement.",
        "tx_ref": ref,
        "amount_kobo": req.amount_kobo,
        "fee_kobo": fee,
        "net_payout_kobo": net_payout,
        "new_balance_kobo": balance_after,
    }

    # Record idempotency response
    if idempotency_key:
        record_idempotency(
            db=db,
            key=idempotency_key,
            user_id=user.id,
            endpoint="/wallet/withdraw",
            request_data=req.model_dump(),
            response_code=200,
            response_body=resp_data,
        )

    return WithdrawResponse(**resp_data)


# ──────────────────────────────────────────────────────────────
# 3. POST /webhooks/payment (Provider Webhooks with HMAC Signature)
# ──────────────────────────────────────────────────────────────
@router.post("/webhooks/payment")
async def handle_payment_webhook(request: Request, db: DbSession = Depends(get_db)):
    """
    Webhook endpoint for payment processors (Paystack/Flutterwave).
    - Verifies cryptographic HMAC-SHA512 signature
    - Deduplicates events using ProviderEvent table
    - Handles charge.success (marks room payment_received, writes hold ledger)
    - Handles transfer.success / transfer.failed (finalizes payouts)
    """
    body_bytes = await request.body()
    signature = request.headers.get("x-paystack-signature") or request.headers.get("X-Paystack-Signature")

    # In production, require valid signature
    webhook_secret = getattr(settings, "PAYSTACK_SECRET_KEY", "pk_test_mock_secret")
    if not settings.DEBUG:
        if not signature:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature")
        expected = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(signature, expected):
            # Log invalid attempt in AuditLog
            audit = AuditLog(
                event="webhook_invalid_signature",
                ip=request.client.host if request.client else "unknown",
                details=f"Invalid signature received on /webhooks/payment",
                timestamp=utc_now(),
            )
            db.add(audit)
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    import json
    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event_type = payload.get("event")
    event_id = str(payload.get("id") or payload.get("data", {}).get("id") or payload.get("data", {}).get("reference") or "")

    # Deduplicate event
    if event_id:
        existing_event = db.query(ProviderEvent).filter(ProviderEvent.provider_event_id == event_id).first()
        if existing_event:
            return {"status": "success", "message": "Event already processed"}

    data = payload.get("data", {})
    ref = data.get("reference")

    if event_type == "charge.success":
        # Inbound payment for a payment room
        amount_kobo = data.get("amount")
        currency = data.get("currency", "NGN")

        if currency != "NGN":
            return {"status": "ignored", "reason": "Unsupported currency"}

        # Match payment room
        room = db.query(PaymentRoom).filter(PaymentRoom.order_number == ref).first()
        if room:
            expected_kobo = int(float(room.amount or 0) * 100)
            if amount_kobo == expected_kobo:
                room.status = "payment_received"
                # Record held funds ledger entry
                hold_ref = f"HOLD-{ref}"
                if not db.query(WalletTransaction).filter(WalletTransaction.reference == hold_ref).first():
                    hold_entry = WalletTransaction(
                        user_id=room.buyer_id,
                        order_number=room.order_number,
                        type="hold",
                        amount_kobo=amount_kobo,
                        balance_before_kobo=0,
                        balance_after_kobo=0,
                        reference=hold_ref,
                        status="successful",
                        created_at=utc_now(),
                    )
                    db.add(hold_entry)
                db.commit()
                ram_cache.sync_payment_room({"orderNumber": room.order_number, "status": "payment_received"})
            else:
                # Underpayment or overpayment - do not advance room!
                audit = AuditLog(
                    event="payment_amount_mismatch",
                    target=ref,
                    ip=request.client.host if request.client else "unknown",
                    details=f"Expected {expected_kobo} kobo, received {amount_kobo} kobo",
                    timestamp=utc_now(),
                )
                db.add(audit)
                db.commit()

    elif event_type == "transfer.success":
        # Outbound bank transfer succeeded
        tx = db.query(WalletTransaction).filter(WalletTransaction.reference == ref).first()
        if tx and tx.status == "pending":
            tx.status = "successful"
            db.commit()

    elif event_type in ("transfer.failed", "transfer.reversed"):
        # Outbound bank transfer failed - reverse and restore user balance
        tx = db.query(WalletTransaction).filter(WalletTransaction.reference == ref).first()
        if tx and tx.status in ("pending", "successful"):
            tx.status = "failed"
            # Restore user balance
            user = db.query(User).filter(User.id == tx.user_id).first()
            if user:
                before = user.wallet_balance_kobo
                user.wallet_balance_kobo += tx.amount_kobo
                after = user.wallet_balance_kobo

                reversal_ref = f"REV-{ref}"
                rev_entry = WalletTransaction(
                    user_id=user.id,
                    type="withdrawal_reversal",
                    amount_kobo=tx.amount_kobo,
                    balance_before_kobo=before,
                    balance_after_kobo=after,
                    reference=reversal_ref,
                    parent_id=tx.id,
                    status="successful",
                    created_at=utc_now(),
                )
                db.add(rev_entry)
                db.commit()

    # Record event in ProviderEvent table
    if event_id:
        p_event = ProviderEvent(
            provider_event_id=event_id,
            reference=ref,
            event_type=str(event_type),
            payload=json.dumps(payload),
            processed_at=utc_now(),
        )
        db.add(p_event)
        db.commit()

    return {"status": "success"}
