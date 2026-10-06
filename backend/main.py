from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy import inspect, text
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import os
import qrcode
import shutil
import joblib
from datetime import datetime, timedelta
import io
import logging
import cloudinary
import cloudinary.uploader
from cloudinary.uploader import upload
from cloudinary.utils import cloudinary_url

from database import engine, Base, SessionLocal
import models
from security import hash_password, verify_password, create_access_token
from auth import get_current_user
import razorpay

# Setup production-safe logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("collegebuddy")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Razorpay credentials - no hardcoded credentials
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

if ENVIRONMENT == "production":
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise RuntimeError("CRITICAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required in production!")
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    else:
        # Development dummy client so non-payment endpoints don't crash without credentials
        razorpay_client = razorpay.Client(auth=("rzp_test_placeholder", "secret_placeholder"))

app = FastAPI(title="CollegeBuddy / CampusIQ API")

# Environment-based CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip()

if ENVIRONMENT == "production":
    if not FRONTEND_URL:
        logger.warning("FRONTEND_URL is empty in production mode. CORS will reject cross-origin requests!")
        allowed_origins = []
    else:
        allowed_origins = [origin.strip() for origin in FRONTEND_URL.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]
    if FRONTEND_URL:
        for origin in FRONTEND_URL.split(","):
            if origin.strip() and origin.strip() not in allowed_origins:
                allowed_origins.append(origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Cloudinary Configuration
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")
if ENVIRONMENT == "production" and not CLOUDINARY_URL:
    raise RuntimeError("CRITICAL: CLOUDINARY_URL environment variable is required in production for image and QR storage!")

if CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)
else:
    logger.warning("CLOUDINARY_URL not found. Local disk storage will be used (development only).")

# Storage Configuration for development fallback
STORAGE_DIR = os.getenv("STORAGE_DIR", ".")
QR_CODES_DIR = os.path.join(STORAGE_DIR, "qr_codes")
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")

os.makedirs(QR_CODES_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

app.mount("/qr_codes", StaticFiles(directory=QR_CODES_DIR), name="qr_codes")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# In production, schema is strictly managed via Alembic ('alembic upgrade head').
# Automatic create_all is enabled only in development.
if ENVIRONMENT != "production":
    Base.metadata.create_all(bind=engine)

def _ensure_sqlite_schema_compat():
    """
    Dev-safety net for SQLite files created with older schemas.

    SQLAlchemy `create_all()` does not add new columns to existing tables,
    which can break core flows (e.g. event creation) when `test.db` is stale.
    This only runs for SQLite and only adds missing columns.
    """
    try:
        if not str(engine.url).startswith("sqlite"):
            return

        insp = inspect(engine)
        table_names = set(insp.get_table_names())

        desired = {
            "events": {
                "volunteer_fee": "REAL DEFAULT 0",
                "max_volunteers": "INTEGER",
                "event_date": "DATETIME",
                "event_end_date": "DATETIME",
                "updated_at": "DATETIME",
                "event_type": "TEXT",
                "criteria": "TEXT",
                "prizes": "TEXT",
            },
            "users": {
                "profile_photo": "TEXT",
                "phone": "TEXT",
                "address": "TEXT",
                "student_type": "TEXT",
                "institution_name": "TEXT",
                "board": "TEXT",
                "grade": "TEXT",
                "semester": "TEXT",
                "course": "TEXT",
                "department": "TEXT",
                "section": "TEXT",
                "roll_number": "TEXT",
                "org_name": "TEXT",
                "org_address": "TEXT",
                "updated_at": "DATETIME",
            },
            "volunteer_whitelist": {
                "user_id": "INTEGER",
                "status": "TEXT DEFAULT 'pending'",
                "updated_at": "DATETIME",
            },
            "payments": {
                "payment_id": "TEXT",
                "signature": "TEXT",
                "currency": "TEXT DEFAULT 'INR'",
                "status": "TEXT DEFAULT 'pending'",
                "updated_at": "DATETIME",
            },
            "registrations": {
                "updated_at": "DATETIME",
            },
        }

        for table, columns in desired.items():
            if table not in table_names:
                continue

            existing_cols = {c["name"] for c in insp.get_columns(table)}
            for col_name, col_ddl in columns.items():
                if col_name in existing_cols:
                    continue
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_ddl}"))

        with engine.begin() as conn:
            for table in ("payments", "volunteer_whitelist", "registrations"):
                if table in table_names:
                    conn.execute(text(
                        f"DELETE FROM {table} WHERE event_id NOT IN (SELECT id FROM events)"
                    ))
    except Exception as e:
        logger.warning(f"SQLite schema compatibility check failed: {e}")

if ENVIRONMENT != "production":
    _ensure_sqlite_schema_compat()

@app.on_event("startup")
def on_startup():
    logger.info(f"CollegeBuddy API initialized successfully in [{ENVIRONMENT.upper()}] mode")
    if ENVIRONMENT == "production":
        logger.info(f"Restricted CORS active with {len(allowed_origins)} allowed origin(s)")

