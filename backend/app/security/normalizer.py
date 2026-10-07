import re
from typing import Tuple
import phonenumbers
from phonenumbers import NumberParseException


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def normalize_email(email: str) -> str:
    """Normalize email: strip whitespace and lowercase."""
    return email.strip().lower()


def normalize_phone(phone: str, default_region: str = "NG") -> str:
    """
    Normalize phone number to international E.164 format (e.g. +2348032001585).
    Defaults to Nigeria ('NG') region for local numbers like 08032001585.
    """
    cleaned = phone.strip()
    try:
        parsed = phonenumbers.parse(cleaned, default_region)
        if not phonenumbers.is_possible_number(parsed) or not phonenumbers.is_valid_number(parsed):
            # Attempt with leading plus if not provided
            if not cleaned.startswith("+"):
                parsed = phonenumbers.parse("+" + cleaned, None)

        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except NumberParseException:
        pass

    # Basic regex cleanup fallback for E.164: + followed by 10-15 digits
    digits = re.sub(r"\D", "", cleaned)
    if cleaned.startswith("+") and 10 <= len(digits) <= 15:
        return f"+{digits}"
    if digits.startswith("234") and len(digits) == 13:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+234{digits[1:]}"
    if len(digits) == 10:
        return f"+234{digits}"

    return cleaned


def is_phone_number(val: str) -> bool:
    """Determine if identifier resembles a phone number rather than an email."""
    return "@" not in val


def normalize_identifier(identifier: str) -> Tuple[str, str]:
    """
    Detect whether the identifier is an email or WhatsApp phone number.
    Returns: (normalized_value, id_type) where id_type is 'email' or 'phone'.
    """
    raw = identifier.strip()
    if "@" in raw:
        return normalize_email(raw), "email"
    else:
        return normalize_phone(raw), "phone"
