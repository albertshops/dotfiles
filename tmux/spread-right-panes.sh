#!/bin/bash

SESSION=$1
WINDOW=$2
PANE=$(tmux display-message -p "#{pane_index}")
CURRENT_PANE_HEIGHT=$(tmux display-message -p "#{pane_height}")

WINDOW_ID=$SESSION:$WINDOW

WINDOW_HEIGHT=$(tmux display -p -t $WINDOW_ID '#{window_height}')
PANES=$(tmux list-panes -t $WINDOW_ID -F "#{pane_index}")

NUM_RIGHT_PANES=$(($(echo $PANES | wc -w) - 1))
TARGET_PANE_HEIGHT=$((WINDOW_HEIGHT / NUM_RIGHT_PANES))

maximise() {
  tmux resize-pane -t $WINDOW_ID.$PANE -y $WINDOW_HEIGHT
}

spread() {
  for PANE in $PANES; do
    if [ $PANE -eq 0 ]; then
      continue
    fi

    tmux resize-pane -t $WINDOW_ID.$PANE -y $TARGET_PANE_HEIGHT
  done
}

if tmux list-panes -t $WINDOW_ID -F "#{pane_height}" | grep -q "^1$"; then
  if [ $CURRENT_PANE_HEIGHT -eq 1 ]; then
    maximise
  else
    spread
  fi
else
  maximise
fi