@app.on_event("shutdown")
def on_shutdown():
    logger.info("CollegeBuddy API shutting down cleanly")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.error(f"Internal error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "ai", "attendance_model.pkl")

model = None
try:
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        logger.info("AI attendance model loaded successfully")
    else:
        logger.warning(f"AI model file not found at {model_path}")
except Exception as e:
    logger.error(f"Error loading AI model: {e}")

@app.get("/")
def home():
    return {"message": "CollegeBuddy Backend Running"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except Exception as e:
        logger.error(f"Health check failed to query database: {e}")
        return JSONResponse(status_code=503, content={"status": "error", "database": "unavailable"})

# ─── IMAGE VALIDATION HELPER ─────────────────────────────────────────────
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

def validate_image_file(upload_file: Optional[UploadFile]) -> Optional[bytes]:
    if not upload_file or not upload_file.filename:
        return None

    ext = os.path.splitext(upload_file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Allowed extensions are: JPEG, PNG, WEBP"
        )

    if upload_file.content_type and upload_file.content_type.lower() not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type '{upload_file.content_type}'. Allowed types are: image/jpeg, image/png, image/webp"
        )

    contents = upload_file.file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size limit of 5 MB ({len(contents)} bytes)"
        )

    try:
        from PIL import Image
        img = Image.open(io.BytesIO(contents))
        img.verify()
        if img.format.upper() not in {"JPEG", "PNG", "WEBP"}:
            raise HTTPException(status_code=400, detail=f"Unsupported image format: {img.format}")
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    # Rewind file pointer for subsequent processing
    upload_file.file.seek(0)
    return contents

def create_volunteer_registration(user_id: int, event_id: int, db: Session):
    existing_reg = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.user_id == user_id
    ).first()
    if not existing_reg:
        qr_code_str = str(uuid.uuid4())
        new_reg = models.Registration(
            user_id=user_id,
            event_id=event_id,
            qr_code=qr_code_str
        )
        db.add(new_reg)
        db.commit()
        
        qr_data = f"TICKET:{qr_code_str}"
        img = qrcode.make(qr_data)
        
        if os.getenv("CLOUDINARY_URL"):
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            
            cloudinary.uploader.upload(
                img_byte_arr,
                public_id=f"{qr_code_str}",
                folder="collegebuddy/qr_codes"
            )
        else:
            filepath = os.path.join(QR_CODES_DIR, f"{qr_code_str}.png")
            img.save(filepath)

ALLOWED_PUBLIC_ROLES = {"student", "host"}

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class WhitelistRequest(BaseModel):
    email: str
    event_id: int

class BulkWhitelistRequest(BaseModel):
    emails: List[str]
    event_id: int

class ApplyVolunteerRequest(BaseModel):
    event_id: int

class UpdateVolunteerStatusRequest(BaseModel):
    status: str

# ─── AUTH ────────────────────────────────────────────────────────────────

