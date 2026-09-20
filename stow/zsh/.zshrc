eval "$(mise activate zsh)"
alias oc='opencode .'
alias vi='nvim'
alias vim='nvim'
export PROMPT="%F{87}%~%f%F{87} $ %f"
export PATH="$HOME/.local/bin:$PATH"

# Enable keyless Exa search for pi-web-tools.
export PI_WEB_TOOLS_EXA_ENDPOINT="https://mcp.exa.ai/mcp"
