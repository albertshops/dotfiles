---
description: Create private repo if needed, then enable session auto commit+push
agent: build
---
Run a git bootstrap and then enable session-scoped auto commit/push behavior.

Primary objective:
1) Ensure this folder is a git repository and has a private GitHub remote if missing.
2) Commit and push current pending work safely.
3) For the rest of this OpenCode session, after each successful code-edit task, commit and push the resulting changes.

Bootstrap workflow:
- Validate git context.
  - If not in a git repo, run `git init`.
- Check GitHub CLI auth with `gh auth status`. If not authenticated, stop and tell the user to authenticate.
- Detect whether a remote exists.
  - If `origin` does not exist, create a private repo with `gh repo create --private --source . --remote origin --push`.
  - If a remote exists but no upstream is configured for current branch, use `git push -u origin HEAD` after the first successful commit.
- Inspect `git status --short`, `git diff`, `git diff --staged`, `git ls-files --others --exclude-standard`, `git log --oneline -10`.
- Before committing, ensure ignore hygiene:
  - Add likely noise files/directories to `.gitignore` when appropriate (build outputs, cache folders, logs, temp files, editor/system artifacts, coverage outputs).
  - If `.gitignore` was updated, commit it first as a dedicated chore commit.
- Never commit likely secrets (`.env`, credentials, private keys, token dumps) unless user explicitly requests it.

Commit strategy:
- Prefer the smallest sensible number of commits.
  - One cohesive change => one commit.
  - Distinct intents/scopes => split into logical commits.
- Stage only files relevant to each commit.
- Match commit message style to recent repo history.

Push strategy:
- Push only after commits succeed.
- Use `git push` when upstream exists.
- Use `git push -u origin HEAD` when upstream is missing.
- Never use force push.

Session policy to enforce after this command completes:
- For the remainder of this chat session, automatically run a commit+push cycle after each successful code-edit task.
- Continue to apply ignore-first hygiene and secret safety rules on each cycle.

Output requirements:
- State whether repo was initialized and/or private remote was created.
- List `.gitignore` updates.
- List each commit hash and message created.
- Report push result.

User guidance (optional):
$ARGUMENTS
