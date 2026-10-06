import psycopg2
try:
    conn = psycopg2.connect("postgresql://postgres:5585@localhost/campusiq")
    cur = conn.cursor()
    cur.execute("ALTER TABLE volunteer_whitelist ADD COLUMN status VARCHAR DEFAULT 'approved';")
    cur.execute("ALTER TABLE volunteer_whitelist ADD COLUMN user_id INTEGER REFERENCES users(id);")
    conn.commit()
    print("Columns added if they didn't exist.")
except Exception as e:
    print(f"Error: {e}")
