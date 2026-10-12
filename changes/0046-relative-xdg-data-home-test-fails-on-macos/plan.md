# 0046 The test of a relative `XDG_DATA_HOME` fails on macOS

## Approach

Written against `bugfix-0046-relative-xdg-data-home-test-fails-on-macos`, cut from `master` at `16131d5`. On that
tree, on the macOS host, `npm test` reports 495 tests, 477 passing, 17 skipped and 1 failing, and
`./sandbox.sh --in-place npm test` reports 495 passing, none skipped and none failing. Both were run at `6710873`,
and nothing but this unit's documents changed since.

The unit is implemented on the macOS host, on this branch, in a role run on the host and not in a unit run of the
sandbox. Requirements 5 and 9 ask for what a macOS host printed, which no run inside the sandbox can give. The
Linux run that requirements 3, 7 and 9 ask for is made from the same host with `./sandbox.sh --in-place npm test`,
which mounts the working tree as it is, so it runs the tests of this branch. It needs Docker on the host. No
install is run in the sandbox, so the `node_modules` the two share stays the host's.

Three pieces of work, in this order:

1. **The temporary directories.** A new module of the suite, `tests/temporary-directory.mjs`, exports
   `temporaryDirectory(t, prefix)`. It makes a directory under node's `tmpdir()` with `mkdtempSync` and the prefix,
   resolves it with `realpathSync`, registers its removal with `t.after`, with `{ recursive: true, force: true }`
   as every place does today, and returns the resolved path. The sixteen places, in fourteen files, are all the
   same two lines, a `mkdtempSync(join(tmpdir(), '<prefix>'))` and a `t.after` that removes it, so each becomes one
   call with the prefix it has. The failing test then passes with its assertions as they are, since `base` is
   already the path the wrapper reports.
2. **The guard.** The helper also exports the names that make a temporary directory, as one regular expression,
   `/\b(?:mkdtemp(?:Sync)?|tmpdir)\b/`. A test reads every `.mjs` file under `tests/`, at any depth, but for the
   helper, and fails for each that holds one of the names. The expression lives in the helper so that the helper
   is the one file of the suite that holds those names, and the test that looks for them needs no exception for
   itself. An import of one of the names fails the test too, which is what makes a file drop the imports it no
   longer uses.
3. **The reasons.** A second new module, `tests/skip-reason.mjs`, exports `skipReason(lacks)`, which returns
   `<lacks>. The whole suite runs in the sandbox: ./sandbox.sh --in-place npm test`. The three places that skip
   for what the host lacks give it the text they have today, unchanged, so the first part of each reason is what
   it says now.

The test of the helper that shows the resolving does not depend on the host: it points `TMPDIR` at a symbolic link
to a directory it made, and expects the new directory under the directory and not under the link. node reads
`TMPDIR` at each call of `tmpdir()`, and runs each test file in a process of its own, so the change stays in that
file, and the test puts the variable back when it ends. It fails on Linux too while the helper does not resolve.

Requirement 2 is shown by breaking the wrapper in the working tree and seeing the test fail, twice, and putting
the wrapper back. The tests copy `container/sandbox.sh` of the working tree, so they see the change.

Requirement 6 has no test that holds it for the three places on a Linux host, where none of them is skipped. The
helper's own text is unit tested, and the three reasons are shown as a macOS host prints them, which is the proof
requirement 9 gives for it.

## Files

- `tests/temporary-directory.mjs`: new, `temporaryDirectory` and the expression of the names
- `tests/temporary-directory.test.mjs`: new, the tests of the helper and the guard
- `tests/skip-reason.mjs`: new, `skipReason`
- `tests/skip-reason.test.mjs`: new, the test of its text
- The fourteen files that make a temporary directory, each with the helper in place of its own two lines and
  without the imports it then no longer uses: `tests/agentrite-config.test.mjs`, `tests/agentrite-init.test.mjs`,
  `tests/agentrite-refresh.test.mjs` (two places), `tests/agentrite-roles.test.mjs`,
  `tests/agentrite-run.test.mjs`, `tests/agentrite-settings.test.mjs`, `tests/check-changes.test.mjs` (two
  places), `tests/entrypoint-home-owner.test.mjs`, `tests/publish-check.test.mjs`, `tests/sandbox-dev.test.mjs`,
  `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs`, `tests/sandbox-wrapper.test.mjs`,
  `tests/settings-update.test.mjs`
- `tests/entrypoint-allowlist.test.mjs`, `tests/entrypoint-home-owner.test.mjs`,
  `tests/sandbox-unit-run.test.mjs`: the reason of each skip made with `skipReason`
- `CONTRIBUTING.md`: "The kit's own tests"
- `changes/0046-relative-xdg-data-home-test-fails-on-macos/record.md`: the log, the runs among it

Nothing under `container/` or `scripts/` is changed (R4), and `CHANGELOG.md` is not touched: a release writes it.
The table "What the repository holds besides the package" of `CONTRIBUTING.md` has a row for `tests/` and needs
no other.

## Tasks

- [ ] On the macOS host, on the tree as it is, show the fault and keep what the later tasks compare with. Run
  `node --test --test-name-pattern="relative XDG_DATA_HOME" tests/sandbox-wrapper.test.mjs`, which must fail with
  `/private/var` where `/var` is expected. Run `node --test --test-reporter=tap tests/*.test.mjs` and keep, in a
  scratch file outside the repository, the name of every line marked `# SKIP`, which must be seventeen. Log both
  (R1, R7)
