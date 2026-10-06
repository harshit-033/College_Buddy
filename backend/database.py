import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Default to SQLite for local dev if no DATABASE_URL is provided
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Normalize DATABASE_URL for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Enforce PostgreSQL in production
if ENVIRONMENT == "production" and not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError("CRITICAL: Production environment requires PostgreSQL DATABASE_URL.")

# Handle special characters in password (like @) or malformed URLs
if "://" in DATABASE_URL and "@" in DATABASE_URL:
    try:
        prefix, rest = DATABASE_URL.rsplit("@", 1)
        if "@" in prefix:
            scheme_user, password = prefix.rsplit(":", 1)
            encoded_password = urllib.parse.quote(password)
            DATABASE_URL = f"{scheme_user}:{encoded_password}@{rest}"
    except Exception:
        pass

# PostgreSQL conservative pooling for small EC2 instances (pool_size=5, max_overflow=2)
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
    )
else:
    # SQLite settings for development/testing
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()