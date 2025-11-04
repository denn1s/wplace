package main

import (
	"log"
	"time"
)

// Hub manages all WebSocket connections (consumers) and broadcasts pixel updates
// It acts as a central coordinator between the queue and all connected consumers
type Hub struct {
	// Map of all active client connections
	// Using a map allows for O(1) registration and unregistration
	clients map[*Client]bool

	// Channel for broadcasting pixel batches to all clients
	broadcast chan []PixelUpdate

	// Channel to register new client connections
	register chan *Client

	// Channel to unregister disconnected clients
	unregister chan *Client

	// Reference to the pixel queue
	queue *PixelQueue
}

// NewHub creates a new Hub instance
func NewHub(queue *PixelQueue) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []PixelUpdate, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		queue:      queue,
	}
}

// Run starts the hub's main event loop
// This function runs in its own goroutine and handles:
// 1. Registering new clients
// 2. Unregistering disconnected clients
// 3. Broadcasting batches of pixels to all clients
// 4. Reading from the queue and broadcasting
func (h *Hub) Run() {
	// Start the queue processor in a separate goroutine
	// This goroutine continuously reads from the queue and sends batches
	go h.processQueue()

	// Main event loop - runs forever
	for {
		select {
		case client := <-h.register:
			// New client connected - add to the map
			h.clients[client] = true
			log.Printf("Client registered. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			// Client disconnected - remove from map and close channel
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client unregistered. Total clients: %d", len(h.clients))
			}

		case batch := <-h.broadcast:
			// Broadcast a batch of pixels to all connected clients
			// Iterate over all clients and send the batch
			for client := range h.clients {
				select {
				case client.send <- batch:
					// Successfully sent batch to client
				default:
					// Client's send buffer is full - disconnect them
					// This prevents a slow client from blocking the hub
					close(client.send)
					delete(h.clients, client)
					log.Printf("Client removed due to slow consumption")
				}
			}
		}
	}
}

// processQueue continuously reads from the pixel queue and broadcasts batches
// It implements the batching logic: send every 100ms or 50 pixels, whichever comes first
func (h *Hub) processQueue() {
	// Ticker fires every 100 milliseconds
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	// Buffer to accumulate pixels before broadcasting
	var buffer []PixelUpdate

	for {
		select {
		case <-ticker.C:
			// Timer fired - check if we have pixels to broadcast
			if len(buffer) > 0 {
				// Broadcast the accumulated pixels
				h.broadcast <- buffer
				log.Printf("Broadcasting batch of %d pixels (time-based)", len(buffer))

				// Create a new buffer for the next batch
				buffer = make([]PixelUpdate, 0, 50)
			}

			// Try to get more pixels from the queue (non-blocking)
			// We dequeue in a separate goroutine to avoid blocking the ticker
			go func() {
				if !h.queue.IsEmpty() {
					// Get up to 50 pixels from the queue
					batch := h.queue.DequeueBatch(50)
					if len(batch) > 0 {
						// Add to buffer
						// Note: In a production system, you'd need proper synchronization
						// For simplicity, we're broadcasting directly here
						h.broadcast <- batch
						log.Printf("Broadcasting batch of %d pixels (size-based)", len(batch))
					}
				}
			}()
		}
	}
}
