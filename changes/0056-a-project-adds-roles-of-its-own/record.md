---
kind: feature
status: in-progress
timestamp: 2026-10-19T16:00:00Z
---

# 0056 A project adds roles of its own

## Log

- 2026-10-18T17:01:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `d3e594e`, on the human's request to work out how a project adds roles of its own, after units 0052
  and 0054. Made the unit as a feature. Numbered 0056: the highest number in `changes/` is 0055. The session took
  the role on itself, from `roles/specifier.md` of the working tree, which differs from that of the installed
  release 7.1.0 only in the front matter and in naming the project's standards in the place of the kit's
  `standards.md`, as unit 0054 changed it. Read besides: the specs of units 0052 and 0054 and the record of 0054,
  `scripts/agentrite-roles.mjs`, `scripts/agentrite-settings.mjs`, the role handling of `scripts/agentrite-run.mjs`
  and of `refresh` and `run` in `scripts/agentrite.mjs`, `process.md`, `roles/reviewer.md`, and "How it works",
  "agentrite roles", "Running a role", "The project's settings" and "Replacing a role or the standards" of
  `README.md`. In the conversation the human decided that an extra role has no place in the process that the kit
  records in this unit, that its findings do not block `implemented`, and that it is added on top of the process,
  running just before or after one of the four roles. Wrote `spec.md`. Of what the conversation left to decide, the
  spec decides: an extra role sets no status, the form of a role's name, the order of the listings, that `refresh`
  removes the kit's wrappers of a role that is gone, and that `process.md` does not change. The status is `draft`
- 2026-10-19T14:31:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question whether
  the reviewer should not take every role into account. The specifier agreed that its reason to leave it out did
  not hold, since every role writes its entries in `record.md` and the reviewer can see there which extra roles
  worked on the unit, and proposed reading only those; the human agreed. Changed `spec.md`: added requirement 10, by
  which `roles/reviewer.md` reads the file of each extra role that has an entry in the unit's `record.md`, and
  renumbered the requirements after it. Requirement 13 says that an extra role writes at least one entry each time
  it works on the unit. Added a decision with the reasoning, and removed the non-goal on the reviewer and its entry
  under "Beyond the request". The status is `draft`
- 2026-10-19T14:32:27Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision to take
  both entries of "Beyond the request" into the unit. Read the agents of each harness from its documentation, at
  `https://code.claude.com/docs/en/sub-agents` and `https://opencode.ai/docs/agents/`, which give more than the
  spec named before, and found that Claude Code takes digits in a name as well. Changed `spec.md`: requirement 3
  refuses a role named as an agent of either harness, without regard to case, and gives the names; requirement 7
  gives each role's `path` in `agentrite roles --json`; requirement 12 has the README say both. Added a decision
  for each, corrected the reason of the decision on the form of a name, and left "Beyond the request" with none.
  The status is `draft`
- 2026-10-19T14:34:29Z [human] approved the spec. The status is `approved`
- 2026-10-19T15:41:05Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the unit's branch at `170527e`, from
  `roles/planner.md` of the installed release. Wrote `plan.md` against the tree of the branch, on which
  `npm test` reported 653 tests, 653 passing. The default branch has moved on with unit 0057, which touches none of
  the files the plan names. The plan is in five steps and five commits: the settings, everything that follows them,
  the removal of a stale wrapper by `refresh`, the kit's reviewer, and the README. Each requirement has a task,
  R11 a check that `process.md` is unchanged. The status is `approved`
- 2026-10-19T16:00:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on the unit's
  branch at `4e1cc24`, from `roles/implementer.md` of the installed release. Read `spec.md`, `plan.md` and this
  record in full. The status is `in-progress`
- 2026-10-19T17:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built the five steps of the plan
  in five commits, `047b877` to the README commit that follows `d4f88a2`, and ticked every box of `plan.md`. Changed
  `spec.md` and `process.md` in none (`git diff 170527e -- process.md` is empty). Tests of step 3 and step 4 were
  written before their code, but the shell was unavailable for a stretch and the red run of those new tests was not
  observed, so that they failed before the code is not verified. Not checked: `README.md` links were not run through
  a link checker. Where a Prettier run reformatted code the unit does not touch, those hunks were taken out again.
  `npm test` reported 679 tests, 679 passing, and `npm run check-changes` passed, both on the final tree. No line of a
  file the unit changes is over 120 characters, and none holds an em dash. The status stays `in-progress`, for the
  review
