import os
from typing import List
from pydantic import Field

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel
    class BaseSettings(BaseModel):
        pass
    SettingsConfigDict = dict



class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database & Redis
    DATABASE_URL: str = "sqlite:///./paykudi_auth.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Password Pepper & Argon2 Parameters (argon2-cffi)
    # Server-side secret pepper appended/mixed with password before hashing
    AUTH_PEPPER: str = "default_secure_paykudi_pepper_32_bytes_min_length_secret"
    ARGON2_TIME_COST: int = 3
    ARGON2_MEMORY_COST: int = 65536  # 64 MB (64 * 1024 KB)
    ARGON2_PARALLELISM: int = 2
    ARGON2_HASH_LEN: int = 32
    ARGON2_SALT_LEN: int = 16

    # JWT Settings
    JWT_SECRET: str = "super_secret_jwt_signing_key_paykudi_production_minimum_32_characters"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Error Message Strategy
    # When true: granular messages ("Incorrect password (X attempts left)", "Account locked...")
    # When false: generic message ("Invalid credentials")
    SPECIFIC_LOGIN_ERRORS: bool = True

    # Rate Limiting & Account Lockout
    MAX_LOGIN_ATTEMPTS_PER_IP: int = 10
    IP_RATE_LIMIT_WINDOW_MINUTES: int = 15
    MAX_ACCOUNT_FAILED_ATTEMPTS: int = 5
    INITIAL_LOCKOUT_MINUTES: int = 15
    MAX_LOCKOUT_HOURS: int = 24
    CREDENTIAL_STUFFING_ACCOUNT_THRESHOLD: int = 10
    CREDENTIAL_STUFFING_BLOCK_HOURS: int = 24

    # Cloudflare Turnstile
    TURNSTILE_REQUIRED_AFTER_FAILED_ATTEMPTS: int = 3
    CLOUDFLARE_TURNSTILE_SECRET_KEY: str = "0x4AAAAAAA_MOCK_SECRET"
    CLOUDFLARE_TURNSTILE_ENABLED: bool = False

    # Trusted Proxies (CIDRs or IPs)
    TRUSTED_PROXIES: List[str] = Field(
        default_factory=lambda: ["127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    )

    # Cookies & CORS
    PAYKUDI_FRONTEND_ORIGIN: str = "http://localhost:5174"
    COOKIE_DOMAIN: str = "localhost"
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"  # "strict" in production
    CSRF_SECRET: str = "csrf_token_secret_salt_for_double_submit_cookies_paykudi"

    # WhatsApp OTP Two-Step Verification
    OTP_EXPIRE_MINUTES: int = 5
    MAX_OTP_ATTEMPTS: int = 5


settings = Settings()
