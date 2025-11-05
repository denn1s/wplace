package main

import (
	"log"
	"net/http"
	"time"
)

func main() {
	// Initialize SQLite database for canvas persistence
	db, err := NewDatabase("./canvas.db")
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize the pixel queue with a maximum capacity of 10,000 items
	queue := NewPixelQueue(10000)

	// Initialize the rate limiter (1 pixel per user per 5 seconds)
	rateLimiter := NewRateLimiter(5 * time.Second)

	// Initialize the WebSocket hub that manages all consumer connections
	hub := NewHub(queue)

	// Start the hub in a separate goroutine (concurrent execution)
	// This allows the hub to handle broadcasting while the server handles requests
	go hub.Run()

	// Create HTTP server with our handlers
	server := &Server{
		queue:       queue,
		rateLimiter: rateLimiter,
		hub:         hub,
		db:          db,
	}

	// Register HTTP endpoints
	http.HandleFunc("/api/pixel", server.handlePixelUpdate)
	http.HandleFunc("/api/canvas", server.handleGetCanvas)
	http.HandleFunc("/ws/queue", server.handleWebSocket)

	// Add a simple health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Start the HTTP server on port 8080 (accessible from all network interfaces)
	log.Println("Server starting on 0.0.0.0:8080")
	log.Println("Endpoints:")
	log.Println("  POST   /api/pixel  - Submit pixel updates")
	log.Println("  GET    /api/canvas - Get full canvas state")
	log.Println("  WS     /ws/queue   - WebSocket for consumers")
	log.Println("  GET    /health     - Health check")

	if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
