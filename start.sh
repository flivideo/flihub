#!/bin/bash
# Project: FliHub
# Description: Video project system - query projects, recordings, transcripts, chapters, images

echo "================================================"
echo "FliHub - Development Server"
echo "================================================"
echo ""

# Check if already running
if lsof -i :5101 | grep -q LISTEN; then
  echo "FliHub is already running on ports 5100/5101"
  echo "Opening browser..."
  open http://localhost:5100
  exit 0
fi

echo "Building shared types..."
npm run build -w shared

echo ""
echo "Starting FliHub (client: 5100, server: 5101) via Overmind..."
echo "  overmind connect client  — attach to client logs"
echo "  overmind connect server  — attach to server logs"
echo "  overmind stop            — stop all processes"
echo ""

# Open browser after delay (background — gives server time to start)
(sleep 4 && open http://localhost:5100) &

overmind start
