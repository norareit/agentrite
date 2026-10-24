---
kind: bug
status: approved
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
- 2026-10-24T23:46:09Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a run of the orchestrator on the Linux host,
  cut `bugfix-0084-a-test-of-variant-runs-reads-docker-too-early` from `master` at `4c43c10`. Judged that the fix
  needs a plan: regression tests, a wait moved out of `setUp`, and the five tests of the file waiting through it.
  Wrote `plan.md` against `tests/sandbox-variant.test.mjs` as it is on the branch. The status stays `approved`

## Amendments
