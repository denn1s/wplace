#!/bin/bash

# Clean script for r/place frontend

echo "Cleaning frontend artifacts..."

# Remove node_modules
if [ -d node_modules ]; then
    rm -rf node_modules
    echo "✓ Removed node_modules"
fi

# Remove dist folder
if [ -d dist ]; then
    rm -rf dist
    echo "✓ Removed dist"
fi

# Remove bun lockfile (optional - uncomment if you want to clean it)
# if [ -f bun.lockb ]; then
#     rm bun.lockb
#     echo "✓ Removed bun.lockb"
# fi

echo "✓ Clean complete"
