# 0033 Agent sandbox container

## Approach

Build the image first and make the project's own suites pass inside it before any confinement is added, so that a
later failure is attributable to the confinement rather than to the image. Then add the firewall, then the
filesystem and capability confinement, then the state volumes, rerunning the suites after each step that could break
them. The wrapper script comes last, because it only translates flags into what Compose already accepts, and it can
only be written once there is a working invocation to wrap.

Every runtime setting lands in `agent/compose.yml`. `agent/entrypoint.sh` is the single exception and holds only the
firewall and the privilege drop, because iptables rules are kernel state in a network namespace that does not exist
at build time.

## Files

- `.dockerignore`: new, at the repository root. Trims the build context to the tracked source the image needs
  (`package.json`, `package-lock.json`, `agent/`), keeping `node_modules`, `.git` and generated output out
- `agent/Dockerfile`: new. `node:26` Debian base, two `ARG` lines pinning the harness versions, the packages the
  firewall and Chromium need, Playwright's Chromium at a fixed `PLAYWRIGHT_BROWSERS_PATH`, both harness CLIs
  installed globally at the pinned versions with their auto-updaters disabled, and a non-root `agent` user whose uid
  and gid come from build arguments
- `agent/compose.yml`: new. The service and its build, the working directory and state volumes, the read-only root
  filesystem and its tmpfs mounts, the capability set, `no-new-privileges`, the resource limits, the host gateway
  entry, and the allowlist
- `agent/entrypoint.sh`: new. Runs as root, installs the default-deny rules and the allowlist, resolving each
  allowlisted hostname and taking each allowlisted CIDR range verbatim, verifies reachability in both directions,
  and drops to the `agent` user
- `agent.sh`: new. Thin wrapper over `docker compose -f agent/compose.yml`, with the working directory flag,
  repeatable mount flags, a rebuild flag, and a pass-through command
- `README.md`: a new section documenting the sandbox, and a line in "Project structure" for `agent/`
- `AGENTS.md`: one line under "In this repository" saying that the agent container files live in `agent/` and that
  `npm run image` does not work inside the container
- `ideas/harnass-container.md`: deleted

## Tasks

### 1. Image

- [x] Write `agent/Dockerfile` on the `node:26` Debian base, with two `ARG` lines at the top pinning the Claude Code
      and OpenCode versions, both installed globally at those versions with their auto-updaters disabled
- [x] Install Playwright's Chromium at a fixed `PLAYWRIGHT_BROWSERS_PATH` at build time, and the packages the
      firewall needs
- [x] Create a non-root `agent` user whose uid and gid come from build arguments, so a bind mount on Linux is
      writable without changing ownership on the host, tolerating a uid or gid that already exists in the base image
      (the macOS gid 20 collides with `dialout`)
- [x] Add a repository-root `.dockerignore` so the build context is the tracked source the image needs, not the
      whole working tree
- [x] Build the image and confirm `claude --version` and `opencode --version` report the pinned versions, that the
      shell runs as `agent`, and that the build succeeds on the host's own architecture with no `--platform` flag

### 2. Suites inside the image

- [x] Write the minimum of `agent/compose.yml` needed to run the image: the service, its build, and the working
      directory mounted read-write at a fixed path
- [x] Run `npm ci`, `npm run build` and `npm run test:unit` inside the container and fix the image until all three
      pass
- [x] Run `npm test` inside the container and fix the image until it passes, including the visual comparisons
      against the committed `tests/e2e/callouts.spec.ts-snapshots/*-chromium-linux.png` baselines. Settle the
      Chromium sandbox flags and the `/dev/shm` size here rather than later

### 3. Firewall

- [x] Add the allowlist to `agent/compose.yml`: the Anthropic and OpenAI APIs, `models.dev`, the npm registry,
      GitHub, Google's font-serving ranges as CIDRs, and the host gateway address on the local model server's port,
      with each entry annotated with what needs it
- [x] Write `agent/entrypoint.sh`: deny egress by default, allow loopback, DNS and established connections, then
      resolve each allowlisted hostname and allow it, and allow each allowlisted CIDR range directly
