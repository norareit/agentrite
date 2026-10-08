---
kind: feature
status: in-progress
timestamp: 2026-10-08T17:40:00Z
---

# 0038 `--no-sandbox` replaces `agentrite-roles`

## Log

- 2026-10-08T10:54:55Z [human] in an earlier session of Claude Code on the host, while unit 0037 was specified, was
  told that `agentrite-roles` and `agentrite roles` do unrelated things under nearly the same name, and that the
  first is nearly redundant since `init` and `refresh`. Proposed to move it into `agentrite init --roles-only` and
  `agentrite refresh --roles-only`. Was answered that `--no-sandbox` fits the case better, and that the choice is
  between removing `agentrite-roles` with that option on both commands, and removing it with no option at all. In
  this session, gave that exchange to the specifier and decided: "I agree with that last part. Make it a
  --no-sandbox !"
- 2026-10-08T10:54:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `3f61b74`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made the
  unit as a feature, since it takes decisions on what two commands leave out and on what becomes of a published
  name. Numbered 0038: the plain directories run from 0001 to 0037 and then hold 0042, the `history-` directories do
  not count, and the number continues after the last of the consecutive run, as the human said for 0037. Wrote
  `spec.md`. Read for it `scripts/agentrite.mjs`, `scripts/agentrite-roles.mjs`, the pointer package under
  `pointers/agentrite-roles/`, the parts of `README.md` on installing and updating, and the spec of unit 0037.
  Searched the repository for `agentrite-roles`. Found by that: the usage text of `init` and `refresh` is the usage
  text of `agentrite-roles` with the name replaced, and `scripts/agentrite.mjs` and `scripts/agentrite-run.mjs`
  import the wrappers from the file of the old command, so that file's logic stays whatever becomes of the command.
  Ran no command of the kit and no suite. The human decided the removal and the option on both commands. The rest in
  the spec is the specifier's and was not the human's in those words:
    * that the pointer package is kept, reworded and given a higher version, and that publishing it is the human's
    * that `init --no-sandbox` runs without a `name` in `package.json` and does not read `package-lock.json`
    * that no line is printed for a file that is left out
    * that the option is accepted at any place and counts once when repeated
    * that there is no release that warns first, and that the release that carries the unit is a major one
    * that nothing of unit 0037 is changed here, though its requirement 5 lists `agentrite-roles`
  Status left at `draft`
- 2026-10-08T16:45:17Z [human] approved the spec as it stands on `master` at `8be0136`
- 2026-10-08T16:45:17Z [Claude Code, anthropic/claude-sonnet-5-5] in the main session on the Linux host, on `master`
  at `8be0136`, set the status to `approved`
