# 0093 The tests of the commit-msg hook fail in the sandbox

## Context

Unit 0078 made git in the sandbox run the image's commit-msg hook: `container/compose.yml` sets two entries of
git's environment configuration, `safe.directory` and `core.hooksPath`, the second set to
`/usr/local/lib/agentrite/hooks`, through `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_<n>` and `GIT_CONFIG_VALUE_<n>`. The
environment stands above every configuration file, so in the container every git command, and every process started
from it, finds its hooks there.

`npm test` passes on the host and fails in the sandbox. The implementer of unit 0092 found this while running the
suite in the sandbox, and found the same failures on `e27280f`, before that unit.

## Observed behavior

`./sandbox-dev.sh --in-place npm test` reports 19 failing tests, all of `tests/agentrite-init.test.mjs`,
`tests/agentrite-refresh.test.mjs`, `tests/commit-msg-hook.test.mjs` and `tests/sandbox-update.test.mjs` that
write, judge or use the kit's commit-msg hook. `init` writes no `.git/hooks/commit-msg`, so a test that reads it
fails with `ENOENT`, and `refresh` says that `/usr/local/lib/agentrite/hooks/commit-msg is not the kit's commit-msg
hook` and leaves it as it is.

## Expected behavior

The suite passes in the sandbox as it does on the host, and each of those tests checks in the sandbox what it
checks on the host: the hook in the repository or the hooks directory that the test sets up.

## Steps to reproduce

1. On the host, in this repository, run `./sandbox-dev.sh --in-place npm test`
2. See the 19 tests above fail, and the rest pass or be skipped

## Root cause

The failing tests start `agentrite init`, `agentrite refresh` or the dev shim as child processes that inherit the
test runner's environment, and in the sandbox that environment holds the two entries of `container/compose.yml`.
`init` and `refresh` ask git where the repository's hooks are, git answers with `core.hooksPath` from the
environment, and they write or judge the image's hook in `/usr/local/lib/agentrite/hooks` instead of the one in the
test's repository. Where a test gives git an environment of its own, as `tests/commit-msg-hook.test.mjs` does, only
its own git commands are spared, and the `init` it starts is not. This is read from the messages of the failing
runs and from the code: no test was changed to confirm it.

## Fix

The tests that start processes which ask git where the hooks are give them an environment without git's
environment configuration: no `GIT_CONFIG_COUNT`, and none of `GIT_CONFIG_KEY_<n>` and `GIT_CONFIG_VALUE_<n>`. The
kit's commands and `container/compose.yml` are not changed.

## Requirements

1. `./sandbox-dev.sh --in-place npm test` passes, with none of the tests above failing
2. `npm test` passes on the host, with no test skipped that ran before this unit
3. Every test of `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`,
   `tests/commit-msg-hook.test.mjs` and `tests/sandbox-update.test.mjs` that starts a process which asks git where
   the hooks are gives that process an environment that holds none of `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_<n>` and
   `GIT_CONFIG_VALUE_<n>`, whatever the environment of the test runner holds
4. A regression test shows, on the host, that those tests pass when the test runner's environment holds the two
   entries that `container/compose.yml` sets, as it does in the sandbox

## Decisions

* **The kind is bug.** The suite is meant to pass in the sandbox, which `CONTRIBUTING.md` has the developer run, and
  it does not
* **The tests are fixed, and the kit is not.** In the sandbox git does run the hooks of
  `/usr/local/lib/agentrite/hooks`, so `init` and `refresh` report the truth there. Making them ignore git's
  environment configuration was rejected: it would have them write a hook that git in that environment never runs,
  and the request was for the suite, not for a change of what the commands do
* **The environment is cleared of git's environment configuration rather than of `core.hooksPath` alone.** The
  entries are numbered, and a project may set its own `GIT_CONFIG_COUNT`, so no single key can be removed safely;
  without any of them the tests see git as on a host whose user sets none

## Non-goals

* Running `agentrite init` or `refresh` inside the sandbox on a real project, and where they write the hook there
* The 33 tests skipped in the sandbox
* `container/compose.yml` and the image's hook

## Beyond the request

1. A check of the suite, such as a test of the test files, that refuses a new test which starts the kit's commands
   with the inherited environment. It costs a test that reads the other test files and the rules of what it
   accepts. Without it a later test can fail in the sandbox the same way, which is seen in the next run there and
   fixed as this one is
