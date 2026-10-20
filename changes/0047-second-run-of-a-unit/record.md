---
kind: feature
status: in-progress
timestamp: 2026-10-13T20:22:53Z
---

# 0047 A second run of a unit

## Log

- 2026-10-13T20:22:53Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `4d36473`, on the human's request for a second, separate clone of a unit in a container of its
  own, so that two models can implement one unit and the results be compared. The request reached the specifier
  through the agent that launched it. Made the unit as a
  feature. Numbered 0047: the highest number in `changes/` is 0046, and `origin` holds `master` alone, at the same
  commit.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: `SANDBOX.md`, and the wrapper and its git work in this repository's own copy under `container/`, which
  is what `master` holds and differs from the installed copy by unit 0045, which no release holds yet. Checked
  there what the spec says of the sandbox today: the container's name as the lock and the refusal that names
  `--connect`, where the clone is, how the work is brought back, what the runs of one project share, and that a
  number which two branches hold is refused.
  Wrote `spec.md` as a sketch, as the human asked for a minimal spec that is not worked out, since other features
  are built first and may change the sandbox. It has five requirements, which are what the request fixes, and no
  decision. Left open on purpose, and listed under "Decisions": the form of the command, where the second run's
  commits go, what the second clone starts from, how the second run is named afterwards, how the two results are
  compared and one is taken, and what the two runs share. The human was asked about none of them, by their own
  wish. So the spec does not yet let someone implement the unit without coming back to ask, and it says so in its
  first paragraph. It is worked out before it is approved.
  Not checked: anything that needs Docker. The status is `draft`
- 2026-10-20T20:05:38Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `e20449c`, on the human's request to check whether the unit needs updating before it is implemented,
  and then to work it out. Read `roles/specifier.md` of the installed release. Checked what the spec said of the
  sandbox against `SANDBOX.md`, `README.md` and `container/unit-clone.sh` of `master`: it still held, apart from the
  wrapper now cutting a unit's branch itself, `agentrite run` with `--model`, and two checkouts sharing a branch's
  clone. Found that no branch, no directory of `changes/` and no file of `.reviews` holds `--`. Proposed an answer
  to each of the six open questions; the human took all six, made clear that the option is optional, and added that
  a variant's reviews are kept apart by their file's name and that its implementer reads only those. Rewrote
  `spec.md`: a variant is a unit run of the branch `<unit's branch>--<name>`, started with the optional
  `--variant <name>`; its reviews end in `--<name>`; a role reads its variant from its branch; a record's entry made
  on a variant names it. Reworded the two places of the first entry above that quoted the human, whom the standards
  of release 7.2.0 forbid quoting in anything committed. The status is `draft`
- 2026-10-20T20:11:35Z [human] approved the spec. The status is `approved`
- 2026-10-20T20:14:53Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host. Cut
  `feature-0047-second-run-of-a-unit` from `master` at `00b7d58` and wrote `plan.md` against it. Read
  `roles/planner.md` of the installed release, and of the working tree `container/sandbox.sh`,
  `container/unit-clone.sh`, `sandbox-dev.sh`, the wrapper's tests and their fixtures, `SANDBOX.md`, `README.md`,
  `process.md`, `roles/reviewer.md` and `roles/implementer.md`. What the spec says of the sandbox still holds there.
  The option is taken before the unit, as the wrapper's other options are, and as the first argument after it, as
  the spec's forms give it. Requirements 7 to 11 are tested with Docker on a new fixture that runs real containers of
  the image `container/Dockerfile` builds on, as `tests/sandbox-signal.test.mjs` does. The plan also changes
  `sandbox-dev.sh`, which reads the wrapper's options and names an option that takes a value as one to add there,
  and its form in `CONTRIBUTING.md`, which "The documents" of `AGENTS.md` keeps complete. Every requirement has a
  task that traces to it, and every task traces to a requirement. The status stays `approved`
- 2026-10-20T20:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on
  `feature-0047-second-run-of-a-unit` at `9a17b1a`. The status is `in-progress`
- 2026-10-20T21:30:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built the plan, one commit for
  each of its commit points on `feature-0047-second-run-of-a-unit`, tests first, in the order of its tasks, with no task
  added or removed. Decisions of the build where the plan left the detail open: `--variant` after the unit is taken in
  the early block of `container/sandbox.sh` by looking at the argument right after the unit only, and a second
  `--variant` right behind the first is refused as a variant given twice. `mount_forms` keeps its existing lines and
  adds the variant's. `tests/sandbox-variant.test.mjs` has its own `setUp`, shorter than the one of
  `tests/sandbox-unit-run.test.mjs`, since that one is not exported and its fake host does not run containers.
  `containerHost` also turns `docker exec` into a real one, as the user and group of the suite and without
  `known-terminal.sh`, because the base image has no `agent` account and no such script, which the connect test needs.
  Verified on `23b32e9`: `npm test` on the host reported 810 tests, 810 passed, none skipped, so
  `tests/sandbox-variant.test.mjs` ran with its 5 tests; `./sandbox.sh --in-place npm test` reported 810 tests, 782
  passed, 28 skipped, none failed, with the Docker tests among the skipped; `npm run check-changes` exited 0; by hand,
  `./sandbox-dev.sh 0047 --variant try echo hi` cut `feature-0047-second-run-of-a-unit--try`, ran `echo hi` in the
  container and ended with no clone left, and the branch was deleted. The new tests that need no Docker were run against
  the wrapper before the change and 39 of the file's tests failed, and the two new tests of `sandbox-dev.sh` failed
  without its change. Not checked: the new tests of the Docker file against the wrapper before the change, a run of a
  variant on a macOS host, and a project other than this one. The status stays `in-progress`
- 2026-10-20T23:01:34Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0047 at
  `d85ed256849a2ed5cce0573763ae0e21ce436e3d` in full against the merge base with `master`,
  `00b7d5811e86cebf32a4bba5ce57ef90c1d3914d`. Returned C1, C2 and C3, saved in
  `.reviews/0047-second-run-of-a-unit/2026-10-20T230038Z-d85ed25-opencode.md`.
  Ran `npm test`: 810 passed, none skipped; `./sandbox.sh --in-place npm test`: 782 passed, 28 skipped;
  `npm run check-changes` and `git diff --check master...HEAD`: both passed. Reproduced the concurrent Docker-test
  collision and checked the CLI with an empty `node_modules`. Did not independently repeat the historical
  pre-change failure counts or the manual dev-wrapper smoke run, and did not run on macOS.
- 2026-10-21T08:00:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, applied the three findings of the
  review of `d85ed25` (C1, C2, C3), all nonblocking and all accepted as valid after checking each against the tree. C1:
  `tests/sandbox-variant.test.mjs` names the Compose project after the process, in the project's compose file, so that
  the container names and clone paths differ between suite invocations. C2: the two examples of `SANDBOX.md` run `npm
  ci` before `npx agentrite run`, and say why. C3: the table of `README.md` says that `--connect` takes `--variant`, and
  a sentence below it gives both spellings and both places of the option. Verified on `e2a8aa7`: `npm test` reported 810
  passed, none skipped, and two invocations of `tests/sandbox-variant.test.mjs` run at once each passed its 5 tests. Not
  checked: the `npm ci` of the new examples in a real clone, which needs the registry. The status stays `in-progress`

## Amendments
