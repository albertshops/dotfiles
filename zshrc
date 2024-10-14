export PROMPT="%F{87}%~%f%F{87} $ %f"
export RPROMPT=""

# pyenv
if which pyenv >/dev/null 2>&1; then
  export PYENV_ROOT="$HOME/.pyenv"
  command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"
  eval "$(pyenv init --path)"
  eval "$(pyenv init -)"
  eval "$(pyenv virtualenv-init -)"
  export PYENV_VIRTUALENV_DISABLE_PROMPT=1

  precmd () {
    export PROMPT="%F{87}%~%f%F{87} $ %f"
    export RPROMPT=""

    if [ $(pwd) = "$PREV_DIR" ]; then
      return
    else
      PREV_DIR=$(pwd)
    fi

    # check if we're just using the default system python version
    local pyenv_root=$(pyenv root)
    local pyenv_version_file=$(pyenv version-file)
    if [[ $pyenv_version_file == $pyenv_root* ]]; then
      return
    fi

    local in_venv=$(pyenv virtualenv-prefix 2>/dev/null)
    if [[ -n $in_venv ]]; then
      # if we're in a venv, get the name and version
      local version=${in_venv##*/}
      local name=$(pyenv version-name)
      prefix="$name:$version"
    else
      # otherwise just get the version
      local version=$(pyenv version-name)
      prefix="$version"
    fi

    export RPROMPT="%F{109}$prefix"
  }
fi


# nvm
if which nvm >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
    [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
    [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
fi



# aliases
alias ls='ls -G'
alias CD='A=`tmux show-environment PROJECT_ROOT` && cd ${A#*=}'
alias desaturate=sed 's/\x1B\[[0-9;]\{1,\}[A-Za-z]//g'
alias vim=nvim

export ANDROID_HOME="$HOME/.local/bin"

export PATH="$PATH:$HOME/.local/bin"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"
export PATH="$HOME/go/bin:$PATH"

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
