---
kind: task
status: implemented
timestamp: 2026-10-20T13:45:00Z
---

# 0060 What the human must do ends a message

## Log

- 2026-10-19T15:48:46Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `c38c2f0`, on the human's request to specify a scratch note: every role lists what it needs from the
  human at the end of its message, so that it is not buried in prose. The human placed the rule in `standards.md`.
  Made the unit as a feature, since the form of the list needs deciding. Numbered 0060: the highest number in
  `changes/` is 0059. Read `standards.md`, `process.md` and the four role files of the working tree, none of which
  says how a message asks the human for something. Wrote `spec.md`. The status is `draft`
- 2026-10-20T12:41:04Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question whether
  the unit is not a task. It is: one rule added to `standards.md`, with nothing in it left to decide now that
  `spec.md` decides the form of the list. Changed the kind to `task`. `spec.md` is kept, as what the task makes
  true, and no plan is written. The status is `draft`
- 2026-10-20T12:41:04Z [human] approved the spec. The status is `approved`
- 2026-10-20T13:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on the branch
  `task-0060-what-the-human-must-do-ends-a-message`, cut from `master` at `07e5442`. Added the rule on messages to the
  human to "Text" of `standards.md`, as the spec's requirement 1 words it. No role file repeats it. The status is
  `in-progress`
- 2026-10-20T13:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, ran `npm test` on the final
  tree: 725 tests, 724 pass and 1 fails, a test that expects an `agentrite.json` without the `bell`, `standards` and
  `roles` keys. The same test fails with the same result on `master` with my change stashed, so it is not caused by
  this unit and is not fixed here. The end-to-end suite is the same `npm test`. Lines of `standards.md` are within 120
  characters
- 2026-10-20T13:45:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on the human's word that they
  reviewed the unit themselves, so that no reviewer ran and no finding is open. The task has no `plan.md`. The status
  is `implemented`

## Amendments

- 2026-10-20T14:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on the human's request, added
  to the rule in `standards.md` that the prose above the list does not ask or restate what the list asks. The reason:
  a message that asked in its prose and again in the list made the list repeat the message. `spec.md` is frozen and
  is not changed
