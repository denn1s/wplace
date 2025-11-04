#!/bin/bash

# Stop all r/place services

echo "Stopping all r/place services..."

# Function to kill process on port
kill_port() {
    PORT=$1
    NAME=$2
    PID=$(lsof -t -i:$PORT)
    if [ ! -z "$PID" ]; then
        kill $PID 2>/dev/null
        echo "✓ Stopped $NAME (port $PORT, PID: $PID)"
    else
        echo "ℹ $NAME not running on port $PORT"
    fi
}

# Kill all services by port
kill_port 8080 "Backend"
kill_port 3001 "Consumer"
kill_port 3000 "Frontend"

echo ""
echo "All services stopped"
