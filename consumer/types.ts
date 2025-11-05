/**
 * Type definitions for the r/place consumer application
 *
 * These types ensure type safety across the application and make
 * the data structures clear for other developers.
 */

/**
 * Represents a single pixel update from the backend queue
 */
export interface PixelUpdate {
  x: number;           // X coordinate (0-999)
  y: number;           // Y coordinate (0-999)
  color: string;       // Hex color code (e.g., "#FF0000")
  userId: string;      // Unique identifier for the user
  timestamp?: number;  // Optional timestamp (added if not present)
}

/**
 * Validation result for pixel updates
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Configuration for the consumer service
 */
export interface ConsumerConfig {
  backendWsUrl: string;      // WebSocket URL to connect to backend
  backendHttpUrl: string;    // HTTP URL to connect to backend API
  frontendWsPort: number;    // Port to listen for frontend connections
  canvasWidth: number;       // Maximum canvas width
  canvasHeight: number;      // Maximum canvas height
  reconnectDelay: number;    // Delay in ms before reconnecting to backend
}
