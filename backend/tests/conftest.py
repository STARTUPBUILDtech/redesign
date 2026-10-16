import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import fakeredis
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.config import settings
from app.models import User, KnownDevice
from app.security.hasher import password_hasher
from app.security.tokens import generate_refresh_token, hash_refresh_token
from app.services.rate_limiter import set_redis, RateLimiter
from app.security.csrf import generate_csrf_token, CSRF_COOKIE_NAME, CSRF_HEADER_NAME

# Use in-memory SQLite database for deterministic tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    # Use low Argon2 cost for fast tests while exercising the real Argon2id implementation
    settings.ARGON2_TIME_COST = 1
    settings.ARGON2_MEMORY_COST = 2048  # 2MB for fast tests
    settings.ARGON2_PARALLELISM = 1
    settings.CLOUDFLARE_TURNSTILE_ENABLED = False
    settings.SPECIFIC_LOGIN_ERRORS = True
    settings.PAYKUDI_FRONTEND_ORIGIN = "http://localhost:5174"
    # Re-initialize hasher with test parameters for speed
    from argon2 import PasswordHasher
    password_hasher.ph = PasswordHasher(
        time_cost=settings.ARGON2_TIME_COST,
        memory_cost=settings.ARGON2_MEMORY_COST,
        parallelism=settings.ARGON2_PARALLELISM,
        hash_len=settings.ARGON2_HASH_LEN,
        salt_len=settings.ARGON2_SALT_LEN,
    )


from app.services.ram_cache import ram_cache

@pytest.fixture(autouse=True)
def init_db_and_redis():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    fake_r = fakeredis.FakeRedis(decode_responses=True)
    set_redis(fake_r)
    ram_cache.clear()
    yield
    Base.metadata.drop_all(bind=test_engine)
    ram_cache.clear()


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def fake_redis_client():
    client = fakeredis.FakeRedis(decode_responses=True)
    set_redis(client)
    return client


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, base_url="http://testserver") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def csrf_context():
    """Generates matching CSRF cookie and header for test requests."""
    token = generate_csrf_token()
    cookies = {CSRF_COOKIE_NAME: token}
    headers = {CSRF_HEADER_NAME: token}
    return {"cookies": cookies, "headers": headers, "token": token}


@pytest.fixture
def create_test_user(db_session):
    """Factory fixture to create standard test users with Argon2id hashed passwords."""
    def _create(
        email="testuser@paykudi.com",
        whatsapp_number="+2348012345678",
        password="SecurePassword123!",
        is_verified=True,
        known_ip="testclient",
    ) -> User:
        p_hash = password_hasher.hash_password(password)
        user = User(
            email=email,
            whatsapp_number=whatsapp_number,
            password_hash=p_hash,
            is_verified=is_verified,
            failed_attempts=0,
            lock_count=0,
        )
        db_session.add(user)
        db_session.flush()

        if known_ip:
            device = KnownDevice(
                user_id=user.id,
                ip=known_ip,
                user_agent="TestClient/1.0",
            )
            db_session.add(device)

        db_session.commit()
        db_session.refresh(user)
        return user

    return _create
