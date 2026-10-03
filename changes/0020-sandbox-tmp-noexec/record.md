---
kind: bug
status: in-progress
timestamp: 2026-10-03T12:53:39Z
---

# 0020 The sandbox refuses to run anything from `/tmp`

## Log

- 2026-10-03T12:49:57Z [human] on hearing that this repository's suite fails in its new sandbox because `/tmp` is
  mounted `noexec`, said that using `/tmp` is not special, that no project adopting the kit should have to change
  its code to run its tests in the container, and asked for the fix in the kit, as bug 0020, on which 0018 depends
- 2026-10-03T12:49:57Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A bug, with a plan, since the fix comes with a regression test, a comment, a README paragraph and a
  real run. The number is the human's: the rule gives 0019, the highest directory on this branch being 0018, and a
  local branch `task-0019-beyond-the-request` already uses that number. Checked before writing, on Linux with
  Docker Engine 28.4.0 and Compose 2.39.2, in this repository's sandbox built from kit 2.2.0: the mount options of
  `/tmp`, `/run`, `/dev/shm`, `/work` and `/home/agent`, and whether a script written to each runs, which are the
  table in the spec; and that with `/tmp:exec` in a copy of the installed compose file, `/tmp` is mounted
  `rw,nosuid,nodev,relatime` and `npm test` in the sandbox reports 177 passing and 0 failing, against 162 and 15
  without it. Not checked: Docker Desktop for macOS and Docker Engine 24.0.7. That Docker adds `noexec` to every
  tmpfs given this way is what was observed here and what reports in Docker's issue tracker say; the engine's
  source was not read. Written on the branch `feature-0017-sandbox-without-playwright`, which holds 0017, the 2.2.0
  release commit and 0018, none of which `master` holds yet
- 2026-10-03T12:53:39Z [human] approved the spec and the plan and asked for the implementation
- 2026-10-03T12:53:39Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  in-progress

## Amendments
