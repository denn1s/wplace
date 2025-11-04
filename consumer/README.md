# r/place Consumer Service

## Overview

The Consumer Service is the middleware component of the r/place clone that sits between the backend queue and frontend clients. It receives pixel updates from the backend, validates them, and broadcasts them to all connected frontend clients in real-time.

## Architecture

```
Backend (Go)          Consumer (Bun)         Frontend Clients
    |                      |                        |
    |  /ws/queue           |                        |
    |-------------------->|                         |
    |  pixel updates       |                        |
    |                      |   validate             |
    |                      |----------->            |
    |                      |                        |
    |                      |  /ws/canvas            |
    |                      |----------------------->|
    |                      |  broadcast updates     |
```

### Components

1. **BackendClient** (`backendClient.ts`)
   - Connects to backend WebSocket at `/ws/queue`
   - Receives pixel updates from the queue
   - Handles automatic reconnection on disconnect

2. **Validator** (`validator.ts`)
   - Validates pixel coordinates (0-999 for both x and y)
   - Validates color format (hex code #RRGGBB)
   - Validates userId presence
   - Ensures data type correctness

3. **Broadcaster** (`broadcaster.ts`)
   - Manages all frontend client connections
   - Broadcasts validated pixels to all clients
   - Handles client connections/disconnections

4. **Main Service** (`index.ts`)
   - Orchestrates all components
   - Runs WebSocket server on port 3001
   - Processes pixel update pipeline

## Installation

### Prerequisites
- [Bun](https://bun.sh) runtime installed
- Backend service running on port 8080

### Setup

1. Navigate to the consumer directory:
```bash
cd consumer
```

2. Install dependencies:
```bash
bun install
```

## Usage

### Development Mode (with auto-reload)
```bash
bun run dev
```

### Production Mode
```bash
bun run start
```

The service will:
- Start WebSocket server on `ws://0.0.0.0:3001/ws/canvas` (accessible from network)
- Connect to backend at `ws://localhost:8080/ws/queue`
- Begin processing and broadcasting pixel updates

## Configuration

Configuration is located in `index.ts` in the `config` object:

```typescript
const config: ConsumerConfig = {
  backendWsUrl: "ws://localhost:8080/ws/queue",  // Backend WebSocket URL
  frontendWsPort: 3001,                          // Port for frontend connections
  canvasWidth: 1000,                             // Canvas width
  canvasHeight: 1000,                            // Canvas height
  reconnectDelay: 5000,                          // Reconnection delay (ms)
};
```

To modify these values, edit the `config` object in `index.ts`.

## API

### Frontend WebSocket Connection

**Endpoint:** `ws://localhost:3001/ws/canvas`

**Protocol:** WebSocket

**Message Format (Outgoing to Frontend):**
```json
{
  "x": 42,
  "y": 100,
  "color": "#FF5733",
  "timestamp": 1699012345678
}
```

### Backend WebSocket Connection

**Endpoint:** `ws://localhost:8080/ws/queue` (configured in backend)

**Protocol:** WebSocket

**Message Format (Incoming from Backend):**
```json
{
  "x": 42,
  "y": 100,
  "color": "#FF5733",
  "userId": "user123",
  "timestamp": 1699012345678
}
```

## Validation Rules

The consumer validates all pixel updates before broadcasting:

1. **X Coordinate:** Must be a number between 0 and 999 (inclusive)
2. **Y Coordinate:** Must be a number between 0 and 999 (inclusive)
3. **Color:** Must be a valid hex color code (#RGB or #RRGGBB format)
4. **UserId:** Must be a non-empty string

Invalid pixels are logged and discarded without broadcasting.

## Error Handling

### Backend Connection Failures
- Automatic reconnection every 5 seconds (configurable)
- Logs connection status and errors
- Service continues to serve frontend clients during backend downtime

### Frontend Client Failures
- Failed clients are automatically removed from broadcast list
- Other clients continue to receive updates normally

### Invalid Pixel Updates
- Validation errors are logged with details
- Invalid pixels are discarded
- Service continues processing subsequent updates

## Graceful Shutdown

Press `Ctrl+C` to trigger graceful shutdown:
1. Disconnects from backend
2. Closes all frontend client connections
3. Exits cleanly

## File Structure

```
consumer/
├── index.ts              # Main entry point and service orchestration
├── backendClient.ts      # Backend WebSocket client
├── broadcaster.ts        # Frontend client broadcast manager
├── validator.ts          # Pixel update validation logic
├── types.ts             # TypeScript type definitions
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## Logging

The service provides detailed logging for debugging:

- `[BackendClient]` - Backend connection events
- `[Broadcaster]` - Frontend client and broadcast events
- `[Consumer]` - Main service and validation events

Example output:
```
============================================================
r/place Consumer Service Starting...
============================================================
Canvas Size: 1000x1000
Backend: ws://localhost:8080/ws/queue
Frontend WebSocket Port: 3001
============================================================
[Consumer] Starting WebSocket server for frontend on port 3001...
[Consumer] Frontend WebSocket server running on ws://localhost:3001/ws/canvas
[BackendClient] Connecting to backend at ws://localhost:8080/ws/queue...
[Consumer] Service is running and ready to process pixel updates
[BackendClient] Connected to backend queue
[Consumer] Frontend client connected
[Broadcaster] New client connected. Total clients: 1
[BackendClient] Received pixel update: (42, 100) #FF5733
[Broadcaster] Broadcasted pixel (42, 100) to 1 clients
```

## Testing

### Manual Testing

1. Start the backend service
2. Start the consumer service
3. Connect a WebSocket client to `ws://localhost:3001/ws/canvas`
4. Send pixel updates to the backend
5. Observe broadcasts in the frontend client

### Using websocat (CLI tool)
```bash
# Install websocat
# Listen for broadcasts
websocat ws://localhost:3001/ws/canvas
```

## Troubleshooting

### "Failed to connect to backend"
- Ensure backend service is running on port 8080
- Check backend WebSocket endpoint is `/ws/queue`
- Verify no firewall blocking the connection

### "WebSocket upgrade failed"
- Ensure you're connecting to `/ws/canvas` path
- Verify port 3001 is not in use by another service

### No broadcasts received
- Check if backend is sending pixel updates
- Verify consumer is connected to backend (check logs)
- Ensure frontend client is connected to `/ws/canvas`

## Development Tips

### Code Organization
- Each module has a single responsibility (separation of concerns)
- All modules are well-commented for learning purposes
- Type safety is enforced via TypeScript

### Adding Features
- **New validation rules:** Modify `validator.ts`
- **Custom message format:** Update types in `types.ts` and broadcasting logic
- **Additional endpoints:** Add routes in `index.ts` fetch handler

### Performance
- Bun's native WebSocket implementation is highly efficient
- Broadcasting is O(n) where n = number of connected clients
- No queuing delay - updates are broadcast immediately upon validation

## License

MIT
