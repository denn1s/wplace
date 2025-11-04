#!/bin/bash

# Run script for r/place frontend

echo "Starting r/place frontend..."

# Check if node_modules exists, if not install dependencies
if [ ! -d node_modules ]; then
    echo "Dependencies not found. Installing..."
    bun install
    if [ $? -ne 0 ]; then
        echo "✗ Dependency installation failed. Cannot run."
        exit 1
    fi
fi

# Run the development server
bun run dev
