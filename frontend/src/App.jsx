import { useState, useEffect, useCallback } from 'react'
import Canvas from './components/Canvas'
import ColorPicker from './components/ColorPicker'
import StatusBar from './components/StatusBar'
import './App.css'

/**
 * Main App Component
 *
 * This is the root component that manages:
 * - User's selected color
 * - WebSocket connection for real-time updates
 * - User ID generation
 * - Rate limiting status
 */
function App() {
  // Current color selected by the user (default: black)
  const [selectedColor, setSelectedColor] = useState('#000000')

  // WebSocket connection instance
  const [ws, setWs] = useState(null)

  // Unique identifier for this user's session
  const [userId, setUserId] = useState('')

  // Status message to show user (e.g., "Connected", "Rate limited")
  const [statusMessage, setStatusMessage] = useState('Connecting...')

  // Whether the user is currently rate limited
  const [isRateLimited, setIsRateLimited] = useState(false)

  /**
   * Generate a unique user ID when the component first mounts
   * Uses timestamp + random number for uniqueness
   */
  useEffect(() => {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setUserId(id)
  }, [])

  /**
   * Establish WebSocket connection to receive real-time pixel updates
   * This runs once when the component mounts
   */
  useEffect(() => {
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:3000/ws/canvas`

    console.log('Connecting to WebSocket:', wsUrl)
    const websocket = new WebSocket(wsUrl)

    // When connection opens successfully
    websocket.onopen = () => {
      console.log('WebSocket connected')
      setStatusMessage('Connected')
      setWs(websocket)
    }

    // Handle connection errors
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      setStatusMessage('Connection error')
    }

    // Handle connection close
    websocket.onclose = () => {
      console.log('WebSocket disconnected')
      setStatusMessage('Disconnected - refresh to reconnect')
    }

    // Cleanup: close WebSocket when component unmounts
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close()
      }
    }
  }, [])

  /**
   * Handle pixel placement when user clicks on canvas
   * Sends pixel data to backend API
   *
   * @param {number} x - X coordinate (0-999)
   * @param {number} y - Y coordinate (0-999)
   */
  const handlePixelClick = useCallback(async (x, y) => {
    // Don't allow placing pixels while rate limited
    if (isRateLimited) {
      setStatusMessage('Please wait - you are rate limited!')
      return
    }

    try {
      // Send pixel data to backend
      const response = await fetch('/api/pixel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x,
          y,
          color: selectedColor,
          userId
        })
      })

      if (response.status === 429) {
        // User is being rate limited (too many pixels too quickly)
        setIsRateLimited(true)
        setStatusMessage('Rate limited! Wait 5 seconds between pixels')

        // Clear rate limit after 5 seconds
        setTimeout(() => {
          setIsRateLimited(false)
          setStatusMessage('Connected')
        }, 5000)
      } else if (response.ok) {
        // Pixel placed successfully
        setStatusMessage(`Pixel placed at (${x}, ${y})`)
      } else {
        // Some other error occurred
        const error = await response.text()
        setStatusMessage(`Error: ${error}`)
      }
    } catch (error) {
      console.error('Failed to place pixel:', error)
      setStatusMessage('Failed to place pixel - check backend connection')
    }
  }, [selectedColor, userId, isRateLimited])

  return (
    <div className="app">
      <header className="app-header">
        <h1>r/place Clone</h1>
        <p className="subtitle">Collaborative Pixel Canvas - Click to place pixels!</p>
      </header>

      <main className="app-main">
        {/* Color selection UI */}
        <ColorPicker
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />

        {/* Main canvas where pixels are displayed and placed */}
        <Canvas
          onPixelClick={handlePixelClick}
          websocket={ws}
        />

        {/* Status bar showing connection and user info */}
        <StatusBar
          status={statusMessage}
          userId={userId}
          isRateLimited={isRateLimited}
        />
      </main>
    </div>
  )
}

export default App
