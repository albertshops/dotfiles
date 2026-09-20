---
description: Review pending changes and create logical git commits
agent: build
model: openai/gpt-5.4-mini
---
Create appropriate git commits for the current repository. Do not push.

Workflow:
- If the current directory is not a git repository, stop and explain.
- Inspect `git status --short`, `git diff`, `git diff --staged`, `git ls-files --others --exclude-standard`, and `git log --oneline -10` before staging anything.
- Review all pending changes and avoid committing generated files, build output, caches, local environment files, credentials, private keys, tokens, or other likely secrets.
- Preserve unrelated user changes. Stage only files that belong in each intended commit.
- Use the smallest sensible number of commits: one for a cohesive change, or separate commits for clearly distinct intents.
- Match the repository's existing commit-message style. If there is no clear style, use a concise imperative message.
- Treat `$ARGUMENTS` as optional guidance for commit scope or message, but verify that it accurately describes the changes.
- Do not run tests, linters, formatters, builds, type checks, or other validation commands. Do not bypass commit hooks that run automatically.
- Never amend an existing commit, rewrite history, force-push, or push.
- If there is nothing appropriate to commit, make no commit and report why.

Finish by listing each created commit's short hash and message, plus any files intentionally left uncommitted.

User guidance:
$ARGUMENTS
