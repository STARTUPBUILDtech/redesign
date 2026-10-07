from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.services.ram_cache import ram_cache
from app.routers import auth
from app.security.headers import SecurityHeadersMiddleware

# Ensure database tables exist in development / fallback
Base.metadata.create_all(bind=engine)


def warmup_ram_cache():
    """Pre-load existing users from database into server RAM cache on boot."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            ram_cache.cache_user(u)
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

# 3. Include Authentication Router
app.include_router(auth.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "PayKudi Auth", "environment": settings.ENVIRONMENT}
