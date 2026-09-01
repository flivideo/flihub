#!/bin/bash
# Project: FliHub
cd "$(dirname "$0")"

trap 'rm -f ./.overmind.sock' EXIT INT TERM

echo "================================================"
echo "FliHub - Development Server"
echo "================================================"
echo ""

# Stop overmind if running, then remove stale socket
overmind stop 2>/dev/null
sleep 0.5
rm -f ./.overmind.sock

# Kill anything on our ports
for port in 5100 5101; do
  pids=$(lsof -ti :$port 2>/dev/null)
  [ -n "$pids" ] && echo "Clearing port $port..." && echo "$pids" | xargs kill -9 2>/dev/null
done
sleep 0.5

echo ""
echo "Starting via Overmind (client: 5100, server: 5101)..."
echo "  overmind connect client  — client logs"
echo "  overmind connect server  — server logs"
echo "  overmind stop            — stop all"
echo ""

(sleep 4 && open http://localhost:5100) &

overmind start
