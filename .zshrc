PROMPT="%F{87}%~%f%F{87} $ %f"

export PATH="$PATH:$HOME/.local/bin"

# nvm
export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion


# pyenv
export PYENV_ROOT="$HOME/.pyenv"
command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"


# aliases
alias ls='ls -G'
alias ll='ls -lh | sort -r | awk '\''NF==9 { if ($1~/^d/) { printf "\033[0;34m" $9 "\033[0m" "\n" } else { printf $9 "\n" } }'\'' | column -t -s"/"'

# fix dvorak tilde position
hidutil property \
  --matching '{"ProductID":0x343,"VendorID":0x5ac}' \
  --set '{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":0x700000035,"HIDKeyboardModifierMappingDst":0x700000064},{"HIDKeyboardModifierMappingSrc":0x700000064,"HIDKeyboardModifierMappingDst":0x700000035}]}' \
  >/dev/null
