/**
 * r/place Consumer Service - Main Entry Point
 *
 * This service acts as a middleman between the backend queue and frontend clients.
 *
 * ARCHITECTURE:
 * 1. Connects to backend WebSocket (/ws/queue) to receive pixel updates
 * 2. Validates each pixel update (coordinates, color format, etc.)
 * 3. Broadcasts validated updates to all connected frontend clients
 *
 * FLOW:
 * Backend Queue -> Consumer (validate) -> Frontend Clients
 */

import type { ConsumerConfig, PixelUpdate } from "./types";
import { BackendClient } from "./backendClient";
import { Broadcaster } from "./broadcaster";
import { validatePixelUpdate } from "./validator";

/**
 * Configuration for the consumer service
 *
 * These values can be modified or moved to environment variables
 * for different deployment environments.
 */
const config: ConsumerConfig = {
  backendWsUrl: "ws://localhost:8080/ws/queue",  // Backend WebSocket URL
  frontendWsPort: 3001,                          // Port for frontend connections
  canvasWidth: 1000,                             // Canvas dimensions
  canvasHeight: 1000,
  reconnectDelay: 5000,                          // 5 seconds between reconnection attempts
};

// Initialize the broadcaster for frontend clients
const broadcaster = new Broadcaster();

// Initialize the backend client to receive queue updates
const backendClient = new BackendClient(config.backendWsUrl, config.reconnectDelay);

/**
 * Processes a pixel update from the backend queue
 *
 * This is the main processing pipeline:
 * 1. Receive pixel from backend
 * 2. Validate the pixel data
 * 3. If valid, broadcast to all frontend clients
 * 4. If invalid, log the error and discard
 *
 * @param pixel - The pixel update to process
 */
function processPixelUpdate(pixel: PixelUpdate): void {
  // Log incoming pixel for debugging
  console.log(`[Consumer] Processing pixel update:`, {
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    userId: pixel.userId,
    timestamp: pixel.timestamp,
    raw: pixel
  });

  // Validate the pixel update
  const validationResult = validatePixelUpdate(
    pixel,
    config.canvasWidth,
    config.canvasHeight
  );

  console.log(`[Consumer] Validation result:`, validationResult);

  // Check if validation passed
  if (!validationResult.isValid) {
    // Log validation failure and skip broadcasting
    console.error(`[Consumer] Validation failed: ${validationResult.error}`);
    console.error(`[Consumer] Failed pixel data:`, pixel);
    return;
  }

  // Ensure timestamp is present
  if (!pixel.timestamp) {
    pixel.timestamp = Date.now();
    console.log(`[Consumer] Added timestamp: ${pixel.timestamp}`);
  }

  console.log(`[Consumer] Pixel validated successfully, broadcasting...`);

  // Broadcast valid pixel to all connected frontend clients
  broadcaster.broadcast(pixel);
}

/**
 * Starts the WebSocket server for frontend clients
 *
 * This server listens on /ws/canvas and accepts connections from
 * frontend clients. When pixels are validated, they are broadcasted
 * to all connected clients through this server.
 */
function startFrontendWebSocketServer(): void {
  console.log(`[Consumer] Starting WebSocket server for frontend on port ${config.frontendWsPort}...`);

  // Create Bun WebSocket server
  Bun.serve({
    hostname: "0.0.0.0", // Listen on all network interfaces
    port: config.frontendWsPort,

    // Handle HTTP requests (WebSocket upgrade)
    fetch(req, server) {
      const url = new URL(req.url);

      // Only accept WebSocket connections on /ws/canvas endpoint
      if (url.pathname === "/ws/canvas") {
        // Upgrade HTTP connection to WebSocket
        const upgraded = server.upgrade(req);

        if (upgraded) {
          return undefined; // Return undefined to indicate upgrade success
        }

        // If upgrade failed, return error
        return new Response("WebSocket upgrade failed", { status: 500 });
      }

      // Return 404 for other paths
      return new Response("Not found. Use /ws/canvas for WebSocket connection", {
        status: 404,
      });
    },

    // WebSocket handlers
    websocket: {
      /**
       * Called when a frontend client connects
       */
      open(ws) {
        console.log("[Consumer] Frontend client connected");
        broadcaster.addClient(ws);
      },

      /**
       * Called when a frontend client sends a message
       *
       * Note: In this architecture, frontend clients only receive broadcasts.
       * They don't send messages to the consumer (they send directly to backend).
       */
      message(ws, message) {
        console.log("[Consumer] Received unexpected message from frontend client:", message);
      },

      /**
       * Called when a frontend client disconnects
       */
      close(ws) {
        console.log("[Consumer] Frontend client disconnected");
        broadcaster.removeClient(ws);
      },

      /**
       * Called when a WebSocket error occurs
       */
      error(ws, error) {
        console.error("[Consumer] WebSocket error:", error);
      },
    },
  });

  console.log(`[Consumer] Frontend WebSocket server running on ws://0.0.0.0:${config.frontendWsPort}/ws/canvas`);
}

/**
 * Main function - starts the consumer service
 *
 * This function:
 * 1. Starts the frontend WebSocket server
 * 2. Sets up the pixel processing handler
 * 3. Connects to the backend queue
 */
function main(): void {
  console.log("=".repeat(60));
  console.log("r/place Consumer Service Starting...");
  console.log("=".repeat(60));
  console.log(`Canvas Size: ${config.canvasWidth}x${config.canvasHeight}`);
  console.log(`Backend: ${config.backendWsUrl}`);
  console.log(`Frontend WebSocket Port: ${config.frontendWsPort}`);
  console.log("=".repeat(60));

  // Start the WebSocket server for frontend clients
  startFrontendWebSocketServer();

  // Set up the message handler for backend pixel updates
  backendClient.onMessage(processPixelUpdate);

  // Connect to backend queue
  backendClient.connect();

  console.log("[Consumer] Service is running and ready to process pixel updates");
}

/**
 * Graceful shutdown handler
 *
 * Ensures clean disconnection when the service is stopped (Ctrl+C)
 */
process.on("SIGINT", () => {
  console.log("\n[Consumer] Shutting down gracefully...");

  // Disconnect from backend
  backendClient.disconnect();

  // Disconnect all frontend clients
  broadcaster.disconnectAll();

  console.log("[Consumer] Shutdown complete");
  process.exit(0);
});

// Start the service
main();
