# 0081 The runs of a project can be listed

## Approach

The work has two halves: the orchestrator learns the branch and the variant of a run (R1 to R5), and a new command
`runs` reads `.orchestrator/` (R6 to R19). The documents follow (R20 to R23). Two refactoring commits go first, each
changing no behavior, so that the knowledge the writer of a run and its reader share is in one place before the
reader is built.

**Shared knowledge, moved before it is used twice.**

* The name of a step's file is today the local `fileOf` of `orchestrateCommand` with the private `numberWidth` of
  `scripts/agentrite.mjs`. The reader needs the name of the followed file of a run's step (R18), so both move into
  `scripts/agentrite-orchestrate.mjs` as `numberWidth(definition)` and `stepFileName(definition, number, role,
  kind)`, which gives `` `${String(number).padStart(numberWidth(definition), '0')}-${role}.${kind}` ``.
  `orchestrateCommand` then calls `stepFileName(definition, planned.number, planned.step.role, kind)` in its `fileOf`
* The line before a step is `stepLine(planned)` with `: started`. The reader shows the same head without it (R12), so
  the head becomes the exported `stepHead({ number, round, step })`, and `stepLine` uses it
* `isObject` is written in `scripts/agentrite-definition.mjs` and in `scripts/agentrite-outcome.mjs`, and the reader
  would make a third. It moves to `scripts/agentrite-json.mjs`, exported, and both import it
* `runs` takes `<number>` and `--limit` as `units` does, by the decision that keeps the two commands alike. Two
  exported functions of `scripts/agentrite-units.mjs` hold the checks, used by `units` at the place its checks stand
  today: `numberError(positionals)`, which gives `<number> is exactly four digits, not <word>` or `unexpected
  argument: <word>` or `undefined`, and `limitError(limit)`, which gives `--limit takes a whole number of zero or
  more, not <value>` for a value given that is not one, or `undefined`. `isUnitDirectory` and `DEFAULT_LIMIT` are
  imported from there too

**The branch and the variant of a run.** In `scripts/agentrite-orchestrate.mjs`, as pure functions beside the other
knowledge of a run:

* `VARIANT_PATTERN`, the source `[a-z0-9]+(?:-[a-z0-9]+)*`, the form `./sandbox.sh --variant` takes, and
  `INSTANT_PATTERN`, the source `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z`, each exported for the reader
* `variantOf(branch)`: `null` for a branch that is `null` or holds no `--`, and otherwise what follows the last `--`.
  A variant not of `^VARIANT_PATTERN$` throws `the branch <branch> gives the variant "<variant>", and a variant is one
  or more words of the lowercase letters a to z and the digits 0 to 9, joined by single hyphens` (R2, R4)
* `runName(instant, variant)`: `instant` for a variant that is `null`, and `` `${instant}--${variant}` `` otherwise
  (R3)

In `scripts/agentrite.mjs`, `checkedOutBranch(root)` runs `git symbolic-ref --quiet HEAD` with `spawnSync` in the
root, as `hookPath` runs git. A status of 0 with an output that opens with `refs/heads/` gives the rest of the line;
a status of 1, which `--quiet` gives for a detached `HEAD`, gives `null`, and so does a standard error that says the
directory is not a git repository (R1). A git that cannot be run, or that fails otherwise, throws `git could not be
run: <message>`, which the command reports and exits 1 with, as any failure. `orchestrateCommand` reads the branch
and `variantOf` it after `checkApproved` and before `makeRunDirectory`, so a refusal writes nothing (R4), and keeps
the branch in a constant. `makeRunDirectory(root, directory, variant)` names the run's directory by `runName`, still
made without `recursive`, so two runs of one variant in one second still fail and two of different variants do not
(R5). `writeState` writes `{ unit, definition, branch, at, sessions, ended }`, so `branch` is in every write and the
same in each (R1).

**The command.** A new module `scripts/agentrite-runs.mjs` holds every pure part, as `scripts/agentrite-units.mjs`
does for `units`; `scripts/agentrite.mjs` holds the reading of the files, in an exported `readRuns(root, number,
now)`, and the command `runs(root, parsed)`.

* `RUNS_FORM` is `usage: agentrite runs [<number>] [--limit <count>] [--json]`, and `parseRunsArgs(args)` gives `{
  number, limit, json }`. It reads the arguments as `parseUnitsArgs` does, by `parseArgs` not strict with tokens, and
  refuses, in this order, by `optionError`, `--limit was given twice`, `numberError` and `limitError`, throwing the
  line and `RUNS_FORM` (R6, R19). `--limit 0` stays 0, and no limit gives `DEFAULT_LIMIT`
