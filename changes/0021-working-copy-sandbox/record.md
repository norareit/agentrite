---
kind: feature
status: in-progress
timestamp: 2026-10-04T00:51:53Z
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
- 2026-10-04T00:51:53Z [Claude Code, anthropic/claude-opus-5-5] implemented the plan in two commits, `d5d45a4` with
  the tests, the variable and the shim, and `897080e` with the README. Every task of the plan is ticked. The unit
  stays in-progress, since no review has been made. What was verified:
  * The four tests of `tests/agent-dev.test.mjs` failed before the shim and the variable existed, three for want
    of `agent-dev.sh` and one on `name: ritenoar-agentrite-agent`, and pass after
  * Compose's resolved configuration for `./agent.sh`, taken before any edit and again after with
    `AGENT_PROJECT_NAME` unset, shows no difference under `diff` (R4)
  * `npm pack --dry-run` lists 22 files, the same list as an export of `master`, without `agent-dev.sh`, and
    `git diff master -- container templates scripts package.json` is empty (R5)
  * On the host, on `897080e`: `npm test` reported 182 passing and 0 failing. No line of a file changed against
    `master` is over 120 characters and none holds an em dash. `npm run check-changes` exited 0 on the commit that
    holds this entry
  * The real check (R8), on Linux with Docker Engine 28.4.0 and Compose 2.39.2. Before it, the image
    `ritenoar-agentrite-agent` had the id `sha256:143d91ec452a9f56c3b367e67d08eea60b51a103ac93e76b7ee6b82510a6ff82`
    and the volume `ritenoar-agentrite-agent_agent-home` the creation time 2026-10-03T14:37:37+02:00. With an
    uncommitted variable `AGENTRITE_0021_MARKER` in `container/compose.yml` and a `log` line in
    `container/entrypoint.sh`, `./agent-dev.sh bash -c 'echo "marker=$AGENTRITE_0021_MARKER"'`, with no flag,
    printed the variable's value and the entrypoint's line, building the image, in 9.3 seconds. With the
    entrypoint's line changed, the same command printed the changed line, in 8.7 seconds. Afterwards the volume
    `ritenoar-agentrite-agent-dev_agent-home`, the image `ritenoar-agentrite-agent-dev` and the network
    `ritenoar-agentrite-agent-dev_default` existed, and the release image's id and the release volume's creation
    time were as before. What the release volume holds was not compared
  * The two at once (R2): no sandbox was running, so `./agent.sh sleep 100` was started first. While it ran,
    `./agent-dev.sh sleep 25` started, and `docker ps` listed a container of each image
  * With the two edits reverted by `git checkout -- container`, `./agent-dev.sh npm test` exited 0 with 182
    passing and 0 failing, the count the host reports. `git status --short` shows nothing of the temporary edits,
    and the two saved configurations are removed
  * Left on the host: the dev image, home volume and network, which are what the command creates and the README
    says how to remove
  * Not checked: Docker Desktop for macOS; a first build without the release image's layers in the build cache;
    whether either harness starts in the dev sandbox, where only `bash`, `sleep` and `npm test` were run
- 2026-10-04T01:01:04Z [OpenCode, openai/gpt-6.1-sol] took the reviewer role and completed a full review of
  0021 on `826982b501baa110de39372de3520235ecf79124`, against merge base
  `58430fa51fd239f61caeae9a165b61caac447783` with `master`. Returned no findings on spec conformance, plan
  fidelity or code quality. Complete findings and verification results are saved in
  `.reviews/0021-working-copy-sandbox/2026-10-04T005903Z-full-826982b.md`. Independently ran `npm test` on the
  host and `./agent-dev.sh npm test`, each with 182 passing and 0 failing; observed the dev sandbox rebuilding
  and running concurrently with `./agent.sh sleep 30`; compared the release image ID and home-volume metadata
  before and after, with no difference; and verified identical default release Compose configuration against
  the merge base. The change check, packaging check (22 files, no dev shim), shell syntax and whitespace checks
  passed, and changed committed files meet the line limit and contain no em dashes. Could not independently
  recover the original test-first execution order or temporary marker experiments. Not checked in this review:
  release home-volume contents, Docker Desktop for macOS, other engine versions, a cache-empty first build,
  a live run without a dev image, interactive harness startup, or destructive home-reset and cleanup commands

## Amendments
