# Fresh Worker subagent

A deliberately narrow Pi extension for orchestration workflows.

It registers one `subagent` tool and accepts only single-worker calls:

```json
{
  "agent": "worker",
  "task": "A complete, self-contained task prompt",
  "cwd": "/path/to/repository"
}
```

Each invocation starts a new ephemeral `pi` process with `--no-session`, inherits the parent session's model and thinking level, and gives the worker the normal coding tools. The worker is instructed to preserve unrelated changes, validate its work, and create exactly one task commit.

Parallel and chain modes are intentionally unsupported so orchestrators cannot accidentally violate serial task-processing requirements.

## Installation

This directory is managed from the dotfiles repository. Link it into Pi's global extension directory:

```sh
mkdir -p ~/.pi/agent/extensions
ln -s ~/dotfiles/stow/pi/.pi/agent/extensions/subagent ~/.pi/agent/extensions/subagent
```

Run `/reload` in an existing Pi session after installation.
