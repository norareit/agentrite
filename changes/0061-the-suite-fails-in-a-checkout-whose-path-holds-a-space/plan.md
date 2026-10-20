# 0061 The suite fails in a checkout whose path holds a space

## Approach

Written against `20ddd41` on `bugfix-0061-the-suite-fails-in-a-checkout-whose-path-holds-a-space`. Before the work,
`npm test` in this checkout, whose path holds no space, in an environment without Docker, reports 745 tests: 722
pass, 0 fail and 23 are skipped. Unit 0054's R24 test, which the spec names as failing anywhere on the trees of unit
0058, passes on this tree.

The planner tried the fix in a scratch worktree of `20ddd41` at a path that holds a space, with a copy of
`node_modules`, in the same environment, so that the plan names every place that fails rather than leaving the
implementer to find them:

* With every `new URL(..., import.meta.url).pathname` replaced by `fileURLToPath(new URL(..., import.meta.url))`,
  the suite reported 745 tests, 719 passing, 3 failing and 23 skipped. The 3 are the tests of
  `tests/bell.test.mjs` that put the path of `ring-bell.sh` into a command of `sh` unquoted, at its lines 52, 60
  and 68. This answers what the spec left open: an unquoted path fails a test on its own
* With a space added to the name of every temporary directory besides, the 3 bell tests quoted, and nothing else,
  3 tests failed: the test of the helper that the name starts with the prefix, which the chosen form below keeps
  passing; bell's R1 test at line 60, whose quoting was not yet right; and "the wrapper runs nothing of the
  clone's configuration and hooks on the host" in `tests/sandbox-unit-run.test.mjs`. That last one sets
  `core.fsmonitor` and `uploadpack.packObjectsHook` to a path under the temporary directory unquoted, and git runs
  both through a shell, so the trap it checks never fired. The fault is in the test, not in the kit
* With those two quoted as the tasks below say, `tests/bell.test.mjs` and `tests/sandbox-unit-run.test.mjs` passed
  in full

No test failed in the kit's own code, so the plan changes nothing under `scripts/` or `container/`. The 23 skipped
tests need Docker, so the run that decides R1 and R5 is the one on a host with Docker, at the end. Should a Docker
test fail there only for the space, the last task says what to do.

Nine files take a path from a URL's `pathname`, not the eight of the spec's root cause, which was counted on another
tree: `tests/bell.test.mjs`, `tests/entrypoint-function.mjs`, `tests/harness-versions.test.mjs`,
`tests/known-terminal.test.mjs`, `tests/release.test.mjs`, `tests/sandbox-dev.test.mjs`,
`tests/sandbox-project-dockerfile.test.mjs`, `tests/sandbox-unit-run.test.mjs` and `tests/sandbox-wrapper.test.mjs`.
The `resolved.pathname` of `tests/agentrite-instructions.test.mjs`, line 509, compares a URL with a URL and takes no
file system path, so it stays, and the regression test must not count it.

### Decided here, so that the implementer does not re-derive it

**What the regression test looks for (R2, R3).** A file of the suite fails it when its text matches
`/\)\s*\.pathname\b/`: `.pathname` read off the result of a call or a parenthesised expression, which is the form
`new URL(...).pathname` takes in all nine files. `resolved.pathname` does not match. The pattern's own source does
not match itself, since what follows its `)` is `\s*`, so the test file need not exclude itself; it is still
written so that no message of the test holds `).pathname`. A URL held in a variable and then read as
`variable.pathname` is not caught, as the spec's decision accepts of a test that reads text.

**Where the list of the suite's files lives.** `moduleFiles` and `testsDirectory` of
`tests/temporary-directory.test.mjs` list every `.mjs` file under `tests/`. The regression test needs the same list,
so it is written in a new module, `tests/suite-files.mjs`, which the regression test imports from its first task,
and `tests/temporary-directory.test.mjs` then imports it in place of its own copy. That second step is a
refactoring, and is committed on its own after the fix, so that the regression test stays the first task.

**The name of a temporary directory (R4).** The helper makes each directory as
``mkdtempSync(join(tmpdir(), `${prefix} `))``: the caller's prefix, one space, then the six characters `mkdtemp`
adds. The name still starts with the prefix, so the helper's present test keeps passing, and no caller changes. A
comment above the line says why the space is there: so that every test that runs the kit's code in a directory of
its own runs it from a path that holds a space.

**The quoting of the bell tests (R1).** `tests/bell.test.mjs` has `quoted(word)` already, at line 133. Lines 52 and
68 give `sh ${quoted(ringBell)}`. Line 60 nests the path two shells deep, so the path is not written into the text:
it is given to the outer shell as its `$0` and passed to the inner one in the same way,

```js
const command = `sh -c 'sh -c "exec setsid sh \\"\\$0\\" </dev/null >/dev/null 2>&1" "$0"; true' ${quoted(ringBell)}`;
```

