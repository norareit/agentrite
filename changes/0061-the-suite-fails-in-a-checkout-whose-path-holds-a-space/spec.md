# 0061 The suite fails in a checkout whose path holds a space

## Context

The review of unit 0058, at `10f5bac` on `feature-0058-a-bell-from-the-sandbox`, returned a finding C1: the tests of
`tests/bell.test.mjs` fail when the checkout's path holds a space. The human decided that the finding is not fixed
in unit 0058, since the way those tests build their paths is the way the whole suite builds them, and that a unit of
its own fixes it for the suite.

## The bug

**Observed.** In a checkout whose path holds a space, `npm test` fails hundreds of tests, each because it opens or
runs a file of the repository at a path that does not exist.

**Expected.** `npm test` reports the same results in a checkout whose path holds a space as in one whose path does
not.

**Steps to reproduce.** Check out the repository at a path that holds a space, install its packages, and run
`npm test`.

**Root cause.** Eight files under `tests/` take the path of a file of the repository as the `pathname` of a file
URL, as `new URL('../container/sandbox.sh', import.meta.url).pathname`, and others build paths from what those give.
A file URL's `pathname` is percent-encoded, so a space in the checkout's path is `%20` in it, and the file at that
path does not exist. The specifier showed it on the human's Linux host on 2026-10-19, with two worktrees of `546f970`
of the branch of unit 0058, each with a copy of the checkout's `node_modules`, that differ only in the space in
their directory's name:

| Checkout's directory | Tests | Pass | Fail | Skipped |
|----------------------|-------|------|------|---------|
| `spacetree`          | 725   | 724  | 1    | 0       |
| `space tree`         | 719   | 482  | 237  | 0       |

The one failure in both is unit 0054's R24 test in `tests/repository-own-files.test.mjs`, which fails on that tree
anywhere. With the space, the failures are in 11 files, 101 of them in `tests/sandbox-unit-run.test.mjs` and 85 in
`tests/sandbox-wrapper.test.mjs`, and a file whose loading fails is counted as one test, which is why 6 fewer are
reported. Every error message that names a path names it with `space%20tree`.

Some of those tests also put such a path into a command of `sh` without quoting it, as `sh ${ringBell}` in
`tests/bell.test.mjs`, which would split the path at the space once it is decoded. Whether any test fails for that
alone was not established, since the encoded path makes it fail first.

The kit's own code, under `scripts/` and `container/`, takes no path from a URL's `pathname`; the bug is in the
suite alone.

**Fix.** Every path the suite takes from a file URL is taken with `fileURLToPath` of `node:url`, as
`tests/temporary-directory.test.mjs` already does, and every path the suite puts into a command of a shell is
quoted there, so that a space in it stays part of it.

## Requirements

1. `npm test` reports the same results, test for test, in a checkout whose path holds a space as in one whose path
   does not, on a host that runs the suite: the same tests pass, fail and are skipped in both
2. No file under `tests/` takes a file system path from the `pathname` of a URL
3. The suite holds a regression test that fails while a file under `tests/` takes a path from the `pathname` of a
   file URL, and so fails on the tree this unit is cut from

## Decisions

* **The regression test reads the suite's files, rather than running the suite from a path with a space.** Running
  the suite from inside itself, in a copy at such a path, would take as long as the suite, need a copy of
  `node_modules`, and run the Docker tests twice. A test that reads the text of the files under `tests/` and finds
  `.pathname` taken from a URL catches the cause that was shown, in milliseconds. It does not catch a path left
  unquoted in a shell command, which requirement 1 holds, checked as the steps to reproduce say
* **The fix is in the suite only.** The kit's own code takes no path from a URL's `pathname`, so there is nothing to
  change in it. A test of the kit's code from a path with a space is beyond the request
* **One unit for the whole suite, and not a fix of `tests/bell.test.mjs` in unit 0058.** The human decided it. A fix
  of one file would leave the suite with two ways of building a path, which `standards.md` counts as a finding, and
  would not make the suite pass from such a path

## Non-goals

* Paths that hold characters other than a space that a URL encodes, such as `%` or `#`. `fileURLToPath` decodes them
  as it decodes a space, so they are fixed with it, but nothing is checked for them
* Running the kit's commands from a project whose path holds a space
* Unit 0054's R24 test in `tests/repository-own-files.test.mjs`, which fails anywhere on the trees of unit 0058

## Beyond the request

* A test that runs the suite, or a part of it, from a copy at a path with a space. It would catch an unquoted path
  in a shell command, which the regression test of requirement 3 does not, at the cost of a copy of the repository
  and its packages and a run of the suite in each run of the suite. Without it, an unquoted path that a later unit
  adds fails only for a contributor whose checkout's path holds a space, who sees the failing test name the path
