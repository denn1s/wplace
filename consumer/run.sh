#!/bin/bash

# Run script for r/place consumer

echo "Starting r/place consumer..."

# Check if node_modules exists, if not install dependencies
if [ ! -d node_modules ]; then
    echo "Dependencies not found. Installing..."
    ./build.sh
    if [ $? -ne 0 ]; then
        echo "✗ Build failed. Cannot run."
        exit 1
    fi
fi

# Run the consumer in development mode with auto-reload
bun run dev
