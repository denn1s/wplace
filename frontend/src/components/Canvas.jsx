import { useRef, useEffect, useState } from 'react'
import './Canvas.css'

/**
 * Canvas Component
 *
 * Renders a 1000x1000 pixel grid using HTML Canvas API
 * Handles:
 * - Initial canvas setup
 * - Receiving real-time pixel updates via WebSocket
 * - User clicks to place pixels
 * - Efficient canvas rendering
 *
 * @param {Function} onPixelClick - Callback when user clicks a pixel
 * @param {WebSocket} websocket - WebSocket connection for updates
 */
function Canvas({ onPixelClick, websocket }) {
  // Reference to the canvas DOM element (not stored in state to avoid re-renders)
  const canvasRef = useRef(null)

  // Reference to the 2D drawing context (for performance)
  const ctxRef = useRef(null)

  // Track canvas dimensions
  const CANVAS_SIZE = 1000

  // Scale factor for display (makes pixels visible)
  // Each logical pixel is displayed as 5x5 screen pixels
  const PIXEL_SCALE = 5

  // Actual display size
  const DISPLAY_SIZE = CANVAS_SIZE * PIXEL_SCALE

  // Number of updates received (for debugging)
  const [updateCount, setUpdateCount] = useState(0)

  // Loading state for initial canvas fetch
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Initialize canvas when component mounts
   * Sets up the canvas element and drawing context
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get 2D drawing context
    const ctx = canvas.getContext('2d', {
      // Performance optimization: we don't need alpha channel
      alpha: false
    })

    ctxRef.current = ctx

    // Fill canvas with white background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    console.log('Canvas initialized:', CANVAS_SIZE, 'x', CANVAS_SIZE)
  }, [])

  /**
   * Fetch initial canvas state from backend when component mounts
   * This ensures new clients see all existing pixels
   */
  useEffect(() => {
    const loadInitialCanvasState = async () => {
      try {
        console.log('Fetching initial canvas state...')
        setIsLoading(true)

        const response = await fetch('/api/canvas')

        if (!response.ok) {
          throw new Error(`Failed to fetch canvas: ${response.status}`)
        }

        const pixels = await response.json()
        console.log(`Loading ${pixels.length} existing pixels...`)

        // Draw all existing pixels on the canvas
        pixels.forEach(pixel => {
          const { x, y, color } = pixel
          if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
            drawPixel(x, y, color)
          }
        })

        console.log('Initial canvas state loaded successfully')
        setUpdateCount(pixels.length)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load initial canvas state:', error)
        setIsLoading(false)
        // Continue anyway - real-time updates will still work
      }
    }

    // Only load if we have a canvas context
    if (ctxRef.current) {
      loadInitialCanvasState()
    }
  }, [ctxRef.current])

  /**
   * Listen for pixel updates from WebSocket
   * When a pixel update arrives, draw it on the canvas
   */
  useEffect(() => {
    if (!websocket) return

    /**
     * Handle incoming WebSocket messages
     * Expected format: { x: number, y: number, color: string, timestamp: number }
     */
    const handleMessage = (event) => {
      try {
        const pixelData = JSON.parse(event.data)
        const { x, y, color } = pixelData

        // Validate pixel coordinates
        if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
          console.warn('Invalid pixel coordinates:', x, y)
          return
        }

        // Draw the pixel on the canvas
        drawPixel(x, y, color)

        // Update counter (useful for debugging)
        setUpdateCount(prev => prev + 1)
      } catch (error) {
        console.error('Error processing pixel update:', error)
      }
    }

    // Attach message listener
    websocket.addEventListener('message', handleMessage)

    // Cleanup: remove listener when component unmounts or websocket changes
    return () => {
      websocket.removeEventListener('message', handleMessage)
    }
  }, [websocket])

  /**
   * Draw a single pixel on the canvas
   *
   * @param {number} x - X coordinate (0-999)
   * @param {number} y - Y coordinate (0-999)
   * @param {string} color - Hex color code (e.g., "#FF0000")
   */
  const drawPixel = (x, y, color) => {
    const ctx = ctxRef.current
    if (!ctx) return

    // Set the fill color
    ctx.fillStyle = color

    // Draw a 1x1 pixel at the specified coordinates
    // The canvas will automatically scale this based on our CSS scaling
    ctx.fillRect(x, y, 1, 1)
  }

  /**
   * Handle canvas click events
   * Converts screen coordinates to pixel coordinates and calls onPixelClick
   *
   * @param {MouseEvent} event - Click event
   */
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get canvas bounding rectangle to calculate relative position
    const rect = canvas.getBoundingClientRect()

    // Calculate click position relative to canvas
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    // Convert from display coordinates to pixel coordinates
    // We need to account for the scaling factor
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height

    const pixelX = Math.floor(clickX * scaleX)
    const pixelY = Math.floor(clickY * scaleY)

    // Ensure coordinates are within bounds
    if (pixelX >= 0 && pixelX < CANVAS_SIZE && pixelY >= 0 && pixelY < CANVAS_SIZE) {
      onPixelClick(pixelX, pixelY)
    }
  }

  return (
    <div className="canvas-container">
      <div className="canvas-info">
        <span>Canvas: {CANVAS_SIZE}x{CANVAS_SIZE} pixels</span>
        <span className="update-counter">
          {isLoading ? 'Loading canvas...' : `Pixels: ${updateCount}`}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="pixel-canvas"
        onClick={handleCanvasClick}
        style={{
          // Scale up the canvas for better visibility
          width: `${DISPLAY_SIZE}px`,
          height: `${DISPLAY_SIZE}px`,
          // Use nearest-neighbor scaling to keep pixels sharp
          imageRendering: 'pixelated'
        }}
      />

      <div className="canvas-instructions">
        Click on the canvas to place a pixel with your selected color
      </div>
    </div>
  )
}

export default Canvas
