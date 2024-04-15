# pyenv
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

  export RPROMPT="%F{220}$prefix"
}




# nvm
export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion



# aliases
alias ls='ls -G'
alias ll='ls -lh | sort -r | awk '\''NF==9 { if ($1~/^d/) { printf "\033[0;34m" $9 "\033[0m" "\n" } else { printf $9 "\n" } }'\'' | column -t -s"/"'

alias CD='A=`tmux show-environment PROJECT_ROOT` && cd ${A#*=}'
alias f='fzf'

alias vim=nvim


# fix dvorak tilde position
hidutil property \
  --matching '{"ProductID":0x343,"VendorID":0x5ac}' \
  --set '{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":0x700000035,"HIDKeyboardModifierMappingDst":0x700000064},{"HIDKeyboardModifierMappingSrc":0x700000064,"HIDKeyboardModifierMappingDst":0x700000035}]}' \
  >/dev/null


export ANDROID_HOME=/Users/albertshops/.local/bin

export PATH="$PATH:$HOME/.local/bin"

# pnpm
export PNPM_HOME="/Users/albertshops/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm endexport PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"
