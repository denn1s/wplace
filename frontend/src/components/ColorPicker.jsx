import { useState } from 'react'
import './ColorPicker.css'

/**
 * ColorPicker Component
 *
 * Provides a palette of preset colors plus a custom color picker
 * Users can select a color to place pixels with
 *
 * @param {string} selectedColor - Currently selected color
 * @param {Function} onColorChange - Callback when color is selected
 */
function ColorPicker({ selectedColor, onColorChange }) {
  // Preset color palette (common colors used in r/place)
  const PRESET_COLORS = [
    '#FFFFFF', // White
    '#E4E4E4', // Light gray
    '#888888', // Gray
    '#222222', // Dark gray
    '#000000', // Black
    '#FF4444', // Red
    '#FF6B00', // Orange
    '#FFD635', // Yellow
    '#00CC78', // Green
    '#00CCC0', // Cyan
    '#2450A4', // Blue
    '#811E9F', // Purple
    '#FF99AA', // Pink
    '#9C6926', // Brown
  ]

  return (
    <div className="color-picker">
      <h2>Select Color</h2>

      {/* Display currently selected color */}
      <div className="selected-color-display">
        <div
          className="color-preview"
          style={{ backgroundColor: selectedColor }}
        />
        <span className="color-code">{selectedColor}</span>
      </div>

      {/* Preset color palette */}
      <div className="preset-colors">
        <h3>Quick Colors</h3>
        <div className="color-grid">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`color-button ${selectedColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              title={color}
              aria-label={`Select color ${color}`}
            >
              {/* Show checkmark on selected color */}
              {selectedColor === color && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom color picker for any color */}
      <div className="custom-color">
        <h3>Custom Color</h3>
        <div className="custom-color-input">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="color-input"
            aria-label="Choose custom color"
          />
          <input
            type="text"
            value={selectedColor}
            onChange={(e) => {
              // Validate hex color format
              const value = e.target.value
              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                onColorChange(value)
              }
            }}
            className="color-text-input"
            placeholder="#000000"
            pattern="^#[0-9A-Fa-f]{6}$"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  )
}

export default ColorPicker
