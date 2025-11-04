# r/place Clone - Frontend

A React-based frontend for a collaborative pixel canvas application, similar to Reddit's r/place.

## Features

- **1000x1000 Pixel Canvas**: Interactive canvas for placing colored pixels
- **Real-time Updates**: WebSocket connection to receive pixel updates from other users
- **Color Selection**: Preset color palette and custom color picker
- **Rate Limiting**: Prevents users from placing pixels too quickly (1 pixel per 5 seconds)
- **User Sessions**: Unique user ID generated for each session
- **Visual Feedback**: Status bar showing connection state and rate limit warnings

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Backend server running on port 8080
- Consumer WebSocket server running on port 3000

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
bun install
```

### 2. Start Development Server

```bash
bun run dev
```

The application will start on `http://0.0.0.0:3000` (accessible via localhost:3000 or your machine's IP)

### 3. Verify Backend Connections

Make sure the following are running:
- Backend API server: `http://localhost:8080`
- Consumer WebSocket: `ws://localhost:3001/ws/canvas`

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Canvas.jsx          # Main canvas component with pixel rendering
│   │   ├── Canvas.css          # Canvas styling
│   │   ├── ColorPicker.jsx     # Color selection UI
│   │   ├── ColorPicker.css     # Color picker styling
│   │   ├── StatusBar.jsx       # Connection status display
│   │   └── StatusBar.css       # Status bar styling
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # App layout styles
│   ├── main.jsx                # React entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── vite.config.js              # Vite configuration with proxies
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## How It Works

### Component Architecture

1. **App.jsx** - Root component that manages:
   - User state (color selection, user ID)
   - WebSocket connection lifecycle
   - Rate limiting logic
   - Communication between child components

2. **Canvas.jsx** - Handles pixel rendering:
   - Uses HTML Canvas API for efficient rendering
   - Receives real-time updates via WebSocket
   - Converts click coordinates to pixel positions
   - Optimized with `useRef` to avoid unnecessary re-renders

3. **ColorPicker.jsx** - Color selection interface:
   - Preset color palette (14 common colors)
   - Custom color picker for any hex color
   - Visual preview of selected color

4. **StatusBar.jsx** - User feedback:
   - Connection status (Connected/Disconnected)
   - Current user ID
   - Rate limit warnings

### WebSocket Integration

The app connects to the consumer's WebSocket endpoint (`/ws/canvas`) to receive real-time pixel updates:

```javascript
// Expected message format
{
  "x": 0-999,        // X coordinate
  "y": 0-999,        // Y coordinate
  "color": "#RRGGBB", // Hex color code
  "timestamp": 1234567890
}
```

### Pixel Placement Flow

1. User clicks on canvas → `handleCanvasClick` converts screen coordinates to pixel coordinates
2. App sends POST request to `/api/pixel` with pixel data
3. Backend validates and adds to queue
4. Consumer processes and broadcasts via WebSocket
5. All connected clients receive update and render the pixel

### Rate Limiting

- Users can place 1 pixel every 5 seconds
- Backend returns `429 Too Many Requests` if limit exceeded
- Frontend displays warning and disables clicking for 5 seconds

## Development Tips

### Code Organization

The code is heavily commented for educational purposes:
- Each function has a JSDoc-style comment explaining its purpose
- Complex logic includes inline comments
- Component props are documented

### Performance Optimizations

1. **Canvas Rendering**: Uses `useRef` for canvas context to avoid re-renders
2. **Event Handlers**: Wrapped with `useCallback` to prevent recreation
3. **Canvas Scaling**: CSS-based scaling with `image-rendering: pixelated`
4. **WebSocket**: Single persistent connection, proper cleanup on unmount

### Customization

To modify the canvas size, update these constants in `Canvas.jsx`:
```javascript
const CANVAS_SIZE = 1000      // Logical pixel count
const PIXEL_SCALE = 5         // Display scale factor
```

To add more preset colors, edit the `PRESET_COLORS` array in `ColorPicker.jsx`.

## Building for Production

```bash
bun run build
```

This creates an optimized production build in the `dist/` directory.

To preview the production build:
```bash
bun run preview
```

## Troubleshooting

### WebSocket Not Connecting
- Check that the consumer is running on port 3000
- Open browser console to see connection logs
- Verify the WebSocket URL in `App.jsx`

### Pixels Not Appearing
- Check browser console for errors
- Verify backend is running and accepting requests
- Check WebSocket messages in browser DevTools (Network tab)

### Rate Limit Always Active
- Check if backend is returning 429 responses
- Clear browser cache and reload
- Verify user ID is being generated (check StatusBar)

## API Reference

### Backend Endpoints Used

**POST /api/pixel**
```json
{
  "x": 0-999,
  "y": 0-999,
  "color": "#RRGGBB",
  "userId": "user_timestamp_randomstring"
}
```

Response Codes:
- `200 OK` - Pixel placed successfully
- `429 Too Many Requests` - Rate limit exceeded
- `400 Bad Request` - Invalid pixel data

**WebSocket /ws/canvas**
- Receives pixel updates in real-time
- Auto-reconnect not implemented (requires page refresh)

## Learning Resources

- [React Documentation](https://react.dev/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Vite Documentation](https://vitejs.dev/)

## License

This is an educational project for computer science students.
