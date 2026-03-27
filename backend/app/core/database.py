from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Convert postgresql:// to postgresql+asyncpg://
database_url = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

# Remove pgbouncer param (not needed for asyncpg)
if "?pgbouncer=true" in database_url:
    database_url = database_url.replace("?pgbouncer=true", "")

# statement_cache_size=0 required for Supabase PgBouncer
engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    connect_args={"statement_cache_size": 0},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
