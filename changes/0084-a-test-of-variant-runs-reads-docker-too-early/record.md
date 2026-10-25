---
kind: bug
status: implemented
timestamp: 2026-10-23T23:50:06Z
---

# 0084 A test of variant runs reads Docker too early

## Log

- 2026-10-23T23:50:06Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `7036e32`, on the human's request for a bug unit for the test of `tests/sandbox-variant.test.mjs` that
  fails now and then, as it did on the first `npm test` of the release of 8.1.0. Made the unit as a bug. Numbered
  0084: the highest number in `changes/` is 0083. Read the test file, `containerProject` and `containerHost` of
  `tests/wrapper-fixture.mjs`, and how `container/sandbox.sh` names a unit run's container and asks `docker ps`
  whether it runs. Ran `npm test` 14 times on this host, 8 of them with every CPU busy, while logging the containers
  of the file every 200 milliseconds: all passed. Reproduced the race beneath it with a script outside the
  repository, as the spec gives it: `docker ps` left out 23 of 36 containers started twelve at a time, and 6 of 10
  started one at a time, at the moment their process had touched a file, and `docker inspect` said `running` for
  each. Wrote `spec.md`. The status is `draft`
- 2026-10-24T23:42:58Z [human] approved the spec. The status is `approved`
- 2026-10-24T23:46:09Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a run of the orchestrator on the
  Linux host, cut `bugfix-0084-a-test-of-variant-runs-reads-docker-too-early` from `master` at `4c43c10`. Judged that
  the fix needs a plan: regression tests, a wait moved out of `setUp`, and the five tests of the file waiting through
  it. Wrote `plan.md` against `tests/sandbox-variant.test.mjs` as it is on the branch. The status stays `approved`
- 2026-10-25T09:00:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work and built it in
  `tests/sandbox-variant.test.mjs` alone as commit `e840e69`: `runningContainers`, `waitForRun` and `branchOf` at the
  top level, `wait` and `runningNames` of `setUp` through them, and three regression tests with a fake `docker`, without
  `{ skip }`. The regression tests and the wait were written in one step, so the tests were not seen failing before the
  wait existed. `node --test tests/sandbox-variant.test.mjs` reported 8 passed, 0 failed, and `npm test` 1238 passed, 0
  failed, both before a formatting-only pass of Prettier with the file's own style (4 spaces, single quotes, 120
  columns); the file alone was run again after it, 8 passed. The three `waitForRun` tests alone passed on this host with
  Docker, and call no `docker` but their fake. No line of the file is over 120 characters, and nothing outside the file
  changed in the commit. `npm run check-changes` passed before the record entry was committed. The status is
  `in-progress`
- 2026-10-24T23:49:46Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0084 at
  `92cc7ba718c1513e4aa2807321ec0933ea5dda44`, against merge base `4c43c10` with `master`. Returned nonblocking P1
  in `.reviews/0084-a-test-of-variant-runs-reads-docker-too-early/review-20261024T234946Z.md`; no spec-conformance
  or code-quality findings. Independently ran the test file (8 passed), the regression tests alone (3 passed),
  `npm test` (1238 passed, none failed or skipped), `npm run check-changes` and `git diff --check master...HEAD`
  (both passed). The original intermittent race and historical tests-first ordering were not independently
  verified. The status stays `in-progress`
- 2026-10-25T10:00:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, took the finding P1 of the review
  `review-20261024T234946Z.md`, nonblocking, accepted by the definition of the orchestrator and not as a decision of
  the human. The first task of `plan.md` said the tests were written first and seen failing, which did not happen, so
  its text now says what was done. As evidence after the fact, and not as the red run that was skipped, the wait was
  changed in a scratch edit to ignore the listing: of the three `waitForRun` tests, 2 failed (the delayed listing and
  the never listed container) and 1 passed (the missing ready file, which does not depend on the listing). The edit
  was reverted and is not committed. The status stays `in-progress`
- 2026-10-25T10:30:00Z [human] decided that the unit meets the bar for `implemented`: the review's one finding, P1,
  is nonblocking and corrected, and every task of `plan.md` is ticked. Recorded by Claude Code,
  anthropic/claude-sonnet-5-5, as the implementer, at the human's request. The status is `implemented`

## Amendments
