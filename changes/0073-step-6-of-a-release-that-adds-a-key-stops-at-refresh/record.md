---
kind: bug
status: approved
timestamp: 2026-10-21T20:47:18Z
---

# 0073 Step 6 of a release that adds a key stops at refresh

## Log

- 2026-10-21T20:47:18Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `beb0347`, on the human's request after step 6 of the release of 8.0.0 stopped at `refresh`, as it stopped
  after 7.2.0. Made the unit as a bug. Numbered 0073: the highest number in `changes/` is 0072. Read step 6 of
  `RELEASING.md`, the decisions of unit 0055, which gave the step its five commands and the settling of the
  instructions, the record of task 0062, and "Updating a project to a newer kit" of `README.md`. The observed run is the
  one task 0072 records. Did not run the new order, which requirement 5 asks of the implementer. Wrote `spec.md`. The
  status is `draft`
- 2026-10-21T23:11:52Z [human] approved the spec. The status is `approved`
- 2026-10-21T23:19:26Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `bugfix-0073-step-6-of-a-release-that-adds-a-key-stops-at-refresh` from `master` at `12f7195` and wrote `plan.md`
  against it. The fix takes more than a couple of steps: the failure seen in a clone at `v8.0.0`, the reordering of
  step 6, and the dry run of the new order in that clone, each with what it printed logged. Case 1 of step 6 says
  the five commands and the commit "below" do what an instruction it takes as done asks; with the install now above
  the instructions, the plan rewords that to the commands of the step, each at its place, as requirement 2 gives.
  The status is `approved`

## Amendments
