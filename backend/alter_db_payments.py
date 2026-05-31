import os
from sqlalchemy import text
import sys

# Add backend directory to path to import database config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import engine

def migrate():
    print("Running database migration...")
    with engine.begin() as conn:
        # Add volunteer_fee column to events table if not already present
        try:
            conn.execute(text("ALTER TABLE events ADD COLUMN volunteer_fee FLOAT DEFAULT 0.0"))
            print("Successfully added volunteer_fee column to events table!")
        except Exception as e:
            print("Skipped adding volunteer_fee (it may already exist or table is fresh):", e)

if __name__ == "__main__":
    migrate()
