---
kind: bug
status: in-progress
timestamp: 2026-10-12T15:10:00Z
---

# 0046 The test of a relative `XDG_DATA_HOME` fails on macOS

## Log

- 2026-10-12T13:00:17Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `8c5f0da`, on the human's request for a bug unit for the one test that fails on this host, and
  their question whether it is a leftover of the releases 4.0.0 or 6.0.0. Made the unit as a bug. Numbered 0046:
  the plain directories run from 0001 to 0045. `origin` was fetched and holds no unit past 0044.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: the failing test and the helper it uses, and the part of the wrapper that makes and mounts the log
  directory.
  Reproduced, on macOS 15.1.1 with node 26.9.0 and bash 3.2.57: `npm test` on `master` reports 495 tests, 477
  passing, 17 skipped and 1 failing, which is this test, with `/private/var` where it expects `/var`. The same
  test, run alone in a worktree of the tag `v4.1.0`, fails in the same way, so it has failed on macOS since the
  release it came in. `git log -S` gives `2bbd5b3`, of unit 0035, as the commit that added it, and `v4.1.0` as the
  first tag that holds it.
  Shown for the root cause, with a shell started by node in a directory under the temporary directory: without
  `PWD`, and with a `PWD` that names another directory, `pwd` prints the path under `/private/var`, and with `PWD`
  set to the directory it prints the path under `/var`. node gives the temporary directory as a path under `/var`
  and its real path as one under `/private/var`.
  Wrote `spec.md`. Decided, each with its reason under "Decisions": the test changes and the wrapper does not, the
  test expects the path as the system names it and is given no `PWD`, and the proof is a run on macOS.
  Not checked: that the suite passes on a Linux host at `8c5f0da`, which is taken from the reviewer's entry in the
  record of unit 0045, why the seventeen skipped tests are skipped, and anything that needs Docker. The status is
  `draft`
- 2026-10-12T13:39:01Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the same session, on `master` at
  `6710873`, on the human's question what the seventeen skipped tests are, and their word that the skipped tests
  say that they are run in the sandbox. Looked into them: ten need bash 4 or newer, six need GNU `stat`, and one
  needs `script` of util-linux, each skipped on macOS since the unit that wrote it, 0010, 0007 and 0034, which
  `git log -S` on the three reasons gives. Ran `./sandbox.sh --in-place npm test` on the macOS host, with Docker
  Desktop 24.0.7 and the sandbox of release 6.0.0: 495 tests, 495 passing, none skipped, none failing, and the
  tree was left as it was. Added to `spec.md`: the three kinds in "Context", requirements 6 to 9, three
  decisions, of which that the tests stay skipped and say where they run is the human's, and two items under
  "Beyond the request", the `--connect` test on macOS and a line at the end of the run. The non-goal that said
  the skipped tests were not looked into is replaced. No requirement was renumbered. The status stays `draft`
- 2026-10-12T13:57:01Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the same session, on `master` at
  `e00d8a4`, on the human's word that the first item of "Beyond the request" is in the unit, with a helper, so
  that the next test of this kind written on a Linux host passes on macOS too. Took "the first" for the first
  item as `spec.md` listed them, the temporary directory resolved once for every test, which is the one that
  named a helper. It left "Beyond the request" and is requirement 10, and "Fix" now gives the helper as the
  repair. Added requirement 11 as the specifier's decision: a test that fails when a file of the suite makes a
  temporary directory itself, since the helper repairs only a test that uses it. Counted for requirement 10:
  sixteen places in fourteen files make a directory under the temporary directory, and no file of the suite
  makes one in another way. The `--connect` test on macOS and the line at the end of the run stay under
  "Beyond the request". No requirement was renumbered. The status stays `draft`
