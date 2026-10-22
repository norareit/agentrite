---
kind: feature
status: in-progress
timestamp: 2026-10-22T12:22:44Z
---

# 0074 A unit can be cancelled

## Log

- 2026-10-22T12:22:44Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `c9ae228`, on the human's request for an end status beside `implemented` that closes a unit without
  building it, with the name, the transitions, the commit of an `in-progress` unit's cancellation and the freeze
  decided by the human. Made the unit as a feature. Numbered 0074: the highest number in `changes/` is 0073. Read the
  statuses and the freeze in `process.md`, the change check, the record template, the role files, the refusal of
  `agentrite run` and the sandbox's cutting of a branch, and "check-changes", "How it works" and "Adding a role" of
  `README.md`. The human decided the commit on the default branch for an `in-progress` unit; requirement 6 gives the
  same for an `approved` unit whose planning cut a branch, the only reading under which its plan reaches the default
  branch without the branch being merged. Wrote `spec.md`. The status is `draft`
- 2026-10-22T12:32:47Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, revised `spec.md` on the human's
  decisions on "Beyond the request": took item 2 into the unit as requirements 12, 13 and 17, by which `sandbox.sh`
  refuses to cut a branch for a cancelled unit with a message that names why and what to do, so that by the rule of
  `AGENTS.md` on refusals `SANDBOX.md` does not describe it; recorded items 1 and 3 as declined; added the human's
  confirmation of the cancellation commit for an `approved` unit with a branch to its decision; and renumbered the
  requirements after them. The status is `draft`
- 2026-10-22T12:33:10Z [human] approved the spec. The status is `approved`
- 2026-10-22T18:15:26Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `feature-0074-a-unit-can-be-cancelled` from `master` at `737cb52` and wrote `plan.md` against it. Read requirement
  16 as a test of `agentrite orchestrate`, the only reading that works: `checkApproved` of that command is the one
  refusal by status, and `agentrite run` refuses none. The status is `approved`
- 2026-10-22T18:20:00Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's request, corrected
  `spec.md` on the unit's branch to take `agentrite run` out of it: the context, requirement 16 and the decision that
  no command needs a change now name `agentrite orchestrate` alone, which is the one command that refuses a unit by
  its status. Nothing else of the spec changed. The status is `approved`
- 2026-10-22T18:24:43Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the human's request, cut the
  paragraph of `plan.md` on requirement 16 to the one sentence it needs since the spec's correction. No task changed.
  The status is `approved`
- 2026-10-22T18:31:51Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  began the work on `feature-0074-a-unit-can-be-cancelled` at `a118e5d`. The status is `in-progress`
