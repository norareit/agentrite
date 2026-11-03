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
- 2026-11-03T15:50:57Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on `680bae1`. On the
  host `npm test` passed, 1335 tests with none skipped, and `npm run check-changes` passed. In the sandbox, run with
  `./sandbox-dev.sh --in-place npm test` because `./sandbox.sh` runs the installed release, which does not hold
  this unit, 1283 passed, 33 were skipped and 19 failed: those of `agentrite-init`, `agentrite-refresh`,
  `commit-msg-hook` and `sandbox-update` that write or use the commit-msg hook, which find the image's own hook
  at `/usr/local/lib/agentrite/hooks` through `core.hooksPath`. The first three files fail 17 tests and
  `sandbox-update` fails as a whole the same way on `e27280f`, before this unit, so that verification task stays
  open as a concern outside this unit. On the host, with `cleanupPeriodDays` of 365 in `~/.claude/settings.json`,
  `./sandbox-dev.sh --in-place` printed `{"cleanupPeriodDays": 365}` from
  `/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json`, mode 644, and the agent's write to it was
  refused as a read-only file system. `/status` of Claude Code in the sandbox was not checked, since it needs an
  interactive session, and that task stays open. The status is `in-progress`
- 2026-11-03T16:13:30Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ticked the last check of the plan's
  verification but one: the human reported that `/status` of Claude Code in the sandbox lists User settings, Project
  local settings and Enterprise managed settings (file + drop-ins) among its setting sources. That shows that Claude
  Code reads `/etc/claude-code/managed-settings.d/`, which also holds the bell's drop-in, and does not show the
  number in use, which Claude Code does not display. The check of `./sandbox.sh --in-place npm test` stays open
  for the failures of unit 0093. The status is `in-progress`
- 2026-11-03T16:14:22Z [human] decided that the check of `./sandbox.sh --in-place npm test` counts as passed for
  this unit: its 19 failures are not of this unit and are the bug of
  `changes/0093-hook-tests-fail-in-the-sandbox`
- 2026-11-03T16:14:22Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ticked that check on the human's
  decision. Every task of `plan.md` is ticked, and the unit is handed over for review. The status is `in-progress`
- 2026-11-03T16:19:41Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of 0092 at `6f7917d`,
  against merge base `31bcf08` with `master`, restarted after the human reported a squash. Returned S1 in
  `.reviews/0092-sandbox-keeps-sessions-as-long-as-the-host/review-2026-11-03-opencode.md`. Ran `npm test`: 1335
  passed; `./sandbox-dev.sh --in-place npm test`: 1283 passed, 19 hook-related failures, 33 skipped; and
  `npm run check-changes` and `git diff --check master...HEAD`: passed. Reproduced S1 with an isolated
  overlapping-start probe using the wrapper's fake-host fixture. Did not independently repeat the interactive
  Claude Code `/status` observation. The status is `in-progress`
- 2026-11-03T16:26:29Z [human] accepted S1 of the review, to be corrected in this unit with a file of the number for
  each number, which no start changes or removes
- 2026-11-03T16:26:29Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the correction of S1 to
  `plan.md`, with its approach, and began it. The status is `in-progress`
- 2026-11-03T16:30:43Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, corrected S1 in `94603bf`: each
  number has its file, `<logs>/claude-cleanup-period-<n>.json`, which a start writes when it is not there and no start
  changes or removes. The wrapper's tests of the correction failed on the wrapper before it, and pass after it.
  On `94603bf`, `npm test` passed on the host, 1336 tests with none skipped, and `npm run check-changes`
  passed. `./sandbox-dev.sh --in-place npm test` passed 1284, skipped 33 and failed the 19 tests of the
  commit-msg hook of unit 0093, which the human's decision above counts as passed for this unit.
  `./sandbox-dev.sh --in-place` printed `{"cleanupPeriodDays": 365}` from the mount, whose source on the host
  was `claude-cleanup-period-365.json`. Removed `claude-cleanup-period.json` from this project's log directory
  on the host, which this branch's wrapper wrote before the correction. Not checked: two starts made at the same
  moment with real Docker. The status is `in-progress`
