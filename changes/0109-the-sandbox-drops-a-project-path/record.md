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

## Amendments
