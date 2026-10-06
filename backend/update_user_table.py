from sqlalchemy import create_engine, text
from database import DATABASE_URL

def migrate():
    engine = create_engine(DATABASE_URL)
    columns = [
        ("profile_photo", "VARCHAR"),
        ("phone", "VARCHAR"),
        ("address", "VARCHAR"),
        ("student_type", "VARCHAR"),
        ("institution_name", "VARCHAR"),
        ("board", "VARCHAR"),
        ("grade", "VARCHAR"),
        ("semester", "VARCHAR"),
        ("course", "VARCHAR"),
        ("department", "VARCHAR"),
        ("section", "VARCHAR"),
        ("roll_number", "VARCHAR"),
        ("org_name", "VARCHAR"),
        ("org_address", "VARCHAR")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                print(f"Added column {col_name}")
            except Exception as e:
                print(f"Skipping {col_name}: {e}")
        conn.commit()

if __name__ == "__main__":
    migrate()
