from database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE events ADD COLUMN max_volunteers INTEGER"))
    print("Success")
except Exception as e:
    print("Error:", e)
