---
description: Create or update a project's deployment setup for beelink
agent: build
---
Create or update a `deploy/` directory that prepares the current Git repository for deployment to `beelink`. This command configures deployment; it must not deploy the application or modify the server.

Project identity:
- Work from the Git worktree root. If the current directory is not in a Git repository, stop and explain.
- Derive `<repo-name>` from the basename of the canonical Git remote repository URL, removing a trailing `.git`. Prefer `origin`; if it is absent, use the sole unambiguous remote. Do not substitute the local directory name without asking.
- Use `<repo-name>` as the restricted SSH and systemd service user.
- The SSH destination is `<repo-name>@beelink`, the application path is `/srv/<repo-name>`, and the public URL is `https://<repo-name>.alasdair.app`.

SSH key safety:
- Find private-key candidates directly inside `<worktree>/.ssh/`. Exclude `*.pub`, `config`, `authorized_keys`, and `known_hosts*`. Do not display or copy private-key contents.
- If no candidate exists, stop and explain where the key is expected. If multiple candidates exist, list only their filenames and ask which one to use.
- Validate the selected candidate without printing derived key material. Ensure its permissions are acceptable to OpenSSH, using mode `0600` when a correction is needed.
- Ensure the root `.gitignore` ignores `/.ssh/`. If anything under `.ssh/` is already tracked by Git, stop and warn instead of assuming that adding an ignore rule makes it safe.
- Generated scripts must resolve the selected key relative to the worktree, use `ssh -i <key> -o IdentitiesOnly=yes`, and retain normal SSH host-key verification. Never embed the key, disable host-key checking, or copy the key to `deploy/`.

Discovery:
- Inspect repository instructions, README files, manifests, lockfiles, build scripts, runtime requirements, existing deployment files, and ignored files before designing the deployment.
- Determine whether the project is a static site or has one or more long-running processes, its verified production build command, production-required files, and each production start command. Identify which processes actually listen on TCP and how each runtime accepts its bind address and port, including supported environment variables such as `HOST` and `PORT`.
- Choose local or server-side production builds based on the project. Prefer local builds for portable static artifacts; prefer server-side builds when Linux-specific or native runtime dependencies make local artifacts unsafe.
- Use the selected key and only read-only commands over SSH to inspect server architecture, `/srv/<repo-name>`, readable Caddy configuration, existing relevant systemd units, installed runtimes, deployment conventions, and currently bound TCP ports. Use tools such as `ss` when available, without requiring elevated privileges. Do not use `sudo` or alter the server during setup.
- Preserve compatible existing port assignments. Otherwise, select a stable, unoccupied, non-privileged loopback TCP port for every process that must listen, ensuring the selected ports are unique both within this deployment and among discovered listeners and configured reverse-proxy upstreams. Do not allocate ports to workers or other processes that do not listen on TCP.
- Treat a port as unavailable when another application, service unit, or reverse-proxy upstream already claims it. If ownership cannot be determined safely, ask rather than guessing. A port being free during inspection is not a reservation, so document the assignment and any administrator coordination needed to prevent later conflicts.
- Inspect the Caddy service identity and filesystem permissions or ACLs along the proposed static-root path. If Caddy cannot traverse or read it, report the exact administrator-managed permission or ACL prerequisite; do not change permissions on the server during setup.
- Do not print environment-file contents, inline secret values, private keys, tokens, or unrelated virtual-host configuration. Report only relevant directives and redact potentially sensitive values.
- Piping the proposed Caddyfile over SSH to `caddy adapt --config - --adapter caddyfile` for parsing is considered read-only and is allowed. Do not run commands that start or reload Caddy.
- Never ask for secret values; refer to an administrator-managed server environment file instead.

Existing deployment compatibility:
- Treat an identical deployed artifact, an empty Caddy site file, or an inactive systemd placeholder without `ExecStart` as non-conflicting.
- For static sites, migrating from files directly under `/srv/<repo-name>` to `releases/<release-id>` plus a `current` symlink is permitted when content and public behavior remain unchanged.
- Ask before proceeding if the existing deployment is active and materially differs in content, application type, port, build process, persistent-data layout, public behavior, or release convention.
- Existing top-level server files must remain untouched unless their removal is explicitly approved.
- Ask all unresolved questions in one concise batch before writing files.

