#!/bin/bash
set -e

# This script helps with Coolify deployment permission issues
# Run this on the Coolify host

COOLIFY_APP_DIR="${1:-.}"
COOLIFY_USER="${COOLIFY_USER:-coolify}"
COOLIFY_GROUP="${COOLIFY_GROUP:-coolify}"

echo "Setting up Coolify deployment permissions..."
echo "App directory: $COOLIFY_APP_DIR"

# Ensure directory exists and has correct ownership
if [ ! -d "$COOLIFY_APP_DIR" ]; then
  echo "Creating directory: $COOLIFY_APP_DIR"
  sudo mkdir -p "$COOLIFY_APP_DIR"
fi

# Fix ownership
echo "Setting ownership to $COOLIFY_USER:$COOLIFY_GROUP"
sudo chown -R "$COOLIFY_USER:$COOLIFY_GROUP" "$COOLIFY_APP_DIR"

# Fix permissions
echo "Setting permissions (755 for dirs, 644 for files)"
sudo find "$COOLIFY_APP_DIR" -type d -exec chmod 755 {} \;
sudo find "$COOLIFY_APP_DIR" -type f -exec chmod 644 {} \;

# Make scripts executable
echo "Making scripts executable"
sudo find "$COOLIFY_APP_DIR" -name "*.sh" -exec chmod +x {} \;

echo "✓ Permissions fixed successfully"
echo ""
echo "Next steps:"
echo "1. Redeploy your Coolify application"
echo "2. Coolify will now have proper write permissions"
echo ""
