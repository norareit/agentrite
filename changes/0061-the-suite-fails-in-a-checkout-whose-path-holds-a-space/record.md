---
kind: bug
status: approved
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

## Amendments
