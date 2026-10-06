import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate signed JWT access token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def generate_guest_order_token() -> str:
    """Generate a high-entropy URL-safe guest access token for students"""
    return secrets.token_urlsafe(32)


def generate_pickup_otp() -> str:
    """Generate 6-digit numeric pickup code"""
    return f"{secrets.randbelow(900000) + 100000:06d}"


def hash_pickup_otp(otp: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hash pickup OTP with salt using SHA-256 PBKDF2.
    Returns (hashed_otp, salt).
    """
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        otp.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return hashed, salt


def verify_pickup_otp(otp: str, hashed_otp: str, salt: str) -> bool:
    """Verify pickup OTP against salted hash"""
    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        otp.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return hmac.compare_digest(computed_hash, hashed_otp)


def generate_agent_key() -> str:
    """Generate secure registration/auth key for Edge Agent"""
    return f"agnt_{secrets.token_hex(24)}"
