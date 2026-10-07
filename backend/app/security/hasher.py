import hmac
import hashlib
from typing import Tuple
from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from ..config import settings


class PasswordHasherService:
    def __init__(self):
        self._init_hasher()

    def _init_hasher(self):
        self.ph = PasswordHasher(
            time_cost=settings.ARGON2_TIME_COST,
            memory_cost=settings.ARGON2_MEMORY_COST,
            parallelism=settings.ARGON2_PARALLELISM,
            hash_len=settings.ARGON2_HASH_LEN,
            salt_len=settings.ARGON2_SALT_LEN,
            type=Type.ID,
        )
        self._dummy_password = "paykudi_timing_attack_prevention_dummy_password"
        self._dummy_hash = self.ph.hash(self._pepper_password(self._dummy_password))

    def _pepper_password(self, password: str) -> str:
        """
        Apply HMAC-SHA256 with server-side secret pepper before passing to Argon2.
        This prevents length-extension issues and ensures the database hash
        is completely useless without the application server's pepper key.
        """
        pepper_bytes = settings.AUTH_PEPPER.encode("utf-8")
        password_bytes = password.encode("utf-8")
        return hmac.new(pepper_bytes, password_bytes, hashlib.sha256).hexdigest()

    def hash_password(self, password: str) -> str:
        """Hash password with server pepper and Argon2id."""
        peppered = self._pepper_password(password)
        return self.ph.hash(peppered)

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against an Argon2id hash in constant-time."""
        peppered = self._pepper_password(password)
        try:
            return self.ph.verify(hashed_password, peppered)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False

    def check_needs_rehash(self, hashed_password: str) -> bool:
        """Check if hash parameters are obsolete and require rehashing."""
        try:
            return self.ph.check_needs_rehash(hashed_password)
        except Exception:
            return False

    def dummy_verify(self, password: str = "dummy") -> None:
        """
        Execute an identical Argon2id verify against precomputed dummy hash.
        Used when a requested user does not exist to eliminate timing discrepancies.
        """
        peppered = self._pepper_password(password)
        try:
            self.ph.verify(self._dummy_hash, peppered)
        except Exception:
            pass


password_hasher = PasswordHasherService()

# Module-level convenience functions
hash_password = password_hasher.hash_password
verify_password = password_hasher.verify_password
check_needs_rehash = password_hasher.check_needs_rehash
dummy_verify = password_hasher.dummy_verify
