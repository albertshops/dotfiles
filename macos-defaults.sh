#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script supports macOS only." >&2
  exit 1
fi

echo "Applying macOS preferences..."

# Appearance
defaults write NSGlobalDomain AppleInterfaceStyle -string "Dark"

# Keyboard: fast key repeat and normal key repeat instead of accent selection.
defaults write NSGlobalDomain InitialKeyRepeat -int 15
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false

# Trackpad: natural scrolling, tap to click, secondary click, and tracking speed.
defaults write NSGlobalDomain com.apple.swipescrolldirection -bool true
defaults write NSGlobalDomain com.apple.trackpad.scaling -float 0.6875
defaults write NSGlobalDomain com.apple.mouse.tapBehavior -int 1
defaults -currentHost write NSGlobalDomain com.apple.mouse.tapBehavior -int 1

for domain in com.apple.AppleMultitouchTrackpad com.apple.driver.AppleBluetoothMultitouch.trackpad; do
  defaults write "$domain" Clicking -bool true
  defaults write "$domain" TrackpadRightClick -bool true
  defaults write "$domain" TrackpadThreeFingerDrag -bool false
  defaults write "$domain" Dragging -bool false
  defaults write "$domain" DragLock -bool false
  defaults write "$domain" TrackpadCornerSecondaryClick -int 0
  defaults write "$domain" TrackpadTwoFingerFromRightEdgeSwipeGesture -int 3
  defaults write "$domain" TrackpadThreeFingerHorizSwipeGesture -int 2
  defaults write "$domain" TrackpadThreeFingerVertSwipeGesture -int 2
  defaults write "$domain" TrackpadFourFingerHorizSwipeGesture -int 2
  defaults write "$domain" TrackpadFourFingerVertSwipeGesture -int 2
  defaults write "$domain" TrackpadFiveFingerPinchGesture -int 2
  defaults write "$domain" TrackpadPinch -bool true
  defaults write "$domain" TrackpadRotate -bool true
  defaults write "$domain" TrackpadScroll -bool true
done

defaults write com.apple.AppleMultitouchTrackpad ActuationStrength -int 1
defaults write com.apple.AppleMultitouchTrackpad FirstClickThreshold -int 1
defaults write com.apple.AppleMultitouchTrackpad SecondClickThreshold -int 1

# Dock: show only running apps and hide immediately.
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock autohide-time-modifier -float 0.01
defaults write com.apple.dock show-recents -bool false
defaults write com.apple.dock static-only -bool true

# Finder: list view, visible hidden files/path/status bars, and no desktop icons.
defaults write NSGlobalDomain AppleShowAllFiles -bool true
defaults write com.apple.finder AppleShowAllFiles -bool true
defaults write com.apple.finder ShowPathbar -bool true
defaults write com.apple.finder ShowStatusBar -bool true
defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"
defaults write com.apple.finder FXArrangeGroupViewBy -string "Name"
defaults write com.apple.finder CreateDesktop -bool false
defaults write com.apple.finder ShowHardDrivesOnDesktop -bool false
defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool true
defaults write com.apple.finder ShowRemovableMediaOnDesktop -bool true

# Menu bar clock and privacy.
defaults write com.apple.menuextra.clock ShowDate -int 0
defaults write com.apple.menuextra.clock ShowDayOfWeek -bool true
defaults write com.apple.AdLib allowApplePersonalizedAdvertising -bool false

# Restart affected UI processes. Some keyboard and trackpad changes require logout.
killall Dock 2>/dev/null || true
killall Finder 2>/dev/null || true
killall SystemUIServer 2>/dev/null || true

echo "macOS preferences applied. Log out and back in to apply all input settings."
