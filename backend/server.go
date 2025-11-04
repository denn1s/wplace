package main

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
)

// Server holds all the dependencies needed to handle HTTP requests
type Server struct {
	queue       *PixelQueue
	rateLimiter *RateLimiter
	hub         *Hub
}

// PixelUpdate represents a single pixel change on the canvas
type PixelUpdate struct {
	X         int    `json:"x"`         // X coordinate (0-999)
	Y         int    `json:"y"`         // Y coordinate (0-999)
	Color     string `json:"color"`     // Hex color (#RRGGBB)
	UserID    string `json:"userId"`    // User identifier
	Timestamp int64  `json:"timestamp"` // Unix timestamp in milliseconds
}

// Regular expression to validate hex color format (#RRGGBB)
var hexColorRegex = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// handlePixelUpdate processes incoming pixel update requests
func (s *Server) handlePixelUpdate(w http.ResponseWriter, r *http.Request) {
	// Only accept POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Enable CORS (Cross-Origin Resource Sharing) for frontend access
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Parse the JSON request body into a PixelUpdate struct
	var pixel PixelUpdate
	if err := json.NewDecoder(r.Body).Decode(&pixel); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate the pixel data
	if err := validatePixel(&pixel); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if the user is rate limited
	// Returns true if the user is allowed to place a pixel
	if !s.rateLimiter.Allow(pixel.UserID) {
		http.Error(w, "Rate limit exceeded. Please wait before placing another pixel.", http.StatusTooManyRequests)
		return
	}

	// Add timestamp to the pixel update (in milliseconds)
	pixel.Timestamp = currentTimeMillis()

	// Try to add the pixel to the queue
	if err := s.queue.Enqueue(pixel); err != nil {
		log.Printf("Failed to enqueue pixel: %v", err)
		http.Error(w, "Queue is full. Please try again.", http.StatusServiceUnavailable)
		return
	}

	// Success! Return 200 OK
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Pixel update accepted"))

	log.Printf("Pixel accepted: user=%s x=%d y=%d color=%s",
		pixel.UserID, pixel.X, pixel.Y, pixel.Color)
}

// handleWebSocket upgrades HTTP connection to WebSocket for consumers
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Enable CORS for WebSocket
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	// Create a new client connection and register it with the hub
	client := &Client{
		hub:  s.hub,
		conn: conn,
		send: make(chan []PixelUpdate, 256),
	}

	// Register the client with the hub
	s.hub.register <- client

	// Start goroutines to handle reading and writing
	// These run concurrently to handle bidirectional communication
	go client.writePump()
	go client.readPump()

	log.Printf("New WebSocket consumer connected from %s", r.RemoteAddr)
}

// validatePixel checks if a pixel update is valid
func validatePixel(pixel *PixelUpdate) error {
	// Check X coordinate is within bounds (0-999)
	if pixel.X < 0 || pixel.X > 999 {
		return &ValidationError{"x coordinate must be between 0 and 999"}
	}

	// Check Y coordinate is within bounds (0-999)
	if pixel.Y < 0 || pixel.Y > 999 {
		return &ValidationError{"y coordinate must be between 0 and 999"}
	}

	// Check color format is valid hex (#RRGGBB)
	if !hexColorRegex.MatchString(pixel.Color) {
		return &ValidationError{"color must be in #RRGGBB format"}
	}

	// Check userId is not empty
	if pixel.UserID == "" {
		return &ValidationError{"userId is required"}
	}

	return nil
}

// ValidationError is a custom error type for validation failures
type ValidationError struct {
	message string
}

func (e *ValidationError) Error() string {
	return e.message
}

// currentTimeMillis returns the current Unix timestamp in milliseconds
func currentTimeMillis() int64 {
	return timeNow().UnixNano() / int64(1000000)
}
