import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    BigInteger,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Index,
    CheckConstraint,
    text,
)
from sqlalchemy.orm import relationship, validates, synonym
from .database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=True, index=True)
    whatsapp_number = Column(String(32), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    lock_count = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    full_name = Column(String(255), nullable=True)
    username = Column(String(100), unique=True, nullable=True, index=True)
    avatar_color = Column(String(32), nullable=True)
    avatar_url = Column(Text, nullable=True)
    wallet_balance_kobo = Column(BigInteger, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    known_devices = relationship("KnownDevice", back_populates="user", cascade="all, delete-orphan")
    otps = relationship("WhatsAppOTP", back_populates="user", cascade="all, delete-orphan")
    payout_accounts = relationship("PayoutAccount", back_populates="user", cascade="all, delete-orphan")
    wallet_transactions = relationship("WalletTransaction", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("wallet_balance_kobo >= 0", name="check_wallet_balance_non_negative"),
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    family_id = Column(String(36), nullable=False, index=True)
    refresh_token_hash = Column(String(64), unique=True, nullable=False, index=True)
    ip = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)

    user = relationship("User", back_populates="sessions")


class KnownDevice(Base):
    __tablename__ = "known_devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    first_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="known_devices")

    __table_args__ = (
        Index("idx_user_device", "user_id", "ip"),
    )


class WhatsAppOTP(Base):
    __tablename__ = "whatsapp_otps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    otp_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="otps")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=True, index=True)
    actor_id = Column(String(36), nullable=True, index=True)
    actor_role = Column(String(32), nullable=True)
    action = Column(String(64), nullable=True, index=True)
    target = Column(String(128), nullable=True)
    reason = Column(Text, nullable=True)
    event = Column(String(64), nullable=False, index=True)  # login_success, login_failed, locked, new_device, ip_blocked, withdraw, release, refund
    ip = Column(String(45), nullable=False, index=True)
    user_agent = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class PayoutAccount(Base):
    __tablename__ = "payout_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bank = Column(String(100), nullable=False)
    bank_code = Column(String(50), nullable=False)
    account_number = Column(String(20), nullable=False)
    account_name = Column(String(255), nullable=False)
    verified_name = Column(String(255), nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    usable_after = Column(DateTime(timezone=True), nullable=True)  # Cooling period for newly added accounts
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="payout_accounts")


class PrePaymentRoom(Base):
    """
    Table for pre-payment rooms: rooms in invitation status before transitioning
    into active escrow payment_rooms upon creator proceeding.
    Columns:
    - id
    - item
    - price
    - creator_id
    - buyer_id (with buyers_id synonym)
    - seller_id (with sellers_id synonym)
    - counterparty_joined (with counter_party_joined synonym)
    - status_text
    - category
    - resend_count
    - expires_at
    - resent_at
    """
    __tablename__ = "pre_payment_rooms"

    id = Column(String(64), primary_key=True, index=True)
    item = Column(String(255), nullable=False)
    price = Column(String(64), nullable=False)
    creator_id = Column(String(64), nullable=True)
    buyer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    seller_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    counterparty_joined = Column(Boolean, default=False)
    status_text = Column(String(64), default="Invite Sent")
    category = Column(String(64), default="pre_payment")
    resend_count = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    resent_at = Column(DateTime(timezone=True), nullable=True)

    # Synonyms for exact requested alias names and query compatibility
    buyers_id = synonym("buyer_id")
    sellers_id = synonym("seller_id")
    counter_party_joined = synonym("counterparty_joined")
    order_number = synonym("id")
    title = synonym("item")

    seller = relationship("User", foreign_keys=[seller_id])
    buyer = relationship("User", foreign_keys=[buyer_id])

    def __init__(self, **kwargs):
        if "id" not in kwargs and "order_number" in kwargs:
            kwargs["id"] = kwargs["order_number"]
        if "item" not in kwargs and "title" in kwargs:
            kwargs["item"] = kwargs["title"]
        if "price" not in kwargs and "amount" in kwargs:
            kwargs["price"] = str(kwargs["amount"])
        if "buyer_id" not in kwargs and "buyers_id" in kwargs:
            kwargs["buyer_id"] = kwargs["buyers_id"]
        if "seller_id" not in kwargs and "sellers_id" in kwargs:
            kwargs["seller_id"] = kwargs["sellers_id"]
        if "counterparty_joined" not in kwargs and "counter_party_joined" in kwargs:
            kwargs["counterparty_joined"] = kwargs["counter_party_joined"]
        # Filter unknown keys to prevent constructor error
        valid_cols = {
            "id", "item", "price", "creator_id", "buyer_id", "seller_id",
            "counterparty_joined", "status_text", "category", "resend_count",
            "expires_at", "resent_at", "buyers_id", "sellers_id", "counter_party_joined",
            "order_number", "title",
        }
        filtered = {k: v for k, v in kwargs.items() if k in valid_cols}
        super().__init__(**filtered)

    @property
    def amount(self):
        if not self.price:
            return 0.0
        clean = str(self.price).replace("₦", "").replace(",", "").strip()
        try:
            return float(clean)
        except (ValueError, TypeError):
            return 0.0

    @amount.setter
    def amount(self, val):
        self.price = str(val)

    @property
    def status(self) -> str:
        if not self.status_text:
            return "pending_invite"
        st = self.status_text.lower()
        if "expire" in st:
            return "expired"
        if "kill" in st:
            return "killed"
        if "invite sent" in st:
            return "pending_invite"
        return self.status_text

    @status.setter
    def status(self, val: str):
        if val == "expired":
            self.status_text = "Expired"
        elif val == "killed":
            self.status_text = "Killed"
        elif val == "pending_invite":
            self.status_text = "Invite Sent"
        else:
            self.status_text = str(val)

    @property
    def creator(self) -> str:
        if self.seller and self.seller_id == self.creator_id:
            return self.seller.full_name or self.seller.username
        if self.buyer and self.buyer_id == self.creator_id:
            return self.buyer.full_name or self.buyer.username
        return "Howard Ukah"

    @property
    def counterparty(self) -> str:
        if self.seller and self.seller_id != self.creator_id:
            return self.seller.full_name or self.seller.username
        if self.buyer and self.buyer_id != self.creator_id:
            return self.buyer.full_name or self.buyer.username
        return "Howard Ukah"

    @property
    def counterparty_username(self) -> str:
        return ""

    @property
    def counterparty_phone(self) -> str:
        return ""

    @property
    def counterparty_account_id(self) -> str:
        return ""

    @property
    def counterparty_id(self) -> str:
        if self.role == "Buying":
            return self.seller_id
        return self.buyer_id

    @property
    def created_at(self):
        return self.resent_at or utc_now()

    @property
    def role(self) -> str:
        if self.creator_id and self.creator_id == self.seller_id:
            return "Selling"
        return "Buying"

    @property
    def price_numeric(self) -> float:
        return float(self.amount or 0.0)

    @property
    def buyer_name(self) -> str:
        if self.buyer:
            return self.buyer.full_name or self.buyer.username or "Buyer"
        return "Buyer"

    @property
    def seller_name(self) -> str:
        if self.seller:
            return self.seller.full_name or self.seller.username or "Seller"
        return "Seller"

    @property
    def has_agreed_terms(self) -> bool:
        return False



class PaymentRoom(Base):
    """
    Table for active approved payment rooms (escrow rooms moved out of pre_payment_rooms).
    Lean schema:
    - bank/account details are linked via seller_id/buyer_id to users/profiles
    - dispute messages and timeline are in dispute_trails
    - amount is stored numerically
    - display formatting and roles are computed dynamically
    """
    __tablename__ = "payment_rooms"

    order_number = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    fee_kobo = Column(BigInteger, default=0, nullable=False)
    currency = Column(String(10), default="NGN", nullable=False)
    seller_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    buyer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(64), default="awaiting_payment")
    variant = Column(String(128), nullable=True)
    buyer_agreed_terms = Column(Boolean, default=False)
    seller_agreed_terms = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    seller = relationship("User", foreign_keys=[seller_id])
    buyer = relationship("User", foreign_keys=[buyer_id])

    id = synonym("order_number")
    item = synonym("title")

    @property
    def buyer_name(self) -> str:
        if self.buyer:
            return self.buyer.full_name or self.buyer.username or "Buyer"
        try:
            from app.services.ram_cache import ram_cache
            cached = ram_cache.get_payment_room(self.order_number)
            if cached and cached.get("buyer"):
                return cached["buyer"]
        except Exception:
            pass
        return "Howard Ukah"

    @property
    def seller_name(self) -> str:
        if self.seller:
            return self.seller.full_name or self.seller.username or "Seller"
        try:
            from app.services.ram_cache import ram_cache
            cached = ram_cache.get_payment_room(self.order_number)
            if cached and cached.get("seller"):
                return cached["seller"]
        except Exception:
            pass
        return "Benedicta James"

    @property
    def price(self) -> str:
        return f"₦{float(self.amount or 0.0):,.2f}"

    @property
    def price_numeric(self) -> float:
        return float(self.amount or 0.0)

    @property
    def has_agreed_terms(self) -> bool:
        return bool(self.buyer_agreed_terms or self.seller_agreed_terms)


class KilledPaymentRoom(Base):
    """
    Table for killed/expired payment rooms before creator joined or when cancelled.
    """
    __tablename__ = "killed_payment_rooms"

    id = Column(String(64), primary_key=True)
    order_number = Column(String(64), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    item = Column(String(255), nullable=True)
    amount = Column(String(64), nullable=False)
    price = Column(String(64), nullable=True)
    role = Column(String(32), default="Buying")
    creator = Column(String(255), nullable=True)
    counterparty = Column(String(255), nullable=True)
    reason = Column(String(64), default="timeout_creator_not_joined")
    killed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class WalletTransaction(Base):
    """
    Immutable financial transaction ledger table (append-only).
    Tracks all balance changes: hold, release_credit, platform_fee, refund, withdrawal, withdrawal_reversal, adjustment.
    """
    __tablename__ = "wallet_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    order_number = Column(String(64), nullable=True, index=True)
    type = Column(String(32), nullable=False, index=True)  # hold, release_credit, platform_fee, refund, withdrawal, withdrawal_reversal, adjustment
    amount_kobo = Column(BigInteger, nullable=False)
    balance_before_kobo = Column(BigInteger, nullable=False)
    balance_after_kobo = Column(BigInteger, nullable=False)
    reference = Column(String(64), unique=True, nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("wallet_transactions.id", ondelete="SET NULL"), nullable=True, index=True)
    payout_account_id = Column(String(36), ForeignKey("payout_accounts.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), default="pending", nullable=False, index=True)  # pending, successful, failed
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="wallet_transactions")
    payout_account = relationship("PayoutAccount")
    parent = relationship("WalletTransaction", remote_side=[id])

    __table_args__ = (
        Index(
            "idx_unique_release_refund",
            "order_number",
            "type",
            unique=True,
            sqlite_where=text("type IN ('release_credit', 'refund') AND order_number IS NOT NULL"),
            postgresql_where=text("type IN ('release_credit', 'refund') AND order_number IS NOT NULL"),
        ),
    )


class IdempotencyKey(Base):
    """
    Ensures every money-moving API call is executed exactly once.
    Replaying identical requests returns cached response.
    """
    __tablename__ = "idempotency_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(128), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    endpoint = Column(String(128), nullable=False)
    request_hash = Column(String(64), nullable=False)
    response_code = Column(Integer, default=200, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ProviderEvent(Base):
    """
    Webhook deduplication and audit table for payment providers (Paystack, Flutterwave).
    """
    __tablename__ = "provider_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider_event_id = Column(String(128), unique=True, nullable=False, index=True)
    reference = Column(String(64), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    payload = Column(Text, nullable=False)
    processed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)