* `isRunDirectory(name)` holds for `^INSTANT_PATTERN(?:--VARIANT_PATTERN)?$` (R7)
* `runFrom(unit, name, { state, definition, heartbeat })` takes the unit directory's name, the run directory's name,
  the text of `state.json`, the text of `definition.json` and the text of `heartbeat` or `undefined`, and gives a
  `Run`, or throws naming the file by its path from the directory the command runs in, as
  `.orchestrator/<unit>/<run>/state.json`, and what is wrong (R13). It judges:
    * `state.json` is JSON (`<file> is not JSON: <message>`) and an object, whose keys are among `unit`,
      `definition`, `branch`, `at`, `sessions` and `ended`, judged by `jsonKeyFault`, and whose values are judged by
      `jsonFault` and `jsonPath` with what each must hold: `unit` and `definition` a string that is not empty;
      `branch` missing, which reads as `null` (R8), `null` or a string that is not empty; `at` `null` or an object of
      the keys `number` and `item`, whole numbers of zero or more, `round`, `null` or an object of `at` and `of`,
      whole numbers of one or more with `at` at most `of`, and `index`, `null` or a whole number of zero or more;
      `sessions` an array of objects of `role`, `harness` and `session`, each a string that is not empty; `ended`
      `null` or an object of `status`, a whole number, and `line`, a string
    * `definition.json` by `parseDefinition(text, { path })`, which then judges it without the names of
      `agentrite.json` (R8)
    * the step `at` names (R11): item `at.item` of the definition; for a repeat, its step `at.index`, with `at.round`
      not `null` and `at.round.of` the repeat's `times`; for a step outside one, `at.index` and `at.round` both
      `null`. Anything else throws `<state file>: at names a step that <definition file> does not have`
    * the heartbeat is the instant of a text that is `^(INSTANT_PATTERN)\n$`, or `null` (R10)

  The `Run` holds `number` (the first four characters of the unit), `unit`, `variant` (by the name, after the `--`,
  or `null`), `branch`, `run` (the instant of the name), `directory` (`.orchestrator/<unit>/<run>`), `heartbeat`,
  `step` (`null`, or `{ number, round, rounds, role, harness, model }` with `round` and `rounds` from `at.round` or
  both `null`), `followedName` (`stepFileName(definition, at.number, role, 'followed.jsonl')` or `null` for no step),
  `head` (`stepHead` of the step, or `null`) and `ended` (`null` or `{ status, line }`)
* `runStateOf(run, now)`: `ended` for a run with an end; `running` when the heartbeat is not `null` and `now -
  Date.parse(heartbeat)` is at most `STALE_MILLISECONDS`, 60 000; `stale` otherwise, a heartbeat that `Date.parse`
  cannot read among it (R10)
* `selectRuns(runs, limit)`: a sorted copy, by `run` the latest first, then by `unit`, then by the name of the
  directory, each by `localeCompare` on the strings, cut to `limit` unless it is 0, with `total` the number before
  the cut (R9, R15)
* `runLine(listed)` and `runsListing({ runs, total }, number)` give the text: the instant, the unit as `number` or
  `` `${number}--${variant}` ``, and the state, the last two padded to the widest of their column, two spaces apart,
  then two spaces and what the state gives: for `running` the head, or `before its first step`; for `stale` `no sign
  of life since <heartbeat>` or `no sign of life`, then `, at <head>` or `, before its first step`; for `ended` the
  `line` (R12). After the lines, `showing <shown> of <total> runs, --limit 0 shows them all` when runs were left out
  (R16). With no run, `no runs` or `no runs of <number>` (R17)
* `runsJson({ runs, total })` gives `{ runs, total }` laid out with two spaces and a line break, each run with the
  keys `number`, `unit`, `variant`, `branch`, `run`, `directory`, `state`, `heartbeat`, `step`, `followed` and
  `ended` in that order (R18)

