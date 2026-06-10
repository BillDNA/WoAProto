#!/bin/bash
# War of Attrition — LAN server launcher for macOS (and Linux).
# If double-clicking doesn't work, open Terminal here and run:  sh run-server.command
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required for two-device play. Install it from https://nodejs.org"
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
node server.js
