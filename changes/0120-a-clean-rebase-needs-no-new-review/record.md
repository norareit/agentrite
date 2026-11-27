---
kind: bug
status: draft
timestamp: 2026-11-23T00:03:55Z
supersedes: 0117-set-a-unit-implemented-by-a-command
---

# 0120 A clean rebase needs no new review

## Log

- 2026-11-23T00:03:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, wrote `spec.md` on the
  human's report that `npx agentrite complete` refuses a branch after a clean rebase, reproduced on a clone with 0117.
  `supersedes` names 0117 for its tree comparison and the refusals of the named commit only. `process.md` has 2562
  words at `9e2db59`, and the spec keeps it from growing. The status is `draft`
- 2026-11-27T13:45:23Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` in full at `f1b26ac1e5c6fcd79313fba8cff8a0b40d348ef1`. Findings F1 to F6 are in
  `.reviews/0120-a-clean-rebase-needs-no-new-review/spec-review-2026-11-27T134446Z.md`. Did not repeat the exact rebase
  with an added file or the trial across units 0100 to 0119, or verify live harness behavior

## Amendments
