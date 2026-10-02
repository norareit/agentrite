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
- 2026-10-02T14:20:46Z [Claude Code, anthropic/claude-opus-5-5] wrote the tests of `wrapWords`, wrapped the three
  fixtures, changed the OpenCode test to compare unfolded descriptions, and added the test on line length and
  unchanged text. `npm test` then failed on `tests/agentrite-roles.test.mjs` as a whole, the file importing a function
  that did not exist yet, so the tests were not seen failing one by one. Wrote `wrapWords` and the folded rendering in
  `scripts/agentrite-roles.mjs`; `npm test` passed, 150 of 150
- 2026-10-02T14:21:25Z [Claude Code, anthropic/claude-opus-5-5] added the test that no file `init` plans holds a line
  over 120 characters. It passed at once: the templates already keep to it, and the wrappers do since the commit
  before. Removed this repository's six wrappers and wrote them again with `node scripts/agentrite-roles.mjs claude
  opencode` from the working copy; they now break at 120 characters where the hand wrapping of 0012 broke at 118, and
  the three Claude ones equal the fixtures
- 2026-10-02T14:21:25Z [Claude Code, anthropic/claude-opus-5-5] checked the harnesses in this repository, on the host
  and not in a sandbox, which this repository does not have: with OpenCode 1.18.34, `opencode agent list` names
  `planner`, `implementer` and `reviewer` as subagents; with Claude Code 2.1.287, a new `claude -p` session returned
  the three descriptions, each equal to the kit's text in full. The versions the sandbox pins, OpenCode 1.18.30 and
  Claude Code 2.1.266, were not tried
- 2026-10-02T14:21:25Z [Claude Code, anthropic/claude-opus-5-5] verified on 4cf527d: `npm test` passed, 151 of 151; no
  line over 120 characters in the fixtures or in this repository's wrappers; `npm run check-changes` exited 0. In a
  scratch project with the packed working copy and `playwright` 1.59.1, `npx agentrite init claude opencode` exited 0
  and wrote six wrappers that are byte for byte this repository's, and none of the files it wrote holds a line over
  120 characters. Every box in `plan.md` is ticked. The status stays `in-progress` until the unit is reviewed and the
  human has decided what the review returns

## Amendments