which the planner ran green from a path with a space. The comment above it gains a sentence on why the path is an
argument. Line 196's `--volume ${bell}:...` is one element of an argument list that `quoted` joins, and needs
nothing.

**The quoting of the git trap (R5).** In "the wrapper runs nothing of the clone's configuration and hooks on the
host", the two `git config` lines of the agent's script set their value with single quotes inside the double, as
`git config core.fsmonitor "'$PWD/.git/fsmonitor.sh'"`, written in the JavaScript string as `"\'$PWD...\'"`. The
shell that git runs the value in then takes the path as one word. A comment says that git runs both values through a
shell.

## Files

- `tests/suite-files.mjs`: new, `testsDirectory` and `moduleFiles`, as `tests/temporary-directory.test.mjs` has them
- `tests/temporary-directory.test.mjs`: a new test that the name holds a space; imports the two in place of its own
- `tests/file-paths.test.mjs`: new, the regression test of R3
- `tests/bell.test.mjs`, `tests/entrypoint-function.mjs`, `tests/harness-versions.test.mjs`,
  `tests/known-terminal.test.mjs`, `tests/release.test.mjs`, `tests/sandbox-dev.test.mjs`,
  `tests/sandbox-project-dockerfile.test.mjs`, `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-wrapper.test.mjs`:
  `fileURLToPath` in place of `.pathname`
- `tests/bell.test.mjs`: the three commands of `sh` quoted
- `tests/temporary-directory.mjs`: the space in the name, and its comment
- `tests/sandbox-unit-run.test.mjs`: the two values of the git trap quoted

No document changes: nothing a reader of `README.md`, `SANDBOX.md` or `CONTRIBUTING.md` types or sees changes, and no
file or directory at the root of the repository is added.

## Tasks

### The paths of the checkout

- [x] Add `tests/suite-files.mjs`, exporting `testsDirectory` and `moduleFiles` as
  `tests/temporary-directory.test.mjs` defines them, with the comment that they list every module of the suite.
  Add `tests/file-paths.test.mjs` with one test: every file `moduleFiles(testsDirectory)` lists whose text
  matches the pattern of "What the regression test looks for" is an offender, and the test asserts there are none,
  naming the offenders by their path from the root of the repository and saying to take the path with
  `fileURLToPath` of `node:url`, since a URL's `pathname` is percent-encoded and fails in a checkout whose path holds
  a space. Run it and see it fail, naming the nine files (R2, R3)
- [x] In each of the nine files, replace `new URL(<path>, import.meta.url).pathname` with
  `fileURLToPath(new URL(<path>, import.meta.url))`, and import `fileURLToPath` from `node:url`, into the import of
  `node:url` the file has already where it has one, as `tests/bell.test.mjs` does for `pathToFileURL`. Run the
  regression test green (R2, R3)
- [x] In `tests/bell.test.mjs`, quote the path of `ring-bell.sh` in the commands at lines 52, 60 and 68 as "The
  quoting of the bell tests" says (R1)

### The temporary directories

- [x] In `tests/temporary-directory.test.mjs`, add a test that a directory the helper makes holds a space in its
  name, the part after the last `/`. Run it and see it fail (R4)
- [x] In `tests/temporary-directory.mjs`, make the name as "The name of a temporary directory" says, with its
  comment. Run the helper's tests green (R4)
- [x] In `tests/sandbox-unit-run.test.mjs`, quote the two values of the git trap as "The quoting of the git trap"
  says. Run `node --test tests/sandbox-unit-run.test.mjs` green (R5)

### The list of the suite's files

- [x] In `tests/temporary-directory.test.mjs`, import `testsDirectory` and `moduleFiles` from
  `tests/suite-files.mjs` and remove its own copies, with no change of behavior. Run
  `node --test tests/temporary-directory.test.mjs` green (R3)

## Verification

- [x] `npm test` in this checkout passes with the results of before the work, plus the tests of R3 and R4
- [x] `npm test` in a checkout at a path with a space, made with `git worktree add` and a copy of `node_modules`,
  reports the same results test for test as in this checkout (R1, R5)
- [ ] The two runs above, done again on the human's Linux host with Docker, so that the 23 Docker tests run. Should a
  test fail there only from the path with the space, fix it: in the test when the fault is in the test, and in the
  kit's code under `scripts/` or `container/` when it is there, which `record.md` then names, with a regression test
  in the suite for a fault of the kit's. Commit the fix on its own, after the commits below, and run both again (R1,
  R5)
- [ ] `npm run check-changes` passes after the last commit

## Commit Points

- [x] `bugfix-0061 Take the suite's paths with fileURLToPath and quote those given to a shell`, after the tasks of
  "The paths of the checkout"
- [x] `bugfix-0061 Make every temporary directory of the suite with a space in its name`, after the tasks of "The
  temporary directories"
- [x] `bugfix-0061 List the suite's files for the test of the temporary directories from the shared module`, after
  the task of "The list of the suite's files"
