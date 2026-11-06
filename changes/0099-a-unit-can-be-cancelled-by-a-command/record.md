---
kind: feature
status: in-progress
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
- 2026-11-06T14:51:20Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the unit's branch at `bac3134`, wrote
  `plan.md` against the tree. What `approve` and `cancel` share, the reading and the writing of a record, the
  commit of the record alone and the files that differ from the commit, is moved to a module of its own in a first
  commit that changes no behavior, as the standards extract a decision the second time it appears. Read the
  requirement that `--reason` holding a line break is a wrong argument as of the value as it was given. The status
  is `approved`
- 2026-11-06T15:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on the unit's
  branch at `aa4530d`. The status is `in-progress`
- 2026-11-06T15:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built the unit in four commits,
  `e79d296` for the shared record module, then the pure parts, the command and the documents, the last being `8d1a7b3`
  on the plan's commit points. Every task of `plan.md` is ticked. `npm test` reported 1591 passing and 0 failing, and
  `npm run check-changes` passed, both on the tree of the documents commit, before this entry. `node
  scripts/agentrite.mjs` prints the line of `cancel` after that of `approve`. A search of `process.md`, `roles/`,
  `README.md`, `SETUP.md`, `COMMANDS.md` and `SANDBOX.md` found no statement of the old rule left, and the statement
  of `./sandbox.sh` in `COMMANDS.md` is unchanged. The commit trailer the attribution reminder asks for was left out,
  since the `commit-msg` hook refuses `Co-Authored-By`. The root `process.md` was changed, and the copy in
  `node_modules/agentrite` was not, as it is installed. Not checked: a run of the command on a real unit. The status
  is `in-progress`
- 2026-11-06T15:02:40Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0099 at
  `cf2694c5e074ad758f596fad61179c0e02e7c99a`, against the merge base with `origin/master`. Returned S1 and P1 in
  `.reviews/0099-a-unit-can-be-cancelled-by-a-command/review-20261106T150240Z.md`. Independently ran the suite:
  1591 passed, 0 failed and 33 Docker-dependent tests skipped. The change check passed. Docker checks and a
  cancellation of a real project unit were not verified. The status is `in-progress`
- 2026-11-06T15:20:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, accepted S1 and P1 of the review
  of `cf2694c`, by the definition of the orchestrator and not as a decision of the human. For S1, the success test of
  the task on its branch and the test of the moved branches now commit an `in-progress` record on the branch before
  the command runs. For P1, the verification and commit-point boxes of `plan.md` are ticked, since the suite, the
  change check, the usage order and the line limit were run and the four commits exist. `npm test` reported 1591
  passing and 0 failing, and `npm run check-changes` passed, on the tree before this entry. The status is
  `in-progress`
- 2026-11-06T15:06:17Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a delta review of unit 0099 at
  `4a20b0d83eafcb1999d12520e2f527b716be0dcf`, from `cf2694c5e074ad758f596fad61179c0e02e7c99a`. Returned no findings;
  the review is `.reviews/0099-a-unit-can-be-cancelled-by-a-command/review-20261106T150617Z.md`. Independently ran
  `npm test`: 1591 passed, 0 failed and 33 Docker-dependent tests skipped. The change check passed. Docker checks
  and cancellation of a real project unit remain unverified. The status is `in-progress`

## Amendments
