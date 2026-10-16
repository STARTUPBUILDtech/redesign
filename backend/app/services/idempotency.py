import json
import hashlib
from typing import Optional, Tuple, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import IdempotencyKey


def compute_request_hash(data: Any) -> str:
    """Computes a stable SHA-256 hash of the request payload."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def check_idempotency(
    db: Session,
    key: Optional[str],
    user_id: Optional[str],
    endpoint: str,
    request_data: Any,
) -> Optional[Tuple[int, dict]]:
    """
    Checks if an Idempotency-Key has already been used.
    - If key is missing: raises 400 Bad Request (Idempotency-Key is required on money-moving calls).
    - If key exists with MATCHING request hash: returns stored (status_code, response_body) for replay.
    - If key exists with DIFFERENT request hash: raises 422 Unprocessable Entity.
    - If key does not exist: returns None (caller should proceed).
    """
    if not key or not key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header is required on money-moving financial endpoints.",
        )

    clean_key = key.strip()
    req_hash = compute_request_hash(request_data)

    existing = (
        db.query(IdempotencyKey)
        .filter(IdempotencyKey.key == clean_key)
        .first()
    )

    if existing:
        if existing.request_hash != req_hash:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Idempotency-Key reused with a different request payload.",
            )
        try:
            body = json.loads(existing.response_body)
        except Exception:
            body = {"message": existing.response_body}
        return existing.response_code, body

    return None


def record_idempotency(
    db: Session,
    key: str,
    user_id: Optional[str],
    endpoint: str,
    request_data: Any,
    response_code: int,
    response_body: dict,
):
    """Saves the completed response for future replaying."""
    try:
        clean_key = key.strip()
        req_hash = compute_request_hash(request_data)
        serialized_body = json.dumps(response_body, default=str)

        entry = IdempotencyKey(
            key=clean_key,
            user_id=user_id,
            endpoint=endpoint,
            request_hash=req_hash,
            response_code=response_code,
            response_body=serialized_body,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
