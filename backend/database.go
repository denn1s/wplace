package main

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Database manages the SQLite connection and canvas state persistence
type Database struct {
	db *sql.DB
}

// NewDatabase creates a new database connection and initializes the schema
func NewDatabase(dbPath string) (*Database, error) {
	// Open SQLite database file
	// If the file doesn't exist, it will be created
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	database := &Database{db: db}

	// Initialize the schema
	if err := database.initSchema(); err != nil {
		return nil, err
	}

	log.Printf("Database initialized at %s", dbPath)
	return database, nil
}

// initSchema creates the canvas_state table if it doesn't exist
func (d *Database) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS canvas_state (
		x INTEGER NOT NULL,
		y INTEGER NOT NULL,
		color TEXT NOT NULL,
		user_id TEXT,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (x, y)
	);

	CREATE INDEX IF NOT EXISTS idx_updated_at ON canvas_state(updated_at);
	`

	_, err := d.db.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("Database schema initialized")
	return nil
}

// SavePixel saves or updates a pixel in the database
// Uses REPLACE to handle both INSERT and UPDATE cases
func (d *Database) SavePixel(pixel PixelUpdate) error {
	query := `
	REPLACE INTO canvas_state (x, y, color, user_id, updated_at)
	VALUES (?, ?, ?, ?, ?)
	`

	// Use provided timestamp or current time
	timestamp := pixel.Timestamp
	if timestamp == 0 {
		timestamp = time.Now().UnixNano() / int64(1000000)
	}

	_, err := d.db.Exec(query, pixel.X, pixel.Y, pixel.Color, pixel.UserID, timestamp)
	if err != nil {
		log.Printf("Failed to save pixel (%d, %d): %v", pixel.X, pixel.Y, err)
		return err
	}

	return nil
}

// GetAllPixels retrieves all pixels from the database
// Returns a slice of PixelUpdate representing the current canvas state
func (d *Database) GetAllPixels() ([]PixelUpdate, error) {
	query := `
	SELECT x, y, color, user_id, updated_at
	FROM canvas_state
	ORDER BY updated_at ASC
	`

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pixels []PixelUpdate

	// Iterate through all rows
	for rows.Next() {
		var pixel PixelUpdate
		err := rows.Scan(&pixel.X, &pixel.Y, &pixel.Color, &pixel.UserID, &pixel.Timestamp)
		if err != nil {
			log.Printf("Failed to scan pixel row: %v", err)
			continue
		}
		pixels = append(pixels, pixel)
	}

	// Check for errors from iterating over rows
	if err = rows.Err(); err != nil {
		return nil, err
	}

	log.Printf("Retrieved %d pixels from database", len(pixels))
	return pixels, nil
}

// GetPixelCount returns the total number of pixels in the canvas
func (d *Database) GetPixelCount() (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM canvas_state`

	err := d.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// ClearCanvas removes all pixels from the database
// This is useful for testing or resetting the canvas
func (d *Database) ClearCanvas() error {
	query := `DELETE FROM canvas_state`
	_, err := d.db.Exec(query)
	if err != nil {
		return err
	}

	log.Println("Canvas cleared")
	return nil
}

// Close closes the database connection
func (d *Database) Close() error {
	if d.db != nil {
		return d.db.Close()
	}
	return nil
}
