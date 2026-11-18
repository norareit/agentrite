---
kind: bug
status: in-progress
timestamp: 2026-11-15T23:30:08Z
---

# 0109 The sandbox drops the PATH that a project's Dockerfile sets

## Log

- 2026-11-15T23:30:08Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `be11220`, on the human's request for a bug unit for a problem a developer reported from runs on their
  own project: a line `ENV PATH` in the project's `sandbox/Dockerfile` is overridden without a word. Numbered 0109:
  the highest number in `changes/`, on every local branch, is 0108. Read `container/entrypoint.sh`, the `--connect`
  call of `container/sandbox.sh`, the test of `tests/sandbox-unit-run.test.mjs` that holds the two against each other
  and "Adding software to the sandbox" and "Two agents on one unit" of `SANDBOX.md`. Wrote `spec.md`. The status is
  `draft`
- 2026-11-18T15:19:48Z [human] approved the spec. The status is `approved`
- 2026-11-18T15:24:38Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the Linux host, cut
  `bugfix-0109-the-sandbox-drops-a-project-path` from `master` at `66170c9` and wrote `plan.md`: regression tests
  first, then the entrypoint and `--connect`, then `SANDBOX.md`. The kit's image has the `PATH` of R3 from its base
  image, `node:26-bookworm`, as `docker image inspect` showed, so R3 needs no change and gets a test that keeps it.
  The status stays `approved`
- 2026-11-18T15:29:30Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  `bugfix-0109-the-sandbox-drops-a-project-path` at `f9647f6`, began the work. The status is `in-progress`
- 2026-11-18T15:35:26Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added to `plan.md` a task for
  `tests/sandbox-dev.test.mjs`, which the plan did not name: its test of the shim's `--connect` expects the call to
  give `--env PATH`, and was the one test of `npm test` that failed once `--connect` gave none. In the run of the
  regression tests before the fix, two tests of `tests/entrypoint-path.test.mjs` passed already, since the tree had
  no other line that sets `PATH` and the kit's image sets none; the three others failed, with the tests of the other
  two files
- 2026-11-18T15:38:45Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, finished the plan. On `eb5120d`, on
  the Linux host, `npm test` passed, 1905 tests with none failed or skipped, and `npm run check-changes` exited 0. No
  line the unit changes or adds is longer than 120 characters, as `awk` over the changed files showed. The image that
  `./sandbox-dev.sh --in-place --rebuild` built has the `PATH`
  `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` in its configuration, as `docker image inspect` showed,
  and a command run in it printed that `PATH` (R3). A container of a project's image that sets `ENV PATH` was not
  started: R1 is shown by the test that runs the entrypoint's own lines on the host, not in a container. The unit is
  handed over for review. The status stays `in-progress`
- 2026-11-18T15:46:12Z [OpenCode, openai/gpt-6.2-sol] as the reviewer, made a full review of 0109 at `1e37678d5ee7`.
  Returned S1, P1 and C1 in
  `.reviews/0109-the-sandbox-drops-a-project-path/review-1e37678d5ee7-20261118T154544Z.md`. Ran `npm test` and
  `npm run check-changes` and checked the default and custom `PATH` cases with Docker. Did not replay the
  historical pre-fix suite run
- 2026-11-18T15:51:57Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, took the findings of
  `.reviews/0109-the-sandbox-drops-a-project-path/review-1e37678d5ee7-20261118T154544Z.md` and accepted all three.
  S1: the shebang `#!/usr/bin/env bash` has the image's `PATH` choose the shell that runs the entrypoint as root,
  before the fixed `PATH` is set, which R4 rules out. C1: the pattern of the entrypoint's last line is written in
  three test files. P1: `./sandbox-dev.sh --rebuild` alone refuses, since it mounts nothing at `/work`, as it did when
  run again. Added to `plan.md` the tasks after S1 and C1 and their commit points, made the step of "Verification"
  after P1 the invocation that builds and runs in place, and unticked the steps of "Verification", which hold only
  for the final tree

## Amendments
