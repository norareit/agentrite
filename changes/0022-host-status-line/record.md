---
kind: feature
status: draft
timestamp: 2026-10-04T00:41:26Z
---

# 0022 The developer's Claude Code status line in the sandbox

## Log

- 2026-10-04T00:41:26Z [human] in the session that implemented 0015, on finding that Claude Code in the sandbox does
  not show the host's status line, and that getting it means copying the script and the setting into the home
  volume by hand: "I don't want to be doing that every time. Even if it's only once a month. I just want my
  statusline to be included." Named two ways, shipping the human's own status line in the kit or a per-project
  setting pointing at a status line file, asked the implementer's opinion, and asked for the implementer's
  recommendation, a read-only mount of the developer's own script after the `.gitconfig` precedent with a
  system-level Claude Code settings file, to be written up as a unit. The number 0022 was given, 0021 and 0023 being
  written at the same time
- 2026-10-04T00:41:26Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`, on the branch `feature-0022-host-status-line` from `master` at `58430fa`. A feature: it needed
  decisions. The recommendation was kept in its idea and changed in two places after checking it: the mount and
  the settings file are both added by the wrapper and only when the host script exists, and neither the base
  Compose file nor the image changes. What was checked, on Linux with Docker Engine 28.4.0, in throwaway containers
  from `node:26-bookworm` with Claude Code 2.1.266, `jq` and `git`, with no network, a made-up API key and no login:
  * The three questions the implementer left open. Claude Code honours `statusLine` from
    `/etc/claude-code/managed-settings.json` and from a file in `managed-settings.d/`, and in both cases a
    `statusLine` in the user's `~/.claude/settings.json` no longer runs. A managed command that prints nothing
    leaves the line blank and still shadows the user's. With a missing source, Docker creates a root-owned
    directory on the host and mounts it, so the mount needs a guard, which is why the wrapper makes it. The path
    is fixed, with a symbolic link for another name, and an environment variable is under "Beyond the request"
  * The design itself, with `docker run` flags and not through the wrapper, which does not have the change yet:
    the human's own script and a settings file, both bind-mounted read-only, showed
    `/work (master) | Opus 5 (1M context)` in Claude Code's terminal while a user-level status line was also set,
    which did not run. On a
    read-only root as uid 1000 with no capabilities, Docker created `/etc/claude-code` for the mounts, and writing
    to either file or beside them failed with `Read-only file system`. A symbolic link at the host path mounted its
    target
  * The suite on `master`: 178 passing, 0 failing. `npm pack --dry-run`: 22 files

  Not established:
  * Docker Desktop for macOS: nothing was run there. The wrapper's test of the file runs on the host, and a single
    file under the home directory is the same kind of mount as `.gitconfig`, which works there since 0006 and 0007
  * A logged-in session. The `rate_limits` part of the human's line appears only after a first API response with a
    subscription, so the percentages were not seen, only the directory, the branch and the model
  * An organization that delivers managed settings from the claude.ai console. The documentation says Claude Code
    then ignores the file by default. Recorded as a non-goal
  * What `/status` shows. The documentation says it names `Enterprise managed settings (file)` as a setting source
    when the file is present
  * The missing-source behavior through Compose's short volume syntax. It was seen with `docker run -v`

  Found on the way and not part of this unit: with no `~/.gitconfig` on the host, Docker creates a root-owned
  directory at that path, and git in the container then exits 128 on every command with `unable to read config file
  '/etc/gitconfig': Is a directory`. Seen with `docker run` in a scratch directory standing in for the home. Left
  to the human as a bug of its own. Every container, the image and the scratch files made for the checks were
  removed. The status stays at draft

## Amendments
