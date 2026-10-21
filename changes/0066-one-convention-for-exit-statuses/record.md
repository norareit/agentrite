---
kind: feature
status: implemented
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
- 2026-10-21T10:32:56Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the option loop of
  `container/sandbox.sh` refuse with 2 a word that opens with `-` where an option stands, naming it, saying that a unit
  or a command that opens with `-` goes after `--`, and printing the forms. Its four tests failed before it: given
  alone, after `--rebuild` and after `--connect` with 1, and after `--in-place` with 0, run as the command. Changed to 1
  the 24 assertions of status 2 the plan lists, and gave `assertNothingRan` the status it expects: 1 at six of its calls
  and 2 at four. With the wrapper's statuses unchanged, `node --test tests/sandbox*.test.mjs
  tests/settings-update.test.mjs` failed 56 tests, each one a test changed to 1. Then changed to 1 the 17 `exit 2` the
  plan's table marks 1, which left 12 `exit 2`, each a refusal of the arguments. The same suites pass: 276 tests, none
  skipped. The test of `./sandbox-dev.sh` with an `agentrite.json` of `{}` was written after the change, as the plan
  orders it, and passed when first run
- 2026-10-21T10:35:08Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote the documents: the section
  "Exit statuses" of `README.md` after "Commands", the statuses in each section of "Commands" with a link to it, 1 in
  place of "non-zero", "a status other than 0" and the 2 of a start of `./sandbox.sh` with a file at fault, the statuses
  of the entry on `--connect` in "When something goes wrong" of `SANDBOX.md`, the status of `sandbox-dev.sh` in
  `CONTRIBUTING.md`, and the section "Exit statuses" of `AGENTS.md`. The row of `--` in the table of `sandbox.sh` says
  that what follows it may open with `-`. A search of the three documents for "non-zero", "other than 0", "exits 2",
  "exits with 2" and "status 2" leaves four statements of 2, each for wrong arguments of `npx agentrite init`, `config`
  or `refresh`, and the heading of the entry on `--connect`, which names both. `npm test` passes on this tree: 817
  tests, none skipped. Added to `plan.md` a commit point for the verification, since the change check reads committed
  work and its result is recorded after the documents are committed
- 2026-10-21T10:35:27Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, verified the committed work on
  `cebf9e1`: `npm test` passes, 817 tests, none skipped, on its tree but for the unit's documents; `npm run
  check-changes` and `node scripts/check-changes.mjs` pass; every line the unit adds is within 120 characters; and every
  requirement, 1 to 9, has a task that names it. Not checked: the sandbox against a real Docker beyond what the suite
  runs, which includes `tests/sandbox-variant.test.mjs` with none of its tests skipped. Every task of `plan.md` is
  ticked. The review is to be done elsewhere, so the status stays `in-progress`
- 2026-10-21T10:42:05Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, completed a full review of unit 0066 at
  `653cfbb6cde3938790f4b1d199262f7ef78239c0`, against merge base `2f0d5013baff09a8a8772afac949c9136c8a7bb8`.
  Returned S1 and S2. Saved the complete findings in
  `.reviews/0066-one-convention-for-exit-statuses/20261021T104104Z-opencode-full-653cfbb.md`.
  Independently ran `npm test`: 817 passed, none failed or skipped; `npm run check-changes` and
  `node scripts/check-changes.mjs` passed. Shell syntax and diff whitespace checks passed, and all 463 added lines
  fit 120 characters. Ran direct argument-refusal probes and a controlled pre-start Docker-status probe. Could not
  independently verify the historical red/green test order, or the production sandbox's full firewall and live-harness
  behavior beyond what the suite exercises
- 2026-10-21T10:47:11Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, took up the review's findings at the
  human's request to handle them, and added their tasks and two commit points to `plan.md`. S1, accepted and applied:
  every refusal of `./sandbox.sh` with 2 now prints, after its own lines, `The forms it takes:` and the forms, through
  `refuse_arguments` in `container/sandbox.sh`, but the one of nothing to mount, which keeps its `Say what to mount at
  /work` and the same forms. The lines of the forms moved from `mount_forms` into `list_forms`, which both use.
  `assertFormsListed` in `tests/wrapper-fixture.mjs` checks the forms, in `assertVariantRefused`, in `assertNothingRan`
  given 2, and in the tests of an option the wrapper does not take; a new test covers `--workdir` and `--mount` with no
  value. Before the wrapper changed, `node --test tests/sandbox*.test.mjs` failed 39 tests, each a refusal of the
  arguments. The test of `--connect` with no unit expected the one form that refusal printed, which lacked `--variant
  NAME`, and now expects the form of `--connect` from the list. After it, `node --test tests/sandbox*.test.mjs
  tests/settings-update.test.mjs` passes: 279 tests, none skipped
- 2026-10-21T10:47:58Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, S2, accepted and applied: the
  section `sandbox.sh` of "Commands" and "Exit statuses" of `README.md` say that a Docker command `./sandbox.sh` runs
  before the command starts which fails, as Compose reading the configuration or the build of the image, ends it with
  Docker's status, which it passes on. No behavior changed, as the non-goal on Docker's statuses has it. On the tree of
  this commit, `npm test` passes: 819 tests, none skipped. `npm run check-changes` and `node scripts/check-changes.mjs`
  pass on `9413ea2`, whose tree differs from this commit's only in `README.md` and the unit's documents. No line the
  unit adds is over 120 characters. Both findings are decided and every task of `plan.md` is ticked. The status stays
  `in-progress`: the review of the corrections is done elsewhere
- 2026-10-21T10:50:40Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, completed a delta review of unit 0066 at
  `ca3f98323f01bfb5d5afcbd4631c1079c9ae357f`, from the previous review's commit
  `653cfbb6cde3938790f4b1d199262f7ef78239c0`. Returned no findings. Saved the complete review in
  `.reviews/0066-one-convention-for-exit-statuses/20261021T105040Z-opencode-delta-ca3f983.md`.
  Independently ran `npm test`: 819 passed, none failed or skipped; `npm run check-changes` and
  `node scripts/check-changes.mjs` passed. Shell syntax and delta whitespace checks passed, all 132 added delta
  lines fit 120 characters, and nine direct argument-refusal probes passed. Could not independently verify the
  historical red/green test order, or production sandbox firewall and live-harness behavior beyond the suite
- 2026-10-21T10:54:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's word that the delta
  review returned no findings: the review's one blocking finding, S1, was applied at the human's request, S2 was applied
  too, and every task of `plan.md` is ticked. The status is `implemented`