Generated files:
- Tailor every file to the project; do not leave unresolved placeholders or template variables.
- Create `deploy/Caddyfile`. Static sites must be served from the active release under `/srv/<repo-name>` with appropriate static-file behavior. Services must reverse proxy to a loopback-only application port.
- Create `deploy/<repo-name>.service` for the primary long-running process only when one is required. If additional independently supervised processes are required, create deterministic role-based units such as `deploy/<repo-name>-worker.service`. Every generated unit must run as `User=<repo-name>`, use the active release under `/srv/<repo-name>`, restart sensibly, load secrets only from an existing server-side environment file, and include hardening that does not break the process.
- Configure every listening process to bind only to loopback and use its assigned stable port. Prefer explicit non-secret systemd environment assignments such as `Environment=HOST=127.0.0.1` and `Environment=PORT=<assigned-port>` when the runtime supports them; otherwise use the runtime's verified command-line or configuration mechanism. Do not place generated port assignments in the administrator-managed secrets file, dynamically choose a free port at service startup, or assume an environment variable is honored without verification.
- A project consisting only of directly servable HTML, CSS, JavaScript, images, or fonts may use no build step. For such a project, stage an explicit production-artifact allowlist rather than copying the repository, and do not create a systemd service even if an unused placeholder unit exists.
- Create executable `deploy/deploy.sh` with `set -euo pipefail`. It must locate the Git worktree, use the selected `.ssh/` key, verify required local and remote commands, run the chosen build, and transfer only production-required files.
- The deployment script must never install or update Caddy or systemd configuration. These files are drafts for manual administrator review and installation.
- Make deployments atomic when practical using `/srv/<repo-name>/releases/<release-id>` and an atomic `/srv/<repo-name>/current` symlink switch after success. Do not expose a partially copied release.
- Exclude source-control metadata, `.ssh/`, local secrets, caches, unnecessary dependencies, and `deploy/` from transfers. Preserve administrator-managed secrets and persistent application data. Any deletion must be narrowly scoped to a newly created release or explicitly protect persistent paths.
- Do not prune old releases by default. Leave complete inactive releases available for administrator-managed rollback or cleanup.
- For long-running processes, restart only the exact generated units after activating a successful release, then report useful status for any unit that fails to start. Do not run `daemon-reload`, enable units, or restart unrelated services.
- For a static site, do not reload Caddy for routine content-only releases.
- Quote shell variables and paths correctly and avoid credentials or machine-specific secret values in generated files.
- Create `deploy/README.md` documenting project-specific prerequisites, the release layout, the routine deployment command, administrator installation destinations, initial installation order, validation commands, and rollback guidance. Clearly distinguish local developer commands from administrator commands that run on `beelink`.

Verification and handoff:
- Validate shell syntax with `bash -n deploy/deploy.sh` and run `shellcheck` if installed.
- Run safe project checks needed to verify the selected production build and artifact path.
- Review Caddy, systemd, and script paths, users, ports, release layout, and commands for consistency. Confirm every Caddy upstream matches its process's assigned environment/configuration port and that no generated listener ports collide with each other or with ports discovered on the server.
- Do not execute `deploy/deploy.sh`, copy configuration drafts, invoke sudo, restart services, or otherwise change `beelink`, even if optional guidance asks for it. This command is setup-only.
- Report the repository name, deployment type, selected key filename, generated files, build/runtime choices, every listening process and its assigned loopback port, verification, administrator installation destinations and commands, and server prerequisites. Distinguish commands that run locally from commands that an administrator runs on `beelink`.
- At the end of the final response, print the complete generated `deploy/Caddyfile` in a fenced code block and each generated systemd service file in a separate fenced code block. If no service file is appropriate, state that explicitly instead. Do not print private keys, environment-file contents, or secret values.

Optional guidance:
$ARGUMENTS
