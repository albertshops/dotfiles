# dotfiles

This repo now uses [chezmoi](https://www.chezmoi.io/) for sharing config between machines.

## Layout

- `chezmoi/` is the source-of-truth for managed files.
- All tracked config lives under `chezmoi/`.

Managed targets from `chezmoi/`:

- `chezmoi/dot_zshrc` -> `~/.zshrc`
- `chezmoi/dot_aerospace.toml` -> `~/.aerospace.toml`
- `chezmoi/dot_config/lazygit/config.yml` -> `~/.config/lazygit/config.yml`
- `chezmoi/dot_config/tmux/tmux.conf` -> `~/.config/tmux/tmux.conf`
- `chezmoi/executable_dot_config/tmux/sessionizer` -> `~/.config/tmux/sessionizer`
- `chezmoi/dot_config/nvim/init.lua` -> `~/.config/nvim/init.lua`
- `chezmoi/dot_config/kitty/kitty.conf` -> `~/.config/kitty/kitty.conf`
- `chezmoi/dot_config/karabiner/karabiner.json` -> `~/.config/karabiner/karabiner.json`
- `chezmoi/dot_config/karabiner/assets/complex_modifications/*` -> `~/.config/karabiner/assets/complex_modifications/*`

## First-time setup on a machine

1. Run `./bootstrap.sh`.
2. If you want to run commands manually instead, use:
   - `brew bundle --file ./Brewfile`
   - `chezmoi -S "$PWD/chezmoi" apply --force`

## Daily workflow

- Edit a file: `chezmoi edit ~/.zshrc`
- See pending changes: `chezmoi -S "$PWD/chezmoi" diff`
- Apply changes: `chezmoi -S "$PWD/chezmoi" apply --force`
- Re-sync from source directory: `chezmoi -S "$PWD/chezmoi" re-add`

## Notes

- Generated runtime state (tmux resurrect snapshots, Karabiner automatic backups) should stay out of source-managed files.
