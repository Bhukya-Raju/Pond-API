#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "================================================================="
echo "   HydroPond AI - Phase 3 VIVA & Demo Runner"
echo "================================================================="

# Start Backend
echo "Starting FastAPI Backend on http://127.0.0.1:8000..."
cd "$DIR/pond_catchment_backend"
PYTHONPATH=app:app/venv/lib/python3.14/site-packages /usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Vite Frontend on http://127.0.0.1:5173..."
cd "$DIR/pond_catchment_frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

cleanup() {
    echo -e "\nStopping all services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "================================================================="
echo "  ✓ Backend API running at : http://localhost:8000 (Swagger: /docs)"
echo "  ✓ GIS Frontend running at: http://localhost:5173"
echo "================================================================="
echo "Press Ctrl+C to terminate both servers."

wait
