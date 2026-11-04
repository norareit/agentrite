---
kind: bug
status: in-progress
timestamp: 2026-11-03T15:56:34Z
---

# 0093 The tests of the commit-msg hook fail in the sandbox

## Log

- 2026-11-03T15:56:34Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `31bcf08`, on the human's request for a bug unit for the 19 tests that fail in the sandbox, found by
  the implementer of unit 0092. Numbered 0093: the highest number in `changes/`, on every local branch, is 0092.
  Read the messages of the failing runs of `./sandbox-dev.sh --in-place npm test` on `680bae1` and on `e27280f`,
  `container/compose.yml`'s environment for git, `container/hooks/commit-msg` and the setup of
  `tests/commit-msg-hook.test.mjs`. Wrote `spec.md`. The status is `draft`
- 2026-11-04T11:27:27Z [human] approved the spec. The status is `approved`
- 2026-11-04T12:09:33Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `bugfix-0093-hook-tests-fail-in-the-sandbox`, cut from `master` at `0549980`. Read the four test files' places
  that start processes, `tests/compose-entries.mjs` and `container/compose.yml`'s environment for git. Ran the four
  files on the host with the five entries of `container/compose.yml` set, and saw the same 19 tests fail as in the
  sandbox. Wrote `plan.md`: a pure function of the suite that removes git's environment configuration from a copy
  of the environment, passed to every start of `init` and `refresh` in the four files, and a regression test that
  runs the four files with the compose file's entries added. The status is `approved`
- 2026-11-04T12:16:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `bugfix-0093-hook-tests-fail-in-the-sandbox` at `ab895dd`, began the work. The status is `in-progress`
- 2026-11-04T12:19:32Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote
  `tests/sandbox-git-environment.test.mjs` first and ran it on the host: it failed, with 182 tests in the child
  run of the four files, 163 passing and the 19 of the spec failing. Wrote `tests/git-environment.test.mjs`, saw it
  fail for the missing module, then `tests/git-environment.mjs`, whose three tests pass. Passed the cleared
  environment to the six starts of `init` and `refresh` that the plan names, after which the regression test
  passes. Searched the four files and the helpers they call for every other `spawnSync`, `execFileSync` and
  `execSync`: each is one the plan leaves as it is, the `sh -c 'command -v git'` of
  `tests/commit-msg-hook.test.mjs` and the `git` of `tests/wrapper-fixture.mjs` among them, which ask git nothing
  of the hooks or have an environment of their own, so the approach stands. `npm test` on the host reported 1340
  tests, 1340 passing and 0 skipped, against 1336 passing and 0 skipped on `master` at `46ee34e`
- 2026-11-04T12:22:30Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran `./sandbox-dev.sh --in-place npm
  test` on `d225d18`: 1340 tests, 1306 passing, 33 skipped and 1 failing, none of them in the four files of the spec.
  The failing one, `a project with the wrappers, the sandbox and no agentrite.json gets one in the four steps` of
  `tests/settings-update.test.mjs`, starts `refresh` with the inherited environment and missed `wrote
  .git/hooks/commit-msg`, the same cause as the 19. It fails on the host too with the five entries of
  `container/compose.yml` set, and dates from unit 0078, so the spec's count of 19 in four files left it out. Clearing
  the environment of that start as well is the only reading of the spec under which R1 holds, as its Fix covers every
  test that starts such a process, so added it to `plan.md` as a task with a commit point and did it: added the file to
  those the regression test runs, saw the test fail on the host with that one test, then passed the cleared environment
  to the `command` of that file, after which it passes. The file's other starts, the `check-changes` script, the
  `sandbox.sh` and `git` with environments of their own, are left as they are
- 2026-11-04T12:24:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the suites on `80e1cc7`. `npm
  test` on the host reported 1340 tests, 1340 passing and 0 skipped (R2). `./sandbox-dev.sh --in-place npm test`
  reported 1340 tests, 1307 passing, 33 skipped and 0 failing (R1). `npm run check-changes` passed. Every task of
  `plan.md` is ticked. Handed over for review; the status is `in-progress`
- 2026-11-04T12:35:11Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of 0093 at `ea945bf`.
  Returned no findings on the three axes, saved in
  `.reviews/0093-hook-tests-fail-in-the-sandbox/2026-11-04T123511Z-opencode.md`. Independently ran `npm test`:
  1340 passing, 0 skipped; `./sandbox-dev.sh --in-place npm test`: 1307 passing, 33 skipped, 0 failing; and
  `npm run check-changes`, which passed. Historical test-first execution and task-box update timing could not be
  verified from the committed snapshots alone.
