#!/bin/bash

# Build script for r/place frontend

echo "Building r/place frontend..."

# Install dependencies
bun install

if [ $? -ne 0 ]; then
    echo "✗ Dependency installation failed"
    exit 1
fi

# Build for production
bun run build

if [ $? -eq 0 ]; then
    echo "✓ Build successful! Output in dist/"
else
    echo "✗ Build failed"
    exit 1
fi
