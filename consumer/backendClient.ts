/**
 * Backend WebSocket Client Module
 *
 * This module connects to the backend queue WebSocket and receives pixel updates.
 * It handles automatic reconnection if the connection is lost.
 */

import type { PixelUpdate } from "./types";

/**
 * Manages the WebSocket connection to the backend queue
 */
export class BackendClient {
  private wsUrl: string;
  private socket: WebSocket | null = null;
  private reconnectDelay: number;
  private shouldReconnect: boolean = true;
  private onMessageCallback: ((pixel: PixelUpdate) => void) | null = null;

  /**
   * Creates a new backend client
   *
   * @param wsUrl - WebSocket URL of the backend queue (e.g., "ws://localhost:8080/ws/queue")
   * @param reconnectDelay - Milliseconds to wait before reconnecting after disconnect
   */
  constructor(wsUrl: string, reconnectDelay: number = 5000) {
    this.wsUrl = wsUrl;
    this.reconnectDelay = reconnectDelay;
  }

  /**
   * Connects to the backend WebSocket queue
   *
   * Sets up event handlers for:
   * - Connection open
   * - Incoming messages
   * - Errors
   * - Connection close
   */
  connect(): void {
    console.log(`[BackendClient] Connecting to backend at ${this.wsUrl}...`);

    try {
      // Create WebSocket connection to backend
      this.socket = new WebSocket(this.wsUrl);

      // Handle successful connection
      this.socket.onopen = () => {
        console.log("[BackendClient] Connected to backend queue");
      };

      // Handle incoming messages from backend
      this.socket.onmessage = (event) => {
        try {
          // Log raw data received for debugging
          console.log(`[BackendClient] Raw data received:`, event.data);

          // Parse the JSON message
          const data = JSON.parse(event.data);
          console.log(`[BackendClient] Parsed data:`, data);
          console.log(`[BackendClient] Data type:`, Array.isArray(data) ? 'Array' : typeof data);

          // Backend sends batches (arrays) of pixels, not individual pixels
          if (Array.isArray(data)) {
            console.log(`[BackendClient] Received batch of ${data.length} pixels`);

            // Process each pixel in the batch
            data.forEach((pixel: PixelUpdate) => {
              console.log(`[BackendClient] Processing pixel: (${pixel.x}, ${pixel.y}) ${pixel.color}`);

              // Call the message handler if one is registered
              if (this.onMessageCallback) {
                this.onMessageCallback(pixel);
              }
            });
          } else {
            // Handle single pixel (fallback, though backend sends arrays)
            const pixel: PixelUpdate = data;
            console.log(`[BackendClient] Received single pixel: (${pixel.x}, ${pixel.y}) ${pixel.color}`);

            if (this.onMessageCallback) {
              this.onMessageCallback(pixel);
            }
          }
        } catch (error) {
          console.error("[BackendClient] Failed to parse message:", error);
          console.error("[BackendClient] Raw message was:", event.data);
        }
      };

      // Handle connection errors
      this.socket.onerror = (error) => {
        console.error("[BackendClient] WebSocket error:", error);
      };

      // Handle connection close
      this.socket.onclose = () => {
        console.log("[BackendClient] Disconnected from backend");
        this.socket = null;

        // Attempt to reconnect if we should
        if (this.shouldReconnect) {
          console.log(`[BackendClient] Reconnecting in ${this.reconnectDelay}ms...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error("[BackendClient] Failed to create WebSocket:", error);

      // Try to reconnect after delay
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    }
  }

  /**
   * Sets the callback function to handle incoming pixel updates
   *
   * @param callback - Function to call when a pixel update is received
   */
  onMessage(callback: (pixel: PixelUpdate) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Disconnects from the backend and prevents automatic reconnection
   */
  disconnect(): void {
    console.log("[BackendClient] Disconnecting...");
    this.shouldReconnect = false;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Checks if currently connected to backend
   *
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
