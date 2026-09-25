# 0008 Sandbox and host share one node_modules

## Context

The sandbox mounts the whole project at `/work`, `node_modules` included, so the host and the sandbox install into the
same directory. npm installs a package that is limited to some platforms only on those platforms, and `npm ci` removes
`node_modules` before installing. So an install on one side takes away what the other side's platform needed, and
nothing says so. On a Linux host both sides are the same platform and the effect disappears; on macOS they differ.

It was found while fixing Norareit's `0040-sandbox-firewall-dns`, the first time the sandbox started on a Mac with
Docker Desktop.

## Observed behavior

In Norareit on macOS, after `npm ci` inside the sandbox, the host's `node_modules/fsevents` is gone. The host's unit
suite still passes and Playwright still runs, so nothing reports it.

## Expected behavior

A developer who uses the sandbox and the host on the same checkout knows that they share `node_modules`, knows what
an install on either side does to the other, and knows how to restore their own side.

## Steps to reproduce

On macOS with Docker Desktop, Docker Engine 24.0.7, in Norareit on kit 1.0.2:

1. `npm ci` on the host, and confirm `node_modules/fsevents` exists
2. `./agent.sh -- bash -c 'npm_config_cache=/tmp/npm npm ci'`, with the cache moved because of
   `0007-home-volume-owner-mismatch`
3. Observe that `node_modules/fsevents` no longer exists on the host

## Root cause

Reproduced with the steps above. `fsevents` is the only package in Norareit's lockfile limited to a platform: macOS
only, optional, and a dependency of Playwright, which uses it to watch files. The in-sandbox install, on Linux, skipped
it after removing the whole directory. After it, on the host, `npm run test:unit` passed, 48 tests, and `npx playwright
--version` answered. A host `npm ci` restored `fsevents`.

So in Norareit the loss is small: Playwright falls back from native file watching on the host. A project that depends
on native binaries, such as a bundler shipping one per platform, would lose the binary its host needs, and fail. That
case was not reproduced, because no project using the kit has one.

## Fix description

Document it. The kit's README, where it describes running the sandbox, says that the sandbox mounts the project with
its `node_modules`, that an install on either side installs for that side's platform and removes what only the other
side's platform used, and that `npm ci` on the side about to be used restores it.

## Requirements

1. The kit's README says that the host and the sandbox share the project's `node_modules`
2. It says what an install on one side does to the other, with the macOS host as the case where it matters
3. It gives the command that restores either side

## Decisions

* **Documented rather than separated, for now.** The alternative gives the container its own `node_modules`, a volume
  mounted over `/work/node_modules`. It was rejected for this unit because of what it costs against what the evidence
  shows:
    * Every project's `AGENTS.md` sends agents to the kit's `process.md` and roles under `node_modules`. A new volume
      starts empty, so an agent in a fresh sandbox would find no instructions until something installed them there
    * Something would then have to install on every start, or whenever the lockfile changes, which needs the project's
      allowlist to hold the registry and the kit's host, and makes each start as slow as an install
    * The one project using the kit loses only native file watching on the host

  A project with native binaries per platform would change that balance. The volume is the fix to reach for then, as a
  unit of its own, deciding how the container's `node_modules` is filled
* **No check that warns at start.** Telling a Linux install from a macOS one in a shared directory needs knowledge of
  which packages are limited to which platform, per project. Documenting the rule costs nothing and covers every
  project
* **No regression check.** The fix is documentation. The reviewer reads the README against the three requirements

## Non-goals

* A separate `node_modules` for the container
* Installing dependencies automatically when the sandbox starts
* Package managers other than npm
