---
kind: task
status: implemented
timestamp: 2026-11-18T12:18:43Z
---

# 0111 The test of the package's metadata expects the homepage it had before

## Log

- 2026-11-18T12:18:43Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `cc989d1`, on the human's request to fix the test that fails since `be11220`. Numbered 0111: the
  highest number in `changes/`, on every local branch, is 0110. Wrote this record. The status is `draft`
- 2026-11-18T12:21:07Z [human] approved the record. The status is `approved`
- 2026-11-18T12:21:19Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  cut `task-0111-homepage-in-the-package-test` from `master` at `7d0b8ca` and began the work. The status is
  `in-progress`
- 2026-11-18T12:22:36Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, changed the `homepage` that the test
  "package.json says what the package is, where it lives and under which license" of
  `tests/package-documents.test.mjs` expects to `https://agentrite.dev`, and nothing else. `npm test` on this tree
  passes 1898 of 1898 tests. The work is handed over for review. The status stays `in-progress`
- 2026-11-18T12:24:44Z [human] reviewed the unit and found it good, with no findings
- 2026-11-18T12:24:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, set the unit to `implemented` on
  the human's review. The status is `implemented`

## The task

`be11220` set the `homepage` of `package.json` to `https://agentrite.dev`, and the test "package.json says what the
package is, where it lives and under which license" in `tests/package-documents.test.mjs` still expects
`https://github.com/norareit/agentrite#readme`, so `npm test` fails on `master`. The human confirmed that
`https://agentrite.dev` is the homepage. The test is to expect it, and nothing else changes.

## Amendments

- 2026-11-18T12:24:55Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrapped again the first line of the
  entry that sets `implemented`, which `dd883a5` made longer than 120 characters
