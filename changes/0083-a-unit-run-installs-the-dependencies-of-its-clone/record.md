---
kind: feature
status: implemented
timestamp: 2026-10-23T22:37:29Z
---

# 0083 A unit run installs the dependencies of its clone

## Log

- 2026-10-23T22:37:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `dd7d669`, on the human's request that a unit run no longer needs `npm ci` typed before each command,
  and the human's choice that the sandbox installs a new clone itself, over a `node_modules` kept in a volume or a
  clone kept between runs. Made the unit as a feature. Numbered 0083: the highest number in `changes/` is 0082. Read
  "Running a unit", "Getting the work back", "Where things are kept on the host" and "When something goes wrong" of
  `SANDBOX.md`, "sandbox.sh" of `README.md`, and how `container/sandbox.sh`, `container/unit-clone.sh` and
  `container/entrypoint.sh` make the clone and start the command. Wrote `spec.md`. The status is `draft`
- 2026-10-23T22:44:30Z [human] approved the spec. The status is `approved`
- 2026-10-23T22:52:22Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `feature-0083-a-unit-run-installs-the-dependencies-of-its-clone` at `cf4f3bc`, wrote `plan.md`. Read as the only
  readings that work: "Exit statuses" of `README.md` changes with "sandbox.sh", since `AGENTS.md` has every status of
  a command follow that section and its bullet on `./sandbox.sh` would otherwise not name the install's; and the
  bullet of "Commit messages" of `SANDBOX.md` on a clone before `npm ci` stays, since it tells the reader to run
  nothing and holds of a resumed clone. The status stays `approved`
- 2026-10-23T22:53:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `feature-0083-a-unit-run-installs-the-dependencies-of-its-clone` at `14990d9`, began the work. The host has no
  Docker, so the tests of real containers are skipped in every run of the suite here. The status is `in-progress`
- 2026-10-23T22:55:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added `clone_is_new` and
  `default_command` as the first task gives them. `npm test` passed with 1187 tests, 30 skipped for want of Docker
- 2026-10-23T22:57:00Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added
  `tests/install-dependencies.test.mjs`, whose five tests failed with no script, then wrote
  `container/install-dependencies.sh` and its `COPY` and `chmod`, and the five passed. Added a task to the plan: the
  `RUN chmod` with the script beside the others is longer than 120 characters, so it continues on a second line, and
  the test of `tests/known-terminal.test.mjs` read the first line alone. Both tests now read the paths with the new
  `tests/dockerfile-executables.mjs`, and those of `tests/known-terminal.test.mjs` pass
- 2026-10-23T23:00:30Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the tests of the install
  to `tests/sandbox-unit-run.test.mjs`. Before the wrapper changed, the five that expect the install failed and the
  five that expect none passed. Added the install to `container/sandbox.sh`, and all ten passed. Added the volume of
  the script to `containerHost` and the new `tests/sandbox-install.test.mjs`. Not checked: the three tests of real
  containers, which are skipped here for want of Docker. What was checked of them instead: `bash -n` passes on the
  `docker` that `containerHost` writes, and `container/install-dependencies.sh` run with `sh` on this host's npm
  11.19.1, in a directory of the package `p` and its dependency `local`, printed `installed` on standard output and
  `added 1 package` on standard error, and exited 7 with a `preinstall` of `exit 7`, the command not run. The lockfile
  of the test is the one that npm wrote there. `tests/sandbox-commit-msg.test.mjs` read the `RUN chmod` from its first
  line alone too, and failed with it continued, so it reads it with `tests/dockerfile-executables.mjs` as well, which
  the plan now names. `npm test` passed with 1202 tests and 33 skipped, all for want of Docker
- 2026-10-23T23:03:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, corrected the timestamps of the
  two entries before this one, which were written without reading the clock, to the minute before the commit each
  went in with, read from `git log`. Changed "Running a unit", "Two implementations of one unit" and "When something
  goes wrong" of `SANDBOX.md`, and "sandbox.sh", "Exit statuses", "Running a role" and "The orchestrator" of
  `README.md`, as the plan's tasks give them. `npm test` passed on the changed documents with 1202 tests and 33
  skipped, all for want of Docker
