/**
 * Pixel Validation Module
 *
 * This module validates pixel updates before broadcasting them to frontend clients.
 * Validation ensures data integrity and prevents invalid updates from corrupting the canvas.
 */

import type { PixelUpdate, ValidationResult } from "./types";

/**
 * Validates a pixel update to ensure it meets all requirements
 *
 * Checks performed:
 * 1. All required fields are present
 * 2. Coordinates are within canvas bounds
 * 3. Color is a valid hex code
 * 4. Data types are correct
 *
 * @param pixel - The pixel update to validate
 * @param canvasWidth - Maximum allowed X coordinate
 * @param canvasHeight - Maximum allowed Y coordinate
 * @returns Validation result with isValid flag and optional error message
 */
export function validatePixelUpdate(
  pixel: PixelUpdate,
  canvasWidth: number,
  canvasHeight: number
): ValidationResult {
  // Check if pixel object exists
  if (!pixel) {
    return { isValid: false, error: "Pixel update is null or undefined" };
  }

  // Validate X coordinate
  if (typeof pixel.x !== "number" || pixel.x < 0 || pixel.x >= canvasWidth) {
    return {
      isValid: false,
      error: `Invalid X coordinate: ${pixel.x}. Must be between 0 and ${canvasWidth - 1}`,
    };
  }

  // Validate Y coordinate
  if (typeof pixel.y !== "number" || pixel.y < 0 || pixel.y >= canvasHeight) {
    return {
      isValid: false,
      error: `Invalid Y coordinate: ${pixel.y}. Must be between 0 and ${canvasHeight - 1}`,
    };
  }

  // Validate color format (must be hex color like #RRGGBB)
  if (typeof pixel.color !== "string" || !isValidHexColor(pixel.color)) {
    return {
      isValid: false,
      error: `Invalid color format: ${pixel.color}. Must be hex format like #RRGGBB`,
    };
  }

  // Validate userId exists
  if (typeof pixel.userId !== "string" || pixel.userId.trim() === "") {
    return {
      isValid: false,
      error: "Invalid or missing userId",
    };
  }

  // All validations passed
  return { isValid: true };
}

/**
 * Checks if a string is a valid hex color code
 *
 * Valid formats:
 * - #RGB (short form, e.g., #F00)
 * - #RRGGBB (long form, e.g., #FF0000)
 *
 * @param color - The color string to validate
 * @returns true if valid hex color, false otherwise
 */
function isValidHexColor(color: string): boolean {
  // Regular expression for hex color validation
  // Matches #RGB or #RRGGBB format
  const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexColorRegex.test(color);
}
