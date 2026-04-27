# stty -ixon

export PROMPT="%F{87}%~%f%F{87} $ %f"
export RPROMPT=""

export DOCKER_API_VERSION=1.43

# nvm
if which nvm >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
    [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
    [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
fi

export PKG_CONFIG_PATH="/opt/homebrew/opt/opencv/lib/pkgconfig:$PKG_CONFIG_PATH"
export CGO_CFLAGS="-I/opt/homebrew/opt/opencv/include"
export CGO_LDFLAGS="-L/opt/homebrew/opt/opencv/lib"



# aliases
alias CD='A=`tmux show-environment PROJECT_ROOT` && cd ${A#*=}'
alias desaturate=sed 's/\x1B\[[0-9;]\{1,\}[A-Za-z]//g'

alias ls='ls -G'
alias d='ls -lah'
alias vim=nvim
alias dc="docker compose exec app"
#alias venv='source .venv/bin/activate'
#alias venv='pyenv activate elysium'


export ANDROID_HOME="$HOME/.local/bin"

export PATH="$PATH:$HOME/.local/bin"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"
export PATH="$HOME/go/bin:$PATH"
export PATH="$HOME/.config/opencode:$PATH"

# pnpm
if which pnpm >/dev/null 2>&1; then
  export PNPM_HOME="$HOME/Library/pnpm"
  case ":$PATH:" in
    *":$PNPM_HOME:"*) ;;
    *) export PATH="$PNPM_HOME:$PATH" ;;
  esac
fi

if which fzf >/dev/null 2>&1; then
  source <(fzf --zsh)
fi

bindkey '^[[1;5C' forward-word     # Ctrl+right arrow
bindkey '^[[1;5D' backward-word    # Ctrl+left arrow
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# pyenv
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - zsh)"

# Smart cd: plain `cd` inside tmux goes to the session root
cd() {
  # If no args and we're inside tmux, try to jump to the session root
  if [[ $# -eq 0 && -n "$TMUX" ]]; then
    # Ask tmux for the current session's @session-root
    local root
    root=$(tmux show-option -qv @session-root 2>/dev/null)

    if [[ -n "$root" ]]; then
      builtin cd "$root"
      return
    fi
  fi

  # Fallback: normal cd behaviour
  builtin cd "$@"
}
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
