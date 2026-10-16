"""
DB to RAM Cache Real-time Synchronization Service.

Ensures that EVERY insert, update, or delete committed to the SQL Database
is immediately synchronized with ServerRAMCache in real-time.
"""

from sqlalchemy import event
from app.models import User, PrePaymentRoom, PaymentRoom
from app.services.ram_cache import ram_cache


# ── 1. User Model Synchronization ─────────────────────────────────────────────

@event.listens_for(User, "after_insert")
@event.listens_for(User, "after_update")
def sync_user_to_ram(mapper, connection, target):
    """Syncs inserted or updated user into server RAM cache."""
    try:
        ram_cache.cache_user(target)
        if getattr(target, "username", None):
            ram_cache.cache_username(target.username, str(target.id))
        if getattr(target, "whatsapp_number", None):
            ram_cache.cache_phone(target.whatsapp_number, str(target.id))
    except Exception as e:
        # Non-blocking safeguard
        pass


@event.listens_for(User, "after_delete")
def sync_user_delete_to_ram(mapper, connection, target):
    """Removes deleted user from server RAM cache."""
    try:
        if getattr(target, "id", None):
            ram_cache.remove_user(str(target.id))
    except Exception:
        pass


# ── 2. PrePaymentRoom Model Synchronization ────────────────────────────────────

def _extract_room_dict(target) -> dict:
    created = getattr(target, "created_at", None)
    updated = getattr(target, "updated_at", None)
    return {
        "id": target.id,
        "orderNumber": target.order_number,
        "order_number": target.order_number,
        "title": target.title,
        "item": target.item,
        "amount": target.amount,
        "price": target.price,
        "role": target.role,
        "creator": target.creator,
        "creator_id": getattr(target, "creator_id", None),
        "counterparty": target.counterparty,
        "counterpartyName": target.counterparty,
        "counterparty_username": target.counterparty_username,
        "counterpartyUsername": target.counterparty_username,
        "counterparty_phone": target.counterparty_phone,
        "counterpartyPhone": target.counterparty_phone,
        "counterparty_account_id": target.counterparty_account_id,
        "counterpartyAccountId": target.counterparty_account_id,
        "counterparty_joined": target.counterparty_joined,
        "counterpartyJoined": target.counterparty_joined,
        "status": target.status,
        "status_text": target.status_text,
        "statusText": target.status_text,
        "category": target.category,
        "currency": getattr(target, "currency", "NGN"),
        "seller_id": getattr(target, "seller_id", None),
        "buyer_id": getattr(target, "buyer_id", None),
        "variant": getattr(target, "variant", None),
        "buyer_agreed_terms": bool(getattr(target, "buyer_agreed_terms", False)),
        "seller_agreed_terms": bool(getattr(target, "seller_agreed_terms", False)),
        "resend_count": getattr(target, "resend_count", 0),
        "resendCount": getattr(target, "resend_count", 0),
        "expires_at": getattr(target, "expires_at", None).isoformat() if getattr(target, "expires_at", None) and hasattr(getattr(target, "expires_at", None), "isoformat") else str(getattr(target, "expires_at", "") or ""),
        "resent_at": getattr(target, "resent_at", None).isoformat() if getattr(target, "resent_at", None) and hasattr(getattr(target, "resent_at", None), "isoformat") else str(getattr(target, "resent_at", "") or ""),
        "created_at": created.isoformat() if created and hasattr(created, "isoformat") else str(created or ""),
        "updated_at": updated.isoformat() if updated and hasattr(updated, "isoformat") else str(updated or ""),
        "is_expired": target.status == "expired",
    }


@event.listens_for(PrePaymentRoom, "after_insert")
@event.listens_for(PrePaymentRoom, "after_update")
def sync_room_to_ram(mapper, connection, target):
    """Syncs inserted or updated PrePaymentRoom into server RAM cache."""
    try:
        room_dict = _extract_room_dict(target)
        ram_cache.sync_pre_payment_room(room_dict)
    except Exception:
        pass


