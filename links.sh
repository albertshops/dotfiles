#!/bin/bash

create_symlink() {
    local source=$1
    local target=$2

    if [ -L "$target" ]; then
        echo "Symlink already exists: $target"
    elif [ -e "$target" ]; then
        echo "Target already exists and is not a symlink: $target"
    else
        ln -s "$source" "$target"
    fi
}

create_symlink ~/dotfiles/nvim ~/.config/nvim
create_symlink ~/dotfiles/tmux ~/.config/tmux
create_symlink ~/dotfiles/kitty ~/.config/kitty
create_symlink ~/dotfiles/karabiner ~/.config/karabiner
create_symlink ~/dotfiles/zshrc ~/.zshrc
create_symlink ~/dotfiles/aerospace.toml ~/.aerospace.toml
create_symlink ~/dotfiles/lazygit.yml ~/Library/Application\ Support/lazygit/config.yml
create_symlink ~/dotfiles/ghostty ~/Library/Application\ Support/com.mitchellh.ghostty/config
