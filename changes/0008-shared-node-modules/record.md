---
kind: bug
status: draft
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

## Amendments
