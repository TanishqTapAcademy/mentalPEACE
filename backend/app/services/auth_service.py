import uuid
from datetime import datetime, timedelta, timezone

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# --- Password utilities ---

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# --- JWT utilities ---

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": user_id, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {"sub": user_id, "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# --- User CRUD ---

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, email: str, username: str, password: str
) -> User:
    """Create a new user. Raises ValueError if email/username already exists."""
    user = User(
        email=email.strip().lower(),
        username=username.strip(),
        hashed_password=hash_password(password),
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise ValueError("An account with this email or username already exists")
    return user


def verify_google_token(credential: str) -> dict:
    """Verify Google ID token and return user info."""
    return id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
    )


async def get_or_create_google_user(db: AsyncSession, google_info: dict) -> User:
    """Find existing user by google_id or email, or create a new one."""
    google_id = google_info["sub"]
    email = google_info["email"].strip().lower()

    # Check by google_id first
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    # Check by email (user signed up with email/password before)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        user.google_id = google_id
        await db.commit()
        await db.refresh(user)
        return user

    # Create new user — derive username from email
    base_username = email.split("@")[0][:25]
    username = base_username
    # Ensure username is unique
    for i in range(100):
        result = await db.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none() is None:
            break
        username = f"{base_username}_{i + 1}"

    user = User(
        email=email,
        username=username,
        google_id=google_id,
        hashed_password=None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
