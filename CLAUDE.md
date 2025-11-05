# CLAUDE.md

## Project: r/place Clone

### Architecture Overview
- Backend (Go): Port 8080, manages pixel queue, SQLite persistence
- Consumer (Bun): Port 3001, middleware/proxy layer, processes queue, broadcasts updates
- Frontend (React): Port 3000, displays canvas, communicates ONLY with Consumer

**Important:** Frontend → Consumer → Backend (Frontend never talks directly to Backend)

## API Endpoints

### Consumer (Bun) - Frontend Interface
**POST /api/pixel** (proxied to Backend)
```json
{
  "x": 0-999,
  "y": 0-999,
  "color": "#RRGGBB",
  "userId": "string"
}
```
Response: `200 OK` or `429 Too Many Requests`

**GET /api/canvas** (proxied to Backend)
- Returns all pixels from database
- Response: Array of pixel objects

**WebSocket /ws/canvas**
- Broadcasts validated pixel updates to all frontend clients
- Format:
```json
{
  "x": number,
  "y": number,
  "color": string,
  "timestamp": number
}
```

### Backend (Go) - Internal API
**POST /api/pixel**
- Validates, saves to SQLite, adds to queue

**GET /api/canvas**
- Returns all pixels from SQLite database

**WebSocket /ws/queue**
- Sends pixel batches to consumers

## System Behavior

### Persistence (Backend)
- SQLite database: `canvas.db`
- Schema: `canvas_state(x, y, color, user_id, updated_at)`
- Primary key: `(x, y)` - allows pixel overwriting

### Queue (Backend)
- In-memory FIFO queue
- Max queue size: 10,000 items
- Batching: Send updates every 100ms or 50 pixels, whichever comes first

### Rate Limiting (Backend)
- 1 pixel per user per 5 seconds
- Enforced before queue insertion

### Validation (Consumer)
- Validates coordinates (0-999)
- Validates color format (#RRGGBB)
- Validates userId presence

## Development Commands

### Run All Services
```bash
./run-all.sh   # Start everything
./stop-all.sh  # Stop everything
```

### Individual Services
```bash
# Backend
cd backend && ./run.sh

# Consumer
cd consumer && ./run.sh

# Frontend
cd frontend && ./run.sh
```

### Build
Each service has `build.sh`, `run.sh`, and `clean.sh` scripts

## Testing

```bash
# Place pixel via Consumer (Frontend path)
curl -X POST http://localhost:3001/api/pixel \
  -H "Content-Type: application/json" \
  -d '{"x":100,"y":100,"color":"#FF0000","userId":"test"}'

# Get canvas state via Consumer
curl http://localhost:3001/api/canvas

# Access frontend
open http://localhost:3000
```
