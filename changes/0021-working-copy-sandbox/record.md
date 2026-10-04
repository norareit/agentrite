---
kind: feature
status: in-progress
timestamp: 2026-10-04T00:49:51Z
---

# 0021 A sandbox built from the working copy

## Log

- 2026-10-04T00:34:26Z [human] while checking 0015 by hand, found that a change to the sandbox made in this repository
  cannot be tried in a real sandbox until it is released, since `./agent.sh` runs the released kit's wrapper, and
  asked whether there should not be a solution for that while developing the kit. Asked for the implementer's
  proposal, a development shim of this repository's own with its own project name, image and home volume, a
  correction of the README and one command for plans to name, to be written up as a unit
- 2026-10-04T00:34:26Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`, on the branch `feature-0021-working-copy-sandbox`, made from `master` at `58430fa`. The number was
  given by the session that asked for the unit, 0022 and 0023 being planned at the same time. A feature and not a
  task: the names, where they are set, whether the command always builds and how the home is emptied are decisions.
  Checked before writing, on Linux with Docker Engine 28.4.0 and Compose 2.39.2, from a git worktree, with everything
  created named `agentrite-0021-plan` and removed afterwards, and with temporary edits that were reverted:
  * What Compose resolves for the project, image, network and volume names with this repository's project Compose
    file as it is, with `COMPOSE_PROJECT_NAME` set, and with the names written as a variable, set and unset. These
    are the spec's findings on the variable
  * Six runs of the working copy's wrapper under those names, with a marker in the working copy's base Compose
    file and one in its entrypoint: the first built the image and showed both markers; a run after changing the
    entrypoint's marker, without `--rebuild`, showed the old one, and with `--rebuild` the new one; a run with
    `--rebuild` and nothing changed took 8 seconds, as did one without; a file written to the home was there in a
    later run, and gone after the volume was removed
  * The id of the image `ritenoar-agentrite-agent` and the lists of volumes and networks were the same after the
    runs as before
  * On `master`, the suite reports 178 passing and 0 failing, `npm pack --dry-run` lists 22 files, and the working
    copy's `container/` is identical to that of the installed 2.2.1
  Not established, and the spec says so: Docker Desktop for macOS and other Docker versions; the time of a first
  build without the release image's layers in the cache; whether a harness starts in a sandbox run this way; and
  the bare run of `./container/agent.sh "$PWD"` reported from the 0015 branch, which was not repeated because it
  would have mounted the human's home volume. One thing departs from the proposal as given: the names are set
  through a variable in this repository's `agent/compose.project.yml`, which the unit therefore edits, because the
  wrapper passes two Compose files and takes no third. Three things are left out as beyond the request and listed
  in the spec: a flag for an empty home, letting the caller choose the name, and a rule in `AGENTS.md`. Status left
  at `draft` for the human's approval
- 2026-10-04T00:49:51Z [human] after the planner's report was put to them, with its questions on the edit to the
  project Compose file, on always building, on the three things beyond the request and on the names, asked for
  the unit to be implemented. The human answered none of those questions separately
- 2026-10-04T00:49:51Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in a session on the host,
  on Linux. Took the human's request as the approval of the spec and the plan as they are written, with the three
  things beyond the request left out, and moved the status through approved to in-progress. That reading is the
  implementer's, and the human is told of it. The branch was checked out in the planner's worktree, which was
  clean and was removed so that the main checkout could take the branch. The plan's first task saves Compose's
  configuration to `/tmp/0021-before.yml`; it is saved in the session's scratch directory instead, and so is the
  later one

## Amendments
