---
kind: feature
status: in-progress
timestamp: 2026-11-03T15:29:26Z
---

# 0092 The sandbox keeps Claude Code's sessions as long as the host

## Log

- 2026-11-03T15:29:26Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `cea7f34`, on the human's request that the sandbox take `cleanupPeriodDays` from the host's global
  Claude Code settings, with no default of the kit and no setting of the project, and that the paragraph of
  `SANDBOX.md` committed at `cea7f34` be rewritten. Numbered 0092: the highest number in `changes/`, on every
  branch, is 0091. Read the mounts of the status line, the bell and the log directory in `container/sandbox.sh`,
  `container/claude-managed-settings.json`, `container/bell/claude-managed-settings.json`, the sections of
  `SANDBOX.md` on the status line, the bell and the host, and Claude Code's documentation of `cleanupPeriodDays`,
  of what it cleans up and of managed settings drop-ins. Ran nothing in the sandbox. Wrote `spec.md`. The status is
  `draft`
- 2026-11-03T15:37:14Z [human] approved the spec. The status is `approved`
- 2026-11-03T15:39:46Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `feature-0092-sandbox-keeps-sessions-as-long-as-the-host`, cut from `master` at `31bcf08`. Read `container/sandbox.sh`
  around the reading of `bell`, `--connect` and the log directory, `scripts/agentrite-settings.mjs`, the `setUp` of
  the wrapper's tests and `package.json`'s `files`. Wrote `plan.md`: a reader of the host's `cleanupPeriodDays` in
  `scripts/`, read with `bell` and written beside the log directory as a file renamed into place, so that a later
  start leaves a run under way with its number. The status is `approved`
- 2026-11-03T15:41:03Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `feature-0092-sandbox-keeps-sessions-as-long-as-the-host` at `e27280f`, began the work. The status is
  `in-progress`
- 2026-11-03T15:45:53Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added to `plan.md` a test of
  `tests/sandbox-unit-run.test.mjs` that the plan did not list: a unit run refused for a host's
  `~/.claude/settings.json` that is not JSON cuts no branch. The plan put that check of R4 in the wrapper's tests,
  which have no repository in which a branch could be cut
