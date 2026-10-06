from database import SessionLocal
import models
import qrcode
import os

db = SessionLocal()
regs = db.query(models.Registration).all()
count = 0

os.makedirs("qr_codes", exist_ok=True)

for r in regs:
    filepath = os.path.join("qr_codes", f"{r.qr_code}.png")
    if not os.path.exists(filepath):
        img = qrcode.make(f"TICKET:{r.qr_code}")
        img.save(filepath)
        count += 1

db.close()
print(f"Generated {count} missing QR images.")
