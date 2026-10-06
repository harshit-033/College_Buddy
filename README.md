# CollegeBuddy 🎓 - Smart Campus Event Management System

CollegeBuddy is a premium, full-stack platform designed to revolutionize campus event management. It provides a seamless experience for students to discover events, hosts to manage them with AI-driven insights, and volunteers to verify attendance using a robust QR-based ticketing system.

![CollegeBuddy Banner](https://img.shields.io/badge/CollegeBuddy-Smart_Events-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Local Setup](#-local-setup)
- [User Roles](#-user-roles)
- [AI & Prediction](#-ai--prediction)
- [Future Scope](#-future-scope)
- [Screenshots](#-screenshots)

---

## 🚀 Features

### 🔐 Multi-Role Authentication
- Secure JWT-based authentication.
- Dedicated dashboards for **Students**, **Hosts**, and **Volunteers**.
- Role-based access control (RBAC).

### 📅 Event Management (For Hosts)
- **Create & Edit**: Rich event creation with posters, descriptions, and participant limits.
- **Analytics Dashboard**: Real-time stats on registrations and attendance.
- **AI Predictions**: Integrated ML models to predict expected attendance based on event metrics.

### 🎟️ Smart Ticketing (For Students)
- **Instant Booking**: One-click registration for campus events.
- **QR Generation**: Automatic generation of unique, secure QR tickets stored locally and in the database.
- **Event Discovery**: Dynamic list of upcoming events with real-time updates.

### 🔍 Attendance Verification (For Volunteers)
- **In-Browser Scanner**: High-performance QR scanner built with `html5-qrcode`.
- **Instant Validation**: Real-time ticket verification and attendance marking.
- **Anti-Fraud**: Prevents duplicate entries or invalid ticket usage.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS & Lucide icons
- **State/Routing**: React Router 7
- **API Client**: Axios
- **Scanning**: html5-qrcode

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL / SQLite (SQLAlchemy ORM)
- **Security**: JWT tokens, Passlib (Bcrypt)
- **Utilities**: Qrcode (generation), Pillow (image handling)

### AI / ML
- **Library**: Scikit-Learn
- **Model**: Linear Regression for attendance prediction
- **Storage**: Joblib

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
To run the development server (uses SQLite `test.db` by default):
```bash
uvicorn main:app --reload --port 8000
```
Backend will be reachable at `http://localhost:8000` (API docs at `http://localhost:8000/docs`).

### 2. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm ci
npm run dev
```
Frontend will be reachable at `http://localhost:5173`.

---

## 🌐 Production Architecture & Deployment

### Target Architecture
```
USERS
  │
  ▼
┌──────────────────────────┐
│     Cloudflare Pages     │
│     React + Vite SPA     │
└─────────────┬────────────┘
              │ HTTPS
              ▼
┌────────────────────────────────────────────────────────┐
│                        AWS EC2                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    Docker                        │  │
│  │  ┌────────────┐     ┌──────────────┐             │  │
│  │  │   Caddy    │ ──► │   FastAPI    │             │  │
│  │  │(HTTPS/Proxy│     │(Gunicorn 1w) │             │  │
│  │  └────────────┘     └──────┬───────┘             │  │
│  │                            │ (Internal network)  │  │
│  │                            ▼                     │  │
│  │                     ┌──────────────┐             │  │
│  │                     │  PostgreSQL  │             │  │
│  │                     │(Volume data) │             │  │
│  │                     └──────────────┘             │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
        ┌─────────────┐             ┌─────────────┐
        │ Cloudinary  │             │  Razorpay   │
        │ Images / QR │             │  Payments   │
        └─────────────┘             └─────────────┘
```

---

## 🔐 Environment Variables

| Variable | Required | Purpose | Example / Notes |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | **Yes** | Execution mode | `production` or `development` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection URI | `postgresql://user:pass@postgres:5432/dbname` |
| `SECRET_KEY` | **Yes** | JWT signing secret key | 64-char random hex string (`openssl rand -hex 32`) |
| `FRONTEND_URL` | **Yes** | CORS origin restriction | `https://your-app.pages.dev` |
| `CLOUDINARY_URL`| **Yes** (in prod) | Media and QR code persistence | `cloudinary://key:secret@cloud_name` |
| `RAZORPAY_KEY_ID` | **Yes** (payments) | Razorpay public key ID | `rzp_live_...` or `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | **Yes** (payments) | Razorpay webhook & verification secret | Razorpay API secret |
| `DOMAIN` | **Yes** (for Caddy) | Public backend API domain | `api.yourdomain.com` |
| `VITE_API_URL` | **Yes** (frontend) | Cloudflare Pages backend target | `https://api.yourdomain.com` |

---

## 🚀 Step-by-Step Production Deployment Guide

### Phase 1: AWS EC2 Instance Setup
1. Launch an EC2 instance:
   - **AMI**: Ubuntu 24.04 LTS (x86_64 or ARM64)
   - **Instance Type**: `t3.micro` or `t4g.small` (Eligible for AWS Free Tier)
   - **Storage**: 20–30 GB gp3 EBS Volume
   - **Security Group Inbound Rules**:
     - `22` (SSH) — Restricted to your IP
     - `80` (HTTP) — `0.0.0.0/0` (for Let's Encrypt ACME challenge)
     - `443` (HTTPS) — `0.0.0.0/0` (for secure API traffic)
     - *Note: Ports 5432 and 8000 must NOT be exposed publicly.*
2. Allocate and associate an **Elastic IP** to the EC2 instance.
3. Configure your DNS provider:
   - Add an `A` record pointing `api.yourdomain.com` to your Elastic IP.

### Phase 2: Host Preparation & Repository Setup
SSH into the EC2 instance and install Docker:
```bash
# Update and install Docker Engine & Compose plugin
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

# Clone repository
git clone https://github.com/harshit-033/College_Buddy.git /opt/campusiq
cd /opt/campusiq
```

### Phase 3: Environment Configuration
Create the production environment file:
```bash
cp .env.example .env
chmod 600 .env
nano .env
```
Fill in your production values (`POSTGRES_PASSWORD`, `SECRET_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_URL`, `FRONTEND_URL`, `DOMAIN`).

### Phase 4: Database Migrations & Container Startup
1. Start PostgreSQL:
```bash
docker compose -f docker-compose.prod.yml up -d postgres
```
2. Run database migrations to head using Alembic:
```bash
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```
3. Launch the full production stack (Caddy + FastAPI + PostgreSQL):
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
4. Verify running containers:
```bash
docker compose -f docker-compose.prod.yml ps
```

### Phase 5: Cloudflare Pages Frontend Deployment
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select repository: `harshit-033/College_Buddy`.
3. Set Build configurations:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://api.yourdomain.com`
5. Click **Save and Deploy**. Cloudflare Pages will automatically provision SPA routing fallback via `_redirects`.

---

## 🧪 Verification & Smoke Testing

Run the included smoke test script to verify API health:
```bash
./scripts/smoke_test.sh https://api.yourdomain.com
```
Expected output:
```
1. Checking GET / ... PASS (HTTP 200)
2. Checking GET /health ... PASS (HTTP 200, Body: {"status":"ok","database":"ok"})
All smoke tests PASSED successfully!
```

---

## 💾 Database Backups & Recovery

### Automated Backup
Run the database backup script:
```bash
./scripts/backup_db.sh
```
This generates a compressed backup file: `backups/backup_YYYY-MM-DD_HHMMSS.sql.gz`.

### Backup Restoration
To restore a snapshot:
```bash
gunzip -c backups/backup_YYYY-MM-DD_HHMMSS.sql.gz | docker exec -i campusiq_postgres psql -U collegebuddy_user -d collegebuddy_db
```

---

## 👥 User Roles & Permissions

| Role | Permissions | Key Features |
| :--- | :--- | :--- |
| **Student** | Browse, Register | QR Tickets, Event History, Profile Management |
| **Host** | Create, Manage, Analyze | AI Attendance Prediction, Poster Upload, Real-time Stats |
| **Volunteer** | Scan, Verify | Event-specific QR Scanner, Anti-Duplicate Check-in |

## 🔮 Future Scope

- [ ] **Automated Certificates**: Generate and email participation certificates (PDF) instantly after the event.
- [ ] **Payment Gateway**: Integration for paid workshops and high-value events.
- [ ] **Push Notifications**: Real-time reminders for upcoming events via Web Push or Email.
- [ ] **Mobile App**: Dedicated Android/iOS app for better scanning performance.
- [ ] **Live Dashboards**: Interactive charts (Recharts) for deeper event analytics.
- [ ] **Multi-Campus Support**: Scale the platform to support multiple institutions simultaneously.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

