# CLAUDE.md

## Project: r/place Clone

### Architecture Overview
- Backend (Go): Port 8080, manages pixel queue
- Consumer (Bun): Processes queue, broadcasts updates
- Frontend (React): Displays canvas, sends pixel updates

## API Endpoints

### Backend (Go)
**POST /api/pixel**
```json
{
  "x": 0-999,
  "y": 0-999,
  "color": "#RRGGBB",
  "userId": "string"
}
```
Response: `200 OK` or `429 Too Many Requests`

**WebSocket /ws/queue**
- Sends pixel updates to consumers
- Format: Same as POST payload + timestamp

### Consumer to Frontend WebSocket
**WebSocket /ws/canvas**
- Broadcasts validated pixel updates to all clients
- Format:
```json
{
  "x": number,
  "y": number,
  "color": string,
  "timestamp": number
}
```

## Queue Behavior
- In-memory FIFO queue
- Max queue size: 10,000 items
- Rate limiting: 1 pixel per user per 5 seconds
- Batching: Send updates every 100ms or 50 pixels, whichever comes first

## Development Commands
- Backend: `cd backend && go run main.go`
- Consumer: `cd consumer && bun run index.ts`
- Frontend: `cd frontend && bun run dev`
