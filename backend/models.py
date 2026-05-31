from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Index, UniqueConstraint
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password = Column(String, nullable=False)
    role = Column(String, default="student", index=True)
    
    # Auditing
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Profile & Personal Details
    profile_photo = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    # Student specific
    student_type = Column(String, nullable=True) # school / college
    institution_name = Column(String, nullable=True)
    board = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    course = Column(String, nullable=True)
    department = Column(String, nullable=True)
    section = Column(String, nullable=True)
    roll_number = Column(String, nullable=True)
    
    # Host specific
    org_name = Column(String, nullable=True)
    org_address = Column(String, nullable=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    venue = Column(String)
    fee = Column(Float, default=0)
    volunteer_fee = Column(Float, default=0.0)
    participant_limit = Column(Integer)
    max_volunteers = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    host_id = Column(Integer, ForeignKey("users.id"))
    poster = Column(String)
    event_date = Column(DateTime, nullable=True)
    event_end_date = Column(DateTime, nullable=True)
    
    # Auditing
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))

    qr_code = Column(String, unique=True, index=True)

    checked_in = Column(Boolean, default=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VolunteerWhitelist(Base):
    __tablename__ = "volunteer_whitelist"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="pending", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('email', 'event_id', name='_email_event_uc'),
    )


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    
    order_id = Column(String, unique=True, index=True)
    payment_id = Column(String, unique=True, index=True, nullable=True)
    signature = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(String, default="pending", index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)