A listed run is a `Run` with `state` and `followed` added. `readRuns(root, number, now)` in `scripts/agentrite.mjs`
lists `.orchestrator/` of `root`, giving `[]` when it is not a directory (R17); takes its directories that pass
`isUnitDirectory`, and that open with `<number>-` when a number is given (R14); in each, the directories that pass
`isRunDirectory` and hold a `state.json`, by `exists`, the others left out (R7); reads `state.json` and
`definition.json`, a read that throws being thrown again as `<file> cannot be read: <message>` (R13), and `heartbeat`
when it is a regular file (R10); and gives each `runFrom`, with `state` by `runStateOf(run, now)` and `followed` as
`` `${run.directory}/${run.followedName}` `` when the step has a name and that is a regular file, and `null`
otherwise (R8, R18). It reads nothing else (R8). `runs(root, parsed)` calls `readRuns(root, parsed.number,
Date.now())`, then `selectRuns`, and prints `runsJson` or `runsListing` once every run was read, so a refusal prints
nothing on standard output (R13). It joins `COMMANDS` after `orchestrate`, so the usage names it last (R23).

`parseDefinition` takes `roles` and `harnesses` as before, and without them judges a step's `role` and `harness` as
strings that are not empty, which is what the orchestrator wrote when the run started; the reader reads no
`agentrite.json` (R8).

The tests of the orchestrator run commands with a `PATH` of the fakes alone, so the fixture `project` links git into
its `bin`, as it links `sleep`. Its projects are in no git repository, so every run they make has `branch: null` and
the directory named as before.

## Files

- `scripts/agentrite-orchestrate.mjs`: `numberWidth`, `stepFileName`, `stepHead`, `VARIANT_PATTERN`,
  `INSTANT_PATTERN`, `variantOf` and `runName`
- `scripts/agentrite-json.mjs`: `isObject`, moved here
- `scripts/agentrite-definition.mjs`, `scripts/agentrite-outcome.mjs`: `isObject` imported; `parseDefinition`
  without names
- `scripts/agentrite-units.mjs`: `numberError` and `limitError`
- `scripts/agentrite-runs.mjs`: new. `RUNS_FORM`, `STALE_MILLISECONDS`, `parseRunsArgs`, `isRunDirectory`, `runFrom`,
  `runStateOf`, `selectRuns`, `runLine`, `runsListing`, `runsJson`, and the typedefs `RunsArguments`, `Run` and
  `Listed`
- `scripts/agentrite.mjs`: `checkedOutBranch`, `makeRunDirectory` with the variant, `orchestrateCommand` with the
  branch, `readRuns`, `runs`, the entry `runs` of `COMMANDS`, and the imports
- `package.json`: `scripts/agentrite-runs.mjs` in `files`, after `scripts/agentrite-units.mjs`
- `tests/package-documents.test.mjs`: the same file in the list of `files`
- `tests/agentrite-orchestrate.test.mjs`: the unit tests of the new functions of the orchestrator's module, git in
  the fixture, and the tests of R25
- `tests/agentrite-definition.test.mjs`: a definition judged without names
- `tests/agentrite-runs.test.mjs`: new. The unit tests of the module and of `readRuns`, and the tests of the command
- `tests/agentrite-init.test.mjs`: the usage of every command ends with the form of `runs`
- `README.md`: "agentrite orchestrate" and a new "agentrite runs" of "Commands", and "What .orchestrator holds"
- `SANDBOX.md`: "Two implementations of one unit"

## Tasks

- [x] Move `numberWidth` from `scripts/agentrite.mjs` to `scripts/agentrite-orchestrate.mjs`, exported, add
  `stepFileName(definition, number, role, kind)` there, and make `fileOf` of `orchestrateCommand` call it. Split
  `stepLine` into the exported `stepHead({ number, round, step })` and the rest. Add to
  `tests/agentrite-orchestrate.test.mjs` tests that `stepFileName` gives `00-planner.outcome.json` for the default
  definition, `000-implementer.followed.jsonl` for a repeat of 101 times one step, and `100-implementer.followed.jsonl`
  for its step 100, and that `stepHead` gives `step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol` for the
  reviewer of the default and `step 0, planner, claude, claude-opus-5-5` for its planner. Every other test passes as
  before (R11, R12, R18)
