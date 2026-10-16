---
kind: feature
status: implemented
timestamp: 2026-10-16T12:51:32Z
---

# 0055 A release moves this repository, with its installed kit

## Log

- 2026-10-16T12:51:32Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `2b93c0b`, which is the release 7.1.0 and the head of `origin/master`. The session had made that
  release and stopped its step 6, and found on the way that `npx agentrite` runs the working tree here. The human
  asked for that finding and a step 6 that carries out exact update instructions in one unit. Made it a feature:
  widening step 6 is new behavior, not the repair of a fault, and the finding is its context. Numbered 0055: the
  highest number in `changes/` is 0054.
  Took the role from the role file and `process.md` of release 7.0.0, installed. Reproduced the finding before
  writing it: with 7.0.0 installed, `npx agentrite roles`, `node node_modules/agentrite/scripts/agentrite.mjs
  roles` and `node_modules/.bin/agentrite roles` were compared on the implementer's description, and
  `npm exec -c 'command -v agentrite'` was run, with npm 11.19.1; the spec's "Context" gives what each printed.
  Read `RELEASING.md`, the release skill, "Commands" and the table of `CONTRIBUTING.md`, this repository's
  `CLAUDE.md`, and the tests that name `RELEASING.md`. Found `npx agentrite` in this repository's own documents in
  step 6 of `RELEASING.md` alone.
  Wrote `spec.md`. It decides, without asking the human: the script's name `kit`, the closed list of what is an
  exact instruction, that this repository's prose stops listing the kit's instruction files, and that the move to
  7.1.0 is step 6 run alone after this unit. Approving the unit approves them. The status is `draft`
- 2026-10-16T12:56:11Z [human] approved the spec. The status is `approved`
- 2026-10-16T12:57:29Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the macOS host, cut
  `feature-0055-a-release-moves-this-repository-with-its-installed-kit` from `master` at `70831ec`, with 7.0.0
  installed. Took the role from the role file and `process.md` of 7.0.0. Read `spec.md`, `RELEASING.md`,
  `CONTRIBUTING.md`, `CLAUDE.md`, `opencode.json`, `package.json`, `tests/release.test.mjs`, the release skill, and
  "Worth knowing when you update" of 7.0.0 and 7.1.0 in `CHANGELOG.md`. Wrote no plan: the spec leaves open what
  the text of step 6 has to say, in two places, and the unit goes back to the specifier and the human. The status
  stays `approved`.
  First, an instruction that repeats one of the five commands. Both sections that asked for more open with a block
  that holds `npm install --save-dev agentrite@latest` and `npx agentrite refresh`, and 7.0.0's holds
  `./sandbox.sh --in-place --rebuild true` too. Each is a command word for word, so requirement 6 has step 6 carry
  it out after the five. Carried out as written, the install moves the devDependency from `7.1.0` to `^7.1.0`, and
  the reading of the tree then stops the step, since `package.json` differs by more than the version. The spec
  does not say whether such an instruction is carried out, counts as done by the five, or stops the step.
  Second, the context says that what 7.1.0 asks besides the five commands is exact: `init` and the line of
  `CLAUDE.md`. Its section asks two more things of a project. A unit whose status is `planned` at the update is to
  have `status: planned` changed to `status: approved`: that is a change to a line, which is not on the closed list
  of requirement 6, and whether it holds here is settled by the units in `changes/`, not by `agentrite.json`. And an
  `AGENTS.md` that names no `standards.md` is to take what the project wants of the sections `init` prints, which
  leaves a choice; this repository's `AGENTS.md` names no `standards.md`. Under requirements 6 and 7 as written,
  step 6 for 7.1.0 stops on both, so the run the decisions name as the first use of the widened step does not
  carry 7.1.0 through. The spec does not say whether that is intended, or whether an instruction whose condition
  does not hold here, as no unit is `planned` at the time, is one that "asks a project to do something"
- 2026-10-16T13:02:18Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the unit's branch at `2c4c777`, on
  what the planner logged above. Checked it against "Worth knowing when you update" of 7.0.0 and 7.1.0: both
  questions are as the planner says, and the spec's "Context" had left out two of 7.1.0's instructions. The human
  chose to fold the edit of this repository's `AGENTS.md` into this unit. Corrected `spec.md`: requirement 7 takes
  an instruction that installs the kit, runs `refresh`, starts the sandbox or asks for the commit as done by step 6;
  requirement 8 has an instruction whose condition does not hold here ask nothing, settled by `agentrite.json` or by
  the tracked files on `master`; requirement 13 brings this repository's `AGENTS.md` to 7.1.0's wording, so that
  7.1.0's instruction on `AGENTS.md` does not hold here; requirement 11 records the instructions taken as done and
  those that do not hold. The requirements after 6 are renumbered. "Context" gives all of what 7.1.0 asks, and
  three decisions give the reasons. The correction waits for the human's approval before the planner starts again.
  The status stays `approved`
