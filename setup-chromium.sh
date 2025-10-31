#!/bin/sh
set -e

CHROMIUM_PATH=$(which chromium || which chromium-browser || find /nix/store -name chromium -type f 2>/dev/null | head -1 || echo "")

if [ -n "$CHROMIUM_PATH" ]; then
  echo "Found chromium at: $CHROMIUM_PATH"
  export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROMIUM_PATH"
else
  echo "WARNING: Could not find chromium executable"
fi

exec "$@"