- 2026-10-08T16:48:43Z [Claude Code, anthropic/claude-sonnet-5-5] as the planner, in a session on the Linux host, cut
  the branch `feature-0038-no-sandbox-replaces-agentrite-roles` from `master` at `1916d7e`. Read `process.md`,
  `roles/planner.md`, `spec.md` and `record.md`, and wrote `plan.md` against the tree. Units 0037 and 0039 are
  implemented on `master`, so the spec's remark that 0037 is a draft is out of date and requirement 11 falls in the
  documents as they are. Re-checked every file that names `agentrite-roles`: `README.md` (the "What is here" row, the
  `agentrite-roles` section of "Commands", one line of "Installing it into a project"), `CONTRIBUTING.md` (the row of
  `pointers/`), `package.json` and `package-lock.json` (the root `bin`; the entry of the installed release 4.2.0 in the
  lock is not this repository's and stays), `scripts/agentrite-roles.mjs`, `scripts/agentrite.mjs` and
  `scripts/agentrite-run.mjs` (imports), `pointers/agentrite-roles/`, and `tests/`. `AGENTS.md`, `SANDBOX.md`,
  `RELEASING.md`, `CHANGELOG.md`, `templates/` and `container/` do not name it. Decided in the plan, the spec leaving it
  open: the module `scripts/agentrite-roles.mjs` keeps its name and loses only what made it a command; the parsing of
  the harnesses moves into `scripts/agentrite.mjs`; the pointer goes to version 2.0.0. Found no contradiction in the
  spec. Wrote no code and ran no suite. Status set to `planned`
- 2026-10-08T17:05:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in the main session on the Linux
  host, on the branch `feature-0038-no-sandbox-replaces-agentrite-roles` at `99e441d`. Read `process.md`,
  `roles/implementer.md`, `spec.md`, `plan.md` and `record.md`. Ran `npm test` before any change: 403 tests, all
  passing. Status set to `in-progress`
- 2026-10-08T17:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built the unit in the commits
  `98c18ee` (tests, failing: 21 of 411), `ae97275` (code), `79d79f4` (pointer) and one for the documents. Followed the
  plan in order. Departures, both small: `tests/agentrite-run.test.mjs` holds the usage of every command and changed
  to the new `init` and `refresh` lines, which the plan listed as unchanged (the plan's Files entry is corrected); and
  the `pointers/` row of `CONTRIBUTING.md` already names the two names without calling the second a command, so it is
  left as it is. `parseHarnesses` is not exported from `scripts/agentrite.mjs`; its cases are tested through
  `parseArgs`. Verified on the tree after the last code and document commit: `npm test` reports 411 tests, 411 pass,
  0 fail; `npm run check-changes` exits 0 (run before this entry was committed). In a scratch project,
  `agentrite init --no-sandbox claude` wrote the four wrappers, `AGENTS.md` and `CLAUDE.md`, changed `package.json`,
  and printed nothing for the three files of the sandbox; `refresh claude --no-sandbox` printed four `up to date`
  lines. An `npm pack` of the tree installed into a scratch project has only `agentrite` in `node_modules/.bin`. Ran
  `agentrite` with no argument, `bad`, `init`, `roles x`, `run`, `refresh --no-sandbox` and
  `init --no-sandbox=1 claude`: none prints `agentrite-roles`. Not checked: publishing the pointer, the review, and
  the run of `agentrite run` with a stale wrapper. Status left at `in-progress`, for the review
- 2026-10-08T19:06:09Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0038 at commit
  `5bfeca830f4dbb09330987f909cd4a494f9fdf9c`, a full review against merge base
  `1916d7ee2d527963299327734d5b3bf8c5fe4247`. Returned S1, P1 and C1; the complete findings are in
  `.reviews/0038-no-sandbox-replaces-agentrite-roles/2026-10-08T190609Z-full-review.md`. Ran the host suite,
  the committed change check, the suite in a fresh unit-style clone, and packed-install command checks. Did not
  verify publication of the registry pointer, an actual Docker run or real harness sessions
- 2026-10-08T19:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, read the review in
  `.reviews/0038-no-sandbox-replaces-agentrite-roles/2026-10-08T190609Z-full-review.md` and checked each finding
  against the tree. All three hold, and I agree with all three. Outcomes:
    * S1 (blocking), applied: the pointer's message and README printed `claude | opencode` as a command, which a shell
      reads as a pipe. They now give `npx agentrite init claude opencode` and `npx agentrite refresh claude opencode`
      and say in prose to name only the harnesses the project uses. The pointer tests check the two commands and that
      neither the message nor the README holds a `|`
    * C1 (blocking), applied: the test that ran `git show master:...` is replaced by explicit expectations for the
      `agentrite` pointer, which is version 1.0.0 and prints its message as published (R4). No test names `master`
      now. Verified in a fresh clone made as `container/unit-clone.sh` makes it (`--branch` the unit branch, no local
      `master`): `npm test` reports 411 tests, 411 pass, 0 fail
    * P1 (not blocking), applied: R3 is added to the pointers-and-module test task of `plan.md`, which says the wrapper
      fixtures stay and verify it; the task's description of the `agentrite` pointer test is brought to what the test
      does. The plan is not frozen
  `npm test` on the host reports 411 tests, 411 pass, 0 fail on the tree after the fixes. Status left at
  `in-progress`: it is the human's to decide the findings before `implemented`

## Amendments
