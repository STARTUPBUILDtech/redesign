import sqlite3
import re
import os

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        return
    print(f"Checking {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_rooms'")
    if not c.fetchone():
        print(f"No payment_rooms table in {db_path}")
        conn.close()
        return

    c.execute("PRAGMA table_info(payment_rooms)")
    cols = [r[1] for r in c.fetchall()]
    if "currency" in cols:
        print(f"Already migrated: {db_path}")
        conn.close()
        return

    print(f"Migrating payment_rooms in {db_path}...")
    c.execute("ALTER TABLE payment_rooms RENAME TO payment_rooms_old")
    c.execute("""
        CREATE TABLE payment_rooms (
            order_number VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            amount FLOAT NOT NULL DEFAULT 0.0,
            currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
            seller_id VARCHAR(36),
            buyer_id VARCHAR(36),
            status VARCHAR(64) DEFAULT 'awaiting_payment',
            variant VARCHAR(128),
            buyer_agreed_terms BOOLEAN DEFAULT 0,
            seller_agreed_terms BOOLEAN DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)
    c.execute("SELECT * FROM payment_rooms_old")
    rows = c.fetchall()
    c.execute("PRAGMA table_info(payment_rooms_old)")
    old_cols = [r[1] for r in c.fetchall()]
    col_idx = {name: i for i, name in enumerate(old_cols)}

    for r in rows:
        order_num = r[col_idx.get("order_number")] if col_idx.get("order_number") is not None else None
        if not order_num and col_idx.get("id") is not None:
            order_num = r[col_idx.get("id")]
        title = r[col_idx.get("title")] if col_idx.get("title") is not None else None
        if not title and col_idx.get("item") is not None:
            title = r[col_idx.get("item")]
        title = title or "Payment Room"

        price_num = r[col_idx.get("price_numeric")] if col_idx.get("price_numeric") is not None else None
        if price_num is None and col_idx.get("amount") is not None:
            raw_amt = str(r[col_idx.get("amount")] or "0")
            clean_amt = re.sub(r"[^0-9.]", "", raw_amt)
            price_num = float(clean_amt) if clean_amt else 0.0
        price_num = float(price_num or 0.0)

        status = (r[col_idx.get("status")] if col_idx.get("status") is not None else None) or "awaiting_payment"
        variant = r[col_idx.get("variant")] if col_idx.get("variant") is not None else None
        agreed = bool(r[col_idx.get("has_agreed_terms")]) if col_idx.get("has_agreed_terms") is not None else False
        created = (r[col_idx.get("created_at")] if col_idx.get("created_at") is not None else None) or "2026-01-01 00:00:00"
        updated = (r[col_idx.get("updated_at")] if col_idx.get("updated_at") is not None else None) or "2026-01-01 00:00:00"

        c.execute("""
            INSERT OR REPLACE INTO payment_rooms (
                order_number, title, amount, currency, seller_id, buyer_id,
                status, variant, buyer_agreed_terms, seller_agreed_terms,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (order_num, title, price_num, "NGN", None, None, status, variant, agreed, 0, created, updated))

    # Check users table columns
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if c.fetchone():
        c.execute("PRAGMA table_info(users)")
        u_cols = [r[1] for r in c.fetchall()]
        if "is_active" not in u_cols:
            print(f"Adding is_active to users in {db_path}...")
            c.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
        if "is_deleted" not in u_cols:
            print(f"Adding is_deleted to users in {db_path}...")
            c.execute("ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0")
        if "deleted_at" not in u_cols:
            print(f"Adding deleted_at to users in {db_path}...")
            c.execute("ALTER TABLE users ADD COLUMN deleted_at DATETIME")
        conn.commit()

    c.execute("DROP TABLE payment_rooms_old")
    conn.commit()
    conn.close()
    print(f"Successfully migrated {db_path} ({len(rows)} records moved)")

def migrate_users_only(db_path):
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if c.fetchone():
        c.execute("PRAGMA table_info(users)")
        u_cols = [r[1] for r in c.fetchall()]
        if "is_active" not in u_cols:
            print(f"Adding is_active to users in {db_path}...")
            c.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
        if "is_deleted" not in u_cols:
            print(f"Adding is_deleted to users in {db_path}...")
            c.execute("ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0")
        if "deleted_at" not in u_cols:
            print(f"Adding deleted_at to users in {db_path}...")
            c.execute("ALTER TABLE users ADD COLUMN deleted_at DATETIME")
        conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate_db("paykudi_auth.db")
    migrate_db("../paykudi_auth.db")
    migrate_users_only("paykudi_auth.db")
    migrate_users_only("../paykudi_auth.db")