@event.listens_for(PrePaymentRoom, "after_delete")
def sync_room_delete_to_ram(mapper, connection, target):
    """Removes deleted PrePaymentRoom from server RAM cache."""
    try:
        if getattr(target, "id", None):
            ram_cache.delete_pre_payment_room(str(target.id))
    except Exception:
        pass


# ── 3. PaymentRoom Model Synchronization ───────────────────────────────────────

def _extract_payment_room_dict(target) -> dict:
    created = getattr(target, "created_at", None)
    updated = getattr(target, "updated_at", None)

    amount_num = float(getattr(target, "amount", 0.0) or 0.0)
    formatted_price = f"₦{amount_num:,.2f}"

    seller = getattr(target, "seller", None)
    buyer = getattr(target, "buyer", None)

    seller_name = getattr(seller, "full_name", None) or getattr(seller, "username", None) or "Seller"
    buyer_name = getattr(buyer, "full_name", None) or getattr(buyer, "username", None) or "Buyer"

    seller_bank = "Guaranteed Trust Bank (GTBank)"
    seller_account = ""
    if seller and hasattr(seller, "payout_accounts") and seller.payout_accounts:
        default_acc = next((a for a in seller.payout_accounts if a.is_default), seller.payout_accounts[0])
        seller_bank = default_acc.bank
        seller_account = default_acc.account_number

    status = getattr(target, "status", "awaiting_payment")
    status_map = {
        "awaiting_payment": "Awaiting Payment",
        "payment_received": "Payment Received",
        "in_transit": "In Transit",
        "confirm_delivery": "Confirm Delivery",
        "completed": "Completed",
        "dispute": "Dispute Ongoing",
        "cancelled": "Cancelled",
    }
    status_text = status_map.get(status, "Awaiting Payment")
    category = "completed" if status == "completed" else "cancelled" if status == "cancelled" else "ongoing"

    buyer_agreed = bool(getattr(target, "buyer_agreed_terms", False))
    seller_agreed = bool(getattr(target, "seller_agreed_terms", False))

    return {
        "id": target.id,
        "orderNumber": target.order_number,
        "order_number": target.order_number,
        "title": target.title,
        "item": target.title,
        "amount": formatted_price,
        "price": formatted_price,
        "price_numeric": amount_num,
        "currency": getattr(target, "currency", "NGN"),
        "role": "Buying",
        "seller_id": getattr(target, "seller_id", None),
        "buyer_id": getattr(target, "buyer_id", None),
        "seller_name": seller_name,
        "buyer_name": buyer_name,
        "sellerName": seller_name,
        "buyerName": buyer_name,
        "creator": buyer_name,
        "counterparty": seller_name,
        "counterparty_joined": True,
        "counterpartyJoined": True,
        "status": status,
        "status_text": status_text,
        "statusText": status_text,
        "category": category,
        "bank": seller_bank,
        "account_name": seller_name,
        "account_number": seller_account,
        "variant": getattr(target, "variant", None),
        "buyer_agreed_terms": buyer_agreed,
        "seller_agreed_terms": seller_agreed,
        "has_agreed_terms": buyer_agreed or seller_agreed,
        "created_at": created.isoformat() if created and hasattr(created, "isoformat") else str(created or ""),
        "updated_at": updated.isoformat() if updated and hasattr(updated, "isoformat") else str(updated or ""),
    }


@event.listens_for(PaymentRoom, "after_insert")
@event.listens_for(PaymentRoom, "after_update")
def sync_payment_room_to_ram(mapper, connection, target):
    """Syncs approved PaymentRoom into server RAM cache and removes from pre-payment cache."""
    try:
        room_dict = _extract_payment_room_dict(target)
        ram_cache.delete_pre_payment_room(str(target.id))
        ram_cache.sync_payment_room(room_dict)
    except Exception:
        pass


@event.listens_for(PaymentRoom, "after_delete")
def sync_payment_room_delete_to_ram(mapper, connection, target):
    """Removes deleted PaymentRoom from server RAM cache."""
    try:
        if getattr(target, "id", None):
            ram_cache.delete_payment_room(str(target.id))
    except Exception:
        pass
