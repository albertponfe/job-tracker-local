#!/usr/bin/env bash
# ===  Job Tracker - one-click start (macOS / Linux)  ===
# Run with:  ./start.sh   (you may need:  chmod +x start.sh)

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js is not installed."
  echo "  Please install it from https://nodejs.org (the 'LTS' version), then run this again."
  echo ""
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies for the first time. This can take a minute..."
  npm install || { echo "Install failed. See the messages above."; exit 1; }
fi

echo "Starting Job Tracker..."
npm start
