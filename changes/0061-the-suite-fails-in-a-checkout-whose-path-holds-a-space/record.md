---
kind: bug
status: in-progress
timestamp: 2026-10-19T23:21:09Z
---

# 0061 The suite fails in a checkout whose path holds a space

## Log

- 2026-10-19T23:21:09Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `8cc88d6`, on the human's decision that finding C1 of the review of unit 0058, that the tests of
  `tests/bell.test.mjs` fail in a checkout whose path holds a space, is fixed by a unit of its own for the whole
  suite. Made the unit as a bug, since it is faulty behavior of the suite. Numbered 0061: the plain numbers in
  `changes/` on `master` run with no gap to 0060, and `history-` directories are not counted. Ran `npm test` on the
  host in two worktrees of `546f970`, which differ only in a space in their directory's name, with a copy of
  `node_modules` in each: 725 tests and 1 failing without the space, 719 tests and 237 failing with it, every path in
  the errors encoded as `%20`. Found that the kit's code under `scripts/` and `container/` takes no path from a
  URL's `pathname`. Did not establish whether a path left unquoted in a shell command fails a test on its own. Wrote
  `spec.md`. The status is `draft`
- 2026-10-20T18:03:01Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `add6bdd`, on the human's question why running the kit's commands from a project whose path holds a
  space was a non-goal. Read `roles/specifier.md` of the installed release 7.2.0. Showed on the host, in a new
  project at such a path with the kit of the working tree linked in, that `agentrite config`, `init`, `roles` and
  `refresh` work there, and that `./sandbox.sh --in-place` and a unit run of `./sandbox.sh` start and run a command,
  with an image of the human's tagged for the project so that none was built; then removed the project, the tag, its
  home volume and its directory of state. Read `tests/temporary-directory.mjs`, which 22 files of the suite use.
  The human took into the unit that the suite keeps the commands working from such a path. Changed `spec.md`: the
  root cause gives the evidence, the fix and requirements 4 and 5 give every temporary directory of the suite a
  space in its name, a decision says why, the non-goal names only what was not tried, and "Beyond the request" is
  numbered and says what requirements 3 and 4 do not catch. The status is `draft`
- 2026-10-20T18:03:13Z [human] approved the spec. The status is `approved`
- 2026-10-20T18:09:06Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `bugfix-0061-the-suite-fails-in-a-checkout-whose-path-holds-a-space` at `20ddd41`, in an environment without
  Docker. Ran `npm test` in the checkout, 745 tests, 722 passing and 23 skipped. In a scratch worktree at a path with
  a space, since removed, tried the fix to name every place that fails: with the paths taken by `fileURLToPath`, the
  three tests of `tests/bell.test.mjs` that give `sh` the script's path unquoted failed, which settles what the spec
  left open; with a space in the temporary directories besides, the git trap of a test of
  `tests/sandbox-unit-run.test.mjs` failed for an unquoted path in the test. No test failed in the kit's code. Found
  nine files taking a path from a URL's `pathname` on this tree, where the spec's root cause counted eight on
  another, which changes no requirement. Wrote `plan.md`. The status stays `approved`
- 2026-10-20T18:10:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on
  `bugfix-0061-the-suite-fails-in-a-checkout-whose-path-holds-a-space` at `a3b3c97`, in an environment without
  Docker, began the work. The status is `in-progress`
- 2026-10-20T18:11:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, before the work, ran `npm test` at `a3b3c97`:
  745 tests, 722 passing, 0 failing and 23 skipped, as the plan states. Wrote the regression test of R3 and saw it
  fail naming the nine files of the plan. Took their paths with `fileURLToPath` and quoted the script's path in the
  three commands of `sh` in `tests/bell.test.mjs`. `npm test` reported 746 tests, 723 passing, 0 failing and 23
  skipped, the three terminal tests of `tests/bell.test.mjs` among those that ran
- 2026-10-20T18:12:28Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote the test of R4 and saw it fail, then
  gave the helper's names a space. `npm test` then failed one test, the git trap of
  `tests/sandbox-unit-run.test.mjs`, as the plan found; with its two values quoted, `node --test
  tests/sandbox-unit-run.test.mjs` reported 101 passing, and `npm test` 747 tests, 724 passing, 0 failing and 23
  skipped. Nothing under `scripts/` or `container/` changed
- 2026-10-20T18:13:09Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on `5f233ab`, in an environment without
  Docker, ran `npm test` in this checkout and in a worktree of the same commit at a path whose directory is named
  `space tree`, with a copy of `node_modules`, since removed. Both reported 747 tests, 724 passing, 0 failing and 23
  skipped: the 745 of before the work, plus the tests of R3 and R4. The lines of the two reports, one per test with
  its result, were the same once the durations were removed. The 23 skipped need Docker, so R1 and R5 are not
  verified for them: the run of both on the human's Linux host with Docker, a task of the plan's verification, is
  left open, and the status stays `in-progress` until it is done
- 2026-10-20T18:13:16Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran `npm run check-changes` on `e73ceb2`, which
  passed. Its task in the plan stays open, since it is to be run after the last commit, which the run with Docker may
  still add

## Amendments
