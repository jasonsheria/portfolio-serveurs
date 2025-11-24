#!/usr/bin/env sh
set -e

# Initialize uploads directory before starting the app.
# Uses UPLOADS_DIR if set, otherwise defaults to /data/uploads then project './uploads'.
: "${UPLOADS_DIR:=/data/uploads}"

# Ensure directory exists with safe permissions
mkdir -p "$UPLOADS_DIR"
chmod 755 "$UPLOADS_DIR"

# Optionally create common subfolders
for d in general profiles mobilier messages documents; do
  mkdir -p "$UPLOADS_DIR/$d"
done

echo "Initialized uploads dir: $UPLOADS_DIR"
