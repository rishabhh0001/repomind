"""Database connection and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


async def get_db() -> AsyncSession:
    """Dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables and install pgvector extension."""
    import logging
    import asyncio
    logger = logging.getLogger(__name__)
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Connecting to database (attempt {attempt}/{max_retries})...")
            async with engine.begin() as conn:
                try:
                    await conn.execute(
                        __import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS vector")
                    )
                except Exception as ext_err:
                    logger.warning(f"pgvector extension creation notice: {ext_err}")
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully.")
            return
        except Exception as e:
            logger.error(f"Database connection attempt {attempt} failed: {e}")
            if attempt < max_retries:
                await asyncio.sleep(2)
            else:
                logger.error("Could not connect to database after retries. Check DATABASE_URL host and region.")
