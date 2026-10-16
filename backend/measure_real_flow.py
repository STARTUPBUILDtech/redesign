import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Add backend to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
settings.DEBUG = True
settings.ARGON2_TIME_COST = 1
settings.ARGON2_MEMORY_COST = 2048
from app.security.hasher import password_hasher
from argon2 import PasswordHasher
password_hasher.ph = PasswordHasher(
    time_cost=settings.ARGON2_TIME_COST,
    memory_cost=settings.ARGON2_MEMORY_COST,
    parallelism=settings.ARGON2_PARALLELISM,
    hash_len=settings.ARGON2_HASH_LEN,
    salt_len=settings.ARGON2_SALT_LEN,
)

from app.security.query_metrics import register_sqlalchemy_query_listeners, QueryMetricsMiddleware
register_sqlalchemy_query_listeners()

from app.main import app
from app.database import SessionLocal
from app.models import User, Session, PaymentRoom, PayoutAccount, KnownDevice
from app.services.ram_cache import ram_cache
from fastapi.testclient import TestClient

def run_real_flow():
    settings.DEBUG = True
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # Clean setup
    u = db.query(User).filter(User.username == 'flow_tester').first()
    if not u:
        u = User(
            id=str(uuid.uuid4()),
            username='flow_tester',
            email='flow@paykudi.com',
            whatsapp_number='2348099887766',
            password_hash=password_hasher.hash_password('FlowPass123!'),
            wallet_balance_kobo=2500000,
            is_active=True,
            is_verified=True,
            created_at=now,
        )
        db.add(u)
    else:
        u.password_hash = password_hasher.hash_password('FlowPass123!')
        u.is_active = True
        u.is_deleted = False
        u.wallet_balance_kobo = 2500000
    db.commit()

    r = db.query(PaymentRoom).filter(PaymentRoom.order_number == 'ORD-FLOW-001').first()
    if not r:
        r = PaymentRoom(
            order_number='ORD-FLOW-001',
            title='MacBook Pro M3 Max',
            amount=150000.0,
            buyer_id=u.id,
            seller_id=str(uuid.uuid4()),
            status='payment_received',
            created_at=now,
        )
        db.add(r)
        db.commit()

    p = db.query(PayoutAccount).filter(PayoutAccount.user_id == u.id).first()
    if not p:
        p = PayoutAccount(
            id=str(uuid.uuid4()),
            user_id=u.id,
            bank="Access Bank",
            bank_code="044",
            account_number="0123456789",
            account_name="Flow Tester",
            is_default=True,
            created_at=now,
        )
        db.add(p)
        db.commit()

    kd = db.query(KnownDevice).filter(KnownDevice.user_id == u.id, KnownDevice.ip == "testclient").first()
    if not kd:
        kd = KnownDevice(
            id=str(uuid.uuid4()),
            user_id=u.id,
            ip="testclient",
            user_agent="testclient",
            first_seen_at=now,
            last_seen_at=now,
        )
        db.add(kd)
        db.commit()

    ram_cache.clear()

    client = TestClient(app)

    # Trace steps
    flow_steps = []
    total_queries = 0
    total_rows = 0

    # 1. Login
    csrf_r = client.get('/auth/csrf')
    csrf_token = csrf_r.json()['csrf_token']

    login_res = client.post(
        '/auth/login',
        json={'identifier': 'flow@paykudi.com', 'password': 'FlowPass123!'},
        headers={'x-csrf-token': csrf_token}
    )
    access_cookie = login_res.cookies.get('paykudi_access_token') or login_res.json().get('access_token')
    q = int(login_res.headers.get('X-DB-Queries', 0))
    rw = int(login_res.headers.get('X-DB-Rows', 0))
    total_queries += q
    total_rows += rw
    flow_steps.append(('1. POST /auth/login', q, rw, login_res.headers.get('X-Time-ms')))

    cookies = {'paykudi_access_token': access_cookie}

    # 2. Dashboard
    dash = [
        ('2a. GET /auth/me', '/auth/me'),
        ('2b. GET /auth/profile', '/auth/profile'),
        ('2c. GET /auth/payment-rooms', '/auth/payment-rooms'),
        ('2d. GET /auth/notifications', '/auth/notifications?user=flow_tester'),
    ]
    for label, path in dash:
        res = client.get(path, cookies=cookies)
        if res.status_code != 200:
            print(f"ERROR on {label}: {res.status_code} - {res.text}")
        q = int(res.headers.get('X-DB-Queries', 0))
        rw = int(res.headers.get('X-DB-Rows', 0))
        total_queries += q
        total_rows += rw
        flow_steps.append((label, q, rw, res.headers.get('X-Time-ms')))

    # 3. Open Room
    res = client.get('/auth/payment-rooms/ORD-FLOW-001', cookies=cookies)
    q = int(res.headers.get('X-DB-Queries', 0))
    rw = int(res.headers.get('X-DB-Rows', 0))
    total_queries += q
    total_rows += rw
    flow_steps.append(('3. GET /auth/payment-rooms/ORD-FLOW-001', q, rw, res.headers.get('X-Time-ms')))

    # 4. Back to Dashboard
    back = [
        ('4a. GET /auth/payment-rooms (back)', '/auth/payment-rooms'),
        ('4b. GET /auth/notifications (back)', '/auth/notifications?user=flow_tester'),
    ]
    for label, path in back:
        res = client.get(path, cookies=cookies)
        q = int(res.headers.get('X-DB-Queries', 0))
        rw = int(res.headers.get('X-DB-Rows', 0))
        total_queries += q
        total_rows += rw
        flow_steps.append((label, q, rw, res.headers.get('X-Time-ms')))

    # 5. Wallet
    wallet = [
        ('5a. GET /wallet/balance', '/wallet/balance'),
        ('5b. GET /auth/payout-accounts', '/auth/payout-accounts'),
    ]
    for label, path in wallet:
        res = client.get(path, cookies=cookies)
        q = int(res.headers.get('X-DB-Queries', 0))
        rw = int(res.headers.get('X-DB-Rows', 0))
        total_queries += q
        total_rows += rw
        flow_steps.append((label, q, rw, res.headers.get('X-Time-ms')))

    stats_res = client.get('/debug/cache-stats')
    prefix_stats = stats_res.json()

    print("=== Step 6 Real-Flow Measurement ===")
    print(f"{'Step / Endpoint':40} | {'Queries':7} | {'Rows':5} | {'Latency':7}")
    print("-" * 68)
    for label, q, rw, lat in flow_steps:
        print(f"{label:40} | {q:7} | {rw:5} | {lat:5}ms")
    print("-" * 68)
    print(f"{'TOTAL FLOW EGRESS':40} | {total_queries:7} | {total_rows:5}")
    print("\nPrefix Cache Statistics:")
    for pfx, s in prefix_stats.items():
        total_reqs = s['hits'] + s['misses']
        ratio = (s['hits'] / total_reqs * 100) if total_reqs > 0 else 0.0
        print(f"  {pfx:18}: Hits = {s['hits']:2}, Misses = {s['misses']:2}, Invalids = {s['invalidates']:2} -> Hit Ratio = {ratio:5.1f}%")

if __name__ == "__main__":
    run_real_flow()
