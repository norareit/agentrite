---
kind: bug
status: draft
timestamp: 2026-10-12T13:00:17Z
---

# 0046 The test of a relative `XDG_DATA_HOME` fails on macOS

## Log

- 2026-10-12T13:00:17Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `8c5f0da`, on the human's request for a bug unit for the one test that fails on this host, and
  their question whether it is a leftover of the releases 4.0.0 or 6.0.0. Made the unit as a bug. Numbered 0046:
  the plain directories run from 0001 to 0045. `origin` was fetched and holds no unit past 0044.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: the failing test and the helper it uses, and the part of the wrapper that makes and mounts the log
  directory.
  Reproduced, on macOS 15.1.1 with node 26.9.0 and bash 3.2.57: `npm test` on `master` reports 495 tests, 477
  passing, 17 skipped and 1 failing, which is this test, with `/private/var` where it expects `/var`. The same
  test, run alone in a worktree of the tag `v4.1.0`, fails in the same way, so it has failed on macOS since the
  release it came in. `git log -S` gives `2bbd5b3`, of unit 0035, as the commit that added it, and `v4.1.0` as the
  first tag that holds it.
  Shown for the root cause, with a shell started by node in a directory under the temporary directory: without
  `PWD`, and with a `PWD` that names another directory, `pwd` prints the path under `/private/var`, and with `PWD`
  set to the directory it prints the path under `/var`. node gives the temporary directory as a path under `/var`
  and its real path as one under `/private/var`.
  Wrote `spec.md`. Decided, each with its reason under "Decisions": the test changes and the wrapper does not, the
  test expects the path as the system names it and is given no `PWD`, and the proof is a run on macOS.
  Not checked: that the suite passes on a Linux host at `8c5f0da`, which is taken from the reviewer's entry in the
  record of unit 0045, why the seventeen skipped tests are skipped, and anything that needs Docker. The status is
  `draft`

## Amendments
