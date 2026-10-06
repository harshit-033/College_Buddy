#!/usr/bin/env bash
set -e

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo " Starting CampusIQ / CollegeBuddy Platform...             "
echo "=========================================================="

# Add ~/.local/bin to PATH
export PATH="$HOME/.local/bin:$PATH"

# Function to kill child processes on EXIT / CTRL+C
cleanup() {
    echo ""
    echo "Shutting down CampusIQ servers..."
    kill $(jobs -p) 2>/dev/null || true
    fuser -k 8000/tcp 5173/tcp 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Free ports if previously occupied
fuser -k 8000/tcp 5173/tcp 2>/dev/null || true

# Detect Local Network IP
LOCAL_IP=$(ip -4 addr show scope global 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="127.0.0.1"
fi

# 1. Start Backend (Listening on 0.0.0.0 for LAN access)
echo "Starting Backend (FastAPI on 0.0.0.0:8000)..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Setting up..."
    uv venv --python 3.11 venv
    uv pip install -r requirements.txt --python venv/bin/python
fi
venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait briefly for backend initialization
sleep 2

# 2. Start Frontend (Listening on 0.0.0.0 for LAN access)
echo "Starting Frontend (Vite on 0.0.0.0:5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "=========================================================="
echo " 🚀 CampusIQ is LIVE and accessible across your network!  "
echo "=========================================================="
echo " 💻 On THIS laptop:                                       "
echo "    Frontend:   http://localhost:5173                     "
echo "    Backend:    http://localhost:8000                     "
echo "    API Docs:   http://localhost:8000/docs                "
echo ""
echo " 📱 On OTHER LAPTOPS / PHONES (Same Wi-Fi network):       "
echo "    Website:    http://${LOCAL_IP}:5173                   "
echo "    Backend:    http://${LOCAL_IP}:8000                   "
echo "=========================================================="
echo " Press Ctrl+C in this terminal to stop all servers.       "
echo "=========================================================="
echo ""

wait
