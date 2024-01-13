## tmux

- resurrect working (manual save & restore)
- contiuum working (saving session every minute)
- restore on start up not working
  - launchctl plist calls start-server.sh which starts tmux by opening a dummy session but old sessions don't get restored
  - considering removing all that and just doing tmux -> ctrl+r when i bootup
