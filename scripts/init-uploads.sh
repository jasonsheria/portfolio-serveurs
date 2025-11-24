#!/usr/bin/env sh
# No-op init script kept for documentation / manual use.
# IMPORTANT: we intentionally avoid creating directories or changing permissions
# at process start to prevent 'Operation not permitted' on mounted volumes.
# Upload folders will be created lazily by the application at the time of upload.

echo "Init script intentionally does nothing at startup. Use the app endpoints to create uploads on demand."
