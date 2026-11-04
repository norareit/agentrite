---
kind: feature
status: in-progress
timestamp: 2026-11-04T11:55:47Z
---

# 0095 A project uses the sandbox alone

## Log

- 2026-11-04T11:55:47Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `b776739`, on the
  human's request that a project can have the sandbox, with its run on a clone of a branch that is brought back,
  without the change process, the roles or the orchestrator, and on the human's decisions recorded in the spec: a new
  required key, no key made optional, the file kept as `./sandbox.sh`, a branch name run or cut from the default
  branch, no hook on the host or in the sandbox, and nothing of the process written. Numbered 0095: the highest
  number in `changes/`, on every branch, is 0094. Read `container/sandbox.sh`, `container/unit-clone.sh`,
  `container/compose.yml`, `scripts/agentrite-settings.mjs`, `init`, `config` and `refresh` in
  `scripts/agentrite.mjs`, the project templates, and the sections of `README.md` and `SANDBOX.md` on them. Wrote
  `spec.md`. The status is `draft`
- 2026-11-04T12:05:50Z [Claude Code, anthropic/claude-opus-5-5] on the human's decision, renamed the option of `init`
  from `--no-process` to `--sandbox-only`, and recorded the decision in the spec. The key stays `process`. The status
  is `draft`
- 2026-11-04T12:11:59Z [Claude Code, anthropic/claude-opus-5-5] on the human's decision that this unit is built after
  units 0093 and 0094, rewrote the requirements on the documents against the documents 0094 leaves, as requirements
  26 to 31, with one line of the README in the map of the documents, which the human decided, and added requirements
  32 to 34 on the tests, from the plan of 0093 at `ab7a8e5`. The context and the decisions say so. The status is
  `draft`
- 2026-11-04T12:43:39Z [Claude Code, anthropic/claude-opus-5-5] on the human's decisions: the specifier's choices are
  accepted, the hooks directory of the image without a hook, a shim that passes no mode running as today, the mode
  taken from the shim alone, and a branch cut for any name that is no branch; `BTR1` to `BTR4` are declined; the spec
  is not reviewed by the spec-reviewer. The status is `draft`
- 2026-11-04T12:44:17Z [human] approved the spec. The status is `approved`
- 2026-11-04T14:27:13Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut
  `feature-0095-a-project-uses-the-sandbox-alone` from `master` at `1c69134`, after units 0093 and 0094 were
  implemented, and wrote `plan.md`. The shim passes the mode as the wrapper's first argument, `--sandbox-only`, before
  the project root, which the spec left to the plan. The status is `approved`
- 2026-11-04T14:30:51Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on
  `feature-0095-a-project-uses-the-sandbox-alone` at `904cb06`. The status is `in-progress`
- 2026-11-04T14:35:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the key `process` and its
  tests. The test of the CLI for `process` and `sandbox` both `false` is in `tests/agentrite-run.test.mjs`, beside the
  other tests that start `agentrite roles`. `settingsToWrite` writes `process` as `true` until `--sandbox-only` is added
  under "`init`, `refresh` and the shim". `npm test` reports 1366 tests, 1365 passing and 1 failing: unit 0054's R24
  test in `tests/repository-own-files.test.mjs`, which holds the root `agentrite.json` byte for byte against the
  template of the installed release 8.2.0, which has no `process`. R4 has the root file hold it, so the test fails until
  the project depends on a release that has the key, as it did in unit 0058. The status is `in-progress`
- 2026-11-04T14:38:43Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, moved the hooks directory into the
  wrapper as `SANDBOX_GIT_HOOKS_PATH`, with the empty directory `/usr/local/lib/agentrite/no-hooks` in the image. The
  assertion that the wrapper's sandbox-only value is that directory is added with the mode, under "The wrapper", since
  the wrapper names no sandbox-only value before it reads the mode. The Docker test of a sandbox-only commit runs the
  base image with an empty directory mounted at `/usr/local/lib/agentrite/no-hooks`; the last stage of the Dockerfile,
  which makes that directory, was not built. `npm test` reports 1369 tests, 1368 passing and the one failing test of
  `tests/repository-own-files.test.mjs` logged above. The status is `in-progress`
