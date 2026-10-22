---
kind: feature
status: draft
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
  decisions on "Beyond the request": took item 2 into the unit as requirements 12, 13 and 17, by which `sandbox.sh` refuses
  to cut a branch for a cancelled unit with a message that names why and what to do, so that by the rule of
  `AGENTS.md` on refusals `SANDBOX.md` does not describe it; recorded items 1 and 3 as declined; added the human's
  confirmation of the cancellation commit for an `approved` unit with a branch to its decision; and renumbered the
  requirements after them. The status is `draft`