- [ ] Move `isObject` to `scripts/agentrite-json.mjs`, exported, and import it in `scripts/agentrite-definition.mjs`
  and `scripts/agentrite-outcome.mjs`. Add `numberError` and `limitError` to `scripts/agentrite-units.mjs`, exported,
  and call them in `argumentError` where its checks of the number and of the limit stand. The tests of
  `tests/agentrite-units.test.mjs` pass unchanged (R19)
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the unit tests of `variantOf`: `null` gives `null`;
  `feature-0029-try-the-orchestrator` gives `null`; `feature-0029-try-the-orchestrator--opus` gives `opus`;
  `a--b--gpt-6-1` gives `gpt-6-1`; and `feature-0029-x--Opus`, `feature-0029-x--` and `feature-0029-x--a/b` each
  throw the message of the approach with that branch and variant. And of `runName`: `2026-10-21T10:00:00Z` with
  `null` and with `opus` (R2, R3, R4, R24)
- [ ] Add `VARIANT_PATTERN`, `INSTANT_PATTERN`, `variantOf` and `runName` to `scripts/agentrite-orchestrate.mjs` as
  the approach gives them (R2, R3, R4)
- [ ] Link git into `bin` of the fixture `project` of `tests/agentrite-orchestrate.test.mjs`, found by `command -v
  git` as `SLEEP` is, and add a helper `agentriteAt(time, ...args)` that runs the command with `NODE_OPTIONS` set to
  `--import=` a `data:text/javascript,` module that makes `Date.now` give `time`, and a helper `onBranch(branch)` that
  runs, from the test process, `git init --quiet` in the base when it is no repository yet and then `git symbolic-ref
  HEAD refs/heads/<branch>`. Assert, in `a run whose every item ends runs the default definition and exits 0`, that
  `state.branch` is `null` (R1, R25)
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the test that three runs of `ONE_STEP` by `agentriteAt` at one
  instant, on `feature-0029-try-the-orchestrator--opus`, on `feature-0029-try-the-orchestrator--gpt-6-1` and on
  `feature-0029-try-the-orchestrator`, each exit 0, that `.orchestrator/0029-try-the-orchestrator/` then holds
  `<instant>`, `<instant>--gpt-6-1` and `<instant>--opus`, and that the `branch` of each `state.json` is the branch
  it ran on. The test that a run on a detached `HEAD`, made by an empty commit with `-c user.name -c user.email` and
  `git checkout --quiet --detach`, writes `branch: null` in a directory named by the instant alone. The test that a
  run started by `started` on `feature-0029-try-the-orchestrator--opus`, whose harness waits, keeps that branch in
  `state.json` after `onBranch('other')` while it runs and after it ended. And by `refused`, whose `prepare` runs
  `git init` and `git symbolic-ref` on the base, that a run on `feature-0029-try-the-orchestrator--Opus` exits 1
  with the message of `variantOf`, starts nothing and makes no `.orchestrator` (R1, R2, R3, R4, R5, R25)
- [ ] Add `checkedOutBranch` to `scripts/agentrite.mjs`, read the branch and its variant in `orchestrateCommand`
  after `checkApproved`, give the variant to `makeRunDirectory`, which names the directory by `runName`, write
  `branch` in `writeState` after `definition`, and say in the comments of `makeRunDirectory` and `orchestrateCommand`
  that the directory's name holds the variant and `state.json` the branch. Run `npm test` (R1, R3, R4, R5)
- [ ] Add to `tests/agentrite-definition.test.mjs` that a definition parsed with `{ path }` alone takes a step of any
  role and harness that is a string that is not empty, and refuses a `role` of `""` and a `harness` of `3`, naming
  each with `a string that is not empty`. Make `parseDefinition` and `parseStep` judge so when the context holds no
  `roles` and `harnesses` (R8)
- [ ] Write `tests/agentrite-runs.test.mjs` with the unit tests of `parseRunsArgs`: no argument gives `{ number:
  undefined, limit: 50, json: false }`; `0029`, `--limit 5`, `--limit=5`, `--limit 0` and `--json` each read; the
  options before, between and after the number; and each wrong argument of R19 throws its line and `RUNS_FORM`:
  `29`, `00290`, `0029 0030`, `--limit`, `--limit --json`, `--limit 1 --limit 2`, `--limit -1`, `--limit 1.5`,
  `--limit x`, `--json=yes` and `--status draft` (R6, R19, R24)
- [ ] Add `RUNS_FORM` and `parseRunsArgs` in the new `scripts/agentrite-runs.mjs` (R6, R19)
- [ ] Add the unit tests of `isRunDirectory`: `2026-10-21T10:00:00Z`, `2026-10-21T10:00:00Z--opus` and
  `2026-10-21T10:00:00Z--gpt-6-1` are runs; `2026-10-21T10:00:00Z--`, `2026-10-21T10:00:00Z--Opus`,
  `2026-10-21T10:00:00Z-opus`, `2026-10-21T10:00Z`, `2026-10-21 10:00:00Z`, `.2026-10-21T10:00:00Z` and `latest`
  are not. Add `isRunDirectory` (R7, R24)
