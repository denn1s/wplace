/**
 * Broadcast Manager Module
 *
 * This module manages WebSocket connections to frontend clients and broadcasts
 * validated pixel updates to all connected clients in real-time.
 */

import type { ServerWebSocket } from "bun";
import type { PixelUpdate } from "./types";

/**
 * Manages all frontend client WebSocket connections
 */
export class Broadcaster {
  // Set to store all active frontend client connections
  private clients: Set<ServerWebSocket<unknown>>;

  constructor() {
    // Initialize empty set of clients
    this.clients = new Set();
  }

  /**
   * Adds a new frontend client connection to the broadcast list
   *
   * @param client - The WebSocket connection to add
   */
  addClient(client: ServerWebSocket<unknown>): void {
    this.clients.add(client);
    console.log(`[Broadcaster] New client connected. Total clients: ${this.clients.size}`);
  }

  /**
   * Removes a frontend client connection from the broadcast list
   *
   * Called when a client disconnects or connection is closed
   *
   * @param client - The WebSocket connection to remove
   */
  removeClient(client: ServerWebSocket<unknown>): void {
    this.clients.delete(client);
    console.log(`[Broadcaster] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcasts a validated pixel update to all connected frontend clients
   *
   * This method sends the pixel update to every connected client.
   * If sending to a client fails, that client is automatically removed.
   *
   * @param pixel - The validated pixel update to broadcast
   */
  broadcast(pixel: PixelUpdate): void {
    // Log what we're about to broadcast
    console.log(`[Broadcaster] Broadcasting pixel:`, {
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      timestamp: pixel.timestamp,
      clientCount: this.clients.size
    });

    // Prepare the message to send (convert object to JSON string)
    const message = JSON.stringify({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      timestamp: pixel.timestamp || Date.now(),
    });

    console.log(`[Broadcaster] JSON message:`, message);

    // Counter for successful broadcasts
    let successCount = 0;
    let failCount = 0;

    // Send message to each connected client
    for (const client of this.clients) {
      try {
        // Send the message to this client
        client.send(message);
        successCount++;
      } catch (error) {
        // If sending fails, remove this client (probably disconnected)
        console.error(`[Broadcaster] Failed to send to client:`, error);
        this.removeClient(client);
        failCount++;
      }
    }

    // Log broadcast summary
    if (this.clients.size > 0) {
      console.log(
        `[Broadcaster] Broadcasted pixel (${pixel.x}, ${pixel.y}) to ${successCount} clients` +
        (failCount > 0 ? `, ${failCount} failed` : "")
      );
    }
  }

  /**
   * Returns the current number of connected clients
   *
   * @returns Number of active client connections
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Disconnects all clients and clears the client list
   *
   * Used during shutdown or restart
   */
  disconnectAll(): void {
    for (const client of this.clients) {
      try {
        client.close();
      } catch (error) {
        console.error(`[Broadcaster] Error closing client:`, error);
      }
    }
    this.clients.clear();
    console.log("[Broadcaster] All clients disconnected");
  }
}
