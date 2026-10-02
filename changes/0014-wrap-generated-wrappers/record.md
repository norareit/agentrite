---
kind: feature
status: in-progress
timestamp: 2026-10-02T14:15:25Z
---

# 0014 Role wrappers that keep to 120 characters a line

## Log

- 2026-10-02T14:15:25Z [human] decided, on finding C1 of the review of 0012, that no tracked file is to hold a line
  over 120 characters whatever wrote it, had the six wrappers of this repository wrapped by hand in 0012, and asked
  for a unit that makes the generator write them that way
- 2026-10-02T14:15:25Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: it needs decisions on the YAML form, the width and what happens to the hand-wrapped
  wrappers. Tried the folded form in both harnesses before writing, as the spec's decisions record, with OpenCode
  1.18.34 and Claude Code 2.1.287 on the host; the sandbox pins 1.18.30 and 2.1.266, which were not tried. Counted
  the lines over 120 characters in tracked files on the 0012 branch at 8030272: six in the three fixtures, five in
  `package-lock.json`, one in the frozen plan of 0002 and 41 in five historical records. Written on a branch from
  `master` at 5f0705d, which holds neither 0012 nor 0013; the plan says to start once 0012 is merged. Left out, and
  the human's to add if wanted: rewrapping the historical records, and a check that fails on any long line
- 2026-10-02T14:19:55Z [human] merged 0012 into `master` and asked for this unit to be implemented first, rebased on
  `master`, which is its approval as written
- 2026-10-02T14:19:55Z [Claude Code, anthropic/claude-opus-5-5] rebased the branch onto `master` at 8030272, took the
  implementer role and moved the status to `in-progress`

## Amendments
