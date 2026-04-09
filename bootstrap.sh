#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it first: https://brew.sh"
  exit 1
fi

if [[ -f "$SCRIPT_DIR/Brewfile" ]]; then
  if ! brew bundle --file "$SCRIPT_DIR/Brewfile"; then
    echo "brew bundle did not fully complete. Continuing with chezmoi apply."
  fi
fi

if ! command -v chezmoi >/dev/null 2>&1; then
  brew install chezmoi
fi

chezmoi -S "$SCRIPT_DIR/chezmoi" apply --force

echo "Bootstrap complete."
