#!/bin/sh
set -e

CHROMIUM_PATH=$(which chromium 2>/dev/null || which chromium-browser 2>/dev/null || find /nix/store -path '*/bin/chromium' -type f 2>/dev/null | head -1 || echo "")

if [ -n "$CHROMIUM_PATH" ]; then
  echo "Found chromium at: $CHROMIUM_PATH"
  echo "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_PATH" > .chromium-path
else
  echo "WARNING: Could not find chromium executable"
fi

exec "$@"
