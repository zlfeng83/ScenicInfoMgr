#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")"

echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Node modules not found. Installing dependencies..."
  npm install
fi

echo "Starting Scenic Info Manager development server..."
npm run dev
