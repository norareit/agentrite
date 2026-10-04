---
kind: feature
status: in-progress
timestamp: 2026-10-04T01:09:49Z
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
- 2026-10-04T01:09:49Z [human] after the planner's report was put to them, with its questions on the override of a
  status line set inside the sandbox, on the fixed path and on scripts that are not bash, asked for the unit to be
  implemented. The human answered none of those questions separately
- 2026-10-04T01:09:49Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in a session on the host,
  on Linux. Took the human's request as the approval of the spec and the plan as they are written, with the two
  things beyond the request left out, as the human let the same reading stand for 0021, and moved the status
  through approved to in-progress. That reading is the implementer's, and the human is told of it. Before any
  edit:
  * The branch was checked out in the planner's worktree, which was clean and was removed so that the main
    checkout could take the branch. The branch was then rebased onto `master` at `48f239b`, which now holds 0015
    and 0021, without conflict. The planner's commit is `1e765ae` since. The suite there reports 184 passing and
    0 failing, where the plan's first task says 178, and `npm pack --dry-run` lists 22 files
  * `plan.md` is changed in one place, the real run. It was planned in a scratch project packed from the branch,
    because this repository had no way to run the working copy's sandbox. 0021 has since added `./agent-dev.sh`,
    which runs the working copy's wrapper under an image and a home volume of its own, so the real run uses that:
    it is the wrapper R7 asks for, with nothing to pack or install. The dev home volume is removed afterwards, so
    that it is empty again

## Amendments
