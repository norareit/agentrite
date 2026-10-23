---
kind: feature
status: in-progress
timestamp: 2026-10-23T14:24:42Z
---

# 0080 The followed output of a run is kept

## Log

- 2026-10-23T14:24:42Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `9a53305`, on the human's request to take item 2 of "Beyond the request" of 0075, the followed output of
  each step kept in the run's directory, for a graphical interface of its own project that shows a step live, the
  second of three units with 0079 and 0081. The human chose the run's directory over a temporary directory, and left
  removing runs to a later unit. Made the unit as a feature. Numbered 0080: the highest number in `changes/` is 0079.
  Read the spec of 0075, "How a run ends" and "What .orchestrator holds" of `README.md`, and how `runStep` reads what a
  harness prints and `followPrinter` prints it. Wrote `spec.md`. The status is `draft`
- 2026-10-23T15:25:27Z [human] approved the spec, without item 1 of "Beyond the request", which may be built later
  if it turns out to be missed. The status is `approved`
- 2026-10-23T15:58:50Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  the unit's branch at `9456141`, with the human's notes that the file is the exception requirement 6 names to the
  sentence of unit 0079 that every file of a run's directory is written whole, that it is appended to directly and not
  through the run's write, and that `instantOf` gives the instant of requirement 5. Read `orchestrateCommand`,
  `runStep`, `runGrouped`, `followPrinter`, `callLabel` and the command's tests. Wrote `plan.md`: the stamping of an
  item's time moved out of the printer first, so that the terminal and the file take one instant, the line of an item
  in `scripts/agentrite-orchestrate.mjs`, and the file, made empty before the harness starts and cut back after a
  failed append, in `scripts/agentrite.mjs`. The status is `approved`
- 2026-10-23T16:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on the unit's
  branch at `8a46637`. The status is `in-progress`
- 2026-10-23T16:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built every task of `plan.md`
  in the five commits it names, and ticked them. Two additions the plan did not name: the existing test of a step
  that fails to give an outcome filters the followed files out of the names it checks for a `01-` file, since the
  followed file of step 1 now stands there; and a followed file of a step is also checked in the test of a step past
  its limit. `npm test` reported 1087 passed and 0 failed on `f6aeebb`, and `npm run check-changes` passed. Not
  checked: a unit run in the sandbox, and a failed write of the file in a run of the command, which only the unit
  tests of `followedFile` cover. The first commit carries a `Co-Authored-By` trailer that the standards forbid, added
  in error from the harness's attribution reminder, and is not rewritten, as `AGENTS.md` forbids that without the
  human's ask. The status stays `in-progress`, for the review