- 2026-10-16T13:04:40Z [human] approved the corrected spec. The status is `approved`
- 2026-10-16T13:05:29Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the unit's branch at `1645b49`,
  with 7.0.0 installed. Read the corrected `spec.md`, 7.1.0's `templates/project/AGENTS.md` at the tag `v7.1.0`,
  this repository's `AGENTS.md`, and `tests/package-documents.test.mjs`, which pins the scripts of `package.json`.
  Wrote `plan.md`: the script `kit` with a test of its text first, then step 6 of `RELEASING.md`, then the text of
  `CLAUDE.md`, `CONTRIBUTING.md` and `AGENTS.md`, in three commits. Every task names its requirements, and every
  requirement from 1 to 13 has a task. The plan has step 6 also remove the files an instruction's command printed
  as written when it puts the repository back, since `git restore .` leaves an untracked file, and checks the
  widened step against the 7.1.0 section as a dry run. The status is `planned`
- 2026-10-16T13:07:48Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the macOS host,
  on the unit's branch at `aed05a1`, with 7.0.0 installed. Took the role from the role file and `process.md` of
  7.0.0. Read `spec.md`, `plan.md` and this record. The status is `in-progress`
- 2026-10-16T13:12:45Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, committed `npm run kit` at
  `edcad3b`: the test of the script failed before the script was added, and `npm test` passed after it, 565 tests
  passing and 17 skipped on macOS. Added a task to `plan.md` before step 6's text was written: step 6 says to run
  the five commands "and nothing else that changes a file", which forbids the instructions the step now carries out,
  so that sentence makes room for them. Reading step 6 against the 7.1.0 section of `CHANGELOG.md` showed that the
  section gives the install, `refresh` and `init` in one block of commands, and that the plan's dry run settles them
  one at a time; step 6 says that a block of several commands is taken one command at a time
- 2026-10-16T13:20:26Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran "Verification" of
  `plan.md` on `07625c4`, the last implementation commit, with 7.0.0 installed. `npm test` passed: 565 tests pass,
  17 are skipped on macOS, none fail. `npm run check-changes` exited 0. `npm run --silent kit -- roles` printed
  what `node node_modules/agentrite/scripts/agentrite.mjs roles` printed, the implementer as "Builds a planned
  change unit", and `npx agentrite roles` printed the working tree's, "Builds an approved change unit".
  `awk 'length > 120'` over `RELEASING.md`, `CONTRIBUTING.md`, `AGENTS.md` and `CLAUDE.md` printed nothing. `grep
  -n 'npx agentrite'` over the first three shows `npx agentrite-roles` in step 5 and sentences that say what
  `npx agentrite` runs here, none that tells a reader to run it. `git diff master --stat` names no path in `files`
  of `package.json`, and not `README.md`. Read step 6 against the 7.1.0 section of `CHANGELOG.md` without running
  it: the install, `refresh` and the commit are taken as done by the step; `npx agentrite init` is exact and runs
  as `npm run kit -- init`; the line `@node_modules/agentrite/standards.md` is exact, between two lines `CLAUDE.md`
  holds; the instruction on `planned` units does not hold, as no `record.md` says `status: planned` once this unit
  is implemented; the instruction on `AGENTS.md` does not hold, as `AGENTS.md` names `standards.md`; the last two
  bullets ask nothing. That `init` here writes only what `opencode.json` is said to gain was not checked, as the
  dry run ran nothing. Every task of `plan.md` is ticked. The status stays `in-progress` until the review
- 2026-10-16T13:29:41Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0055 at
  `3c0a3fe399f1b5d96240ec5f88a2d9bd176d166a`, against merge base `70831ec7fe5d3bf6a7f56019f538769af9fa6c99`.
  Returned no findings on spec conformance, plan fidelity or code quality. `npm test` passed: 565 passed, 17
  skipped on macOS, none failed; the complete run followed an initial tool timeout. `npm run check-changes` exited
  0. Verified the installed command's output and argument forwarding, the document line limits, and the 7.1.0 dry
  run. The installed `standards.md` could not be read because 7.0.0 lacks it, as the spec's decision records;
  read the rules in the installed `process.md`. The platform-specific tests and the actual move to 7.1.0,
  including `init` in this repository and the Docker rebuild/start, were not verified. Complete findings are in
  `.reviews/0055-a-release-moves-this-repository-with-its-installed-kit/20261016T132834Z-opencode.md`
- 2026-10-16T13:32:25Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's word that the
  review returned no findings. No finding is left to decide, and every task of `plan.md` is ticked. The status is
  `implemented`

## Amendments