- 2026-11-04T14:45:22Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave the wrapper the sandbox-only
  mode, with its tests in the new `tests/sandbox-only.test.mjs`. Added to the plan, under "Files" and the tasks of the
  wrapper: `find_branch` and `say_no_default_branch` in `container/unit-clone.sh`, since the exact lookup is made for a
  run and for `--connect` and the plan has the message of a missing default branch shared, and the test of the
  sandbox-only hooks directory moved from the part before. The message of a `--connect` name that is no branch is
  written where the branch of the mode is found, which differs by mode, and not set with the other texts. The test that
  no refusal says `unit` is made by the helper every refusal of the file goes through. `npm test` reports 1401 tests,
  1400 passing and the one failing test of `tests/repository-own-files.test.mjs` logged above. The status is
  `in-progress`
- 2026-11-04T14:52:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave `init` the option
  `--sandbox-only` and had `init` and `refresh` write nothing of the process in a sandbox-only project, with their tests
  and the new `tests/sandbox-only-setup.test.mjs`. The shim's comment line on `--sandbox-only` is a second placeholder,
  `{{mode_comment}}`, alone on its line, which an empty value removes, so that the shim of a project with the process is
  the shim of today byte for byte, as R12 has it; a comment line in the template itself would have changed that shim
  too. `tests/sandbox-update.test.mjs` compares no shim with the template, so it needed no change;
  `tests/agentrite-refresh.test.mjs` did, and `tests/agentrite-run.test.mjs` for the usage of `init`, both added to
  "Files". `tests/agentrite-run.test.mjs` is added to the files the regression test of unit 0093 runs, as R33 has it,
  and that test passes. The end-to-end test runs the shim on the fake host of `tests/wrapper-fixture.mjs`, and no
  container. `npm test` reports 1418 tests, 1417 passing and the one failing test of
  `tests/repository-own-files.test.mjs` logged above. The status is `in-progress`
- 2026-11-04T14:59:54Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, described the sandbox-only setup in
  `COMMANDS.md`, `SETUP.md`, `SANDBOX.md` and one line of the map of `README.md`. The table at the top of `COMMANDS.md`
  gets a row for each of the two forms that are new, `BRANCH` and `--connect BRANCH`, and not a second row for
  `--in-place` and `--workdir`, whose forms are the same in both kinds of project and already have one: R27 has a row
  for each form, and the test of unit 0094 holds the rows against the forms of the first block of each section, so both
  new forms are in that block of "sandbox.sh". The plan's four rows are read so. The refusals of a name git takes for no
  branch, of a missing default branch and of a `--connect` name that is no branch name why and not what to do, so they
  are an entry of "When something goes wrong" in `SANDBOX.md`, as `AGENTS.md` has it, and the refusal of `--variant`,
  which names both, is not described there. The unit adds no file or directory at the root of the repository and changes
  the package by none, so neither "What is here" nor the table of `CONTRIBUTING.md` changes (R31). `npm test` reports
  1418 tests, 1417 passing and the one failing test of `tests/repository-own-files.test.mjs` logged above. The status is
  `in-progress`
- 2026-11-04T15:00:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the verification on `fe8c305`,
  the final tree of the implementation. `npm test` reports 1418 tests, 1417 passing, none skipped, the tests with Docker
  among them, and 1 failing: unit 0054's R24 test in `tests/repository-own-files.test.mjs`, for the `process` of the
  root `agentrite.json` that the installed 8.2.0 template lacks, as logged above. The first box of "Verification" stays
  open for it, and the human decides it. `node --test tests/sandbox-git-environment.test.mjs` passes, `npm run
  check-changes` exits 0, every changed line apart from Markdown table rows is within 120 characters, and each of R1 to
  R34 is named by a task and each task names a requirement. Not checked: a build of the kit's real image, so the last
  stage of the Dockerfile that makes `/usr/local/lib/agentrite/no-hooks` was not run, and a run of `./sandbox.sh` in a
  real container in a sandbox-only project. The unit is handed over for review at `in-progress`. The status is
  `in-progress`
