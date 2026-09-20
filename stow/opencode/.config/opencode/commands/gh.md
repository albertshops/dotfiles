---
description: Create a private GitHub repository, commit, and push
agent: build
---
Create a new private GitHub repository for the current directory using the GitHub CLI, then commit and push the current project.

Workflow:
- Confirm `gh` is installed and run `gh auth status`. If authentication is missing, stop and explain how the user can authenticate.
- Inspect the current directory, `git status --short`, `git diff`, `git diff --staged`, untracked files, and recent commits before making changes.
- If this directory is not a Git repository, initialize one with `git init`.
- Ensure generated files, dependencies, build output, local environment files, credentials, keys, tokens, and other secrets will not be committed. Add appropriate entries to `.gitignore` when needed.
- If an `origin` remote already exists, stop rather than replacing it or creating a duplicate repository. Report the existing remote.
- Determine the repository name from `$ARGUMENTS`. If no name is provided, use the current directory name. Treat any additional arguments as user guidance.
- Create the repository as private with `gh repo create <name> --private --source . --remote origin`. Do not create a public repository.
- Stage only appropriate project files. Never commit secrets or unrelated changes.
- Create a concise initial commit whose message reflects the contents. If commits already exist, commit only the current pending work and follow the existing message style.
- Push with `git push -u origin HEAD` after the commit succeeds.
- Never force-push, rewrite history, or bypass hooks.

Finish by reporting the repository URL, commit hash and message, and push result.

Repository name or guidance:
$ARGUMENTS
