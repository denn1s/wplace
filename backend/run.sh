#!/bin/bash

# Run script for r/place backend

echo "Starting r/place backend..."

# Check if binary exists, if not build it
if [ ! -f wplace-backend ]; then
    echo "Binary not found. Building..."
    ./build.sh
    if [ $? -ne 0 ]; then
        echo "✗ Build failed. Cannot run."
        exit 1
    fi
fi

# Run the backend
./wplace-backend