- 2026-10-23T23:05:10Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the verification on
  `75190a9`: `npm run check-changes` exited 0; `grep -n "npm ci" README.md SANDBOX.md` shows no example of a unit run
  that opens with it and no sentence that has the reader run it in a new clone before a command; every line of the
  changed files fits 120 characters; every task names the requirements it answers, and each of 1 to 13 is named.
  Left open, for a host with Docker, which this one lacks: `npm test` with `tests/sandbox-install.test.mjs` running,
  and `./sandbox-dev.sh` of a unit showing the install on standard error. The unit is handed over for review. The
  status stays `in-progress`
- 2026-10-23T23:05:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, recorded what blocks the status:
  the unit cannot be `implemented` until the two open boxes of "Verification" in `plan.md` are ticked, which needs a
  host with Docker. On such a host, on this branch: run `npm test` and confirm that it passes with the three tests of
  `tests/sandbox-install.test.mjs` run and not skipped; then run `./sandbox-dev.sh <a unit with a branch> npx
  agentrite units` and confirm that standard error holds the line `install-dependencies.sh: the clone is new, so its
  dependencies are installed with npm ci` followed by npm's output, and that standard output holds the units alone.
  When both hold, tick the two boxes and log the runs here, naming the commit they ran on. When either fails, log
  what was seen here and leave its box open
- 2026-10-23T23:08:48Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  which has Docker 28.4.0 and Compose 2.39.2, on `feature-0083-a-unit-run-installs-the-dependencies-of-its-clone` at
  `2212220`, ran the two checks of "Verification" left open for want of Docker. `npm test`, after `npm ci`, passed
  with 1235 tests and none skipped, so the three tests of `tests/sandbox-install.test.mjs` ran.
  `./sandbox-dev.sh 0083 npx agentrite units`, with no clone of the unit under `ritenoar-agentrite-sandbox-dev`,
  exited 0. Its standard error held the entrypoint's lines, then
  `install-dependencies.sh: the clone is new, so its dependencies are installed with npm ci`, then npm's `added 1
  package, and audited 2 packages` and `found 0 vulnerabilities`. Its standard output held the units, after the
  progress of the image build that the `--rebuild` of `./sandbox-dev.sh` adds, which this unit does not change. To
  see the run's own standard output apart from the build's, ran `container/sandbox.sh` of the working copy with the
  same project name, the same unit and command and no `--rebuild`, again on a new clone: it exited 0, standard error
  held the same line and npm's output, and standard output held the 50 lines of units and the `showing 50 of 83
  units` line alone. Ticked the two boxes of "Verification". The status stays `in-progress`
- 2026-10-23T23:15:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  which has no Docker, on `feature-0083-a-unit-run-installs-the-dependencies-of-its-clone` at `b400c15`, the final
  tree, ran the suites again. `npm test` passed with 1235 tests, 1202 run and 33 skipped, all for want of Docker. The
  tree's code is the same as that of `2212220`, where the run on the host with Docker skipped none.
  `npm run check-changes` exited 0. Every task of `plan.md` is ticked, and no review is saved under `.reviews/`. The
  unit is handed over for review. The status stays `in-progress`
- 2026-10-23T23:17:54Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0083 at
  `b7d9b883ffc1cf7add1f029f7bab746e68b335e9`, against the merge base with `origin/master`. Returned no findings on
  spec conformance, plan fidelity or code quality. Saved the review in
  `.reviews/0083-a-unit-run-installs-the-dependencies-of-its-clone/review-20261023T231719Z.md`. Independently ran
  `npm test`: 1202 passed, none failed, 33 skipped for want of Docker; `npm run check-changes`, the shell syntax
  checks and `git diff --check` passed. Could not independently verify the Docker-backed tests or the live
  sandbox smoke test, since this environment has no Docker. The status stays `in-progress`
- 2026-10-23T23:20:18Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  which has no Docker, on `feature-0083-a-unit-run-installs-the-dependencies-of-its-clone` at `4431657`, read the review
  saved in `.reviews/0083-a-unit-run-installs-the-dependencies-of-its-clone/review-20261023T231719Z.md`, which returned
  no findings, so none blocks and none is left for the human to decide. Every task of `plan.md` is ticked. `npm test`
  passed with 1235 tests, 1202 run and 33 skipped, all for want of Docker, and `npm run check-changes` exited 0. The
  status is `implemented`
