package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512
)

// upgrader is used to upgrade HTTP connections to WebSocket connections
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow connections from any origin (for development)
	// In production, you should restrict this to your frontend domain
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Client represents a single WebSocket connection to a consumer
type Client struct {
	hub  *Hub              // Reference to the hub
	conn *websocket.Conn   // The WebSocket connection
	send chan []PixelUpdate // Channel for outbound pixel batches
}

// readPump reads messages from the WebSocket connection
// We don't expect consumers to send us data, but we need to handle
// ping/pong messages to detect disconnections
func (c *Client) readPump() {
	defer func() {
		// When this function exits, unregister the client and close connection
		c.hub.unregister <- c
		c.conn.Close()
	}()

	// Configure the connection
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		// When we receive a pong, extend the read deadline
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// Read messages in a loop
	// We discard any messages since consumers shouldn't send us data
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			// Connection closed or error occurred
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

// writePump sends pixel batches to the WebSocket connection
// It also sends periodic ping messages to keep the connection alive
func (c *Client) writePump() {
	// Create a ticker for sending ping messages
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case batch, ok := <-c.send:
			// Set write deadline
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))

			if !ok {
				// The hub closed the channel - connection is closing
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Convert the pixel batch to JSON
			data, err := json.Marshal(batch)
			if err != nil {
				log.Printf("Failed to marshal batch: %v", err)
				continue
			}

			// Send the JSON message
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("Failed to write message: %v", err)
				return
			}

			log.Printf("Sent batch of %d pixels to consumer", len(batch))

		case <-ticker.C:
			// Send a ping message to keep the connection alive
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
