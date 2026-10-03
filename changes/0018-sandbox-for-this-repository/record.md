---
kind: task
status: draft
timestamp: 2026-10-03T11:40:32Z
---

# 0018 A sandbox for the kit's own repository

## Description

Once 0017 is implemented and the human has released it, give this repository the sandbox every other project has,
so that agents working on the kit no longer run on the developer's host:

* Move the devDependency on `@ritenoar/agentrite` to that release, by its URL, as 0016 did for 2.1.0
* Run `npx agentrite init claude opencode` at the root. It writes `agent.sh`, `agent/compose.project.yml` without a
  Playwright version, since this repository's lockfile resolves none, and `.dockerignore`, which does not exist
  here. It skips the six role wrappers, `AGENTS.md` and `CLAUDE.md`, which exist, and leaves `package.json`, which
  has the `check-changes` script. `AGENTS.md` already holds what makes the kit's instructions reach an agent, so
  the sections `init` prints for it are not pasted in
* In `agent/compose.project.yml`, add to `ALLOWLIST` what this repository's agents reach beyond what the kit and
  `init` supply: `api.openai.com`, for the reviewer under OpenCode. Nothing of AWS: releasing runs on the host
* Check on a host with Docker that `./agent.sh --rebuild npm ci` and then `./agent.sh npm test` exit 0, and log
  what they reported
* Add to the README's section "The kit's own copy of the kit" that the repository also runs the kit's sandbox, from
  the installed release, with `./agent.sh`, and that `./deploy.sh` stays on the host

This waits for two things: 0017 implemented, and a release that holds it, which the human makes. Until then it
stays `draft`. If 0015 is not fixed by then, neither harness starts in the new sandbox, here as anywhere, and the
check above still holds, since it runs `npm`.

## Log

- 2026-10-03T11:40:32Z [human] asked why this repository would not need a sandbox, and for the unit that makes one
  possible, 0017
- 2026-10-03T11:40:32Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, while planning 0017. A task:
  one dependency, one command and one allowlist entry, with no decision left open. Blocked on 0017 and on its
  release, as 0012 was on the release of 0011. Checked before writing that this repository has no `agent.sh`, no
  `agent/` directory and no `.dockerignore`

## Amendments
