import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Default to SQLite for local dev if no DATABASE_URL is provided
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Normalize DATABASE_URL for SQLAlchemy/Render/Supabase issues
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Handle special characters in password (like @) or malformed URLs
# Many providers use strings that break simple parsers. 
# We ensure the URI is standard or falling back to a safe parse.
if "://" in DATABASE_URL and "@" in DATABASE_URL:
    try:
        # Split on the last '@' to separate user info from host
        prefix, rest = DATABASE_URL.rsplit("@", 1)
        # Re-encode the password part if it contains another '@'
        if "@" in prefix:
            # Format: scheme://user:password
            scheme_user, password = prefix.rsplit(":", 1)
            # URL encode the password to preserve the @ for the URI parser
            import urllib.parse
            encoded_password = urllib.parse.quote(password)
            DATABASE_URL = f"{scheme_user}:{encoded_password}@{rest}"
    except Exception:
        pass # Fallback to original if parsing fails

# PostgreSQL specific tuning (pooling) if using Postgres
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
    )
else:
    # SQLite settings (default)
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