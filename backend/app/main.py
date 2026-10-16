from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, PrePaymentRoom, PaymentRoom, KilledPaymentRoom
from app.services.ram_cache import ram_cache
import app.services.db_ram_sync  # Registers real-time DB-to-RAM event listeners
from app.routers import auth, wallet, payment_rooms
from app.security.headers import SecurityHeadersMiddleware
from app.security.query_metrics import register_sqlalchemy_query_listeners, QueryMetricsMiddleware
from fastapi import HTTPException

def _ensure_sqlite_schema():
    """Ensure SQLite schema matches models (adds missing columns if any)."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "payment_rooms" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("payment_rooms")]
            with engine.begin() as conn:
                if "currency" not in columns:
                    conn.execute(text("ALTER TABLE payment_rooms ADD COLUMN currency VARCHAR(10) DEFAULT 'NGN' NOT NULL"))
                if "seller_id" not in columns:
                    conn.execute(text("ALTER TABLE payment_rooms ADD COLUMN seller_id VARCHAR(36)"))
                if "buyer_id" not in columns:
                    conn.execute(text("ALTER TABLE payment_rooms ADD COLUMN buyer_id VARCHAR(36)"))
                if "buyer_agreed_terms" not in columns:
                    conn.execute(text("ALTER TABLE payment_rooms ADD COLUMN buyer_agreed_terms BOOLEAN DEFAULT 0"))
                if "seller_agreed_terms" not in columns:
                    conn.execute(text("ALTER TABLE payment_rooms ADD COLUMN seller_agreed_terms BOOLEAN DEFAULT 0"))
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            with engine.begin() as conn:
                if "avatar_color" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_color VARCHAR(32)"))
                if "avatar_url" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512)"))
                if "wallet_balance_kobo" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN wallet_balance_kobo BIGINT DEFAULT 0 NOT NULL"))
        if "payment_rooms" in inspector.get_table_names():
            p_cols = [c["name"] for c in inspector.get_columns("payment_rooms")]
            with engine.begin() as conn:
                if "fee_kobo" not in p_cols:
                    conn.execute(text("ALTER TABLE payment_rooms ADD COLUMN fee_kobo BIGINT DEFAULT 0 NOT NULL"))
        if "payout_accounts" in inspector.get_table_names():
            acc_cols = [c["name"] for c in inspector.get_columns("payout_accounts")]
            with engine.begin() as conn:
                if "verified_name" not in acc_cols:
                    conn.execute(text("ALTER TABLE payout_accounts ADD COLUMN verified_name VARCHAR(255)"))
                if "usable_after" not in acc_cols:
                    conn.execute(text("ALTER TABLE payout_accounts ADD COLUMN usable_after DATETIME"))
        if "audit_logs" in inspector.get_table_names():
            audit_cols = [c["name"] for c in inspector.get_columns("audit_logs")]
            with engine.begin() as conn:
                if "actor_id" not in audit_cols:
                    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN actor_id VARCHAR(36)"))
                if "actor_role" not in audit_cols:
                    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN actor_role VARCHAR(32)"))
                if "action" not in audit_cols:
                    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN action VARCHAR(64)"))
                if "target" not in audit_cols:
                    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN target VARCHAR(128)"))
                if "reason" not in audit_cols:
                    conn.execute(text("ALTER TABLE audit_logs ADD COLUMN reason TEXT"))
        if "pre_payment_rooms" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("pre_payment_rooms")]
            with engine.begin() as conn:
                if "creator_id" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN creator_id VARCHAR(64)"))
                if "buyer_id" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN buyer_id VARCHAR(36)"))
                if "seller_id" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN seller_id VARCHAR(36)"))
                if "counterparty_joined" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN counterparty_joined BOOLEAN DEFAULT 0"))
                if "status_text" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN status_text VARCHAR(64) DEFAULT 'Invite Sent'"))
                if "category" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN category VARCHAR(64) DEFAULT 'pre_payment'"))
                if "resend_count" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN resend_count INTEGER DEFAULT 0"))
                if "expires_at" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN expires_at DATETIME"))
                if "resent_at" not in columns:
                    conn.execute(text("ALTER TABLE pre_payment_rooms ADD COLUMN resent_at DATETIME"))
    except Exception:
        pass

_ensure_sqlite_schema()

# Ensure database tables exist in development / fallback
Base.metadata.create_all(bind=engine)


def warmup_ram_cache():
    """Pre-load existing users, phone numbers, usernames, pre-payment rooms, and payment rooms from database into server RAM cache on boot."""
    db = SessionLocal()
    try:
        users = db.query(User).all()

        # Backfill: every user MUST have a persisted avatar_color in DB before RAM copy
        from app.services.auth_service import generate_vibrant_avatar_color
        backfilled = False
        for u in users:
            if not (getattr(u, "avatar_color", None) or "").strip():
                seed = u.username or u.whatsapp_number or u.email or str(u.id)
                u.avatar_color = generate_vibrant_avatar_color(seed)
                backfilled = True
        if backfilled:
            db.commit()

        for u in users:
            ram_cache.cache_user(u)
            if getattr(u, "username", None):
                ram_cache.cache_username(u.username, str(u.id))
            if getattr(u, "whatsapp_number", None):
                ram_cache.cache_phone(u.whatsapp_number, str(u.id))

        rooms = db.query(PrePaymentRoom).all()
        for r in rooms:
            created = getattr(r, "created_at", None)
            updated = getattr(r, "updated_at", None)
            room_dict = {
                "id": r.id,
                "orderNumber": r.order_number,
                "order_number": r.order_number,
                "title": r.title,
                "item": r.item,
                "amount": r.amount,
                "price": r.price,
                "role": r.role,
                "creator": r.creator,
                "counterparty": r.counterparty,
                "counterpartyName": r.counterparty,
                "counterparty_username": r.counterparty_username,
                "counterpartyUsername": r.counterparty_username,
                "counterparty_phone": r.counterparty_phone,
                "counterpartyPhone": r.counterparty_phone,
                "counterparty_account_id": r.counterparty_account_id,
                "counterpartyAccountId": r.counterparty_account_id,
                "counterparty_joined": r.counterparty_joined,
                "counterpartyJoined": r.counterparty_joined,
                "status": r.status,
                "status_text": r.status_text,
                "statusText": r.status_text,
                "category": r.category,
                "created_at": created.isoformat() if created and hasattr(created, "isoformat") else str(created or ""),
                "updated_at": updated.isoformat() if updated and hasattr(updated, "isoformat") else str(updated or ""),
                "is_expired": r.status == "expired",
            }
            ram_cache.sync_pre_payment_room(room_dict)

        from app.services.db_ram_sync import _extract_payment_room_dict
        p_rooms = db.query(PaymentRoom).all()
        for p in p_rooms:
            p_dict = _extract_payment_room_dict(p)
            ram_cache.sync_payment_room(p_dict)
    finally:
        db.close()


warmup_ram_cache()

app = FastAPI(
    title="PayKudi Authentication Service",
    description="Enterprise-grade hardened authentication and session management system for PayKudi.",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# 1. Custom Security Headers (CSP, HSTS, X-Frame-Options DENY, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# 2. Strict CORS limited to the PayKudi domain with credentials enabled
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.PAYKUDI_FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "X-Turnstile-Required"],
)

# 3. Include Routers
app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(payment_rooms.router)

# 4. DEBUG Query Metrics & Listeners (Strictly conditional on DEBUG=True)
if settings.DEBUG:
    register_sqlalchemy_query_listeners()
    app.add_middleware(QueryMetricsMiddleware)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "PayKudi Auth", "environment": settings.ENVIRONMENT}


@app.get("/debug/cache-stats")
def get_debug_cache_stats():
    """
    DEBUG-only route exposing cache hit, miss, and invalidate counters
    per cache key prefix. Returns 404 when DEBUG is False.
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Debug cache-stats only available in DEBUG mode")
    return ram_cache.prefix_stats()
