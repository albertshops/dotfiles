#!/usr/bin/env bash

set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOW_DIR="$DOTFILES_DIR/stow"
BREWFILE="$DOTFILES_DIR/Brewfile"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This bootstrap script currently supports macOS only." >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Installing Homebrew..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  else
    echo "Homebrew was installed but could not be found." >&2
    exit 1
  fi
fi

echo "Installing Homebrew dependencies..."
brew bundle --file="$BREWFILE"

# Expose Homebrew's Compose plugin to the Docker CLI without a
# machine-specific Homebrew prefix in ~/.docker/config.json.
docker_compose_plugin="$(brew --prefix)/lib/docker/cli-plugins/docker-compose"
if [[ -e "$docker_compose_plugin" ]]; then
  mkdir -p "$HOME/.docker/cli-plugins"
  ln -sfn "$docker_compose_plugin" "$HOME/.docker/cli-plugins/docker-compose"
fi

echo "Linking dotfiles..."
for package_dir in "$STOW_DIR"/*; do
  [[ -d "$package_dir" ]] || continue
  stow --restow --dir="$STOW_DIR" --target="$HOME" "$(basename "$package_dir")"
done

echo "Applying macOS preferences..."
"$DOTFILES_DIR/macos-defaults.sh"

echo "Installing mise-managed tools..."
mise install

echo "Bootstrap complete."