- [ ] Add the unit tests of `runFrom` and `runStateOf`, with a `state.json` and a `definition.json` written as the
  orchestrator writes them: a run of the default definition at step 2, round 1 of 3, gives its `step`, `head` and
  `followedName` `02-reviewer.followed.jsonl`; at step 0 it gives no round and no rounds; with `at: null` no step,
  no head and no followed name; a run of a definition of 101 steps at step 100 gives `100-implementer.followed.jsonl`;
  a `state.json` without `branch` gives `branch: null`, and one with it the branch; a name with `--opus` gives the
  variant `opus` and one without `null`; an end is kept as `ended` and gives `ended` whatever the heartbeat, a recent
  one among them; without an end, a heartbeat at `now`, and one exactly 60 seconds before `now`, give `running`, one
  60 seconds and 1 millisecond before gives `stale`; a missing one, an empty one, one without its line break and one
  with a second line give `heartbeat: null` and `stale`; and `2026-99-99T99:99:99Z\n`, which is of the form but no
  instant `Date.parse` reads, gives that `heartbeat` and `stale` (R2, R8, R10, R11, R24)
- [ ] Add the unit tests of each refusal of `runFrom`, each by the exact message naming
  `.orchestrator/0029-x/2026-10-21T10:00:00Z/state.json` or `definition.json`: a `state.json` that is not JSON, that
  is an array, with a key `extra`, with `unit` missing, with `branch` of `""`, with `at.number` of `-1`, with
  `at.round` of `{ at: 4, of: 3 }`, with a session lacking `session`, with `ended.status` of `"0"`; a
  `definition.json` that is not JSON and one without `steps`; and an `at` whose `item` is past the last item, whose
  `index` is past the last step of the repeat, whose `round` is `null` in a repeat, whose `round.of` is not the
  repeat's `times`, and whose `index` is not `null` outside a repeat (R13, R24)
- [ ] Add `runFrom`, `STALE_MILLISECONDS` and `runStateOf` as the approach gives them, importing `isObject`,
  `jsonFault`, `jsonKeyFault` and `jsonPath` from `scripts/agentrite-json.mjs`, `parseDefinition`, and
  `stepFileName`, `stepHead`, `VARIANT_PATTERN` and `INSTANT_PATTERN` from `scripts/agentrite-orchestrate.mjs`
  (R7, R8, R10, R11, R13)
- [ ] Add the unit tests of `selectRuns`: runs given out of order come the latest instant first, two units at one
  instant in the order of their directories, `0029`'s `<instant>`, `<instant>--gpt-6-1` and `<instant>--opus` in
  that order, and the input is not changed; 60 runs give 50 and a total of 60, `--limit 5` gives 5, and `0` gives 60.
  Of `runsListing`: a running run, a stale one with a heartbeat and one without, each at a step and before the
  first, and an ended one, with and without a variant, each give the line of R12 with the columns lined up and no
  space at the end of a line; the closing line only when runs were left out; `no runs` and `no runs of 0029` with
  nothing to show. Of `runsJson`: the keys of a run and of its step in the order of R18, `variant`, `branch`,
  `heartbeat`, `step`, `followed` and `ended` each as a value and as `null`, the total, and `{ "runs": [], "total":
  0 }` with nothing to show (R9, R12, R15, R16, R17, R18, R24)
- [ ] Add `selectRuns`, `runLine`, `runsListing` and `runsJson` (R9, R12, R15, R16, R17, R18)
- [ ] Add to `tests/agentrite-runs.test.mjs` the unit tests of `readRuns`, on a temporary directory with run
  directories written by a helper of the test: no `.orchestrator/` gives `[]`; a `.gitignore`, a directory
  `history-0001-old`, a file `0029-x` and, in a unit directory, a directory `latest`, a file of a run's name and a run
  without `state.json` are not read, also when they hold a `state.json` that is not JSON; a number gives the runs of
  that unit, of every variant, and none of `0290-y`; `followed` is the path of the step's file when it is a file, as
  `.orchestrator/0029-x/<run>/02-reviewer.followed.jsonl`, and of `100-implementer.followed.jsonl` for the definition
  of 101 steps, and `null` when the file is missing and for a run with no step; a `definition.json` that is missing
  is refused as one that cannot be read; and `directory` is `.orchestrator/0029-x/<run>` (R7, R8, R13, R14, R18, R24)
