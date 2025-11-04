#!/bin/bash

# Build script for r/place backend

echo "Building r/place backend..."

# Ensure dependencies are up to date
go mod tidy

# Build the binary
go build -o wplace-backend .

if [ $? -eq 0 ]; then
    echo "✓ Build successful! Binary: wplace-backend"
else
    echo "✗ Build failed"
    exit 1
fi
