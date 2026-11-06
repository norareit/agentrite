---
kind: feature
status: approved
timestamp: 2026-11-06T14:07:38Z
---

# 0099 A unit can be cancelled by a command

## Log

- 2026-11-06T14:07:38Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `b79f39c`, on the
  human's request for a command that cancels a unit as `npx agentrite approve` approves one. Numbered 0099, which the
  human's session reserved. A feature, since it needs decisions: how the reason and the superseding unit are given,
  how a unit with a branch is handled, and what is refused. Read `process.md`, `COMMANDS.md`, `README.md`,
  `SETUP.md`, `SANDBOX.md`, `scripts/agentrite-approve.mjs`, the `approve` code of `scripts/agentrite.mjs`, the spec
  of 0082 and the record of 0098. Wrote `spec.md`. The status is `draft`
- 2026-11-06T14:40:48Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `86eeac9`, revised
  `spec.md` by the human's decisions on it. The command cancels on the branch checked out and does nothing to branches,
  and `process.md`'s rule that a unit with a branch is cancelled on the default branch with the documents of its branch
  is replaced in the same unit. Searched `process.md`, the roles, `README.md`, `SETUP.md` and `COMMANDS.md` for the old
  rule, which only the paragraph on the branches in `process.md` states. Recorded as decisions that a plan and branch
  entries not merged are lost with the branch, and that a merge may conflict in `record.md`. The human kept `--by` and
  the wording of the entry with it, and declined items 1 to 3 of "Beyond the request" of 86eeac9. Items 1 and 2, on
  reading the unit's branch, are moot and dropped, and item 3, `--delete-branch`, is now item 1, declined. The status is
  `draft`
- 2026-11-06T14:45:43Z [human] approved the spec. The status is `approved`

## Amendments