- [ ] Add `readRuns` and `runs` to `scripts/agentrite.mjs`, exported `readRuns`, and `runs` in `COMMANDS` after
  `orchestrate`; add `scripts/agentrite-runs.mjs` to `files` of `package.json` and to the list of
  `tests/package-documents.test.mjs`; and end the usage of `tests/agentrite-init.test.mjs` with `       agentrite runs
  [<number>] [--limit <count>] [--json]` (R6, R7, R8, R13, R14, R17, R23)
- [ ] Add to `tests/agentrite-runs.test.mjs` the tests of the command, run by `spawnSync` in a temporary directory
  holding no `agentrite.json`, no `changes/` and no git repository: a project of 53 runs of `0029-x` with and without
  variants, `0030-y` and `0031-z`, a running one, a stale one and an ended one among them, gives 50 lines, the latest
  first, and the closing line `showing 50 of 53 runs, --limit 0 shows them all`, exiting 0; `0030` gives the runs of
  that unit only, every variant among them; `--json` gives the document with `total` 53 and 50 runs; `0099` gives
  `no runs of 0099`; a directory without `.orchestrator/` gives `no runs` and with `--json` `{ "runs": [], "total": 0
  }`, exiting 0; a malformed `state.json` exits 1 with nothing on standard output and the file named on standard
  error; and `--limit x` exits 2 with the line and the usage on standard error (R6, R9, R14, R15, R16, R17, R18, R19,
  R26)
- [ ] Add to `tests/agentrite-orchestrate.test.mjs` the test that, after `a run whose every item ends` of
  `ONE_STEP`, `agentrite runs --json` lists the run as `ended`, with its `branch` `null`, its `step` the implementer
  at number 0 and its `followed` the path of `00-implementer.followed.jsonl`, so that the reader reads what the
  writer writes (R7, R8, R18)
- [ ] In "agentrite orchestrate" of "Commands" of `README.md`, add to the list of refusals a branch whose variant is
  not of the form: it names the branch and the form a variant takes (R21)
- [ ] Add "agentrite runs" to "Commands" of `README.md`, after "agentrite orchestrate": its form; that it lists the
  runs of `.orchestrator/` of the directory it runs in, which runs are listed and which left out, and that it reads
  nothing else, no `changes/`, no `agentrite.json` and no git; the order; the line of a run with an example of each
  state, the three states by the rule of "What .orchestrator holds"; `<number>`; the limit and the closing line; the
  line with nothing to show and its exit status; the JSON document with every key; the refusals of a run's files,
  exiting 1, and the wrong arguments, exiting 2; a table of `<number>`, `--limit <count>` and `--json`; and its exit
  statuses by [Exit statuses](#exit-statuses) (R20)
- [ ] In "What .orchestrator holds" of `README.md`, give `<run>` as the instant, followed by `--` and the variant for
  a run on a variant's branch, as `2026-10-21T10:00:00Z--opus`, the variant read from the branch as `process.md`
  says; add `branch` to what `state.json` holds, `null` without a branch and absent in a run from before; and say that
  `npx agentrite runs` lists the runs and their states by the rule given there (R21)
- [ ] In "Two implementations of one unit" of `SANDBOX.md`, add to the paragraph of the reviews that the runs of the
  orchestrator of the variants are kept apart by the name of their directory in `.orchestrator/<unit-directory>/`,
  which ends in `--<name>` for a variant, as the reviews are by the name of their file (R22)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes, after the commits
- [ ] Every line of the changed files fits 120 characters, checked before each commit
- [ ] Every requirement 1 to 26 is traced by a task above, and every task traces to one

## Commit Points

- [x] `feature-0081 Name the files and the head of a step in the orchestrator's module`: the first task, which
  changes no behavior
- [ ] `feature-0081 Share isObject and the checks of a number and a limit`: the second task, which changes no
  behavior
- [ ] `feature-0081 Keep the branch and the variant of a run`: the third to seventh tasks
- [ ] `feature-0081 List the runs of a project`: the eighth to twentieth tasks
- [ ] `feature-0081 Document the runs and the variants of a run`: the three tasks of `README.md` and the one of
  `SANDBOX.md`
