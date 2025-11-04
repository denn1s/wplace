# r/place Clone - Go Backend

This is the backend server for an r/place-style collaborative pixel canvas. It's designed to be educational and easy to understand for computer science students learning Go.

## Features

- **In-memory FIFO Queue**: Manages up to 10,000 pixel updates
- **Rate Limiting**: Prevents users from placing pixels too frequently (1 pixel per 5 seconds)
- **WebSocket Broadcasting**: Sends pixel updates to consumers in batches
- **Efficient Batching**: Broadcasts updates every 100ms or 50 pixels, whichever comes first
- **Thread-Safe Operations**: Uses mutexes and channels for concurrent access

## Architecture

```
┌─────────────┐       POST /api/pixel        ┌─────────────┐
│   Frontend  │ ───────────────────────────> │   Server    │
│   Clients   │                               │   (Port     │
└─────────────┘                               │    8080)    │
                                              └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │ Rate Limiter│
                                              └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │Pixel Queue  │
                                              │(Max 10,000) │
                                              └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │     Hub     │
                                              │ (Broadcast) │
                                              └──────┬──────┘
                                                     │
┌─────────────┐      WS /ws/queue             │
│  Consumer   │ <─────────────────────────────┘
│  (Bun App)  │
└─────────────┘
```

## File Structure

```
backend/
├── main.go          - Entry point, sets up server and routes
├── server.go        - HTTP handlers and request validation
├── queue.go         - Thread-safe FIFO queue implementation
├── ratelimiter.go   - Per-user rate limiting logic
├── hub.go           - WebSocket connection manager and broadcaster
├── client.go        - Individual WebSocket client handler
├── go.mod           - Go module dependencies
└── README.md        - This file
```

## Setup and Installation

### Prerequisites
- Go 1.21 or higher
- Git (optional)

### Installation Steps

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Download dependencies:**
   ```bash
   go mod download
   ```

3. **Run the server:**
   ```bash
   go run main.go
   ```

   The server will start on `http://localhost:8080`

4. **Verify it's running:**
   ```bash
   curl http://localhost:8080/health
   ```
   You should see: `OK`

## API Endpoints

### POST /api/pixel
Submit a pixel update to the queue.

**Request Body:**
```json
{
  "x": 500,
  "y": 300,
  "color": "#FF5733",
  "userId": "user123"
}
```

**Validation Rules:**
- `x`: Integer between 0-999
- `y`: Integer between 0-999
- `color`: Hex color in format `#RRGGBB`
- `userId`: Non-empty string

**Responses:**
- `200 OK` - Pixel accepted
- `429 Too Many Requests` - User is rate limited (must wait 5 seconds)
- `400 Bad Request` - Invalid data
- `503 Service Unavailable` - Queue is full

**Example:**
```bash
curl -X POST http://localhost:8080/api/pixel \
  -H "Content-Type: application/json" \
  -d '{"x":100,"y":200,"color":"#FF0000","userId":"alice"}'
```

### WebSocket /ws/queue
Connect as a consumer to receive batched pixel updates.

**Message Format:**
```json
[
  {
    "x": 500,
    "y": 300,
    "color": "#FF5733",
    "userId": "user123",
    "timestamp": 1699032145234
  }
]
```

**Batching Behavior:**
- Sends updates every **100ms** OR
- Sends when **50 pixels** have accumulated
- Whichever condition is met first

**Example (using websocat):**
```bash
websocat ws://localhost:8080/ws/queue
```

### GET /health
Simple health check endpoint.

**Response:**
```
OK
```

## Testing

### Manual Testing with curl

1. **Submit a pixel:**
   ```bash
   curl -X POST http://localhost:8080/api/pixel \
     -H "Content-Type: application/json" \
     -d '{"x":0,"y":0,"color":"#000000","userId":"test1"}'
   ```

2. **Test rate limiting (submit quickly):**
   ```bash
   curl -X POST http://localhost:8080/api/pixel \
     -H "Content-Type: application/json" \
     -d '{"x":1,"y":1,"color":"#000000","userId":"test1"}'
   ```
   Should return `429 Too Many Requests`

3. **Test validation (invalid coordinate):**
   ```bash
   curl -X POST http://localhost:8080/api/pixel \
     -H "Content-Type: application/json" \
     -d '{"x":1000,"y":0,"color":"#000000","userId":"test1"}'
   ```
   Should return `400 Bad Request`

### Running with Race Detector

Go's race detector helps find concurrency bugs:

```bash
go run -race main.go
```

This will detect data races if multiple goroutines access shared data incorrectly.

## Key Concepts for Students

### 1. Goroutines and Concurrency
- **Goroutines** are lightweight threads managed by Go
- Started with the `go` keyword: `go functionName()`
- The hub runs in its own goroutine to handle broadcasting concurrently

### 2. Channels
- **Channels** are pipes for communication between goroutines
- Declared with: `make(chan Type, bufferSize)`
- Send: `channel <- value`
- Receive: `value := <-channel`

### 3. Mutexes (Mutual Exclusion)
- **Mutex** ensures only one goroutine accesses data at a time
- `Lock()` acquires the lock, `Unlock()` releases it
- `defer mu.Unlock()` ensures unlock happens even if function panics

### 4. Select Statement
- Like a switch for channels
- Waits for the first channel operation that's ready
- Used in hub.go to handle multiple events

### 5. FIFO Queue
- **First In, First Out**: Items are processed in the order they arrive
- Implemented using a slice with mutex protection
- Essential for fair pixel placement

## Configuration

You can modify these constants in the code:

| Constant | Location | Default | Description |
|----------|----------|---------|-------------|
| Port | main.go | 8080 | Server port |
| Max Queue Size | main.go | 10,000 | Maximum queued pixels |
| Rate Limit | main.go | 5 seconds | Cooldown between pixels |
| Batch Size | hub.go | 50 pixels | Max pixels per batch |
| Batch Interval | hub.go | 100ms | Time between broadcasts |

## Common Issues

### "Address already in use"
Another process is using port 8080. Either stop that process or change the port in main.go.

### WebSocket connection fails
Make sure your consumer supports WebSocket protocol and is connecting to `ws://localhost:8080/ws/queue` (not `http://`).

### Rate limiting too strict
Adjust the duration in main.go: `NewRateLimiter(5 * time.Second)`

## Next Steps

After understanding this backend:
1. Build the consumer application (Bun/TypeScript) to process the queue
2. Build the frontend (React) to display the canvas
3. Add persistence (save canvas to database)
4. Add authentication for real user IDs
5. Scale horizontally with Redis for distributed queue

## Learning Resources

- [Go Tour](https://go.dev/tour/) - Interactive Go tutorial
- [Goroutines](https://go.dev/doc/effective_go#goroutines) - Concurrency in Go
- [Channels](https://go.dev/doc/effective_go#channels) - Channel communication
- [WebSocket RFC](https://datatracker.ietf.org/doc/html/rfc6455) - WebSocket protocol

## License

MIT License - Feel free to use for educational purposes.
