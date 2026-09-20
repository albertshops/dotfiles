---
description: Review changes, create logical git commits, and push
agent: build
model: openai/gpt-5.4-mini
---
Create appropriate git commits for the current repository, then push them to its remote.

Workflow:
- If the current directory is not a git repository, stop and explain.
- Inspect `git status --short`, `git diff`, `git diff --staged`, `git ls-files --others --exclude-standard`, `git log --oneline -10`, and the current branch and remote tracking configuration before staging anything.
- Review all pending changes and avoid committing generated files, build output, caches, local environment files, credentials, private keys, tokens, or other likely secrets.
- Preserve unrelated user changes. Stage only files that belong in each intended commit.
- Use the smallest sensible number of commits: one for a cohesive change, or separate commits for clearly distinct intents.
- Match the repository's existing commit-message style. If there is no clear style, use a concise imperative message.
- Treat `$ARGUMENTS` as optional guidance for commit scope or message, but verify that it accurately describes the changes.
- Do not run tests, linters, formatters, builds, type checks, or other validation commands. Do not bypass commit hooks that run automatically.
- If there are appropriate pending changes, commit them before pushing. If there are no pending changes but the branch has unpushed commits, push those commits. If there is nothing to commit or push, make no changes and report that.
- Push the current branch to its configured upstream. If it has no upstream and the intended remote is unambiguous, set it with `git push -u <remote> HEAD`; otherwise stop and ask which remote to use.
- Never amend an existing commit, rewrite history, force-push, or bypass hooks.
- If committing fails, do not push. If pushing fails, preserve the local commits and report the error without attempting destructive recovery.

Finish by listing each created commit's short hash and message, the remote and branch pushed, the push result, and any files intentionally left uncommitted.

User guidance:
$ARGUMENTS
