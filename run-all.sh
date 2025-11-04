#!/bin/bash

# Master run script for r/place clone
# Starts all three services: backend, consumer, and frontend

echo "================================================"
echo "Starting r/place Clone - All Services"
echo "================================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 &> /dev/null
    return $?
}

# Check if services are already running
echo "Checking for running services..."
if check_port 8080; then
    echo -e "${YELLOW}⚠ Backend already running on port 8080${NC}"
fi
if check_port 3001; then
    echo -e "${YELLOW}⚠ Consumer already running on port 3001${NC}"
fi
if check_port 3000; then
    echo -e "${YELLOW}⚠ Frontend already running on port 3000${NC}"
fi
echo ""

# Start backend
echo -e "${BLUE}[1/3] Starting Backend (Go)...${NC}"
cd backend
./run.sh > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
cd ..
sleep 2

# Start consumer
echo -e "${BLUE}[2/3] Starting Consumer (Bun)...${NC}"
cd consumer
./run.sh > ../logs/consumer.log 2>&1 &
CONSUMER_PID=$!
echo -e "${GREEN}✓ Consumer started (PID: $CONSUMER_PID)${NC}"
cd ..
sleep 2

# Start frontend
echo -e "${BLUE}[3/3] Starting Frontend (React + Vite)...${NC}"
cd frontend
./run.sh > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ..
sleep 2

echo ""
echo "================================================"
echo -e "${GREEN}All services started successfully!${NC}"
echo "================================================"
echo ""
echo "Service URLs:"
echo "  Backend:  http://localhost:8080"
echo "  Consumer: ws://localhost:3001/ws/canvas"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Process IDs:"
echo "  Backend:  $BACKEND_PID"
echo "  Consumer: $CONSUMER_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "Logs are stored in the logs/ directory"
echo ""
echo "To stop all services, run: ./stop-all.sh"
echo "Or kill processes manually: kill $BACKEND_PID $CONSUMER_PID $FRONTEND_PID"
