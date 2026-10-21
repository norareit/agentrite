---
kind: feature
status: in-progress
timestamp: 2026-10-21T09:50:41Z
---

# 0066 One convention for exit statuses

## Log

- 2026-10-21T09:50:41Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `2a7094b`, on the human's request to define the exit statuses of the kit's tools once, after unit
  0065 gave the orchestrator a status of its own. Made the unit as a feature, since it changes what `./sandbox.sh`
  exits with. Numbered 0066: the highest number in `changes/` is 0065. Read every statement of an exit status in
  `README.md` and `SANDBOX.md`, the exits of `scripts/agentrite.mjs`, `scripts/agentrite-settings.mjs`,
  `scripts/check-changes.mjs` and `container/sandbox.sh`, and found that `./sandbox.sh` exits 2 for every refusal
  where `npx agentrite` exits 1. Wrote `spec.md`. The status is `draft`
- 2026-10-21T10:20:44Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision to take item 1
  of "Beyond the request" into the unit: added requirement 7, that the change check refuses a second argument with its
  usage and exit status 2, renumbered the requirements after it, added its test to requirement 9 and recorded why under
  "Decisions". "Beyond the request" holds nothing now. The status is `draft`
- 2026-10-21T10:23:12Z [human] approved the spec. The status is `approved`
- 2026-10-21T10:27:26Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `feature-0066-one-convention-for-exit-statuses` from `master` at `2f0d501` and wrote `plan.md`. Requirement 5
  keeps an option `./sandbox.sh` does not take at 2, and requirement 9 asks for a test of it, but the wrapper has no
  such refusal today: it takes an unknown option for the unit, which requirement 4 refuses with 1, or after
  `--in-place` for the command. The plan reads the requirement as it must be read, and has the option loop refuse,
  with 2, a word that opens with `-` where an option stands, which is what the `--` row of "Commands" of `README.md`
  already says. The status is `approved`
- 2026-10-21T10:29:53Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  `feature-0066-one-convention-for-exit-statuses` at `bba6338`, began the work. Moved `mount_forms` above the option
  loop of `container/sandbox.sh`; the last sentence of the comment above it, on the forms ending with `--connect`,
  went with it, and the rest of the comment stayed with the check that follows it. The sandbox suites,
  `node --test tests/sandbox*.test.mjs`, pass: 269 tests. The status is `in-progress`
- 2026-10-21T10:30:15Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the test of the change check
  given two arguments, which failed with status 1 before the refusal, then made the entry point of
  `scripts/check-changes.mjs` refuse more than one argument with its usage and status 2.
  `node --test tests/check-changes.test.mjs` passes: 37 tests
- 2026-10-21T10:32:56Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the option loop of `container/sandbox.sh`
  refuse with 2 a word that opens with `-` where an option stands, naming it, saying that a unit or a command that
  opens with `-` goes after `--`, and printing the forms. Its four tests failed before it: given alone, after
  `--rebuild` and after `--connect` with 1, and after `--in-place` with 0, run as the command. Changed to 1 the 24
  assertions of status 2 the plan lists, and gave `assertNothingRan` the status it expects: 1 at six of its calls
  and 2 at four. With the wrapper's statuses unchanged,
  `node --test tests/sandbox*.test.mjs tests/settings-update.test.mjs` failed 56 tests, each one a test changed to
  1. Then changed to 1 the 17 `exit 2` the plan's table marks 1, which left 12 `exit 2`, each a refusal of the
  arguments. The same suites pass: 276 tests, none skipped. The test of `./sandbox-dev.sh` with an `agentrite.json`
  of `{}` was written after the change, as the plan orders it, and passed when first run. The record's previous
  entry was rewrapped to the line limit, which it broke
