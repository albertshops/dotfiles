#!/usr/bin/env bash

set -euo pipefail

TWITCHER_REPO="https://github.com/albertshops/twitcher.git"
MY_TUBE_REPO="https://github.com/albertshops/my-tube.git"
TWITCHER_DIR="$HOME/twitcher"
MY_TUBE_DIR="$HOME/my-tube"
APPLICATIONS_DIR="$HOME/Applications"

clone_if_missing() {
  local repo="$1"
  local destination="$2"

  if [[ -d "$destination/.git" ]]; then
    echo "Using existing repository: $destination"
    return
  fi

  if [[ -e "$destination" ]]; then
    echo "Cannot clone $repo: $destination already exists and is not a Git repository." >&2
    exit 1
  fi

  git clone "$repo" "$destination"
}

echo "Installing personal apps..."
clone_if_missing "$TWITCHER_REPO" "$TWITCHER_DIR"
clone_if_missing "$MY_TUBE_REPO" "$MY_TUBE_DIR"

echo "Building Twitcher..."
"$TWITCHER_DIR/scripts/package-app.sh"
mkdir -p "$APPLICATIONS_DIR"
rm -rf "$APPLICATIONS_DIR/Twitcher.app"
ditto "$TWITCHER_DIR/dist/Twitcher.app" "$APPLICATIONS_DIR/Twitcher.app"

echo "Installed Twitcher to $APPLICATIONS_DIR/Twitcher.app"
echo "My Tube is available at $MY_TUBE_DIR"
echo
echo "Manual steps:"
echo "  1. Open Twitcher and grant it Accessibility and Vivaldi Automation access."
echo "  2. In Vivaldi, open vivaldi://extensions, enable Developer mode,"
echo "     choose Load unpacked, and select $MY_TUBE_DIR."
