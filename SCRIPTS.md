# Quick Reference - Run Scripts

## Individual Services

### Backend (Go - Port 8080)
```bash
cd backend
./build.sh    # Build the Go binary
./run.sh      # Run the backend (builds automatically if needed)
./clean.sh    # Remove build artifacts
```

### Consumer (Bun - Port 3001)
```bash
cd consumer
./build.sh    # Install dependencies
./run.sh      # Run the consumer (installs deps if needed)
./clean.sh    # Remove node_modules
```

### Frontend (React + Vite - Port 3000)
```bash
cd frontend
./build.sh    # Install deps and build for production
./run.sh      # Run development server (installs deps if needed)
./clean.sh    # Remove node_modules and dist
```

## All Services at Once

### From the root directory:

```bash
# Start everything
./run-all.sh

# Stop everything
./stop-all.sh
```

## Service URLs

- **Backend**: http://localhost:8080
- **Consumer**: ws://localhost:3001/ws/canvas
- **Frontend**: http://localhost:3000 (accessible from network via your IP)

## Startup Order

If running manually, start in this order:
1. Backend (port 8080)
2. Consumer (port 3001)
3. Frontend (port 3000)

The `run-all.sh` script handles this automatically.

## Logs

When using `run-all.sh`, logs are saved to:
- `logs/backend.log`
- `logs/consumer.log`
- `logs/frontend.log`
