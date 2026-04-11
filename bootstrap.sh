#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it first: https://brew.sh"
  exit 1
fi

if [[ -f "$SCRIPT_DIR/Brewfile" ]]; then
  if ! brew bundle --file "$SCRIPT_DIR/Brewfile"; then
    echo "brew bundle did not fully complete. Continuing with stow setup."
  fi
fi

if ! command -v stow >/dev/null 2>&1; then
  brew install stow
fi

if [[ ! -d "$SCRIPT_DIR/stow" ]]; then
  echo "stow directory not found at $SCRIPT_DIR/stow"
  exit 1
fi

(
  cd "$SCRIPT_DIR/stow"
  stow --target "$HOME" --restow */
)

echo "Bootstrap complete."
