---
kind: bug
status: in-progress
timestamp: 2026-09-25T01:02:43Z
---

# 0008 Sandbox and host share one node_modules

## Log

- 2026-09-25T01:02:43Z [human] asked for the sandbox faults found during Norareit's `0040-sandbox-firewall-dns` to be
  created as bug units in this repository
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] reproduced it on macOS with Docker Desktop, Docker
  Engine 24.0.7, with Norareit on kit 1.0.2: `fsevents`, the only package in Norareit's lockfile with an `os` or
  `cpu` limit, existed on the host; `npm ci` in the sandbox, with `npm_config_cache=/tmp/npm` because of 0007,
  installed 120 packages; the host's `node_modules/fsevents` was then gone. On the host afterwards `npm run
  test:unit` passed 48 tests and `npx playwright --version` answered 1.59.1. A host `npm ci` restored `fsevents`.
  `npm ls fsevents` shows it comes from `playwright`. Not reproduced: a project with native binaries per platform
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. `spec.md` written, status
  `draft`; a single-commit fix, so no `plan.md`. Three requirements, three decisions and three non-goals. The fix is
  documentation. The spec's first decision, documenting instead of giving the container its own `node_modules`, is
  the one approval most needs to confirm, since it keeps the behavior and only makes it known
- 2026-10-02T10:49:09Z [human] asked for the bugfix to be implemented as the spec stands. No separate approval was
  given, and the spec's first decision was not discussed: the request to implement the drafted unit is recorded here
  as its approval, that decision included
- 2026-10-02T10:49:09Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`. Rebased the branch's one commit from `1f59e6a` onto `master` at `94b55d9` first, because `master`
  has since rewritten the README this unit changes. The rebased branch is not pushed
- 2026-10-02T10:49:53Z [Claude Code, anthropic/claude-opus-5-5] before writing, checked what the README was to say
  in a scratch project outside any repository, on macOS arm64 with Docker Desktop, Docker Engine 24.0.7, with
  `esbuild` 0.25.0 as a dependency and `fsevents` 2.3.3 as an optional one, and npm 11.19.1 and Node 26 on both
  sides. The Linux side was a plain `node:26-bookworm` container with the directory bind-mounted, not the kit's
  sandbox. After a Linux `npm ci` the host had lost `fsevents` and `@esbuild/darwin-arm64`, and the host's
  `npx esbuild --version` failed with "cannot execute binary file"; a host `npm ci` restored both and the command
  answered. After a host `npm ci` the Linux side's `npx esbuild --version` failed with "Exec format error"; a Linux
  `npm ci` restored it. `npm install` on either side swapped the platform packages but did not restore the other
  side's `esbuild`: after a Linux `npm install` the Linux side still failed with "Exec format error". That is the
  native binary case the spec records as not reproduced, seen here for this one package
- 2026-10-02T10:49:53Z [Claude Code, anthropic/claude-opus-5-5] in 649f359, added the section "The shared
  `node_modules`" to the README, under "Running the sandbox". It says the host and the sandbox share the project's
  `node_modules` (requirement 1), what an install on one side removes from the other, with the macOS host as the
  case where it matters (requirement 2), and that `npm ci` on the side about to be used restores it, as `npm ci` on
  the host and `./agent.sh -- npm ci` for the sandbox (requirement 3). It also says to use `npm ci` rather than
  `npm install`, which the spec does not ask for and the scratch check above is the only evidence for. Not checked:
  `./agent.sh -- npm ci` in a project's sandbox, which would have removed Norareit's host packages; the claim that
  Playwright still runs without `fsevents`, which rests on the planner's entry above; and a Linux host
- 2026-10-02T10:49:53Z [Claude Code, anthropic/claude-opus-5-5] ran `npm test`, `node scripts/check-changes.mjs`,
  `npm run check-changes` and `git diff --check master...HEAD` on 649f359, on macOS: 139 tests, 127 passed, 0 failed
  and 12 skipped, ten for needing bash 4 and two for needing GNU stat; both checks and the whitespace check exited
  0. `npm run check-changes` ran the installed kit, which is 1.0.1 here although `package.json` names 1.0.3. No test
  was added, as the spec decides there is no regression check. No review has been run, so the status stays
  `in-progress`

## Amendments