@app.post("/register")
def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    normalized_role = (data.role or "").strip().lower()
    if normalized_role not in ALLOWED_PUBLIC_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid registration role. Allowed public roles are: {', '.join(sorted(ALLOWED_PUBLIC_ROLES))}"
        )

    user_email = str(data.email).strip().lower()
    existing_user = db.query(models.User).filter(models.User.email == user_email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(data.password)

    user = models.User(
        name=data.name.strip(),
        email=user_email,
        password=hashed_password,
        role=normalized_role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    approved_whitelists = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == user.email,
        models.VolunteerWhitelist.status == "approved"
    ).all()

    for aw in approved_whitelists:
        aw.user_id = user.id
        create_volunteer_registration(user.id, aw.event_id, db)
    db.commit()

    return {"message": "User registered successfully"}

@app.post("/login")
def login(
    data: Optional[LoginRequest] = None,
    email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    login_email = (data.email if data else email) or ""
    login_password = (data.password if data else password) or ""

    if not login_email or not login_password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = db.query(models.User).filter(models.User.email == login_email.strip().lower()).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email")

    if not verify_password(login_password, user.password):
        raise HTTPException(status_code=400, detail="Invalid password")

    token_data = {
        "sub": user.email,
        "role": user.role,
        "id": user.id
    }

    token = create_access_token(token_data)
    return {"access_token": token, "token_type": "bearer"}

# ─── USER PROFILE ────────────────────────────────────────────────────────

@app.get("/user/profile")
def get_user_profile(db: Session = Depends(get_db), user_data=Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_data["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "profile_photo": user.profile_photo,
        "phone": user.phone,
        "address": user.address,
        "student_type": user.student_type,
        "institution_name": user.institution_name,
        "board": user.board,
        "grade": user.grade,
        "semester": user.semester,
        "course": user.course,
        "department": user.department,
        "section": user.section,
        "roll_number": user.roll_number,
        "org_name": user.org_name,
        "org_address": user.org_address
    }

@app.put("/user/profile")
def update_user_profile(
    name: str = Form(...),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    student_type: Optional[str] = Form(None),
    institution_name: Optional[str] = Form(None),
    board: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    course: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    section: Optional[str] = Form(None),
    roll_number: Optional[str] = Form(None),
    org_name: Optional[str] = Form(None),
    org_address: Optional[str] = Form(None),
    profile_photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    user_data=Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == user_data["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.name = name
    user.phone = phone
    user.address = address
    user.student_type = student_type
    user.institution_name = institution_name
    user.board = board
    user.grade = grade
    user.semester = semester
    user.course = course
    user.department = department
    user.section = section
    user.roll_number = roll_number
    user.org_name = org_name
    user.org_address = org_address

    if profile_photo and profile_photo.filename:
        photo_bytes = validate_image_file(profile_photo)
        if os.getenv("CLOUDINARY_URL"):
            upload_result = cloudinary.uploader.upload(
                io.BytesIO(photo_bytes),
                folder="collegebuddy/profiles",
                public_id=f"profile_{user.id}"
            )
            user.profile_photo = upload_result["secure_url"]
        else:
            os.makedirs(os.path.join(UPLOADS_DIR, "profiles"), exist_ok=True)
            file_extension = os.path.splitext(profile_photo.filename)[1].lower()
            filename = f"profile_{user.id}_{uuid.uuid4().hex[:8]}{file_extension}"
            filepath = os.path.join(UPLOADS_DIR, "profiles", filename)
            
            with open(filepath, "wb") as buffer:
                buffer.write(photo_bytes)
                
            user.profile_photo = f"profiles/{filename}"

    db.commit()
    db.refresh(user)
    
    return {"message": "Profile updated successfully"}

# ─── EVENTS ──────────────────────────────────────────────────────────────

@app.post("/create-event")
def create_event(
    title: str = Form(...),
    description: str = Form(...),
    venue: str = Form(...),
    fee: float = Form(...),
    volunteer_fee: float = Form(0.0),
    participant_limit: int = Form(...),
    max_volunteers: Optional[int] = Form(None),
    event_date: str = Form(None),
    event_end_date: str = Form(None),
    poster: UploadFile = File(None),
    event_type: Optional[str] = Form(None),
    criteria: Optional[str] = Form(None),
    prizes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can create events")

    if participant_limit is None or participant_limit <= 0:
        raise HTTPException(status_code=400, detail="participant_limit must be greater than 0")

    if fee is not None and fee < 0:
        raise HTTPException(status_code=400, detail="fee cannot be negative")

    if volunteer_fee is not None and volunteer_fee < 0:
        raise HTTPException(status_code=400, detail="volunteer_fee cannot be negative")

    if max_volunteers is not None:
        if max_volunteers <= 0:
            raise HTTPException(status_code=400, detail="max_volunteers must be greater than 0")
        if max_volunteers > participant_limit:
            raise HTTPException(status_code=400, detail="max_volunteers cannot exceed participant_limit")

    poster_filename = None

    if poster and poster.filename:
        poster_bytes = validate_image_file(poster)
        if os.getenv("CLOUDINARY_URL"):
            upload_result = cloudinary.uploader.upload(
                io.BytesIO(poster_bytes),
                folder="collegebuddy/posters"
            )
            poster_filename = upload_result["secure_url"]
        else:
            ext = os.path.splitext(poster.filename)[1].lower()
            safe_name = f"{uuid.uuid4().hex}{ext}"
            filepath = os.path.join(UPLOADS_DIR, safe_name)

            with open(filepath, "wb") as buffer:
                buffer.write(poster_bytes)
            poster_filename = safe_name

    parsed_event_date = None
    parsed_event_end_date = None

    if event_date:
        try:
            parsed_event_date = datetime.fromisoformat(event_date)
        except ValueError:
            pass

    if event_end_date:
        try:
            parsed_event_end_date = datetime.fromisoformat(event_end_date)
        except ValueError:
            pass

    if parsed_event_date and parsed_event_end_date and parsed_event_end_date < parsed_event_date:
        raise HTTPException(status_code=400, detail="event_end_date cannot be before event_date")

    event = models.Event(
        title=title,
        description=description,
        venue=venue,
        fee=fee,
        volunteer_fee=volunteer_fee,
        participant_limit=participant_limit,
        max_volunteers=max_volunteers,
        host_id=user["id"],
        poster=poster_filename,
        event_date=parsed_event_date,
        event_end_date=parsed_event_end_date,
        event_type=event_type,
        criteria=criteria,
        prizes=prizes
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return {"message": "Event created successfully", "event_id": event.id}

@app.get("/event/{event_id}")
def get_single_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "venue": event.venue,
        "fee": event.fee,
        "volunteer_fee": event.volunteer_fee,
        "participant_limit": event.participant_limit,
        "max_volunteers": event.max_volunteers,
        "poster": event.poster,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "event_end_date": event.event_end_date.isoformat() if event.event_end_date else None,
        "host_id": event.host_id,
        "event_type": event.event_type,
        "criteria": event.criteria,
        "prizes": event.prizes
    }

@app.get("/events")
def get_events(search: str = Query(None), db: Session = Depends(get_db), user=Depends(get_current_user)):
    query = db.query(models.Event)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Event.title.ilike(search_term),
                models.Event.description.ilike(search_term),
                models.Event.venue.ilike(search_term)
            )
        )

    all_events = query.all()
    results = []
    
    # Get current user record to check email
    user_record = db.query(models.User).filter(models.User.id == user["id"]).first()
    
    for event in all_events:
        # Check registration
        reg = db.query(models.Registration).filter(
            models.Registration.event_id == event.id,
            models.Registration.user_id == user["id"]
        ).first()
        
        # Check volunteer whitelist
        volunteer = db.query(models.VolunteerWhitelist).filter(
            models.VolunteerWhitelist.event_id == event.id,
            models.VolunteerWhitelist.email == user_record.email
        ).first()
        
        # Determine applicable fee
        is_approved_volunteer = volunteer and volunteer.status == "approved"
        applicable_fee = event.volunteer_fee if is_approved_volunteer else event.fee
        
        results.append({
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "venue": event.venue,
            "fee": event.fee,
            "volunteer_fee": event.volunteer_fee,
            "participant_limit": event.participant_limit,
            "max_volunteers": event.max_volunteers,
            "poster": event.poster,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "event_end_date": event.event_end_date.isoformat() if event.event_end_date else None,
            "host_id": event.host_id,
            "event_type": event.event_type,
            "criteria": event.criteria,
            "prizes": event.prizes,
            
            # Relation fields
            "has_ticket": reg is not None,
            "ticket_checked_in": reg.checked_in if reg else False,
            "qr_image": reg.qr_code if reg else None,
            "volunteer_status": volunteer.status if volunteer else None,
            "applicable_fee": applicable_fee
        })
        
    return results

@app.get("/host/events")
def get_host_events(db: Session = Depends(get_db), user=Depends(get_current_user)):

    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts allowed")

    return db.query(models.Event).filter(models.Event.host_id == user["id"]).all()

@app.delete("/delete-event/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):

    event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.query(models.Payment).filter(models.Payment.event_id == event_id).delete()
    db.query(models.VolunteerWhitelist).filter(models.VolunteerWhitelist.event_id == event_id).delete()
    db.query(models.Registration).filter(models.Registration.event_id == event_id).delete()
    db.delete(event)
    db.commit()

    return {"message": "Event deleted successfully"}

@app.put("/edit-event/{event_id}")
def edit_event(
    event_id: int,
    title: str = Form(...),
    description: str = Form(...),
    venue: str = Form(...),
    fee: float = Form(...),
    volunteer_fee: float = Form(0.0),
    participant_limit: int = Form(...),
    max_volunteers: Optional[int] = Form(None),
    event_date: str = Form(None),
    event_end_date: str = Form(None),
    event_type: Optional[str] = Form(None),
    criteria: Optional[str] = Form(None),
    prizes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    if participant_limit is None or participant_limit <= 0:
        raise HTTPException(status_code=400, detail="participant_limit must be greater than 0")

    if fee is not None and fee < 0:
        raise HTTPException(status_code=400, detail="fee cannot be negative")

    if volunteer_fee is not None and volunteer_fee < 0:
        raise HTTPException(status_code=400, detail="volunteer_fee cannot be negative")

    if max_volunteers is not None:
        if max_volunteers <= 0:
            raise HTTPException(status_code=400, detail="max_volunteers must be greater than 0")
        if max_volunteers > participant_limit:
            raise HTTPException(status_code=400, detail="max_volunteers cannot exceed participant_limit")

    event.title = title
    event.description = description
    event.venue = venue
    event.fee = fee
    event.volunteer_fee = volunteer_fee
    event.participant_limit = participant_limit
    event.max_volunteers = max_volunteers
    event.event_type = event_type
    event.criteria = criteria
    event.prizes = prizes

    if event_date:
        try:
            event.event_date = datetime.fromisoformat(event_date)
        except ValueError:
            pass

    if event_end_date:
        try:
            event.event_end_date = datetime.fromisoformat(event_end_date)
        except ValueError:
            pass

    if event.event_date and event.event_end_date and event.event_end_date < event.event_date:
        raise HTTPException(status_code=400, detail="event_end_date cannot be before event_date")

    db.commit()

    return {"message": "Event updated"}

# ─── REGISTRATION & TICKETS ─────────────────────────────────────────────

@app.post("/register-event")
def register_event(event_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):

    event = db.query(models.Event).filter(models.Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    total_registered = db.query(models.Registration).filter(
        models.Registration.event_id == event_id
    ).count()

    if total_registered >= event.participant_limit:
        raise HTTPException(status_code=400, detail="Event is full")

    existing = db.query(models.Registration).filter(
        models.Registration.user_id == current_user["id"],
        models.Registration.event_id == event_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already registered")

    # Get current user details
    user_record = db.query(models.User).filter(models.User.id == current_user["id"]).first()

    # Determine fee
    volunteer = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.event_id == event_id,
        models.VolunteerWhitelist.email == user_record.email
    ).first()
    
    is_approved_volunteer = volunteer and volunteer.status == "approved"
    applicable_fee = event.volunteer_fee if is_approved_volunteer else event.fee

    if applicable_fee > 0:
        # Paid event — create Razorpay Order
        try:
            order_data = {
                "amount": int(applicable_fee * 100),  # in paisa
                "currency": "INR",
                "payment_capture": 1
            }
            order = razorpay_client.order.create(data=order_data)
            
            # Save pending payment record
            payment = models.Payment(
                user_id=current_user["id"],
                event_id=event_id,
                order_id=order["id"],
                amount=applicable_fee,
                status="pending"
            )
            db.add(payment)
            db.commit()
            
            return {
                "requires_payment": True,
                "order_id": order["id"],
                "amount": applicable_fee,
                "key_id": RAZORPAY_KEY_ID,
                "event_title": event.title,
                "user_name": user_record.name,
                "user_email": user_record.email,
                "user_phone": user_record.phone or "9999999999"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay Order creation failed: {str(e)}")

    # Free event — directly register
    qr_token = str(uuid.uuid4())

    registration = models.Registration(
        user_id=current_user["id"],
        event_id=event_id,
        qr_code=qr_token
    )

    db.add(registration)
    db.commit()
    db.refresh(registration)

    qr_data = f"TICKET:{qr_token}"
    img = qrcode.make(qr_data)

    qr_image_url = f"/qr_codes/{qr_token}.png"

    if os.getenv("CLOUDINARY_URL"):
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        upload_result = cloudinary.uploader.upload(
            img_byte_arr,
            public_id=f"{qr_token}",
            folder="collegebuddy/qr_codes"
        )
        qr_image_url = upload_result["secure_url"]
    else:
        filename = f"{qr_token}.png"
        filepath = os.path.join(QR_CODES_DIR, filename)
        img.save(filepath)

    return {
        "requires_payment": False,
        "message": "Event registered successfully",
        "qr_token": qr_token,
        "qr_image": qr_image_url
    }

@app.get("/my-tickets")
def get_my_tickets(db: Session = Depends(get_db), user=Depends(get_current_user)):
    registrations = db.query(models.Registration).filter(
        models.Registration.user_id == user["id"]
    ).all()

    tickets = []
    for reg in registrations:
        event = db.query(models.Event).filter(models.Event.id == reg.event_id).first()
        if event:
            # Check for successful payment
            payment = db.query(models.Payment).filter(
                models.Payment.user_id == user["id"],
                models.Payment.event_id == reg.event_id,
                models.Payment.status == "success"
            ).first()
            payment_id = (payment.payment_id or payment.order_id) if payment else None

            tickets.append({
                "id": reg.id,
                "event_id": event.id,
                "event_title": event.title,
                "event_venue": event.venue,
                "event_fee": event.fee,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "event_end_date": event.event_end_date.isoformat() if event.event_end_date else None,
                "event_poster": event.poster,
                "qr_code": reg.qr_code,
                "qr_image": cloudinary.utils.cloudinary_url(f"collegebuddy/qr_codes/{reg.qr_code}")[0] if os.getenv("CLOUDINARY_URL") else f"/qr_codes/{reg.qr_code}.png",
                "checked_in": reg.checked_in,
                "booked_at": reg.created_at.isoformat() if reg.created_at else None,
                "payment_id": payment_id
            })

    return tickets

# ─── SCAN TICKET ─────────────────────────────────────────────────────────

@app.post("/scan-ticket")
def scan_ticket(qr_token: str, db: Session = Depends(get_db), user=Depends(get_current_user)):

    registration = db.query(models.Registration).filter(
        models.Registration.qr_code == qr_token
    ).first()

    if not registration:
        raise HTTPException(status_code=404, detail="Invalid ticket — no matching registration found")

    if registration.checked_in:
        raise HTTPException(status_code=400, detail="Ticket already used — attendee has already checked in")

    event = db.query(models.Event).filter(models.Event.id == registration.event_id).first()
    
    is_host = event.host_id == user["id"]
    is_volunteer = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == user["sub"],
        models.VolunteerWhitelist.event_id == registration.event_id,
        models.VolunteerWhitelist.status == "approved"
    ).first() is not None

    if not (is_host or is_volunteer):
        raise HTTPException(status_code=403, detail="You are not assigned to scan tickets for this event")

    registration.checked_in = True
    db.commit()

    # Get event info for response
    event = db.query(models.Event).filter(models.Event.id == registration.event_id).first()
    attendee = db.query(models.User).filter(models.User.id == registration.user_id).first()

    return {
        "message": "Check-in successful!",
        "attendee_name": attendee.name if attendee else "Unknown",
        "event_title": event.title if event else "Unknown Event"
    }

@app.get("/event/{event_id}/registrations")
def get_event_registrations(event_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    is_host = event.host_id == user["id"]
    is_volunteer = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == user["sub"],
        models.VolunteerWhitelist.event_id == event_id,
        models.VolunteerWhitelist.status == "approved"
    ).first() is not None

    if not (is_host or is_volunteer):
        raise HTTPException(status_code=403, detail="Not authorized to view registrations for this event")

    registrations = db.query(models.Registration).filter(
        models.Registration.event_id == event_id
    ).all()

    results = []
    for reg in registrations:
        attendee = db.query(models.User).filter(models.User.id == reg.user_id).first()
        results.append({
            "id": reg.id,
            "attendee_name": attendee.name if attendee else "Unknown",
            "attendee_email": attendee.email if attendee else "Unknown",
            "attendee_roll": attendee.roll_number if attendee else None,
            "checked_in": reg.checked_in,
            "checked_in_time": reg.updated_at.isoformat() if (reg.checked_in and reg.updated_at) else None
        })

    return results

@app.post("/manually-checkin-ticket/{registration_id}")
def manually_checkin_ticket(registration_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    registration = db.query(models.Registration).filter(
        models.Registration.id == registration_id
    ).first()

    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    if registration.checked_in:
        raise HTTPException(status_code=400, detail="Attendee is already checked in")

    event = db.query(models.Event).filter(models.Event.id == registration.event_id).first()
    
    is_host = event.host_id == user["id"]
    is_volunteer = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == user["sub"],
        models.VolunteerWhitelist.event_id == registration.event_id,
        models.VolunteerWhitelist.status == "approved"
    ).first() is not None

    if not (is_host or is_volunteer):
        raise HTTPException(status_code=403, detail="You are not authorized to check in attendees for this event")

    registration.checked_in = True
    db.commit()

    attendee = db.query(models.User).filter(models.User.id == registration.user_id).first()

    return {
        "message": f"Successfully checked in {attendee.name if attendee else 'Attendee'}!",
        "attendee_name": attendee.name if attendee else "Unknown",
        "event_title": event.title if event else "Unknown Event"
    }

# ─── VOLUNTEER WHITELIST ─────────────────────────────────────────────────

@app.post("/student/apply-volunteer")
def apply_volunteer(data: ApplyVolunteerRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    
    event = db.query(models.Event).filter(models.Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.max_volunteers is not None:
        approved_count = db.query(models.VolunteerWhitelist).filter(
            models.VolunteerWhitelist.event_id == data.event_id,
            models.VolunteerWhitelist.status == "approved"
        ).count()
        if approved_count >= event.max_volunteers:
            raise HTTPException(status_code=400, detail="Volunteer positions are full for this event")


    existing = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == user["sub"],
        models.VolunteerWhitelist.event_id == data.event_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already applied or been approved for this event."
        )

    entry = models.VolunteerWhitelist(
        email=user["sub"],
        event_id=data.event_id,
        host_id=event.host_id,
        user_id=user["id"],
        status="pending"
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"message": "Volunteer application submitted."}

@app.get("/student/volunteer-events")
def get_student_volunteer_events(db: Session = Depends(get_db), user=Depends(get_current_user)):
    entries = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == user["sub"]
    ).all()

    results = []
    for entry in entries:
        event = db.query(models.Event).filter(models.Event.id == entry.event_id).first()
        if event:
            reg = db.query(models.Registration).filter(
                models.Registration.event_id == event.id,
                models.Registration.user_id == user["id"]
            ).first()
            total_registered = db.query(models.Registration).filter(
                models.Registration.event_id == event.id
            ).count()
            total_checkins = db.query(models.Registration).filter(
                models.Registration.event_id == event.id,
                models.Registration.checked_in == True
            ).count()

            results.append({
                "id": entry.id,
                "event_id": event.id,
                "event_title": event.title,
                "event_venue": event.venue,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "event_poster": event.poster,
                "status": entry.status,
                "applied_at": entry.created_at.isoformat() if entry.created_at else None,
                "registered": reg is not None,
                "qr_image": reg.qr_code if reg else None,
                "volunteer_fee": event.volunteer_fee,
                "fee": event.fee,
                "total_registered": total_registered,
                "total_checkins": total_checkins
            })
    return results

@app.put("/host/volunteer-request/{whitelist_id}")
def update_volunteer_request(whitelist_id: int, data: UpdateVolunteerStatusRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts allowed")

    entry = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.id == whitelist_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Volunteer request not found")

    if entry.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    if data.status == "approved":
        event = db.query(models.Event).filter(models.Event.id == entry.event_id).first()
        if event.max_volunteers is not None:
            approved_count = db.query(models.VolunteerWhitelist).filter(
                models.VolunteerWhitelist.event_id == entry.event_id,
                models.VolunteerWhitelist.status == "approved"
            ).count()
            if approved_count >= event.max_volunteers:
                raise HTTPException(status_code=400, detail="Volunteer positions are full for this event")
                
        if entry.user_id:
            if event.fee == 0 or event.volunteer_fee == 0:
                create_volunteer_registration(entry.user_id, entry.event_id, db)

    entry.status = data.status
    db.commit()

    return {"message": f"Volunteer request {data.status}"}

@app.post("/host/whitelist-volunteer")
def whitelist_volunteer(data: WhitelistRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):

    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can whitelist volunteers")

    # Verify event belongs to this host
    event = db.query(models.Event).filter(
        models.Event.id == data.event_id,
        models.Event.host_id == user["id"]
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not owned by you")

    # Check if email already whitelisted for ANY event (1 event per volunteer rule)
    existing = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.email == data.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"This email is already assigned to another event (Event ID: {existing.event_id})"
        )

    if event.max_volunteers is not None:
        approved_count = db.query(models.VolunteerWhitelist).filter(
            models.VolunteerWhitelist.event_id == data.event_id,
            models.VolunteerWhitelist.status == "approved"
        ).count()
        if approved_count >= event.max_volunteers:
            raise HTTPException(status_code=400, detail="Volunteer positions are full for this event")

    registered_user = db.query(models.User).filter(models.User.email == data.email).first()

    entry = models.VolunteerWhitelist(
        email=data.email,
        event_id=data.event_id,
        host_id=user["id"],
        user_id=registered_user.id if registered_user else None,
        status="approved"
    )

    db.add(entry)
    
    if registered_user:
        if event.fee == 0 or event.volunteer_fee == 0:
            create_volunteer_registration(registered_user.id, data.event_id, db)

    db.commit()
    db.refresh(entry)

    return {"message": f"Volunteer {data.email} whitelisted for event: {event.title}", "id": entry.id}

@app.post("/host/bulk-whitelist-volunteers")
def bulk_whitelist_volunteers(data: BulkWhitelistRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):

    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can whitelist volunteers")

    event = db.query(models.Event).filter(
        models.Event.id == data.event_id,
        models.Event.host_id == user["id"]
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not owned by you")

    added = []
    skipped = []
    
    current_approved_count = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.event_id == data.event_id,
        models.VolunteerWhitelist.status == "approved"
    ).count()

    for email in data.emails:
        email = email.strip()
        if not email:
            continue
            
        if event.max_volunteers is not None and current_approved_count >= event.max_volunteers:
            skipped.append({"email": email, "reason": "Max volunteer limit reached"})
            continue

        # Check if already whitelisted for any event
        existing = db.query(models.VolunteerWhitelist).filter(
            models.VolunteerWhitelist.email == email
        ).first()

        if existing:
            skipped.append({"email": email, "reason": f"Already assigned to event ID {existing.event_id}"})
            continue

        registered_user = db.query(models.User).filter(models.User.email == email).first()

        entry = models.VolunteerWhitelist(
            email=email,
            event_id=data.event_id,
            host_id=user["id"],
            user_id=registered_user.id if registered_user else None,
            status="approved"
        )
        db.add(entry)
        current_approved_count += 1
        
        if registered_user:
            if event.fee == 0 or event.volunteer_fee == 0:
                create_volunteer_registration(registered_user.id, data.event_id, db)
                
        added.append(email)

    db.commit()

    return {
        "message": f"{len(added)} volunteers added, {len(skipped)} skipped",
        "added": added,
        "skipped": skipped
    }

@app.get("/host/whitelisted-volunteers/{event_id}")
def get_whitelisted_volunteers(event_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):

    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts allowed")

    event = db.query(models.Event).filter(
        models.Event.id == event_id,
        models.Event.host_id == user["id"]
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not owned by you")

    entries = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.event_id == event_id
    ).all()

    result = []
    for entry in entries:
        # Check if volunteer has registered
        registered_user = db.query(models.User).filter(
            models.User.email == entry.email
        ).first()

        result.append({
            "id": entry.id,
            "email": entry.email,
            "user_id": entry.user_id,
            "status": entry.status,
            "registered": registered_user is not None,
            "volunteer_name": registered_user.name if registered_user else None,
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        })

    return result

@app.delete("/host/remove-volunteer/{whitelist_id}")
def remove_volunteer(whitelist_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):

    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts allowed")

    entry = db.query(models.VolunteerWhitelist).filter(
        models.VolunteerWhitelist.id == whitelist_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Whitelist entry not found")

    if entry.host_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(entry)
    db.commit()

    return {"message": "Volunteer removed from whitelist"}

# ─── ANALYTICS HELPER ────────────────────────────────────────────────────

@app.get("/event/{event_id}/stats")
def get_event_stats(event_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):

    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    total_registrations = db.query(models.Registration).filter(
        models.Registration.event_id == event_id
    ).count()

    total_checkins = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.checked_in == True
    ).count()

    # Predict attendance using trained LinearRegression AI model
    predicted_attendance = total_registrations
    try:
        import pandas as pd
        df_pred = pd.DataFrame(
            [[event.participant_limit or 100, event.fee or 0.0, total_registrations]],
            columns=["participant_limit", "fee", "registrations"]
        )
        pred_val = model.predict(df_pred)[0]
        max_bound = total_registrations if total_registrations > 0 else (event.participant_limit or 100)
        predicted_attendance = max(0, min(int(round(pred_val)), max_bound))
    except Exception as e:
        predicted_attendance = int(total_registrations * 0.85)

    return {
        "event_id": event_id,
        "title": event.title,
        "total_registrations": total_registrations,
        "total_checkins": total_checkins,
        "participant_limit": event.participant_limit,
        "predicted_attendance": predicted_attendance
    }

# ─── PAYMENTS & RECEIPTS ─────────────────────────────────────────────────

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@app.post("/verify-payment")
def verify_payment(data: VerifyPaymentRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Verify the signature
    params_dict = {
        'razorpay_order_id': data.razorpay_order_id,
        'razorpay_payment_id': data.razorpay_payment_id,
        'razorpay_signature': data.razorpay_signature
    }
    try:
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        logger.warning(f"Payment signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    # Signature is valid. Find the payment record.
    payment = db.query(models.Payment).filter(models.Payment.order_id == data.razorpay_order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    # PAYMENT SECURITY: Verify payment ownership
    if payment.user_id != current_user["id"]:
        logger.warning(f"Payment ownership mismatch: user {current_user['id']} tried to verify order {payment.order_id} belonging to user {payment.user_id}")
        raise HTTPException(status_code=403, detail="Payment does not belong to the authenticated user")
        
    # Idempotent verification handling
    if payment.status == "success":
        reg = db.query(models.Registration).filter(
            models.Registration.user_id == payment.user_id,
            models.Registration.event_id == payment.event_id
        ).first()
        return {
            "message": "Payment already verified",
            "qr_token": reg.qr_code if reg else None,
            "payment_id": payment.payment_id
        }
        
    payment.status = "success"
    payment.payment_id = data.razorpay_payment_id
    payment.signature = data.razorpay_signature
    
    # Check for existing registration before creating to prevent duplicates
    existing_reg = db.query(models.Registration).filter(
        models.Registration.user_id == payment.user_id,
        models.Registration.event_id == payment.event_id
    ).first()

    if existing_reg:
        qr_token = existing_reg.qr_code
        db.commit()
    else:
        # Create the registration
        qr_token = str(uuid.uuid4())
        registration = models.Registration(
            user_id=payment.user_id,
            event_id=payment.event_id,
            qr_code=qr_token
        )
        db.add(registration)
        db.commit()
        db.refresh(registration)
    
    # Generate QR Code image (local or Cloudinary)
    qr_data = f"TICKET:{qr_token}"
    img = qrcode.make(qr_data)
    
    qr_image_url = f"/qr_codes/{qr_token}.png"
    
    if os.getenv("CLOUDINARY_URL"):
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        upload_result = cloudinary.uploader.upload(
            img_byte_arr,
            public_id=f"{qr_token}",
            folder="collegebuddy/qr_codes"
        )
        qr_image_url = upload_result["secure_url"]
    else:
        filename = f"{qr_token}.png"
        filepath = os.path.join(QR_CODES_DIR, filename)
        img.save(filepath)
        
    return {
        "message": "Payment verified and registration successful",
        "qr_token": qr_token,
        "qr_image": qr_image_url,
        "payment_id": payment.payment_id
    }

@app.get("/download-receipt/{payment_id}")
def download_receipt(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Fetch payment
    payment = db.query(models.Payment).filter(
        or_(models.Payment.payment_id == payment_id, models.Payment.order_id == payment_id)
    ).first()
    if not payment or payment.status != "success":
        raise HTTPException(status_code=404, detail="Successful payment record not found")
        
    user = db.query(models.User).filter(models.User.id == payment.user_id).first()
    event = db.query(models.Event).filter(models.Event.id == payment.event_id).first()

    # RECEIPT SECURITY: Verify ownership (attendee or event host only)
    if payment.user_id != current_user["id"] and (not event or event.host_id != current_user["id"]):
        logger.warning(f"Unauthorized receipt access: user {current_user.get('id')} attempted to access receipt for payment {payment_id}")
        raise HTTPException(status_code=403, detail="Unauthorized access to this receipt")
    
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from fastapi.responses import StreamingResponse
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=15
    )
    
    text_style = ParagraphStyle(
        'TextStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        spaceAfter=6
    )
    
    story = []
    
    story.append(Paragraph("CollegeBuddy — Payment Receipt", title_style))
    story.append(Spacer(1, 10))
    
    data = [
        [Paragraph("<b>Receipt Number:</b>", text_style), Paragraph(payment.payment_id or payment.order_id, text_style)],
        [Paragraph("<b>Date of Transaction:</b>", text_style), Paragraph(payment.updated_at.strftime("%d %b %Y, %I:%M %p") if payment.updated_at else payment.created_at.strftime("%d %b %Y, %I:%M %p"), text_style)],
        [Paragraph("<b>Attendee Name:</b>", text_style), Paragraph(user.name if user else "Unknown", text_style)],
        [Paragraph("<b>Attendee Email:</b>", text_style), Paragraph(user.email if user else "Unknown", text_style)],
        [Paragraph("<b>Event Title:</b>", text_style), Paragraph(event.title if event else "Unknown Event", text_style)],
        [Paragraph("<b>Event Venue:</b>", text_style), Paragraph(event.venue if event else "N/A", text_style)],
        [Paragraph("<b>Amount Paid:</b>", text_style), Paragraph(f"INR {payment.amount:.2f}", text_style)],
        [Paragraph("<b>Payment Status:</b>", text_style), Paragraph("SUCCESS", ParagraphStyle('Success', parent=text_style, textColor=colors.HexColor('#16A34A'), fontName='Helvetica-Bold'))]
    ]
    
    t = Table(data, colWidths=[150, 350])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F3F4F6')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    
    story.append(t)
    story.append(Spacer(1, 40))
    story.append(Paragraph("Thank you for your booking! This is a computer generated receipt and does not require a signature.", text_style))
    
    doc.build(story)
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="CollegeBuddy_Receipt_{payment_id}.pdf"'
    }
    return StreamingResponse(buffer, media_type='application/pdf', headers=headers)

@app.get("/host/analytics")
def get_host_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts allowed")
        
    events = db.query(models.Event).filter(models.Event.host_id == user["id"]).all()
    event_ids = [e.id for e in events]
    
    # Successful payments for host's events
    payments = db.query(models.Payment).filter(
        models.Payment.event_id.in_(event_ids),
        models.Payment.status == "success"
    ).all()
    
    total_revenue = sum(p.amount for p in payments)
    
    # Group payments by event
    event_breakdown = []
    for event in events:
        event_payments = [p for p in payments if p.event_id == event.id]
        event_revenue = sum(p.amount for p in event_payments)
        
        # Count ticket types
        registrations = db.query(models.Registration).filter(models.Registration.event_id == event.id).all()
        reg_user_ids = [r.user_id for r in registrations]
        
        volunteer_regs_count = 0
        if reg_user_ids:
            users = db.query(models.User).filter(models.User.id.in_(reg_user_ids)).all()
            user_emails = [u.email for u in users]
            volunteer_regs_count = db.query(models.VolunteerWhitelist).filter(
                models.VolunteerWhitelist.event_id == event.id,
                models.VolunteerWhitelist.email.in_(user_emails),
                models.VolunteerWhitelist.status == "approved"
            ).count()
            
        student_regs_count = len(registrations) - volunteer_regs_count
        
        # Count checkins (attended)
        total_checkins = db.query(models.Registration).filter(
            models.Registration.event_id == event.id,
            models.Registration.checked_in == True
        ).count()
        
        event_breakdown.append({
            "id": event.id,
            "title": event.title,
            "venue": event.venue,
            "fee": event.fee,
            "volunteer_fee": event.volunteer_fee,
            "participant_limit": event.participant_limit,
            "actual_revenue": event_revenue,
            "total_registrations": len(registrations),
            "total_attended": total_checkins,
            "student_registrations": student_regs_count,
            "volunteer_registrations": volunteer_regs_count,
            "potential_revenue": (event.fee * event.participant_limit) if event.participant_limit else 0.0
        })
        
    # Get recent successful payments
    recent_transactions = []
    sorted_payments = sorted(payments, key=lambda x: x.created_at or datetime.min, reverse=True)[:10]
    for p in sorted_payments:
        buyer = db.query(models.User).filter(models.User.id == p.user_id).first()
        evt = db.query(models.Event).filter(models.Event.id == p.event_id).first()
        recent_transactions.append({
            "payment_id": p.payment_id or p.order_id,
            "student_name": buyer.name if buyer else "Unknown",
            "event_title": evt.title if evt else "Unknown Event",
            "amount": p.amount,
            "date": (p.updated_at or p.created_at).isoformat()
        })
        
    return {
        "total_events": len(events),
        "total_revenue": total_revenue,
        "event_breakdown": event_breakdown,
        "recent_transactions": recent_transactions
    }