- [ ] Add `tests/temporary-directory.test.mjs` with two tests, failing because the module is not there yet. The
  first: a directory from the helper, in it a directory `real` and a symbolic link `link` to it, `TMPDIR` set to
  the link and put back in `t.after`, then a second directory from the helper, whose parent must be `real` under
  the first directory, and whose name opens with the prefix given. The second: a subtest makes a directory with
  the helper and writes a file in it, the directory exists inside the subtest, and is gone once the subtest has
  ended (R10)
- [ ] Add `tests/temporary-directory.mjs` with `temporaryDirectory(t, prefix)` as "Approach" gives it, and a
  comment that says why the path is resolved. Both tests pass (R10)
- [ ] Add the guard to `tests/temporary-directory.test.mjs`, failing: it reads every `.mjs` file under `tests/`,
  at any depth, but for `tests/temporary-directory.mjs`, and fails when one holds a name the helper's expression
  matches. Its message names each such file, and names `temporaryDirectory` of `tests/temporary-directory.mjs` as
  what to use. On the tree as it is, it must fail and name the fourteen files of "Files" and no other (R11)
- [ ] In each of the fourteen files, replace the `mkdtempSync(join(tmpdir(), '<prefix>'))` and the `t.after` that
  removes it by `temporaryDirectory(t, '<prefix>')`, with the prefix it has, at all sixteen places. Take
  `mkdtempSync` and `tmpdir` out of the file's imports, and `rmSync` and `join` where nothing else in the file
  uses them. Change no assertion. The guard passes, and `grep -rnE "mkdtemp|tmpdir" tests --include="*.mjs"` names
  `tests/temporary-directory.mjs` alone (R10, R11)
- [ ] On the macOS host, run the test of the first task again: it passes, with its assertions unchanged, which
  `git diff master -- tests/sandbox-wrapper.test.mjs` shows (R1)
- [ ] Show requirement 2, on the macOS host, by breaking the wrapper in the working tree. With line 589 of
  `container/sandbox.sh`, `logs="$(cd "$logs" && pwd)"`, taken out, the test must fail, on a source that is not
  absolute. With that line back and `/agentrite/` in line 587 made `/agentrite-other/`, it must fail again, on
  another directory. Then `git checkout container/sandbox.sh`, and `git diff master -- container/` prints
  nothing. Log what the test printed each time (R2, R4)
- [ ] Add `tests/skip-reason.test.mjs`, failing because the module is not there yet: `skipReason('needs GNU stat')`
  is exactly `needs GNU stat. The whole suite runs in the sandbox: ./sandbox.sh --in-place npm test` (R6)
- [ ] Add `tests/skip-reason.mjs` with `skipReason(lacks)`. The test passes (R6)
- [ ] Make the three reasons with it, each with the text it has today as its argument, unchanged. In
  `tests/entrypoint-allowlist.test.mjs`, the `skip` of line 9. In `tests/entrypoint-home-owner.test.mjs`, one
  `skip` beside `offLinux`, which the six tests then take as `{ skip }` in place of the six ternaries. In
  `tests/sandbox-unit-run.test.mjs`, the argument of `t.skip` in the `--connect` test. The condition each skips on
  is left as it is. Bring the comment above each in line with what the reason now says (R6, R7)
- [ ] In "The kit's own tests" of `CONTRIBUTING.md`, after the two points on `npm test`, say: that on a host other
  than Linux the suite skips tests; which, by what they need, in three points, the reading of the allowlists that
  needs bash 4 or newer, the check of the home's owner that needs GNU `stat`, and the terminal of `--connect` that
  needs `script` of util-linux; that the reason each skipped test prints names the command; and that
  `./sandbox.sh --in-place npm test` runs the whole suite, in a code block. It says what there is and what to
  type, not why, and its lines fit 120 characters (R8)
- [ ] On the macOS host, run `npm test`: no test fails, and seventeen are skipped. Run the tap report of the first
  task again and compare the names of its `# SKIP` lines with the kept ones: the same seventeen. Log the counts,
  and the full reason of one test of each of the three kinds as printed (R1, R5, R7, R9)
- [ ] On the macOS host, run `./sandbox.sh --in-place npm test`: no test fails and none is skipped, and the number
  of tests is the one the host reported. Log what it reported (R3, R7, R9)
- [ ] Log in `record.md` what was run and what it printed, for each task that says "log", and remove the scratch
  file

## Verification

- [ ] `npm test` on the macOS host, on the final tree: no failing test, seventeen skipped
- [ ] `./sandbox.sh --in-place npm test` on the final tree: no failing test, none skipped
- [ ] `git diff master --stat -- container/ scripts/` prints nothing (R4)
- [ ] `npm run check-changes` and `node scripts/check-changes.mjs` pass on the committed branch
- [ ] Every line of the changed and new files is within 120 characters, and no changed text holds an em dash
- [ ] Each requirement of the spec is met by the tree and the record, read one by one

## Commit Points

- [x] `bugfix-0046 Plan the temporary directories and the skipped tests`: this plan and the record's entry, by the
  planner
- [ ] `bugfix-0046 Make the suite's temporary directories through one helper`: the helper, its tests, the guard
  and the fourteen files
- [ ] `bugfix-0046 Say in the reason of a skipped test where the suite runs`: `skipReason`, its test and the three
  files
- [ ] `bugfix-0046 Describe the skipped tests in CONTRIBUTING.md`
- [ ] `bugfix-0046 Record the runs on macOS and in the sandbox`: the record
