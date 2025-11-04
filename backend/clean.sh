#!/bin/bash

# Clean script for r/place backend

echo "Cleaning build artifacts..."

# Remove the compiled binary
if [ -f wplace-backend ]; then
    rm wplace-backend
    echo "✓ Removed binary: wplace-backend"
fi

# Clean Go build cache (optional)
go clean

echo "✓ Clean complete"