- 2026-10-12T13:59:58Z [human] approved the spec. The status is `approved`
- 2026-10-12T14:02:48Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the macOS host, on the
  human's word. Cut `bugfix-0046-relative-xdg-data-home-test-fails-on-macos` from `master` at `16131d5`, and
  read the role file and `process.md` as installed under `node_modules/agentrite`, release 6.0.0, and `spec.md`
  and this record in full. Read on the tree: the sixteen places that make a temporary directory, which are all
  the same two lines, a `mkdtempSync` under `tmpdir()` and a `t.after` that removes it; the three places that
  skip for what the host lacks; `tests/wrapper-fixture.mjs` and `tests/entrypoint-function.mjs`, the modules the
  suite already shares; the lines of `container/sandbox.sh` that make the log directory; and "The kit's own
  tests" of `CONTRIBUTING.md`. No test of the suite reads what `CONTRIBUTING.md` says.
  Wrote `plan.md`. The unit gets a plan although it is a bug: it is three pieces of work in more than a couple
  of steps. Decided in it, as how and not as what: the unit is implemented on the macOS host, in a role run
  and not in a unit run of the sandbox, because requirements 5 and 9 ask for what macOS printed, and the Linux
  run is made from there with `./sandbox.sh --in-place npm test`; the names the guard looks for are exported by
  the helper, so the guard's own file needs no exception; the helper's test points `TMPDIR` at a symbolic
  link, so it fails on Linux too while the helper does not resolve; requirement 2 is shown by breaking the
  wrapper in the working tree twice and putting it back.
  One thing the spec leaves to the proof and the plan does not add to: no test holds on a Linux host that the
  three places make their reason with the helper, since none of them is skipped there. Requirement 9 gives the
  run on macOS as the proof, and the helper's text is unit tested.
  Checked on the host before writing: node gives the value of `TMPDIR` set in the process at the next call of
  `tmpdir()`. Not run: any task of the plan. The status is `planned`
- 2026-10-12T15:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a session on the macOS host
  (macOS, node 26.9.0, bash 3.2, Docker), on branch `bugfix-0046-relative-xdg-data-home-test-fails-on-macos`, from
  `b0ada2f`. The status is `in-progress`: no review has run, so it is not `implemented`. Read the role file,
  `process.md`, `spec.md`, `plan.md` and this record in full before beginning. Done in the order of the plan, with
  commits `9d1c474` (helper, guard, fourteen files) and two after it, for the reasons and `CONTRIBUTING.md`.
  Before: the one test, run alone, failed with `/private/var/...` where `/var/...` was expected, in the two log
  `--volume` arguments. `node --test --test-reporter=tap tests/*.test.mjs` reported 495 tests, 477 passing, 17
  skipped, 1 failing. The names of the seventeen `# SKIP` lines were kept.
  Tests first: `tests/temporary-directory.test.mjs` failed with the module not found, and with the helper present
  the guard failed naming exactly the fourteen files of the plan. `tests/skip-reason.test.mjs` failed with the
  module not found, then passed. After the fourteen files moved to the helper, `grep -rnE "mkdtemp|tmpdir" tests`
  names `tests/temporary-directory.mjs` alone.
  No assertion of `tests/sandbox-wrapper.test.mjs` changed: its diff against `master` is the imports and the two
  lines of the directory.
  R1: the one test by name, `node --test --test-name-pattern="relative XDG_DATA_HOME"
  tests/sandbox-wrapper.test.mjs`, reported 1 test, 1 passing, 0 failing.
  R2 and R4: with line 589 of `container/sandbox.sh` taken out the test failed; with that line back and
  `/agentrite/` of line 587 made `/agentrite-other/` it failed again, the mounted source being
  `.../data/agentrite-other/project/.claude/projects`. `git checkout container/sandbox.sh` put it back, and
  `git diff master -- container/`
  printed nothing. Not recorded: the exact text of the first failure beyond that it failed.
  R5, R7, R9 on macOS at the final tree: `npm test` reported 500 tests, 483 passing, 17 skipped, 0 failing; the
  tap report's seventeen `# SKIP` names are the same as before (compared with `diff` after sorting). The tests are
  495 and five more: four of the helper and its guard, one of `skipReason`. The reasons as printed, one of each
  kind, each ending
  in `The whole suite runs in the sandbox: ./sandbox.sh --in-place npm test`:

  * `needs bash 4 or newer for ${var,,}, found bash 3.`
  * `needs GNU stat, the guard runs in the Linux container.`
  * `script of util-linux, which runs the wrapper on a terminal, is not on the PATH of the suite.`

  R3, R7, R9 on Linux: `./sandbox.sh --in-place npm test` on the final tree exited 0 and reported 500 tests, 500
  passing, 0 skipped, 0 failing.
  Not checked: that a Linux host without the sandbox passes, other than through the sandbox run above, and the
  formatting of the new files with a formatter, since the repository has none configured. Lines of the changed
  files are within 120 characters (checked with `awk` over `tests/*.mjs` and `CONTRIBUTING.md`).

## Amendments
