package main

import (
	"errors"
	"sync"
)

// PixelQueue is a thread-safe FIFO (First In, First Out) queue for pixel updates
// It uses a mutex to ensure only one goroutine can modify the queue at a time
type PixelQueue struct {
	items    []PixelUpdate  // Slice to store pixel updates
	maxSize  int            // Maximum number of items allowed in the queue
	mu       sync.Mutex     // Mutex for thread-safe operations
	notEmpty *sync.Cond     // Condition variable to signal when queue has items
}

// NewPixelQueue creates a new pixel queue with the specified maximum size
func NewPixelQueue(maxSize int) *PixelQueue {
	q := &PixelQueue{
		items:   make([]PixelUpdate, 0, maxSize),
		maxSize: maxSize,
	}
	// Initialize the condition variable with the queue's mutex
	// This allows goroutines to wait for items to be added to the queue
	q.notEmpty = sync.NewCond(&q.mu)
	return q
}

// Enqueue adds a pixel update to the end of the queue
// Returns an error if the queue is full
func (q *PixelQueue) Enqueue(pixel PixelUpdate) error {
	// Lock the mutex to ensure thread-safe access
	// The mutex will be automatically unlocked when this function returns
	q.mu.Lock()
	defer q.mu.Unlock()

	// Check if the queue is full
	if len(q.items) >= q.maxSize {
		return errors.New("queue is full")
	}

	// Add the pixel to the end of the queue
	q.items = append(q.items, pixel)

	// Signal that the queue is no longer empty
	// This wakes up any goroutines waiting in DequeueBatch
	q.notEmpty.Signal()

	return nil
}

// DequeueBatch removes and returns up to 'batchSize' items from the queue
// If the queue is empty, it waits until at least one item is available
func (q *PixelQueue) DequeueBatch(batchSize int) []PixelUpdate {
	// Lock the mutex for thread-safe access
	q.mu.Lock()
	defer q.mu.Unlock()

	// Wait until the queue has at least one item
	// The Wait() method releases the mutex and blocks until Signal() is called
	// When Signal() is called, Wait() reacquires the mutex and continues
	for len(q.items) == 0 {
		q.notEmpty.Wait()
	}

	// Determine how many items to dequeue
	// Take the minimum of batchSize and the current queue length
	count := batchSize
	if count > len(q.items) {
		count = len(q.items)
	}

	// Extract the first 'count' items from the queue
	batch := make([]PixelUpdate, count)
	copy(batch, q.items[:count])

	// Remove the dequeued items from the queue
	// This keeps the remaining items and shifts them to the front
	q.items = q.items[count:]

	return batch
}

// Len returns the current number of items in the queue
func (q *PixelQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.items)
}

// IsEmpty returns true if the queue has no items
func (q *PixelQueue) IsEmpty() bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.items) == 0
}