- [x] Add the start-up verification to `agent/entrypoint.sh`: exit non-zero if a host that is not on the allowlist
      resolves but is reachable, proven by a TCP connect that hangs until killed rather than by any failure a
      `curl` request could report for an unrelated reason, or if the canary does not resolve at all, or if
      `api.anthropic.com` is not reachable
- [x] Drop to the `agent` user at the end of the entrypoint, and confirm from inside that `sudo` is unavailable and
      that `iptables -L` as `agent` fails

### 4. Confinement

- [x] Add to `agent/compose.yml` the read-only root filesystem with its tmpfs mounts, `cap_drop` of all
      capabilities with `NET_ADMIN`, `SETUID` and `SETGID` added back, `no-new-privileges`, and memory and CPU
      limits that leave the host usable
- [x] Rerun `npm ci`, `npm run build`, `npm run test:unit` and `npm test` under confinement and adjust the writable
      path set until all four pass again
- [x] Confirm from inside that writing to the read-only root (`/`, `/usr`, `/opt`, `/etc`) fails as the agent, and
      that the only writable places are the working directory, the agent's home, `/tmp` and `/dev/shm`

### 5. Persistence and identity

- [x] Add a named volume for the agent's home, holding both harnesses' state, and mount `~/.gitconfig` read-only
      (one home volume rather than one per harness: the read-only root filesystem already requires the home to be a
      persistent volume; see record.md)
- [x] Confirm the persistence mechanism the named volume is for: write a file under `~/.claude` in one container,
      start a fresh container, and confirm the file is still there. This tests volume persistence only; the actual
      interactive OAuth login, credential refresh, and an authenticated harness start after a restart are the
      developer's to perform once on the real machine and are not tested here (see record.md)
- [x] Confirm that `git commit` inside the container records the developer's name and email
- [x] Confirm that neither harness attempts an update at launch, and that both start cleanly with the update hosts
      unreachable

### 6. Wrapper

- [x] Write `agent.sh`: build the image when it is missing, force a rebuild on a flag, default the working directory
      to the repository root, accept a repeatable mount flag with read-only and read-write forms, and pass a command
      through to the container
- [x] Confirm that a host path outside the mounts is not visible from inside the container
- [x] Confirm that `agent.sh` sets no confinement setting of its own and that `agent/entrypoint.sh` is the only file
      in the sandbox with logic, which is what requirement 6 asks for

### 7. Documentation

- [x] Write the README.md sandbox section: what it is for, the command to start it, mounting extra directories, and
      changing the allowlist
- [x] Add a numbered step to that section for updating the harnesses, naming the two `ARG` lines in
      `agent/Dockerfile` to edit and the rebuild command to run
- [x] State in that section that `npm run image` does not work inside the container because `sips` is macOS-only,
      and that `./deploy.sh` does not because no AWS credentials enter the container
- [x] Add the `agent/` line to "Project structure" in README.md and the one-line rule to `### In this repository` in
      AGENTS.md
- [x] Delete `ideas/harnass-container.md`
- [x] Confirm no em dashes, American English, and no line over 120 characters in the changed documents

### 8. Verify and close

- [x] Bump one harness version by following only README.md's update step, confirm the container reports the new
      version, and revert the bump
- [x] Break one allowlist entry deliberately, confirm the container exits non-zero at start-up instead of starting,
      and restore it
- [x] Run `npm run test:unit` and `PORT=3100 npm test` on the host on the final tree
- [x] Run the same two suites once more inside the sandbox on the final tree
- [x] Confirm every task here traces to a requirement in `spec.md` and every requirement to a task
- [x] Commit the documentation, the deleted idea, and the recorded verification results
- [x] Run `npm run check:changes` after that commit, so that it checks the committed implementation

### 9. Third review round: root-invocation guard, address-boundary documentation, verification wording

- [x] Refuse to build or start as root: `agent/Dockerfile` rejects `AGENT_UID`/`AGENT_GID` 0 before creating the
      `agent` account, `agent.sh` refuses early with a message naming `sudo` as the mistake, and
      `agent/entrypoint.sh` refuses to drop into an `agent` account it finds at uid or gid 0
