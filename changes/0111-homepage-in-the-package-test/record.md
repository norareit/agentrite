---
kind: task
status: approved
timestamp: 2026-11-18T12:18:43Z
---

# 0111 The test of the package's metadata expects the homepage it had before

## Log

- 2026-11-18T12:18:43Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `cc989d1`, on the human's request to fix the test that fails since `be11220`. Numbered 0111: the
  highest number in `changes/`, on every local branch, is 0110. Wrote this record. The status is `draft`
- 2026-11-18T12:21:07Z [human] approved the record. The status is `approved`

## The task

`be11220` set the `homepage` of `package.json` to `https://agentrite.dev`, and the test "package.json says what the
package is, where it lives and under which license" in `tests/package-documents.test.mjs` still expects
`https://github.com/norareit/agentrite#readme`, so `npm test` fails on `master`. The human confirmed that
`https://agentrite.dev` is the homepage. The test is to expect it, and nothing else changes.

## Amendments
