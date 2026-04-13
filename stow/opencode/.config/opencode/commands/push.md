---
description: Clean ignore rules, make logical commits, and push
agent: build
---
You are running a git automation workflow for the current repository.

Goal:
1) Ensure files that should be ignored are ignored first.
2) Create a series of logical commits (not one giant commit).
3) Push only after commits are complete.

Rules:
- If current directory is not a git repository, stop and explain.
- Run these discovery commands first: `git status --short`, `git diff`, `git diff --staged`, `git ls-files --others --exclude-standard`, `git log --oneline -10`.
- Identify likely ignore candidates among untracked/changed files (build artifacts, caches, logs, temp files, editor/system files, coverage outputs, local env files).
- Update `.gitignore` first when needed, then create a dedicated commit for it (for example: `chore: update gitignore`).
- Never commit likely secret files (`.env`, credentials, private keys, token dumps) unless explicitly requested.
- After ignore cleanup, choose the smallest sensible number of commits:
  - If the remaining changes are one cohesive unit, make one commit.
  - If there are distinct intents/scopes (feature + refactor + docs, etc.), split into coherent commits by intent and scope.
- Stage only the files for each commit as you go (do not blindly stage everything at once unless that group is intentionally all files).
- Commit messages should follow existing repository style from recent commits.
- If the user provided args to this command (`$ARGUMENTS`), treat them as guidance for commit focus/message, not as a reason to collapse into a single commit.
- After all commits, push safely:
  - If upstream exists: `git push`
  - If upstream does not exist: `git push -u origin HEAD`
- Never use force push.

Output requirements:
- Briefly list ignore changes made.
- List each commit hash and message created in this run.
- Report final push result.

User guidance from command args:
$ARGUMENTS
