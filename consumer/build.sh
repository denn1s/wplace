#!/bin/bash

# Build script for r/place consumer

echo "Building r/place consumer..."

# Install dependencies
bun install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "✗ Build failed"
    exit 1
fi
