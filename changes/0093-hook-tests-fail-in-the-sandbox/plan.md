# 0093 The tests of the commit-msg hook fail in the sandbox

## Approach

A new module of the suite, `tests/git-environment.mjs`, exports `withoutGitEnvironmentConfiguration(environment)`: a
pure function that returns a copy of the environment it is given without `GIT_CONFIG_COUNT` and without every
`GIT_CONFIG_KEY_<n>` and `GIT_CONFIG_VALUE_<n>`, `<n>` being one or more digits. It removes nothing else, so
`GIT_CONFIG_NOSYSTEM`, `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_PARAMETERS` stay as they are, and it leaves its argument
unchanged.

Every place in the four test files that starts `agentrite init` or `agentrite refresh` passes
`env: withoutGitEnvironmentConfiguration(process.env)` to `spawnSync`. These are the places that start a process
which asks git where the hooks are: the `run` of `project` in `tests/agentrite-init.test.mjs` and in
`tests/agentrite-refresh.test.mjs`, through which every other helper of those files starts the command, the two
tests of those files that start the command through a `node_modules/.bin` link, the `init` of `repository` in
`tests/commit-msg-hook.test.mjs`, and the `refresh` of `setUp` in `tests/sandbox-update.test.mjs`. The other
processes the four files start ask git nothing of the hooks, or are given an environment of their own already that
holds none of the entries: the `git` helpers, which set `core.hooksPath` in the repository's own configuration or
make the repository, the test that runs a stand-in `sandbox.sh` printing its arguments, the `git` of
`tests/commit-msg-hook.test.mjs` and the `sandbox` of `tests/sandbox-update.test.mjs`. They are left as they are.

The regression test, `tests/sandbox-git-environment.test.mjs`, runs the four files with `node --test` as a child
process, with the test runner's environment to which the five entries of `container/compose.yml` are added, read
with `environmentEntry` of `tests/compose-entries.mjs` so that the test follows the compose file. It asserts status
0, and gives the child's output as the message of a failure. It removes `NODE_TEST_CONTEXT` from the child's
environment: node sets it, to `child-v8`, in every test file it runs, and a `node --test` that inherits it reports
to a parent runner that is not there instead of running as a runner of its own. On the host, before the fix, it
fails with the same 19 tests as the sandbox, which was checked while planning by running the four files with the
five entries set. The four files take about five seconds on the host.

The kit's commands and `container/compose.yml` are not changed, and no document is: no command, file at the root or
behavior a developer meets in the sandbox changes.

## Files

- `tests/sandbox-git-environment.test.mjs`: new. The regression test
- `tests/git-environment.mjs`: new. `withoutGitEnvironmentConfiguration(environment)`
- `tests/git-environment.test.mjs`: new. Its unit tests
- `tests/agentrite-init.test.mjs`: the `run` of `project`, and the test of the `node_modules/.bin` link
- `tests/agentrite-refresh.test.mjs`: the `run` of `project`, and the test of the `node_modules/.bin` link
- `tests/commit-msg-hook.test.mjs`: the `init` of `repository`
- `tests/sandbox-update.test.mjs`: the `refresh` of `setUp`

## Tasks

- [x] Write `tests/sandbox-git-environment.test.mjs`. One test, named for what it shows: that the tests which start
  `init` and `refresh` pass with git's environment configuration of the sandbox. It spawns `process.execPath` with
  `--test` and the paths of `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`,
  `tests/commit-msg-hook.test.mjs` and `tests/sandbox-update.test.mjs`, resolved from `import.meta.dirname`, with
  `cwd` the repository root and an environment that is a copy of `process.env` without `NODE_TEST_CONTEXT` and
  with `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0`, `GIT_CONFIG_VALUE_0`, `GIT_CONFIG_KEY_1` and `GIT_CONFIG_VALUE_1` set
  to their values of `environmentEntry`. Comment why `NODE_TEST_CONTEXT` is removed. Assert status 0 with the
  child's standard output and error as the message. Run it on the host and see it fail, with 19 failing tests in the
  child's output (R4)
- [x] Write `tests/git-environment.test.mjs` against the function below, before it. An environment of
  `GIT_CONFIG_COUNT: '2'`, `GIT_CONFIG_KEY_0`, `GIT_CONFIG_VALUE_0`, `GIT_CONFIG_KEY_1`, `GIT_CONFIG_VALUE_1`,
  `GIT_CONFIG_KEY_12`, `GIT_CONFIG_VALUE_12`, `GIT_CONFIG_NOSYSTEM: '1'`, `GIT_CONFIG_GLOBAL`,
  `GIT_CONFIG_PARAMETERS`, `HOME` and `PATH` gives an object deep equal to the last five alone. An environment
  without any of the entries gives one deep equal to it. The argument is deep equal, after the call, to a copy made
  before it, and the result is not the same object as the argument (R3)
- [x] Write `tests/git-environment.mjs`: `withoutGitEnvironmentConfiguration(environment)` returns
  `Object.fromEntries` of the entries of the argument whose name does not match
  `/^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/`. A comment says what the entries are and that the sandbox sets them
  in `container/compose.yml`, where they point git at the image's hooks. Run its tests (R3)
- [x] Pass `env: withoutGitEnvironmentConfiguration(process.env)` to the `spawnSync` of the `run` of `project` and
  of the test `the command runs through a node_modules bin symlink the way npx does` in
  `tests/agentrite-init.test.mjs`; of the `run` of `project` and of the test
  `refresh runs through a node_modules bin symlink the way npx does` in `tests/agentrite-refresh.test.mjs`; of the
  `init` of `repository` in `tests/commit-msg-hook.test.mjs`; and of the `refresh` of `setUp` in
  `tests/sandbox-update.test.mjs`. Import the function in each file. Run the regression test, which passes (R1, R3,
  R4)
- [x] Search the four files for every other `spawnSync`, `execFileSync` and `execSync`, and confirm each is one of
  those the approach leaves as they are. A process that asks git where the hooks are, and is not listed there, gets
  the same environment, and the approach of this plan is corrected in `record.md` (R3)
- [x] Run `npm test` on the host, which passes, with the number of skipped tests that it reports on `master` (R2)
- [x] Check every changed file for the line limit of 120 characters
- [x] Commit: `bugfix-0093 Start init and refresh in the tests without git's environment configuration`

## Verification

- [ ] `npm test` passes on the host, with no test skipped that ran before this unit (R2)
- [ ] `./sandbox-dev.sh --in-place npm test` passes, with none of the tests of `tests/agentrite-init.test.mjs`,
  `tests/agentrite-refresh.test.mjs`, `tests/commit-msg-hook.test.mjs` and `tests/sandbox-update.test.mjs` failing
  (R1)
- [ ] `npm run check-changes` passes

## Commit Points

- [ ] `bugfix-0093 Start init and refresh in the tests without git's environment configuration`, after the
  regression test, the function, its tests and the four files
