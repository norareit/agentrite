---
kind: bug
status: approved
timestamp: 2026-11-03T15:56:34Z
---

# 0093 The tests of the commit-msg hook fail in the sandbox

## Log

- 2026-11-03T15:56:34Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `31bcf08`, on the human's request for a bug unit for the 19 tests that fail in the sandbox, found by
  the implementer of unit 0092. Numbered 0093: the highest number in `changes/`, on every local branch, is 0092.
  Read the messages of the failing runs of `./sandbox-dev.sh --in-place npm test` on `680bae1` and on `e27280f`,
  `container/compose.yml`'s environment for git, `container/hooks/commit-msg` and the setup of
  `tests/commit-msg-hook.test.mjs`. Wrote `spec.md`. The status is `draft`
- 2026-11-04T11:27:27Z [human] approved the spec. The status is `approved`
- 2026-11-04T12:09:33Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `bugfix-0093-hook-tests-fail-in-the-sandbox`, cut from `master` at `0549980`. Read the four test files' places
  that start processes, `tests/compose-entries.mjs` and `container/compose.yml`'s environment for git. Ran the four
  files on the host with the five entries of `container/compose.yml` set, and saw the same 19 tests fail as in the
  sandbox. Wrote `plan.md`: a pure function of the suite that removes git's environment configuration from a copy
  of the environment, passed to every start of `init` and `refresh` in the four files, and a regression test that
  runs the four files with the compose file's entries added. The status is `approved`
