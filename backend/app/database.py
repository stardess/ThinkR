from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    import app.models  # noqa: F401 – registers all models with Base metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight self-healing migrations for columns added after initial
        # table creation (avoids requiring a manual reseed in dev).
        await conn.execute(
            text(
                "ALTER TABLE student_profiles "
                "ADD COLUMN IF NOT EXISTS prior_experience JSON DEFAULT '[]'"
            )
        )
