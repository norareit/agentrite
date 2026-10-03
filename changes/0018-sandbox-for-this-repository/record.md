---
kind: task
status: implemented
timestamp: 2026-10-03T14:26:05Z
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
- 2026-10-03T12:37:28Z [Claude Code, anthropic/claude-sonnet-5-5] took the implementer role and moved the status to
  in-progress, the human having released 2.2.0, which holds 0017 (the tarball is served: HTTP 200)
- 2026-10-03T12:49:57Z [Claude Code, anthropic/claude-opus-5-5] logged where the implementation stands and what blocks
  it. Done in the working tree and not committed: the devDependency moved to 2.2.0, `npx agentrite init claude
  opencode` run, which wrote `agent.sh`, `agent/compose.project.yml` and `.dockerignore`, and `api.openai.com` added
  to `ALLOWLIST`. `./agent.sh --rebuild npm ci` exited 0. `./agent.sh npm test` exited 1, with 162 passing and 15
  failing: the sandbox mounts `/tmp` with `noexec`, and those tests run scripts they write under the temporary
  directory. The human decided that the fix belongs in the kit and not in these tests, which is bug 0020. This unit
  now also waits for 0020 implemented and for a release that holds it, to which the dependency moves instead of
  2.2.0. The README change is not made yet
- 2026-10-03T13:38:49Z [human] released 2.2.1, which holds 0020
- 2026-10-03T13:38:49Z [Claude Code, anthropic/claude-opus-5-5] finished the task as implementer. Changes made: the
  devDependency on `@ritenoar/agentrite` moved to the 2.2.1 release by its URL, in `package.json` and
  `package-lock.json`, and not to 2.2.0 as first tried, since the suite needs 0020; `agent.sh`,
  `agent/compose.project.yml` and `.dockerignore` as `npx agentrite init claude opencode` wrote them, the compose file
  with no Playwright version; `api.openai.com` added to `ALLOWLIST`, beside `models.dev`, which `init` supplies for
  OpenCode; and a paragraph in the README's section "The kit's own copy of the kit". `init` skipped the six role
  wrappers, `AGENTS.md`, `CLAUDE.md` and `package.json`, as the description expected. Checked on Linux with Docker
  Engine 28.4.0 and Compose 2.39.2, with the installed 2.2.1: `./agent.sh --rebuild npm ci` exited 0, and `./agent.sh
  npm test` exited 0 with 178 passing and 0 failing. On the host `npm test` reported the same. Not checked: starting
  either harness in the sandbox, which is 0015's subject; whether `api.openai.com` suffices for the reviewer under
  OpenCode, beyond the entrypoint finding the host reachable at start-up; `npx agentrite refresh`, which the description
  does not ask for, so the role wrappers are as an earlier release wrote them

- 2026-10-03T13:56:05Z [OpenCode, openai/gpt-6.1-sol] reviewed `0018-sandbox-for-this-repository` at
  `16db87fbbd267bce53cf1c6fada88d1ace498506`, a full review against the merge base with master,
  `5e079eaab64ba5f2166d5243c8f30f35bc01ebf1`. Returned C1 and C2. Complete findings are saved in
  `.reviews/0018-sandbox-for-this-repository/20261003T135141Z-full-16db87f-opencode.md`.
  Independently ran the host `npm test` (178 passing, 0 failing or skipped), `npm run check-changes`,
  `git diff --check master...HEAD`, shell syntax checks, shim/template comparison and read-only Compose
  configuration validation. Not independently verified: real sandbox rebuild/install/test exits; historical
  init/check execution and timing; clean-install release availability and tarball bytes/integrity; human
  authorization before implementation; interactive harness startup and OpenCode reviewer API flows; Node 26
  execution in the image, macOS/arm64 and other Docker versions. No install, build, container run or fix was made
- 2026-10-03T14:21:42Z [human] accepted C1 and C2, and confirmed that asking the implementer to follow up with 0018, and
  then to continue with it once 2.2.0 was released, was the approval of this task
- 2026-10-03T14:21:42Z [Claude Code, anthropic/claude-opus-5-5] applied both findings in this record. C1: the unit went
  from draft to in-progress without an entry for `approved`. The human approved it as the entry above says, before the
  implementation began, and the implementer did not log it at the time, so the status never read `approved` in a commit.
  C2: the entry that begins the implementation, and the frontmatter, said `2026-10-03T14:00:00Z`, which was not read
  from a clock and was later than the entries after it. Both now say `2026-10-03T12:37:28Z`, the time of the commit that
  made that entry, `c6c8372`, which is the best evidence of when it happened; the exact moment was not recorded. No file
  other than this record changed, so no suite was rerun
- 2026-10-03T14:26:05Z [human] asked for the unit to be marked implemented
- 2026-10-03T14:26:05Z [Claude Code, anthropic/claude-opus-5-5] set the status to implemented: the task has no plan, the
  work its description lists is done, and C1 and C2, the findings the review returned, were accepted and applied

## Amendments