- [x] Correct requirements 9 and 10, add the "address boundary" and "no automated regression suite" decisions to
      `spec.md`, and update `agent/compose.yml`'s `ALLOWLIST` comment and README.md's allowlist section to say
      plainly that the firewall enforces addresses, not hostnames
- [x] Narrow the authentication-persistence task and verification item to the mechanism actually tested
      (named-volume file persistence), not a real login
- [x] Rebuild and rerun the full suites, confirm the root-uid guard fires at both the Dockerfile and `agent.sh`,
      and commit

### 10. Fourth review round: firewall proof rigor, out-of-scope file, dispositions

- [x] Rewrite `blocked()` in `agent/entrypoint.sh` to resolve the canary first, dying if it does not resolve, and
      to test the resolved address with a raw TCP connect that must hang until killed to count as blocked, so a
      DNS, TLS or application failure can no longer be mistaken for the firewall's own default-deny signature
- [x] Reword task 3's start-up verification bullet and the matching `## Verification` item to name that proof
      precisely, so a weaker check cannot be marked complete against them again
- [x] Remove the empty, out-of-scope `ideas/roles-tuning-loop.md` from this branch's history entirely, preserving
      the developer's real uncommitted content in that path, since the unit is still `in-progress`
- [x] Record C2 (the Dockerfile's leading-zero uid/gid check) as accepted-but-declined: the entrypoint's own
      `id -u agent`/`id -g agent` check already canonicalizes and catches it, so the property the unit promises
      still holds; record C1 (no automated regression suite) as already declined in round three, unchanged
- [x] Rebuild, rerun the full suites and the three fault-injection cases (normal canary, unresolvable canary,
      reachable-but-unlisted canary), and commit

## Verification

- [x] `./agent.sh --rebuild` succeeds on the host's architecture with no `--platform` flag
- [x] Inside the sandbox, `npm ci`, `npm run build`, `npm run test:unit` and `npm test` all pass, with the visual
      comparisons matching the committed `*-chromium-linux.png` baselines
- [x] Inside the sandbox, the canary's address is proven blocked by a TCP connect that hangs until killed, not by
      any `curl` failure, and an unresolvable canary aborts the start rather than passing by default; a request to
      `api.anthropic.com` succeeds. This is an address boundary, not a hostname one, so a host colocated with an
      allowed address is also reachable, and that is intentional and documented (see spec.md and record.md). The
      firewall admits the host gateway on the model server's port; whether the model actually answers depends on
      the host firewall (see record.md) and is a host prerequisite, not something this unit can assert
- [x] A deliberately broken allowlist entry makes the container exit non-zero at start-up instead of starting
- [x] Building with `AGENT_UID=0` or `AGENT_GID=0` fails at the Dockerfile with a clear message, and `agent.sh`
      itself refuses to run with `id -u`/`id -g` at 0 before it would try
- [x] Inside the sandbox, writing to the read-only root fails as the agent while the working directory, the agent's
      home, `/tmp` and `/dev/shm` are writable, and a host path that was not mounted is not visible
- [x] Inside the sandbox, `sudo` is unavailable and `iptables -L` as the `agent` user fails
- [x] Inside the sandbox, `claude --version` and `opencode --version` report the pinned versions, and neither
      reaches for an update at launch
- [x] Following README.md's update step alone bumps one harness to a new version and the container reports it
- [x] A second container run still has the file written under `~/.claude` in the first, proving named-volume
      persistence, not a real login; `git commit` records the developer's name and email
- [x] On the host, `npm run test:unit` and `PORT=3100 npm test` pass on the final tree
- [x] `npm run check:changes` passes against the committed implementation
- [x] No em dashes and no line over 120 characters in the changed documents

## Commit Points

- [x] The change documents, before any implementation
- [x] The Dockerfile, the minimal compose file, and the recorded suite results from inside the image
- [x] The entrypoint and the allowlist
- [x] The confinement settings and the recorded suite results under them
- [x] The state volumes and the git identity mount
- [x] `agent.sh`
- [x] The documentation, the deleted idea, and the final verification results
- [x] The root-invocation guard, the address-boundary documentation, the narrowed authentication wording, and the
      recorded suite results after them
