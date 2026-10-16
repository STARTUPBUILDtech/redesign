import re
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def format_full_name(name: Optional[str]) -> str:
    """Formats full name into clean sentence/title case, e.g. 'howard ukah' -> 'Howard Ukah'."""
    if not name:
        return ""
    trimmed = str(name).strip()
    if not trimmed:
        return ""

    def cap_word(w: str) -> str:
        if "-" in w:
            return "-".join(part.capitalize() for part in w.split("-"))
        return w.capitalize()

    return " ".join(cap_word(word) for word in trimmed.split())


def format_account_id(val: Optional[str]) -> str:
    """Formats phone or identifier into clean PayKudi account ID without leading 0."""
    if not val:
        return ""
    digits = re.sub(r"\D", "", str(val))
    if not digits:
        return ""
    if digits.startswith("234") and len(digits) > 3:
        digits = digits[3:]
    digits = digits.lstrip("0")
    return digits


class ServerRAMCache:
    """
    High-performance in-memory RAM cache for PayKudi Server.
    
    Architecture:
    1. Every registered user is stored in DB and cached in RAM on startup / write.
    2. Caches phone numbers, usernames, and profiles in RAM for O(1) matching.
    3. Counterparty searches (by phone, username, or name) match directly against RAM.
    """

    def __init__(self, max_entries: int = 10000):
        self._lock = threading.RLock()
        self.max_entries = max_entries
        # Primary storage: user_id -> user_dict
        self._users_by_id: Dict[str, Dict[str, Any]] = {}
        # Secondary index: identifier (phone / email / username) -> user_id
        self._identifier_to_id: Dict[str, str] = {}
        # Fast in-memory username index: lowercase_username -> user_id
        self._usernames: Dict[str, str] = {}
        # Fast in-memory phone index: digits_only -> user_id
        self._phones: Dict[str, str] = {}
        # Real Room Invitations & Notification Engine in Server RAM
        self._room_invitations: Dict[str, Dict[str, Any]] = {}
        self._pre_payment_rooms: Dict[str, Dict[str, Any]] = {}
        self._payment_rooms: Dict[str, Dict[str, Any]] = {}
        self._notifications: Dict[str, List[Dict[str, Any]]] = {}
        # Telemetry
        self.hits: int = 0
        self.misses: int = 0
        self._prefix_stats: Dict[str, Dict[str, int]] = {
            "user": {"hits": 0, "misses": 0, "invalidates": 0},
            "username": {"hits": 0, "misses": 0, "invalidates": 0},
            "phone": {"hits": 0, "misses": 0, "invalidates": 0},
            "room_invitation": {"hits": 0, "misses": 0, "invalidates": 0},
            "pre_payment_room": {"hits": 0, "misses": 0, "invalidates": 0},
            "payment_room": {"hits": 0, "misses": 0, "invalidates": 0},
            "notification": {"hits": 0, "misses": 0, "invalidates": 0},
        }

    def record_hit(self, prefix: str):
        if prefix in self._prefix_stats:
            self._prefix_stats[prefix]["hits"] += 1
        self.hits += 1

    def record_miss(self, prefix: str):
        if prefix in self._prefix_stats:
            self._prefix_stats[prefix]["misses"] += 1
        self.misses += 1

    def record_invalidate(self, prefix: str):
        if prefix in self._prefix_stats:
            self._prefix_stats[prefix]["invalidates"] += 1

    def prefix_stats(self) -> Dict[str, Dict[str, int]]:
        with self._lock:
            return {k: dict(v) for k, v in self._prefix_stats.items()}

    def cache_user(self, user) -> Dict[str, Any]:
        """
        Caches a user object or dict into RAM immediately after DB write or on boot.
        Accepts SQLAlchemy User model or dictionary.
        """
        with self._lock:
            user_id = str(getattr(user, "id", None) or user.get("id"))
            email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
            whatsapp = getattr(user, "whatsapp_number", None) or (user.get("whatsapp_number") if isinstance(user, dict) else None)
            raw_full_name = getattr(user, "full_name", None) or (user.get("full_name") if isinstance(user, dict) else None)
            full_name = format_full_name(raw_full_name) or raw_full_name
            username = getattr(user, "username", None) or (user.get("username") if isinstance(user, dict) else None)
            password_hash = getattr(user, "password_hash", None) or (user.get("password_hash") if isinstance(user, dict) else None)
            avatar_color = getattr(user, "avatar_color", None) or (user.get("avatar_color") if isinstance(user, dict) else None)
            avatar_url = getattr(user, "avatar_url", None) or (user.get("avatar_url") if isinstance(user, dict) else None)
            is_verified = getattr(user, "is_verified", True) if getattr(user, "is_verified", None) is not None else user.get("is_verified", True)
            failed_attempts = getattr(user, "failed_attempts", 0) if getattr(user, "failed_attempts", None) is not None else user.get("failed_attempts", 0)
            lock_count = getattr(user, "lock_count", 0) if getattr(user, "lock_count", None) is not None else user.get("lock_count", 0)
            locked_until = getattr(user, "locked_until", None) or (user.get("locked_until") if isinstance(user, dict) else None)
            last_login_at = getattr(user, "last_login_at", None) or (user.get("last_login_at") if isinstance(user, dict) else None)

            record = {
                "id": user_id,
                "email": email,
                "whatsapp_number": whatsapp,
                "full_name": full_name,
                "username": username,
                "avatar_color": avatar_color,
                "avatar_url": avatar_url,
                "password_hash": password_hash,
                "is_verified": is_verified,
                "failed_attempts": failed_attempts,
                "lock_count": lock_count,
                "locked_until": locked_until,
                "last_login_at": last_login_at,
                "cached_at": utc_now(),
            }

            self._users_by_id[user_id] = record

            if whatsapp:
                clean_phone = whatsapp.strip().lower()
                digits = re.sub(r"\D", "", whatsapp)
                self._identifier_to_id[clean_phone] = user_id
                if digits:
                    self._phones[digits] = user_id
                    # Handle +234 vs 0... formats and clean account ID
                    if digits.startswith("234") and len(digits) > 3:
                        local_0 = "0" + digits[3:]
                        clean_id = digits[3:].lstrip("0")
                        self._phones[local_0] = user_id
                        self._identifier_to_id[local_0] = user_id
                        if clean_id:
                            self._phones[clean_id] = user_id
                            self._identifier_to_id[clean_id] = user_id
                    elif digits.startswith("0") and len(digits) > 1:
                        intl_234 = "234" + digits[1:]
                        clean_id = digits[1:].lstrip("0")
                        self._phones[intl_234] = user_id
                        self._identifier_to_id[intl_234] = user_id
                        if clean_id:
                            self._phones[clean_id] = user_id
                            self._identifier_to_id[clean_id] = user_id
                    else:
                        clean_id = digits.lstrip("0")
                        if clean_id:
                            self._phones[clean_id] = user_id
                            self._identifier_to_id[clean_id] = user_id

            if email:
                self._identifier_to_id[email.strip().lower()] = user_id

            if username:
                clean_un = username.strip().lower().lstrip("@")
                self._identifier_to_id[clean_un] = user_id
                self._usernames[clean_un] = user_id

            return record

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Gets cached user by user ID."""
        with self._lock:
            res = self._users_by_id.get(str(user_id))
            if res:
                self.record_hit("user")
            else:
                self.record_miss("user")
            return res

    def is_username_taken(self, username: str) -> bool:
        """
        O(1) in-memory check to verify if a username is already taken by any user.
        Directly checks Server RAM Cache.
        """
        if not username:
            return False
        clean = username.strip().lower().lstrip("@")
        with self._lock:
            if clean in self._usernames:
                self.record_hit("username")
                return True
            if clean in self._identifier_to_id:
                self.record_hit("username")
                return True
            self.record_miss("username")
            return False

    def cache_username(self, username: str, user_id: str = ""):
        """Directly caches a username into Server RAM."""
        if not username:
            return
        clean = username.strip().lower().lstrip("@")
        with self._lock:
            self._usernames[clean] = user_id
            if user_id:
                self._identifier_to_id[clean] = user_id

    def cache_phone(self, phone: str, user_id: str = ""):
        """Directly caches a phone number into Server RAM."""
        if not phone:
            return
        digits = re.sub(r"\D", "", phone)
        with self._lock:
            if digits:
                self._phones[digits] = user_id
                self._identifier_to_id[phone.strip().lower()] = user_id
                if digits.startswith("234") and len(digits) > 3:
                    self._phones["0" + digits[3:]] = user_id
                    self._identifier_to_id["0" + digits[3:]] = user_id
                elif digits.startswith("0") and len(digits) > 1:
                    self._phones["234" + digits[1:]] = user_id
                    self._identifier_to_id["234" + digits[1:]] = user_id

    def search_users(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fast in-memory RAM search across all cached users.
        Searches by:
        1. Full name (word prefix or substring)
        2. Username (prefix or substring)
        3. Phone number (digits matching)
        """
        if not query or len(query.strip()) < 1:
            return []

        q_raw = query.strip()
        q_lower = q_raw.lower().lstrip("@")
        q_digits = re.sub(r"\D", "", q_raw)

        results: List[Dict[str, Any]] = []
        seen_ids = set()

        with self._lock:
            for user_id, u in self._users_by_id.items():
                if user_id in seen_ids:
                    continue

                matched = False
                un = (u.get("username") or "").lower().lstrip("@")
                fn = (u.get("full_name") or "").lower()
                phone = u.get("whatsapp_number") or ""
                phone_digits = re.sub(r"\D", "", phone)

                # 1. Username match
                if un and (un.startswith(q_lower) or q_lower in un):
                    matched = True

                # 2. Full Name match
                elif fn and (q_lower in fn or any(part.startswith(q_lower) for part in fn.split())):
                    matched = True

                # 3. Phone Number match
                elif q_digits and len(q_digits) >= 3 and phone_digits:
                    if q_digits in phone_digits:
                        matched = True
                    elif phone_digits.startswith("234") and q_digits in ("0" + phone_digits[3:]):
                        matched = True
                    elif phone_digits.startswith("0") and q_digits in ("234" + phone_digits[1:]):
                        matched = True

                if matched:
                    seen_ids.add(user_id)
                    raw_fn = u.get("full_name") or u.get("username") or "PayKudi User"
                    results.append({
                        "id": u["id"],
                        "full_name": format_full_name(raw_fn) or raw_fn,
                        "username": u.get("username"),
                        "avatar_color": u.get("avatar_color"),
                    })
                    if len(results) >= limit:
                        break

            if results:
                self.record_hit("user")
            else:
                self.record_miss("user")

        return results

    def lookup_user(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Exact/high-confidence in-memory RAM lookup by phone, username, name, or UUID.
        """
        if not query or len(query.strip()) < 2:
            return None

        clean = query.strip()
        clean_lower = clean.lower().lstrip("@")
        clean_digits = re.sub(r"\D", "", clean)

        with self._lock:
            # 1. Direct username index
            uid = self._usernames.get(clean_lower)

            # 2. Direct phone index
            if not uid and clean_digits:
                uid = self._phones.get(clean_digits)

            # 3. General identifier index
            if not uid:
                uid = self._identifier_to_id.get(clean_lower)

            # 4. Direct user ID
            if not uid and clean in self._users_by_id:
                uid = clean

            if uid and uid in self._users_by_id:
                u = self._users_by_id[uid]
                self.record_hit("user")
                raw_fn = u.get("full_name") or u.get("username") or "PayKudi User"
                return {
                    "id": u["id"],
                    "full_name": format_full_name(raw_fn) or raw_fn,
                    "username": u.get("username"),
                    "avatar_color": u.get("avatar_color"),
                }

            # 5. Fallback: if search yields exactly 1 match
            matches = self.search_users(query, limit=2)
            if len(matches) == 1:
                return matches[0]

            self.record_miss("user")
            return None

    def get_avatar_directory(self) -> List[Dict[str, Any]]:
        """
        Returns the authoritative avatar color directory for every cached user.
        This RAM copy mirrors the DB `avatar_color` column and is the single
        source of truth the frontend uses to paint avatars.
        """
        with self._lock:
            self.record_hit("user")
            directory = []
            for u in self._users_by_id.values():
                directory.append({
                    "id": u.get("id"),
                    "username": u.get("username"),
                    "avatar_color": u.get("avatar_color"),
                })
            return directory

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Lookup cached user by phone, email, or username directly from RAM."""
        norm = identifier.strip().lower()
        with self._lock:
            user_id = self._identifier_to_id.get(norm)
            if not user_id:
                digits = re.sub(r"\D", "", norm)
                if digits:
                    user_id = self._phones.get(digits)
            if user_id and user_id in self._users_by_id:
                self.record_hit("user")
                return self._users_by_id[user_id]
            self.record_miss("user")
            return None

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Lookup cached user by UUID from RAM."""
        with self._lock:
            user = self._users_by_id.get(user_id)
            if user:
                self.record_hit("user")
                return user
            self.record_miss("user")
            return None

    def update_failed_attempt(self, identifier: str, failed_attempts: int, locked_until: Optional[datetime], lock_count: int):
        """Update security lock counters in RAM."""
        with self._lock:
            user = self.get_by_identifier(identifier)
            if user:
                user["failed_attempts"] = failed_attempts
                user["locked_until"] = locked_until
                user["lock_count"] = lock_count

    def reset_failed_attempts(self, identifier: str):
        """Reset security counters on successful authentication in RAM."""
        with self._lock:
            user = self.get_by_identifier(identifier)
            if user:
                user["failed_attempts"] = 0
                user["locked_until"] = None
                user["last_login_at"] = utc_now()

    def invalidate(self, identifier: str):
        """Removes a user and all secondary identifier indices from RAM cache."""
        self.record_invalidate("user")
        self.record_invalidate("username")
        self.record_invalidate("phone")
        norm = identifier.strip().lower().lstrip("@")
        digits = re.sub(r"\D", "", identifier)
        with self._lock:
            user_id = self._identifier_to_id.pop(norm, None) or (norm if norm in self._users_by_id else None)
            self._usernames.pop(norm, None)
            if digits:
                self._phones.pop(digits, None)
            if user_id:
                record = self._users_by_id.pop(user_id, None)
                if record:
                    if record.get("email"):
                        self._identifier_to_id.pop(record["email"].strip().lower(), None)
                    if record.get("whatsapp_number"):
                        ph = record["whatsapp_number"].strip().lower()
                        self._identifier_to_id.pop(ph, None)
                        ph_d = re.sub(r"\D", "", ph)
                        if ph_d:
                            self._phones.pop(ph_d, None)
                    if record.get("username"):
                        clean_u = record["username"].strip().lower().lstrip("@")
                        self._identifier_to_id.pop(clean_u, None)
                        self._usernames.pop(clean_u, None)

    def create_room_invitation(self, room_data: dict) -> dict:
        """Stores a real payment room invitation in server RAM and notifies counterparty."""
        with self._lock:
            room_id = str(room_data.get("id") or room_data.get("orderNumber") or "ORD-1")
            creator = format_full_name(room_data.get("creator")) or "Howard Ukah"
            raw_cp = room_data.get("counterparty") or room_data.get("counterpartyName") or ""
            counterparty = format_full_name(raw_cp) or raw_cp
            counterparty_un = (room_data.get("counterpartyUsername") or "").lstrip("@")
            counterparty_ph = room_data.get("counterpartyPhone") or ""
            item = room_data.get("item") or room_data.get("title") or "Payment Room"
            amount = room_data.get("amount") or room_data.get("price") or "₦0.00"

            payload = {
                "id": room_id,
                "orderNumber": room_id,
                "item": item,
                "amount": amount,
                "creator": creator,
                "counterparty": counterparty,
                "counterparty_username": counterparty_un,
                "counterparty_phone": counterparty_ph,
                "counterparty_joined": False,
                "created_at": utc_now().isoformat(),
                "joined_at": None,
                "status": "pending_acceptance",
            }
            self._room_invitations[room_id] = payload

            # Generate real notification record for target counterparty
            notif = {
                "id": f"notif_{int(utc_now().timestamp() * 1000)}",
                "type": "room_invitation",
                "room_id": room_id,
                "title": "Payment Room Invitation",
                "message": f"{creator} invited you to join payment room for {item} ({amount}).",
                "item": item,
                "amount": amount,
                "creator": creator,
                "counterparty": counterparty,
                "created_at": utc_now().isoformat(),
                "status": "pending",
                "accepted": False,
            }

            # Index by username and by phone
            targets = []
            if counterparty_un:
                targets.append(counterparty_un.lower())
            if counterparty_ph:
                ph_dig = re.sub(r"\D", "", counterparty_ph)
                if ph_dig:
                    targets.append(ph_dig)
            if counterparty:
                targets.append(counterparty.lower().strip())

            for t in targets:
                if t not in self._notifications:
                    self._notifications[t] = []
                self._notifications[t].append(notif)

            return payload

    def accept_room_invitation(self, room_id: str, accepter: Optional[str] = None) -> Optional[dict]:
        """Accepts an invitation, transitioning room status to joined."""
        with self._lock:
            fmt_accepter = format_full_name(accepter) if accepter else None
            room = self._room_invitations.get(room_id)
            if not room:
                room = {
                    "id": room_id,
                    "orderNumber": room_id,
                    "counterparty_joined": True,
                    "joined_at": utc_now().isoformat(),
                    "status": "joined",
                }
                if fmt_accepter:
                    room["accepted_by"] = fmt_accepter
                self._room_invitations[room_id] = room
            else:
                room["counterparty_joined"] = True
                room["joined_at"] = utc_now().isoformat()
                room["status"] = "joined"
                if fmt_accepter:
                    room["accepted_by"] = fmt_accepter

            if room_id in self._pre_payment_rooms:
                pre = self._pre_payment_rooms[room_id]
                pre["counterparty_joined"] = True
                pre["counterpartyJoined"] = True
                pre["status"] = "accepted"
                pre["status_text"] = "Accepted"
                pre["statusText"] = "Accepted"
                if fmt_accepter:
                    pre["accepted_by"] = fmt_accepter

            # Mark corresponding notifications as accepted
            for t, notifs in self._notifications.items():
                for n in notifs:
                    if n.get("room_id") == room_id:
                        n["status"] = "accepted"
                        n["accepted"] = True

            return room

    def get_room_invitation(self, room_id: str) -> Optional[dict]:
        """Gets room invitation status from Server RAM."""
        with self._lock:
            res = self._room_invitations.get(room_id)
            if res:
                self.record_hit("room_invitation")
            else:
                self.record_miss("room_invitation")
            return res

    def get_user_notifications(self, identifier) -> List[dict]:
        """Fetches pending invitations/notifications strictly for caller's verified identifiers."""
        with self._lock:
            if isinstance(identifier, (set, list)):
                keys = set(str(x).lower().strip().lstrip("@") for x in identifier if x)
                for x in list(keys):
                    d = re.sub(r"\D", "", x)
                    if d:
                        keys.add(d)
            else:
                clean = str(identifier).lower().strip().lstrip("@")
                dig = re.sub(r"\D", "", str(identifier))
                keys = {clean}
                if dig:
                    keys.add(dig)

            seen_ids = set()
            res = []
            for k in keys:
                if k in self._notifications:
                    for notif in self._notifications[k]:
                        nid = notif.get("id") or id(notif)
                        if nid not in seen_ids:
                            seen_ids.add(nid)
                            res.append(notif)
            if res:
                self.record_hit("notification")
            else:
                self.record_miss("notification")
            return res

    def _compute_room_timer(self, room: Optional[dict]) -> Optional[dict]:
        if not room:
            return room
        now_ms = int(utc_now().timestamp() * 1000)
        expires_at_ms = room.get("expires_at_ms")
        if not expires_at_ms and room.get("expires_at"):
            try:
                exp_dt = datetime.fromisoformat(str(room["expires_at"]).replace("Z", "+00:00"))
                expires_at_ms = int(exp_dt.timestamp() * 1000)
                room["expires_at_ms"] = expires_at_ms
            except Exception:
                pass
        if not expires_at_ms and (room.get("updated_at") or room.get("created_at")):
            try:
                dt_str = str(room.get("updated_at") or room.get("created_at"))
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                expires_at_ms = int(dt.timestamp() * 1000) + 120_000
                room["expires_at_ms"] = expires_at_ms
            except Exception:
                pass

        if expires_at_ms:
            rem = max(0, int((expires_at_ms - now_ms) / 1000))
            room["seconds_left"] = rem
            room["secondsLeft"] = rem
            if rem <= 0 and room.get("status") == "pending_invite":
                room["status"] = "expired"
                room["status_text"] = "Expired"
                room["statusText"] = "Expired"
                room["is_expired"] = True
        return room

    def create_pre_payment_room(self, room_data: dict) -> dict:
        """Stores a pre-payment room (room still in invite) in Server RAM Cache."""
        with self._lock:
            now = utc_now()
            now_iso = now.isoformat()
            now_ms = int(now.timestamp() * 1000)
            from datetime import timedelta

            room_id = room_data.get("id") or room_data.get("orderNumber") or room_data.get("order_number") or f"ORD-{int(now.timestamp())}"
            item = room_data.get("item") or room_data.get("title") or "Payment Item"
            amount = room_data.get("amount") or room_data.get("price") or "₦0.00"
            role = room_data.get("role") or "Buying"
            creator = format_full_name(room_data.get("creator")) or "Howard Ukah"
            counterparty = format_full_name(room_data.get("counterpartyName") or room_data.get("counterparty")) or "Counterparty"
            counterparty_un = (room_data.get("counterpartyUsername") or room_data.get("counterparty_username") or "").lstrip("@")
            counterparty_ph = room_data.get("counterpartyPhone") or room_data.get("counterparty_phone") or ""
            counterparty_acc = room_data.get("counterpartyAccountId") or room_data.get("counterparty_account_id") or format_account_id(counterparty_ph)

            creator_un = (room_data.get("creatorUsername") or room_data.get("creator_username") or "").lstrip("@")
            creator_ph = room_data.get("creatorPhone") or room_data.get("creator_phone") or ""
            creator_avatar_color = room_data.get("creator_avatar_color") or room_data.get("creatorAvatarColor")
            if not creator_avatar_color:
                if (creator and ("howard" in creator.lower())) or (creator_un and ("howard" in creator_un.lower())) or (creator_ph and "803200" in creator_ph):
                    creator_avatar_color = "#bf185b"
                elif (creator and ("benedicta" in creator.lower())) or (creator_un and ("benedicta" in creator_un.lower())) or (creator_ph and "903370" in creator_ph):
                    creator_avatar_color = "#0d9488"
            if not creator_un and (creator and "howard" in creator.lower()):
                creator_un = "howard001"
            if not creator_ph and (creator and "howard" in creator.lower()):
                creator_ph = "8032001585"

            counterparty_avatar_color = room_data.get("counterparty_avatar_color") or room_data.get("counterpartyAvatarColor")
            if not counterparty_avatar_color:
                if (counterparty and ("benedicta" in counterparty.lower())) or (counterparty_un and ("benedicta" in counterparty_un.lower())) or (counterparty_ph and "903370" in counterparty_ph):
                    counterparty_avatar_color = "#0d9488"
                elif (counterparty and ("howard" in counterparty.lower())) or (counterparty_un and ("howard" in counterparty_un.lower())) or (counterparty_ph and "803200" in counterparty_ph):
                    counterparty_avatar_color = "#bf185b"

            created_at = room_data.get("created_at") or now_iso
            updated_at = room_data.get("updated_at") or now_iso
            expires_at = room_data.get("expires_at") or (now + timedelta(seconds=120)).isoformat()
            created_at_ms = room_data.get("created_at_ms") or now_ms
            expires_at_ms = room_data.get("expires_at_ms") or (created_at_ms + 120_000)
            rem_sec = max(0, int((expires_at_ms - now_ms) / 1000))

            record = {
                "id": room_id,
                "order_number": room_id,
                "orderNumber": room_id,
                "title": item,
                "item": item,
                "amount": amount,
                "price": amount,
                "role": role,
                "creator": creator,
                "creatorName": creator,
                "creator_id": room_data.get("creator_id") or room_data.get("creatorId"),
                "buyer_id": room_data.get("buyer_id") or room_data.get("buyerId"),
                "seller_id": room_data.get("seller_id") or room_data.get("sellerId"),
                "creator_username": creator_un,
                "creatorUsername": creator_un,
                "creator_phone": creator_ph,
                "creatorPhone": creator_ph,
                "creator_avatar_color": creator_avatar_color,
                "creatorAvatarColor": creator_avatar_color,
                "counterparty": counterparty,
                "counterpartyName": counterparty,
                "counterparty_username": counterparty_un,
                "counterpartyUsername": counterparty_un,
                "counterparty_phone": counterparty_ph,
                "counterpartyPhone": counterparty_ph,
                "counterparty_account_id": counterparty_acc,
                "counterpartyAccountId": counterparty_acc,
                "counterparty_avatar_color": counterparty_avatar_color,
                "counterpartyAvatarColor": counterparty_avatar_color,
                "counterparty_joined": False,
                "counterpartyJoined": False,
                "creator_proceeded": room_data.get("creator_proceeded") or room_data.get("creatorProceeded") or False,
                "creatorProceeded": room_data.get("creator_proceeded") or room_data.get("creatorProceeded") or False,
                "specifications": room_data.get("specifications") or [],
                "status": "expired" if rem_sec <= 0 else "pending_invite",
                "status_text": "Expired" if rem_sec <= 0 else "Invite Sent",
                "statusText": "Expired" if rem_sec <= 0 else "Invite Sent",
                "category": "pre_payment",
                "created_at": created_at,
                "updated_at": updated_at,
                "expires_at": expires_at,
                "created_at_ms": created_at_ms,
                "expires_at_ms": expires_at_ms,
                "seconds_left": rem_sec,
                "secondsLeft": rem_sec,
                "is_expired": rem_sec <= 0,
            }
            self._pre_payment_rooms[room_id] = record
            self._room_invitations[room_id] = record
            return record

    def creator_proceed_pre_payment_room(self, room_id: str, specifications: Optional[list] = None) -> Optional[Dict[str, Any]]:
        """
        Marks that the room creator has entered specifications and clicked Proceed to Payment.
        """
        with self._lock:
            room_key = str(room_id)
            room = self._pre_payment_rooms.get(room_key)
            if not room:
                room = self._payment_rooms.get(room_key)
            if not room:
                room = self._room_invitations.get(room_key)
            if not room:
                return None
            room["creator_proceeded"] = True
            room["creatorProceeded"] = True
            if specifications is not None:
                room["specifications"] = specifications
            return dict(room)

    def sync_pre_payment_room(self, room_data: dict) -> dict:
        """
        Synchronizes a PrePaymentRoom from database directly into Server RAM cache.
        Merges new or updated fields into RAM.
        """
        with self._lock:
            room_id = room_data.get("id") or room_data.get("orderNumber") or room_data.get("order_number")
            if not room_id:
                return room_data
            existing = self._pre_payment_rooms.get(room_id, {})
            merged = {**existing, **room_data}
            self._pre_payment_rooms[room_id] = merged
            self._room_invitations[room_id] = merged
            return merged

    def delete_pre_payment_room(self, room_id: str) -> None:
        """Deletes a pre-payment room from Server RAM cache."""
        self.record_invalidate("pre_payment_room")
        with self._lock:
            self._pre_payment_rooms.pop(str(room_id), None)
            self._room_invitations.pop(str(room_id), None)

    def remove_user(self, user_id: str) -> None:
        """Removes a user and their indexed entries from Server RAM cache."""
        self.record_invalidate("user")
        self.record_invalidate("username")
        self.record_invalidate("phone")
        with self._lock:
            u = self._users_by_id.pop(str(user_id), None)
            if u:
                if u.get("email"):
                    self._identifier_to_id.pop(str(u["email"]).lower(), None)
                if u.get("whatsapp_number"):
                    ph = re.sub(r"\D", "", str(u["whatsapp_number"]))
                    self._identifier_to_id.pop(ph, None)
                    self._phones.pop(ph, None)
                if u.get("username"):
                    un = str(u["username"]).lower().lstrip("@")
                    self._identifier_to_id.pop(un, None)
                    self._usernames.pop(un, None)

    def get_pre_payment_rooms(
        self,
        user_id: Optional[str] = None,
        caller_identifiers: Optional[set] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
    ) -> List[dict]:
        """Returns pre-payment rooms filtered strictly to participant caller and paginated."""
        with self._lock:
            active_invites = [
                r for r in self._pre_payment_rooms.values()
                if not r.get("counterparty_joined")
                and r.get("status") not in ["accepted", "joined", "awaiting_payment", "completed", "cancelled", "killed"]
                and r.get("status_text") not in ["Cancelled", "Killed"]
                and r.get("reason") != "creator_cancelled"
            ]
            if user_id or caller_identifiers:
                filtered = []
                ids = set(caller_identifiers) if caller_identifiers else set()
                if user_id:
                    ids.add(user_id)
                for r in active_invites:
                    is_participant = (
                        r.get("buyer_id") in ids
                        or r.get("seller_id") in ids
                        or str(r.get("creator_id") or "") in ids
                        or str(r.get("creator") or "").lower().strip() in ids
                        or str(r.get("counterparty") or "").lower().strip() in ids
                        or str(r.get("counterparty_username") or "").lower().lstrip("@") in ids
                        or str(r.get("counterparty_phone") or "") in ids
                    )
                    if not is_participant and ids:
                        # Also check phone digit substring for creator_id
                        c_id = str(r.get("creator_id") or "").strip()
                        if c_id and len(c_id) >= 7 and any(len(ident) >= 7 and (ident in c_id or c_id in ident) for ident in ids):
                            is_participant = True
                    if is_participant:
                        filtered.append(r)
                active_invites = filtered

            active_invites.sort(key=lambda r: str(r.get("id") or r.get("orderNumber") or ""), reverse=True)

            if cursor:
                active_invites = [r for r in active_invites if str(r.get("id") or r.get("orderNumber") or "") < cursor]

            result = active_invites[:limit]
            if result:
                self.record_hit("pre_payment_room")
            else:
                self.record_miss("pre_payment_room")
            return [self._compute_room_timer(r) for r in result]

    def get_pre_payment_room(self, room_id: str) -> Optional[dict]:
        """Gets a specific pre-payment room by ID."""
        with self._lock:
            res = self._pre_payment_rooms.get(room_id)
            if res:
                self.record_hit("pre_payment_room")
            else:
                self.record_miss("pre_payment_room")
            return self._compute_room_timer(res)

    def move_pre_to_payment_room(self, room_id: str, accepter: Optional[str] = None) -> Optional[dict]:
        """
        Moves an approved pre-payment room OUT of _pre_payment_rooms and into _payment_rooms.
        """
        self.record_invalidate("pre_payment_room")
        with self._lock:
            room_key = str(room_id)
            pre = self._pre_payment_rooms.pop(room_key, None)
            if not pre:
                pre = self._room_invitations.get(room_key, {})

            fmt_accepter = format_full_name(accepter) if accepter else None
            role = pre.get("role", "Buying")
            creator = pre.get("creator") or "Howard Ukah"
            counterparty = fmt_accepter or pre.get("counterparty") or "Counterparty"
            seller_name = counterparty if role == "Buying" else creator
            buyer_name = creator if role == "Buying" else counterparty

            record = {
                **pre,
                "id": room_key,
                "orderNumber": room_key,
                "order_number": room_key,
                "seller_name": seller_name,
                "buyer_name": buyer_name,
                "sellerName": seller_name,
                "buyerName": buyer_name,
                "counterparty_joined": True,
                "counterpartyJoined": True,
                "status": "awaiting_payment",
                "status_text": "Awaiting Payment",
                "statusText": "Awaiting Payment",
                "category": "ongoing",
                "approved_at": utc_now().isoformat(),
                "updated_at": utc_now().isoformat(),
            }
            self._payment_rooms[room_key] = record
            if room_key in self._room_invitations:
                self._room_invitations[room_key].update({
                    "counterparty_joined": True,
                    "counterpartyJoined": True,
                    "status": "joined",
                    "status_text": "Joined",
                })
            return record

    def sync_payment_room(self, room_data: dict) -> dict:
        """Syncs an approved payment room into Server RAM cache, ensuring it's removed from pre-payment rooms."""
        with self._lock:
            room_id = str(room_data.get("id") or room_data.get("orderNumber") or room_data.get("order_number") or "")
            if not room_id:
                return room_data
            self._pre_payment_rooms.pop(room_id, None)
            existing = self._payment_rooms.get(room_id, {})
            merged = {**existing, **room_data, "id": room_id, "orderNumber": room_id, "order_number": room_id}
            self._payment_rooms[room_id] = merged
            return merged

    def delete_payment_room(self, room_id: str) -> None:
        """Deletes a payment room from RAM cache."""
        self.record_invalidate("payment_room")
        with self._lock:
            self._payment_rooms.pop(str(room_id), None)

    def get_payment_rooms(
        self,
        user_id: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
    ) -> List[dict]:
        """Returns approved active payment rooms filtered strictly by participant user_id and paginated."""
        with self._lock:
            all_rooms = list(self._payment_rooms.values())
            if user_id:
                rooms = [r for r in all_rooms if r.get("buyer_id") == user_id or r.get("seller_id") == user_id]
            else:
                rooms = all_rooms

            rooms.sort(key=lambda r: str(r.get("order_number") or r.get("id") or ""), reverse=True)

            if cursor:
                rooms = [r for r in rooms if str(r.get("order_number") or r.get("id") or "") < cursor]

            result = rooms[:limit]
            if result:
                self.record_hit("payment_room")
            else:
                self.record_miss("payment_room")
            return result

    def get_payment_room(self, room_id: str) -> Optional[dict]:
        """Gets a payment room by ID."""
        with self._lock:
            room = self._payment_rooms.get(str(room_id))
            if room:
                self.record_hit("payment_room")
            else:
                self.record_miss("payment_room")
            return room

    def kill_pre_payment_room(self, room_id: str) -> Optional[dict]:
        """Kills/deactivates a pre-payment room upon countdown timer expiration."""
        with self._lock:
            if room_id in self._pre_payment_rooms:
                pre = self._pre_payment_rooms[room_id]
                pre["status"] = "expired"
                pre["status_text"] = "Expired"
                pre["statusText"] = "Expired"
                pre["is_expired"] = True
                pre["updated_at"] = utc_now().isoformat()
            if room_id in self._room_invitations:
                inv = self._room_invitations[room_id]
                inv["status"] = "expired"
                inv["is_expired"] = True

            # Mark notifications for this room as expired
            for t, notifs in self._notifications.items():
                for n in notifs:
                    if n.get("room_id") == room_id:
                        n["status"] = "expired"
                        n["expired"] = True
            return self._pre_payment_rooms.get(room_id)

    def remove_pre_payment_room(self, room_id: str):
        """Permanently removes a pre-payment room from RAM cache."""
        with self._lock:
            self._pre_payment_rooms.pop(room_id, None)
            self._room_invitations.pop(room_id, None)
            for k in list(self._pre_payment_rooms.keys()):
                r = self._pre_payment_rooms[k]
                if r.get("id") == room_id or r.get("order_number") == room_id or r.get("orderNumber") == room_id:
                    self._pre_payment_rooms.pop(k, None)

    def resend_pre_payment_room(self, room_id: str) -> Optional[dict]:
        """Resends / reactivates a pre-payment room, restarting the countdown timer."""
        with self._lock:
            now = utc_now()
            now_iso = now.isoformat()
            now_ms = int(now.timestamp() * 1000)
            from datetime import timedelta
            expires_at = (now + timedelta(seconds=120)).isoformat()
            expires_at_ms = now_ms + 120_000

            if room_id in self._pre_payment_rooms:
                pre = self._pre_payment_rooms[room_id]
                pre["status"] = "pending_invite"
                pre["status_text"] = "Invite Sent"
                pre["statusText"] = "Invite Sent"
                pre["is_expired"] = False
                pre["counterparty_joined"] = False
                pre["counterpartyJoined"] = False
                pre["created_at"] = now_iso
                pre["updated_at"] = now_iso
                pre["resent_at"] = now_ms
                pre["created_at_ms"] = now_ms
                pre["expires_at"] = expires_at
                pre["expires_at_ms"] = expires_at_ms
                pre["seconds_left"] = 120
                pre["secondsLeft"] = 120
                pre["resend_count"] = pre.get("resend_count", 0) + 1
                pre["resendCount"] = pre["resend_count"]
            if room_id in self._room_invitations:
                inv = self._room_invitations[room_id]
                inv["status"] = "pending_invite"
                inv["is_expired"] = False
                inv["counterparty_joined"] = False
                inv["created_at"] = now_iso
                inv["updated_at"] = now_iso
                inv["resent_at"] = now_ms
                inv["created_at_ms"] = now_ms
                inv["expires_at"] = expires_at
                inv["expires_at_ms"] = expires_at_ms
                inv["seconds_left"] = 120
                inv["secondsLeft"] = 120
                inv["resend_count"] = inv.get("resend_count", 0) + 1
                inv["resendCount"] = inv["resend_count"]

            # Refresh notification for counterparty
            room_data = self._pre_payment_rooms.get(room_id) or self._room_invitations.get(room_id)
            if room_data:
                creator = room_data.get("creator") or "Howard Ukah"
                item = room_data.get("item") or room_data.get("title") or "Payment Room"
                amount = room_data.get("amount") or room_data.get("price") or "₦0.00"
                counterparty_un = (room_data.get("counterparty_username") or room_data.get("counterpartyUsername") or "").lstrip("@")
                counterparty_ph = room_data.get("counterparty_phone") or room_data.get("counterpartyPhone") or ""
                counterparty = room_data.get("counterparty") or room_data.get("counterpartyName") or ""

                notif = {
                    "id": f"notif_{int(utc_now().timestamp() * 1000)}",
                    "type": "room_invitation",
                    "room_id": room_id,
                    "title": "Payment Room Invitation (Resent)",
                    "message": f"{creator} resent invitation for {item} ({amount}).",
                    "item": item,
                    "amount": amount,
                    "creator": creator,
                    "counterparty": counterparty,
                    "created_at": utc_now().isoformat(),
                    "status": "pending",
                    "accepted": False,
                }
                targets = []
                if counterparty_un:
                    targets.append(counterparty_un.lower())
                if counterparty_ph:
                    ph_dig = re.sub(r"\D", "", counterparty_ph)
                    if ph_dig:
                        targets.append(ph_dig)
                if counterparty:
                    targets.append(counterparty.lower().strip())

                for t in targets:
                    if t not in self._notifications:
                        self._notifications[t] = []
                    self._notifications[t].append(notif)

            return self._pre_payment_rooms.get(room_id)

    def clear(self):
        """Clears all entries and indices from RAM cache."""
        with self._lock:
            self._users_by_id.clear()
            self._identifier_to_id.clear()
            self._usernames.clear()
            self._phones.clear()
            self._room_invitations.clear()
            self._pre_payment_rooms.clear()
            self._payment_rooms.clear()
            self._notifications.clear()
            self.hits = 0
            self.misses = 0
            for p in self._prefix_stats:
                self._prefix_stats[p] = {"hits": 0, "misses": 0, "invalidates": 0}

    def stats(self) -> Dict[str, Any]:
        """Telemetry reporting."""
        with self._lock:
            return {
                "cached_users_count": len(self._users_by_id),
                "cached_usernames_count": len(self._usernames),
                "cached_phones_count": len(self._phones),
                "active_room_invitations": len(self._room_invitations),
                "indexed_identifiers": len(self._identifier_to_id),
                "cache_hits": self.hits,
                "cache_misses": self.misses,
            }


# Singleton RAM cache instance for the server
ram_cache = ServerRAMCache()
