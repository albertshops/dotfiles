# dotfiles

This repo uses [GNU Stow](https://www.gnu.org/software/stow/) for symlink-based dotfile management.

## Layout

- `stow/` is the source-of-truth for managed files.
- Each subdirectory under `stow/` is a package (for example `shell`, `nvim`, `tmux`).

Managed targets from `stow/`:

- `stow/shell/.zshrc` -> `~/.zshrc`
- `stow/aerospace/.aerospace.toml` -> `~/.aerospace.toml`
- `stow/lazygit/.config/lazygit/config.yml` -> `~/.config/lazygit/config.yml`
- `stow/tmux/.config/tmux/tmux.conf` -> `~/.config/tmux/tmux.conf`
- `stow/tmux/.config/tmux/sessionizer` -> `~/.config/tmux/sessionizer`
- `stow/nvim/.config/nvim/init.lua` -> `~/.config/nvim/init.lua`
- `stow/kitty/.config/kitty/kitty.conf` -> `~/.config/kitty/kitty.conf`
- `stow/opencode/.config/opencode/plugins/notification.ts` -> `~/.config/opencode/plugins/notification.ts`
- `stow/pi/.pi/agent/extensions/persistent-prompt-suffix.ts` -> `~/.pi/agent/extensions/persistent-prompt-suffix.ts`
- `stow/pi/.pi/agent/extensions/purr-on-finish.ts` -> `~/.pi/agent/extensions/purr-on-finish.ts`
- `stow/pi/.pi/agent/extensions/vim-editor.ts.disabled` -> `~/.pi/agent/extensions/vim-editor.ts.disabled`
- `stow/karabiner/.config/karabiner/karabiner.json` -> `~/.config/karabiner/karabiner.json`
- `stow/karabiner/.config/karabiner/assets/complex_modifications/*` -> `~/.config/karabiner/assets/complex_modifications/*`

## First-time setup on a machine

1. Run `./bootstrap.sh`.
2. If you want to run commands manually instead, use:
   - `brew bundle --file ./Brewfile`
   - `cd ./stow && stow --target "$HOME" --restow */`

## Daily workflow

- See what would change: `cd stow && stow --simulate --target "$HOME" <package>`
- Apply a package: `cd stow && stow --target "$HOME" <package>`
- Re-apply after edits: `cd stow && stow --restow --target "$HOME" <package>`
- Remove symlinks for a package: `cd stow && stow --delete --target "$HOME" <package>`

## Notes

- If Stow reports conflicts, move or remove the existing file in `$HOME` and run Stow again.
- Generated runtime state (tmux resurrect snapshots, Karabiner automatic backups) should stay out of source-managed files.
- Notification plugin reads `~/.config/opencode/.env` on each notification event.
- Set `NOTIFY_DELAY_SECONDS` (for example `NOTIFY_DELAY_SECONDS=5`) to delay notifications.
