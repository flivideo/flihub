#!/bin/bash
# Project: FliHub
#   ./start.sh                                             — open on the last brand/project
#   ./start.sh --brand <key> --project <folder> [--video <NN-name>]
#                                                          — open pointed at that project (W3 open contract)
cd "$(dirname "$0")"

# W3 open contract, door 2: overmind runs the Procfile, so the flags reach the server as FLIVIDEO_* env.
# A FLIVIDEO_LAUNCH_ID marks this launch, so a later nodemon/overmind restart does not re-apply it.
while [ $# -gt 0 ]; do
  case "$1" in
    --brand|--project|--video)
      if [ -z "${2:-}" ] || [ "${2#--}" != "$2" ]; then echo "$1 needs a value"; exit 2; fi
      name="${1#--}"; value="$2"; shift 2 ;;
    --brand=*|--project=*|--video=*)
      name="${1%%=*}"; name="${name#--}"; value="${1#*=}"; shift ;;
    *)
      echo "Unknown argument: $1"
      echo "usage: ./start.sh [--brand <key> --project <folder> [--video <NN-name>]]"
      exit 2 ;;
  esac
  export "FLIVIDEO_$(echo "$name" | tr '[:lower:]' '[:upper:]')=$value"
  FLIVIDEO_LAUNCH_ID="$(date +%s)-$$"
done
[ -n "${FLIVIDEO_LAUNCH_ID:-}" ] && export FLIVIDEO_LAUNCH_ID

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

if [ -n "${FLIVIDEO_LAUNCH_ID:-}" ]; then
  echo "Opening at brand=${FLIVIDEO_BRAND:-?} project=${FLIVIDEO_PROJECT:-?}${FLIVIDEO_VIDEO:+ video=$FLIVIDEO_VIDEO}"
  echo "  (if it cannot resolve, FliHub stays on the picker — curl localhost:5101/api/context says why)"
  echo ""
fi

(sleep 4 && open http://localhost:5100) &

overmind start
