package main

import (
	"sync"
	"time"
)

// RateLimiter tracks when each user last placed a pixel
// It prevents users from placing pixels too frequently
type RateLimiter struct {
	lastUpdate map[string]time.Time // Maps userId to their last pixel timestamp
	mu         sync.RWMutex         // Read-Write mutex for thread-safe map access
	cooldown   time.Duration        // Time users must wait between pixels
}

// NewRateLimiter creates a new rate limiter with the specified cooldown period
func NewRateLimiter(cooldown time.Duration) *RateLimiter {
	rl := &RateLimiter{
		lastUpdate: make(map[string]time.Time),
		cooldown:   cooldown,
	}

	// Start a cleanup goroutine to remove old entries from the map
	// This prevents memory leaks from users who no longer use the service
	go rl.cleanup()

	return rl
}

// Allow checks if a user is allowed to place a pixel
// Returns true if enough time has passed since their last pixel
func (rl *RateLimiter) Allow(userID string) bool {
	// Use the current time for consistent checking
	now := timeNow()

	// Acquire a write lock since we might modify the map
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Check if the user has placed a pixel before
	lastTime, exists := rl.lastUpdate[userID]

	if !exists {
		// First pixel from this user - allow it
		rl.lastUpdate[userID] = now
		return true
	}

	// Calculate how much time has passed since the last pixel
	timeSinceLastUpdate := now.Sub(lastTime)

	// Check if the cooldown period has passed
	if timeSinceLastUpdate < rl.cooldown {
		// User is still in cooldown - deny the pixel
		return false
	}

	// Cooldown period has passed - allow the pixel and update timestamp
	rl.lastUpdate[userID] = now
	return true
}

// cleanup periodically removes old entries from the rate limiter
// This runs in a separate goroutine to avoid memory buildup
func (rl *RateLimiter) cleanup() {
	// Create a ticker that fires every 5 minutes
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()

		now := timeNow()
		// Remove entries older than 10 minutes
		// These users are no longer active
		for userID, lastTime := range rl.lastUpdate {
			if now.Sub(lastTime) > 10*time.Minute {
				delete(rl.lastUpdate, userID)
			}
		}

		rl.mu.Unlock()
	}
}

// timeNow returns the current time
// This is a separate function to make testing easier
var timeNow = time.Now
