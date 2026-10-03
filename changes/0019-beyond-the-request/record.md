---
kind: task
status: implemented
timestamp: 2026-10-03T22:37:23Z
---

# 0019 Keep what the request does not need out of the requirements

## Description

Twice a planner widened a unit beyond what was asked, and both times the widening sat among the requirements, where
approving the unit approved it too. In 0013 the request was a way to refresh generated files, and the one edit the
README invites in them is a pinned model; the spec said that every key a project added is kept, which took five
reviews to get out again. In 0017 the request was a sandbox without Playwright; the draft added a check against a
mistake nobody had made, which the human struck on reading it.

Asking the human whenever a planner is unsure would not have caught either, since the planner was not unsure, and
would add questions to every unit. What was missing is that the human could not see, at the one moment they read the
spec to approve it, which parts were theirs and which were the planner's idea.

Three edits, with this wording:

* In `roles/planner.md`, under "Writing the spec", after the bullet on non-goals:

  > Write as requirements only what the request needs. A check against a mistake nobody has made, support for a
  > case nobody has, and the general form of a specific wish are not requirements. Put each under "Beyond the
  > request" instead, with what it would cost and what happens without it, and leave it out of the unit unless the
  > human takes it. What happens without it is the test: when that is a failure someone would see and could recover
  > from cheaply, such as a clear error or a change to a tracked file, it is fixed when it happens and not before

* In `templates/changes/spec.md`, a section after "Non-goals":

  > ## Beyond the request
  >
  > - [What the planner would add that the request does not need, with its cost and what happens without it. Left
  >   out unless the human takes it. Write "None" when there is nothing]

* In `process.md`, in the sentence that lists what `spec.md` states, add the section: "context, requirements,
  decisions with rationale, non-goals, and what the planner left out as beyond the request"

Afterwards `npm test` and `npm run check-changes` pass. Specs written before this unit have no such section and
are left as they are.

Left out, in the unit's own terms, as beyond the request:

* A check, in `check-changes` or in the reviewer's instructions, that a spec has the section. Without it a planner
  can still leave the section out, which the human sees when approving
* Moving the two open drafts, 0017 and 0018, to the new template. They were written before it

## Log

- 2026-10-03T11:53:53Z [human] asked whether `process.md` should say something about premature optimisation, now
  that it had happened in planning as well as in implementation, feared that "ask the human when unsure" would
  mean a request for input on everything, and asked for a task once the alternative was laid out
- 2026-10-03T11:53:53Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: three wording edits,
  whose text is in the description so that approving the unit approves the wording. The rule goes mainly in
  `roles/planner.md`, since it is about writing a spec; `process.md` already has its counterpart for code, "Build
  what the spec asks for and nothing more". Numbered 0019 because 0015, 0017 and 0018 are on branches of their own.
  It reaches other projects with the release that holds it
- 2026-10-03T20:20:19Z [human] asked for the unit to be implemented, in the words "Implement 0019 as the
  @implementer", which approves it as written. Nothing more explicit was said, and the instruction reached the
  implementer through the session that dispatched it
- 2026-10-03T20:20:25Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  in-progress. Before that, merged `master` into the branch, which was 29 commits behind it, as 0007 did: 0017, 0018
  and 0020 are implemented and merged there, so the two drafts the description leaves out are no longer open, and
  are still not moved to the new template. Checked after the merge that the three places the description names
  exist: the bullet on non-goals in `roles/planner.md`, the section "Non-goals" in `templates/changes/spec.md`, and
  the sentence in `process.md` that lists what `spec.md` states
- 2026-10-03T20:20:39Z [Claude Code, anthropic/claude-opus-5-5] made the three edits as implementer, with the wording
  the description gives and its line breaks, no line over 120 characters: the bullet in `roles/planner.md` after the
  one on non-goals, the section "Beyond the request" in `templates/changes/spec.md` after "Non-goals", and the
  sentence in `process.md`, rewrapped. On `d78389a`, on the host: `npm test` exited 0 with 178 passing and 0 failing
  or skipped, `npm run check-changes` exited 0 and printed nothing, and `git diff --check master...HEAD` reported
  nothing. Only this record changes after that commit. Not checked: that a planner following the new bullet writes
  the section, since no test reads the wording; and the copy under `node_modules/@ritenoar/agentrite/`, which is
  release 2.2.1 and gets the wording with the release that holds it. `check-changes` runs from that installed copy.
  The status stays in-progress until the review and the human's decision
- 2026-10-03T22:34:45Z [OpenCode, openai/gpt-6.1-sol] took the reviewer role and performed a full review of
  0019-beyond-the-request at commit `a7720f5cd04e7031ae16ed97f39e2b30c27a4da3`, against merge base
  `5c4cad9ae701c12f981e570b4cf0ba0d8c2733a0`. Findings saved in
  `.reviews/0019-beyond-the-request/2026-10-03T22-33-29Z-opencode-full.md`. Returned no finding labels.
  Independently ran `npm test` (178 passed, none failed or skipped), `npm run check-changes`, and
  `git diff --check master...HEAD`; all exited 0. Read-only assertions verified approved wording, placement,
  preserved task description, diff scope and 120-character wrapping. Not verified: future planner compliance with
  the prose, publication or downstream adoption, and the human-only conversations represented in the log.
- 2026-10-03T22:37:23Z [human] said that no review remarks came back and asked for the unit to be marked implemented
- 2026-10-03T22:37:23Z [Claude Code, anthropic/claude-opus-5-5] set the status to implemented: the task has no plan, the
  work its description lists is done, and the review returned no findings, so there was none for the human to decide

## Amendments
