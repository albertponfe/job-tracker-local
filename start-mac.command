#!/usr/bin/env bash
# ===  Job Tracker - one-click start (macOS)  ===
# Double-click this file in Finder. (First time only, you may need to right-click →
# Open to get past macOS's "unidentified developer" warning.)

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js is needed to run this app, and it isn't installed yet."
  echo "  Opening the download page — install the 'LTS' version, then run this again."
  echo ""
  open "https://nodejs.org/en/download/prebuilt-installer" 2>/dev/null
  echo "Press Return to close."
  read -r _
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing app dependencies (first time only, about a minute)..."
  npm install || { echo "Install failed. See the messages above."; read -r _; exit 1; }
fi

echo ""
echo "  Starting Job Tracker... your browser will open automatically."
echo "  Keep this window open while you use the app. Close it to stop."
echo ""
npm start
