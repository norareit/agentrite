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
- 2026-11-27T14:00:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, settled the findings of the spec
  review with the human. F2, F3, F5 and F6 are accepted and corrected in `spec.md`: the refusal of a merge is the
  command's own, the commit that added the entry raises the count above each of its parents and the commits after it are
  defined, a fresh clone holds the default branch, and the row of `complete` in `COMMANDS.md` stays. F4 is accepted as a
  limitation, with R4 and R6 naming the commit that added the entry. F1 is declined, since the wording of R2 taken for
  F3 already keeps a removal from being taken. `process.md` stays at 2562 words. The status is `draft`
- 2026-11-27T14:03:19Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` at `1383f201beec30a2720dd24f78a0c1b0c0b6f6db` as a delta from `f1b26ac1e5c6fcd79313fba8cff8a0b40d348ef1`.
  Findings F4, F7 and F8 are in `.reviews/0120-a-clean-rebase-needs-no-new-review/spec-review-2026-11-27T140237Z.md`.
  Did not verify live harness behavior or run the proposed command, which is not yet implemented

## Amendments
