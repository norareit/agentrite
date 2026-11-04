---
kind: feature
status: approved
timestamp: 2026-11-02T21:36:55Z
---

# 0091 One contract per harness

## Log

- 2026-11-02T21:36:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `40d502b`, on the
  human's request for a way to know every feature a harness must support before another harness is added, with the
  fix they chose: one module per harness implementing one contract, with a test that each harness implements all of
  it, and a checklist in `CONTRIBUTING.md` for what code cannot enforce. The human declined a script that runs the
  real harnesses, which is a non-goal. Numbered 0091: the highest number in `changes/`, on every branch, is 0090.
  Read `HARNESSES` of `scripts/agentrite-roles.mjs`, `STARTS` and `runUsage` of `scripts/agentrite-run.mjs`,
  `HEADLESS` of `scripts/agentrite-headless.mjs`, `scripts/agentrite-instructions.mjs`, the harness branches of
  `init` and `refresh` in `scripts/agentrite.mjs`, the spec of 0090, and searched the tree for `claude` and
  `opencode` for the places outside code. Wrote `spec.md`. The status is `draft`
- 2026-11-04T14:14:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `f271638`, on the
  human's request to bring the spec up to date with unit 0094, which split the README and added `diagrams/`. Searched
  `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `CONTRIBUTING.md` and `diagrams/` for
  `claude` and `opencode`, ignoring case: all five documents and the components diagram name the harnesses. The context
  names them, and the checklist of requirement 7 names the four documents beside `SANDBOX.md` and has an entry for the
  components diagram. The status is `draft`
- 2026-11-04T14:18:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's decision
  to take `BTR1`, which became requirement 10: the harness modules are in a directory of their own, and a test compares
  its files with the list of the harnesses. A decision says why the modules are found by their directory, and
  requirement 7 names the test of requirement 10 beside that of requirement 4. `BTR2` to `BTR4` are undecided. The
  status is `draft`
- 2026-11-04T14:21:30Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's
  decision to decline `BTR2`, `BTR3` and `BTR4`, which the spec now marks as declined. The status is `draft`
- 2026-11-04T14:21:30Z [human] approved the spec. The status is `approved`
- 2026-11-04T20:31:06Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut
  `feature-0091-one-contract-per-harness` from `master` at `c582ebe` and wrote `plan.md`. Unit 0090 is implemented,
  so requirement 9 holds and the plan makes the reading of refused calls a member of the contract. Requirement 5 is
  read as letting an existing test change the identifier through which it reaches what it imports, `HEADLESS.claude`
  becoming `claudeHarness.headless`, and three sandbox tests copy the scripts the wrapper's node now imports, since
  both are what the tests import and the tests cannot pass otherwise. The checklist gets entries beyond the spec's
  list for the session retention carried from the host, the default orchestrator and this repository's own sandbox
  compose file, which the search of requirement 8 found. The status is `approved`
- 2026-11-04T20:34:07Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on
  `feature-0091-one-contract-per-harness` at `89ff60a`. The status is `in-progress`
- 2026-11-04T20:45:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added a task to `plan.md`: the
  test "no file under scripts/ has a shebang but the commands the package has" of `tests/agentrite-roles.test.mjs`
  read every entry of `scripts/` as a file and failed with `EISDIR` on `scripts/harnesses/`, which requirement 10
  asks for, so it now reads the files of `scripts/` and its subdirectories, the harness modules among them. It is the
  one change to an existing test beyond its imports that requirement 5 leaves room for, since the test cannot pass
  otherwise; it still fails for a shebang planted in `scripts/harnesses/opencode.mjs`, which was undone. In the same
  reading as the planner's, `tests/agentrite-orchestrate.test.mjs` reaches the follower of a harness it names in a
  loop as `harnessNamed(harness).headless`, where it reached `HEADLESS[harness]`, and two lines of
  `tests/agentrite-outcome.test.mjs` are wrapped to 120 characters after `HEADLESS.claude` became
  `claudeHarness.headless`; the second box of "Verification" now names both. The status is `in-progress`
- 2026-11-04T20:45:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built the unit in
  `9bcd0a7` and `273e406`. `scripts/harnesses/claude.mjs` and `scripts/harnesses/opencode.mjs` each export one object
  with the sixteen members of `HARNESS_CONTRACT` in `scripts/agentrite-harness.mjs`, the reading of refused calls
  among them as `headless.refused` and `OPENCODE_REFUSAL` in the OpenCode module (R9). `init` writes or judges each
  harness's instruction file through `instructions.init`, and `refresh` through `instructions.refresh`. Verified on
  `273e406`: `npm test` reports 1447 tests, 1446 passing, none skipped, and 1 failing, unit 0054's R24 test in
  `tests/repository-own-files.test.mjs`, which fails on `89ff60a` as well and which the human decided to leave
  failing for unit 0090 until the next release; the first box of "Verification" is left open for the human to decide
  for this unit. The new test passes, and fails with `claude lacks start.command` for the module without that member
  and naming `extra.mjs` for a file planted in `scripts/harnesses/`, both undone. The three sandbox tests pass with
  the copied scripts, which are the whole import closure of `agentrite-settings.mjs` and
  `agentrite-cleanup-period.mjs` as computed from their imports. `npm pack --dry-run` lists the three new modules,
  `git diff --check master...HEAD` reports nothing, no added line but a row of a Markdown table is longer than 120
  characters, and `npm run check-changes` exits 0. Requirement 5 is held by the existing tests of `init`, `refresh`,
  `run` and the orchestrator, which pass unchanged in their assertions; no real Claude Code or OpenCode was run. The
  search of R3 in `scripts/*.mjs` outside `scripts/harnesses/` finds only the list in `scripts/agentrite-harness.mjs`,
  the usage of `agentrite run`, the writing of `CLAUDE.md` in `processFiles` and `readTemplates` with the comments on
  it, and `scripts/agentrite-cleanup-period.mjs`. The search of R8 lists 71 files. Each is accounted for by an entry
  of "Adding a harness" in `CONTRIBUTING.md`, or names a harness only as an example: `process.md` as the author of an
  example log entry, `RELEASING.md` with `opencode` as an example of a condition and Claude Code's `/release` skill of
  this repository's own `.claude/`, and the tests that use `claude` as an example harness in the settings they write,
  such as `tests/agentrite-approve.test.mjs`, `tests/check-changes.test.mjs`, `tests/agentrite-runs.test.mjs`,
  `tests/sandbox-only.test.mjs`, `tests/sandbox-only-setup.test.mjs`, `tests/sandbox-unit-run.test.mjs` and
  `tests/release.test.mjs`. The search found the tests of the bell's wiring, the allowlist comment, the status line,
  the sessions kept, the trailers and the pointer package beyond the plan's list, and the checklist's entry on the
  tests names them. The status is `in-progress`
- 2026-11-04T21:21:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's decision: unit
  0054's R24 test in `tests/repository-own-files.test.mjs` is left failing for this unit too, as a known issue until
  the next release. The first box of "Verification" now says so, and is ticked on the run on `273e406` logged above.
  Every box of `plan.md` is ticked. The status is `in-progress`
- 2026-11-04T22:40:54Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of 0091 at
  `e47241fe002184c8e152af9455a362e6282f2efe`, against merge base `c582ebe` with `master`, and returned C1. Saved
  the findings in `.reviews/0091-one-contract-per-harness/2026-11-04T224054Z-opencode.md`. Ran `npm test`:
  1447 tests, 1446 passing, one failing, none skipped; the failure is the root settings comparison already recorded
  as accepted for this unit. The change check, diff whitespace check and package dry run passed. No real harness
  was run; test-first timing and the implementer's temporary mutations could not be independently verified.
