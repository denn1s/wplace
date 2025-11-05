# r/place Clone - Architecture

## Overview

The application uses a three-tier architecture with clean separation of concerns:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│    Frontend     │◄────►│    Consumer     │◄────►│     Backend     │
│   (React+Vite)  │      │      (Bun)      │      │       (Go)      │
│   Port 3000     │      │   Port 3001     │      │    Port 8080    │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Communication Flow

### 1. Initial Canvas Load (New Client Connects)

```
Frontend                    Consumer                   Backend
   │                           │                           │
   │─── GET /api/canvas ──────►│                           │
   │                           │── GET /api/canvas ───────►│
   │                           │                           │
   │                           │                      ┌────▼────┐
   │                           │                      │ SQLite  │
   │                           │                      │ Query   │
   │                           │                      └────┬────┘
   │                           │◄── JSON (pixels) ─────────┤
   │◄── JSON (pixels) ─────────┤                           │
   │                           │                           │
   │  Draw all pixels          │                           │
   │  on canvas                │                           │
   │                           │                           │
```

### 2. User Places a Pixel

```
Frontend                    Consumer                   Backend
   │                           │                           │
   │─── POST /api/pixel ──────►│                           │
   │    {x, y, color, userId}  │                           │
   │                           │── POST /api/pixel ───────►│
   │                           │    {x, y, color, userId}  │
   │                           │                           │
   │                           │                      ┌────▼────┐
   │                           │                      │Rate Limit│
   │                           │                      │Check     │
   │                           │                      └────┬────┘
   │                           │                           │
   │                           │                      ┌────▼────┐
   │                           │                      │ SQLite  │
   │                           │                      │ INSERT  │
   │                           │                      └────┬────┘
   │                           │                           │
   │                           │                      ┌────▼────┐
   │                           │                      │ Queue   │
   │                           │                      └────┬────┘
   │                           │◄── 200 OK ────────────────┤
   │◄── 200 OK ────────────────┤                           │
   │                           │                           │
```

### 3. Real-time Broadcast (WebSocket)

```
Frontend                    Consumer                   Backend
   │                           │                           │
   │── WS /ws/canvas ─────────►│                           │
   │   (persistent connection) │                           │
   │                           │── WS /ws/queue ──────────►│
   │                           │   (persistent connection) │
   │                           │                           │
   │                           │                      ┌────▼────┐
   │                           │                      │Hub polls│
   │                           │                      │queue    │
   │                           │                      └────┬────┘
   │                           │                           │
   │                           │◄── Batch [pixels] ────────┤
   │                           │                           │
   │                      ┌────▼────┐                      │
   │                      │Validate │                      │
   │                      │pixels   │                      │
   │                      └────┬────┘                      │
   │                           │                           │
   │◄── Broadcast pixel ───────┤                           │
   │                           │                           │
   │  Draw pixel on canvas     │                           │
   │                           │                           │
```

## Component Responsibilities

### Frontend (React + Vite)
**Port:** 3000
**Responsibilities:**
- Render 1000x1000 pixel canvas
- Fetch initial canvas state on load
- Handle user clicks and color selection
- Display pixels via Canvas API
- Receive real-time updates via WebSocket
- Show connection status and rate limits

**Endpoints Used:**
- `GET /api/canvas` - Load initial state
- `POST /api/pixel` - Place pixel
- `WS /ws/canvas` - Receive updates

**Technologies:**
- React (UI)
- Vite (dev server & bundler)
- HTML Canvas API (rendering)

---

### Consumer (Bun/TypeScript)
**Port:** 3001
**Responsibilities:**
- Middleware/Proxy layer between Frontend and Backend
- Validate incoming pixel updates
- Broadcast updates to all connected frontend clients
- Proxy HTTP API requests to backend
- Handle WebSocket connections from frontend
- Receive pixel batches from backend queue

**Endpoints Provided:**
- `GET /api/canvas` - Proxy to backend
- `POST /api/pixel` - Proxy to backend
- `WS /ws/canvas` - WebSocket for frontend

**Endpoints Consumed:**
- `GET /api/canvas` - From backend
- `POST /api/pixel` - To backend
- `WS /ws/queue` - From backend

**Technologies:**
- Bun (runtime)
- TypeScript
- Native WebSocket API

---

### Backend (Go)
**Port:** 8080
**Responsibilities:**
- Persist all pixels to SQLite database
- Rate limiting (1 pixel per user per 5 seconds)
- In-memory FIFO queue (max 10,000 pixels)
- Batch broadcasting to consumers
- Serve full canvas state
- Handle consumer WebSocket connections

**Endpoints Provided:**
- `GET /api/canvas` - Return all pixels from database
- `POST /api/pixel` - Accept pixel, save to DB, add to queue
- `WS /ws/queue` - WebSocket for consumers
- `GET /health` - Health check

**Technologies:**
- Go 1.21
- SQLite (go-sqlite3)
- Gorilla WebSocket
- Goroutines & Channels

**Database Schema:**
```sql
CREATE TABLE canvas_state (
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL,
    user_id TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (x, y)
);
```

## Data Flow Summary

### HTTP Requests (Proxied through Consumer)
```
Frontend → Consumer → Backend → SQLite
        ← Consumer ← Backend ← SQLite
```

### WebSocket Updates (Real-time)
```
Backend Queue → Consumer (validate) → Frontend Clients
```

## Why This Architecture?

### ✅ Separation of Concerns
- **Frontend:** Pure UI/UX
- **Consumer:** Validation & real-time distribution
- **Backend:** Persistence & business logic

### ✅ Scalability
- Multiple consumers can connect to backend
- Multiple frontends can connect to each consumer
- Consumer can add caching, rate limiting, or filtering

### ✅ Security
- Frontend never talks directly to backend
- Consumer acts as API gateway
- Backend can be behind firewall

### ✅ Flexibility
- Can add authentication in consumer
- Can add analytics without touching frontend
- Can swap backend implementation

## Performance Characteristics

### Initial Load
- **Small canvas (<1000 pixels):** ~50-100ms
- **Medium canvas (1000-10000 pixels):** ~100-500ms
- **Large canvas (>10000 pixels):** ~500ms-2s

### Real-time Updates
- **Latency:** <50ms (backend → consumer → frontend)
- **Throughput:** ~1000 pixels/second
- **Batch size:** 50 pixels or 100ms interval

### Database
- **Read:** O(n) where n = pixels placed
- **Write:** O(1) per pixel (REPLACE with PRIMARY KEY)
- **File size:** ~100 bytes per pixel

## Development Workflow

### Start All Services
```bash
# From root directory
./run-all.sh
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

### Testing
```bash
# Place a pixel via Consumer
curl -X POST http://localhost:3001/api/pixel \
  -H "Content-Type: application/json" \
  -d '{"x":100,"y":100,"color":"#FF0000","userId":"test"}'

# Get canvas state via Consumer
curl http://localhost:3001/api/canvas

# Access frontend
open http://localhost:3000
```

## Future Enhancements

- [ ] Authentication & user accounts
- [ ] Canvas history & replay
- [ ] Multiple canvases
- [ ] Image export
- [ ] Undo functionality
- [ ] Heatmaps & statistics
- [ ] Rate limit visualization
- [ ] Redis for distributed queue
- [ ] Horizontal scaling with load balancer
