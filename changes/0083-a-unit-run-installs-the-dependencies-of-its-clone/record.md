---
kind: feature
status: in-progress
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
- 2026-10-23T23:01:52Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added
  `tests/install-dependencies.test.mjs`, whose five tests failed with no script, then wrote
  `container/install-dependencies.sh` and its `COPY` and `chmod`, and the five passed. Added a task to the plan: the
  `RUN chmod` with the script beside the others is longer than 120 characters, so it continues on a second line, and
  the test of `tests/known-terminal.test.mjs` read the first line alone. Both tests now read the paths with the new
  `tests/dockerfile-executables.mjs`, and those of `tests/known-terminal.test.mjs` pass
