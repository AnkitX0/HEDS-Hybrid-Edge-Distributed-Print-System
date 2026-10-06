import pytest
from app.core.security import (
    generate_pickup_otp,
    hash_pickup_otp,
    verify_pickup_otp,
    generate_guest_order_token,
    hash_password,
    verify_password,
)


def test_pickup_otp_generation_and_verification():
    otp = generate_pickup_otp()
    assert len(otp) == 6
    assert otp.isdigit()

    otp_hash, salt = hash_pickup_otp(otp)
    assert otp_hash != otp  # Never plaintext
    assert len(salt) > 0

    # Verification
    assert verify_pickup_otp(otp, otp_hash, salt) is True
    assert verify_pickup_otp("000000", otp_hash, salt) is False


def test_guest_token_randomness():
    tok1 = generate_guest_order_token()
    tok2 = generate_guest_order_token()
    assert tok1 != tok2
    assert len(tok1) >= 32


def test_password_hashing():
    pw = "supersecret123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("wrongpass", hashed) is False
