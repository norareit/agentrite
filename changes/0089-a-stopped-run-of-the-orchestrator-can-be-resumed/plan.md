# 0089 A stopped run of the orchestrator can be resumed

## Approach

A resume is a run of `orchestrateCommand` that starts in the middle of a definition rather than at its first item.
The pure part, in `scripts/agentrite-orchestrate.mjs`, learns to start at a position: `orchestrate(definition,
effects, from)` takes an optional `from` that gives the item, the round and the index of the step to rerun, the number
it takes, and the sessions the stopped run held. It skips the items before `from.item`, starts a repeat at `from`'s
round and index, numbers each step `from.number` plus the steps run so far, and marks the first step it runs as the
rerun. Everything after that step is the loop as it is today, so the rerun is judged, asked again, and followed by its
repeat's `until` and the items after it as any step is (R2, R4). A repeat that ran out is resumed at its last round,
so it can run no round beyond the definition's (R4).

The stopped run's `state.json` gives the position: `at`, the step the run was at when it ended, is the step that
stopped it. To rerun the step that an ask again asked, the resume needs to know that `at` is an ask again, which
`state.json` does not say today. `at` gains the key `asked`, `true` for an ask again and `false` otherwise, and a run
written before it, which has no ask again, is read as `false`. The rerun of an ask again is then the step of the same
item, round and index, numbered `at.number - 1`, which is the number of the step that was asked, since an ask again
always takes the number after it (R2, R6). `state.json` also gains `resumes`, the name of the directory of the run
resumed, or `null` (R6). Runs from before both keys are accepted without them, as runs without `branch` are.

The driver in `scripts/agentrite.mjs` gets a second way to prepare a run. `orchestrateCommand` keeps what both share,
from making the run's directory to the end report, and takes what differs from one of two preparers: the one of a run,
which is today's code, and the one of a resume, which finds the latest run of the unit on the checked-out branch's
variant, makes every refusal of R8, and gives the stopped run's definition text, its `definition` path, the position,
its sessions, `resumes`, and the opening line. The listing of a unit's run directories that `readRuns` does today is
extracted, so that the resume chooses among the same runs that `npx agentrite runs` lists (R1). The validation of a
run's `state.json` and `definition.json` that `runFrom` does is extracted in `scripts/agentrite-runs.mjs`, so that a
resume refuses a run's files by the same messages as `runs` (R8). The resume's `state.json` starts its `sessions` with
the stopped run's, so that a resume of a resume continues them too (R2, R7).

The rerun's prompt is built in `runStep` of `scripts/agentrite.mjs`, beside the prompt of an ask again: the step's own
`prompt`, then the human's words or the sentence that says the human resumed the run after it stopped at this step,
then the request of the outcome, each part apart by a blank line as the two parts are today (R3). The sentence lives
in `scripts/agentrite-outcome.mjs` beside the request of an ask again.

The opening line is printed through a new member `opening` of `RunOutput`: `plainOutput` writes it as a line, and
`framedOutput` opens the frame of the first step with it, so that it and the first step's line share the first frame
(R10).

The end report of a resume holds the steps of the resume alone, as `npx agentrite runs` and the run's directory do:
the non-blocking findings that an earlier repeat of the stopped run left open, and its items of `afterwards`, stand in
the stopped run's report and are not carried over. This is the report "as a run does" of R10, over the steps the
resume ran.

The order in which the refusals of R8 are made, which the spec leaves to the plan, is: the project's settings and
`orchestrator` as in a run; `--definition` with `--resume`; the unit as in a run; the unit's status; the variant's form
as in a run; no run of the unit on the variant; the latest run's files not of the form; the latest run not ended, or
ended with a status other than 3; the branch. Each is made before anything is written.

## Files

- `scripts/agentrite-runs.mjs`: the form of `state.json` takes `resumes` and `at.asked`; the parsing of a run's two
  files is extracted from `runFrom` into a function the resume also calls; `detailOf` is exported, for the refusal of a
  run that has not ended or did not stop
- `scripts/agentrite-orchestrate.mjs`: `orchestrate` and `runRepeat` take the position to start at; `Planned` gains
  `rerun`; a pure function gives the position from a stopped run's `at`; the opening line; `RunOutput.opening` in
  `plainOutput` and `framedOutput`; `--resume` and `--prompt` in the options, the form, the usage and the parsing
- `scripts/agentrite-outcome.mjs`: the sentence given to a rerun without `--prompt`
- `scripts/agentrite.mjs`: `at.asked` and `resumes` in the `state.json` a run writes; the extracted listing of a unit's
  run directories; the preparer of a resume and its refusals; `orchestrateCommand` split into what a run and a resume
  share and what each prepares; the prompt of a rerun in `runStep`
- `tests/agentrite-runs.test.mjs`: the form of `state.json` with and without the two keys
- `tests/agentrite-orchestrate.test.mjs`: the position, the start in the middle, the prompt, the opening line, the
  options, and every command case of R11
- `README.md`: "agentrite orchestrate", "The orchestrator" with "How a run ends" and "On the host and in the sandbox",
  and "What .orchestrator holds"
- `SANDBOX.md`: the command of a resume in a unit run, in the part on the orchestrator of "Running a unit"

## Tasks

### The form of state.json

- [x] In `tests/agentrite-runs.test.mjs`, test that `runFrom` accepts a `state.json` with `resumes` as a string that is
  not empty and as `null`, and one without `resumes`; that it refuses a `resumes` of another value, naming the file,
  `resumes` and what it must hold; that it accepts `at.asked` as `true`, `false` and missing, and refuses another value
  the same way; and that the message for an extra key of `state.json` and of `at` names the new keys among those they
  hold (R6, R8)
- [x] In `scripts/agentrite-runs.mjs`, add `resumes` to `STATE_PLACE` after `branch`, checked as `branch` is but for a
  missing key, and `asked` to `AT_PLACE` after `index`, a boolean or missing. Update the `holds` texts (R6)
- [x] Extract from `runFrom` an exported function that parses the text of a run's `state.json` and `definition.json`
  and gives the state, typed with every key the resume reads (`definition`, `branch`, `resumes`, `at` with `asked`,
  `sessions`, `ended`), the parsed definition, and the `at` checked against the definition by `stepNamedBy`, throwing
  as `runFrom` throws today. `runFrom` calls it and is otherwise unchanged, and its tests pass as they are (R8)
- [x] Export `detailOf`, unchanged (R8)

### The position a resume starts at

- [x] In `tests/agentrite-orchestrate.test.mjs`, test the pure function that gives the position from a stopped run's
  `at` and `sessions`: a step outside a repeat, a step in a repeat, and an ask again, whose position is that of the step
  it asked with the number one lower; the sessions given as the map `orchestrate` keys by role and harness (R2, R6)
- [x] Add that function to `scripts/agentrite-orchestrate.mjs`, with a typedef for the position (R2, R6)
- [x] Test, with `runWith` given a position, that `orchestrate`: runs no item before the position's; runs the step of a
  repeat at the position's round and index, then the rest of that round and the later rounds; numbers the first step
  by the position and every step after it, an ask again among them, one more; marks the first step alone with
  `rerun`; gives the first step the session the position holds for its role and harness, and none when it holds none;
  and asks the rerun again when it gives no outcome and its session is known (R2, R6)
- [x] Test that a resume at a step that stopped for questions, and at one that stopped by `stopWhen`, goes on by the
  rerun's outcome: on to the next item when it is done and clean, and stopping again when it is not (R2, R4)
- [x] Test that a resume at the last step of the last round of a repeat that ran out ends the repeat and goes on with
  the item after it when `until` holds for the rerun, and runs out again with the same rounds, running no further
  round, when it does not (R4)
- [x] In `scripts/agentrite-orchestrate.mjs`, give `orchestrate` the optional position and `runRepeat` the round and
  index to start at; add `rerun` to `Planned`, false for every step but the first of a resume; start the sessions map
  from the position's and the numbers from its number. A call without a position behaves as today, and every existing
  test passes unchanged (R2, R4, R6)

### The prompt, the opening line and the options

- [x] Test that the sentence of a rerun without `--prompt` says that the human resumed the run after it stopped at this
  step, and that `resumeWords` gives the human's words when they are given and the sentence otherwise (R3)
- [x] Add the sentence and `resumeWords` to `scripts/agentrite-outcome.mjs` (R3)
- [x] Test the opening line: it names the stopped run's directory and the step it reruns by `stepHead`, as
  `Resuming the run .orchestrator/<unit>/<run>/ at step 2, round 1 of 3, implementer, claude, claude-sonnet-5-5`.
  Test that `plainOutput` writes it as a line before the first step's line, and that `framedOutput` puts it and the
  first step's line in one frame, with no rule between them (R10)
- [x] Add the function of the opening line and `opening` to `RunOutput`, `plainOutput` and `framedOutput` (R10)
- [x] Test that `parseOrchestrateArgs` takes `--resume` and `--prompt <text>`, as `--prompt=<text>` too, at any place,
  and gives `resume` and `prompt`; that `--prompt` without a text is refused as `--definition` without a file is; that
  `--prompt` without `--resume` is refused with the line `--prompt is taken only with --resume` and the usage; that
  `--definition` with `--resume` is parsed, since the command refuses it; and that the usage names both options.
  Update `USAGE_FORM` and `ORCHESTRATE_USAGE_FORM` to the new form (R9, R12)
- [x] In `scripts/agentrite-orchestrate.mjs`, add `resume` and `prompt` to `ORCHESTRATE_OPTIONS`, `prompt: 'a text'`
  to `ORCHESTRATE_VALUES`, the refusal of `--prompt` without `--resume`, and both options to `ORCHESTRATE_FORM` as
  `[--definition <file>] [--resume [--prompt <text>]] [--skip-permissions] [--follow]` and to `orchestrateUsage` (R9,
  R12)

### The command

- [ ] In `tests/agentrite-orchestrate.test.mjs`, with the fake harness, a helper that makes a stopped run by running
  `orchestrate` with the outcomes given, so that each case resumes a run the command wrote. Test that a plain run's
  `state.json` holds `resumes` as `null` and `at.asked`, `true` at an ask again (R6)
- [ ] Test the run chosen: of runs of the unit on two variants and on the unit's branch, a resume on each branch
  resumes the latest of its own, and a branch with no `--` the latest with no variant (R1)
- [ ] Test a resume of a run that stopped for a missing outcome after the ask again gave none either: it reruns the
  step that was asked, numbered as it, with the step's prompt, the human's words or the sentence, and the request of
  the outcome, continuing that step's session, and goes on by its outcome to the steps after it, with the sessions and
  the rounds they would have had. Test the same for questions, a blocking finding of `stopWhen`, and a repeat that ran
  out. Test that a step whose role and harness the stopped run holds no session for starts a new one (R2, R3, R4, R11)
- [ ] Test the prompt with `--prompt`, and with `--prompt` holding a line break, and without it (R3)
- [ ] Test that a resume runs the stopped run's `definition.json` after `agentrite.json` names another definition,
  writes the same text to its own `definition.json` and the stopped run's `definition` path to its `state.json` (R5)
- [ ] Test the resume's directory: a new one under the unit's, named by its instant and variant; its `state.json`
  holding `resumes` with the stopped run's directory name, its `branch` and the sessions of both; its step files
  numbered from the rerun's number, an ask again after the rerun numbered one more; and the stopped run's directory
  unchanged, file for file (R6)
- [ ] Test that a resume that stops is resumed in turn, from its own `state.json`, and that a third run continues the
  sessions of the first (R7)
- [ ] Test each refusal of R8, each exiting 1, printing its message on standard error, starting no harness and making
  no run directory: no run on the variant; a latest run running, stale, ended with 0, and ended with 1 or another
  status, each named with its state and detail as `runs` gives them; a latest run with no `branch`, `branch` `null`,
  and another branch, naming both; a latest `state.json` and `definition.json` that is not JSON or not of the form,
  naming the file; a unit that is `implemented`, `cancelled` and `draft`, naming the status; and `--definition` with
  `--resume`. Test that `--prompt` without `--resume` exits 2 with the usage (R8, R9)
- [ ] Test that a resume prints its opening line first, then its step lines and end report, with `--follow` in frames
  and without it plainly, writes the followed files and the heartbeat, and exits 3 when it stops and 0 when it runs to
  its end (R10)
- [ ] In `scripts/agentrite.mjs`, write `asked` in `at` and `resumes` in `state.json`, in the order unit, definition,
  branch, resumes, at, sessions, ended (R6)
- [ ] Extract from `readRuns` the listing of the run directories of one unit that have a `state.json`, and use it in
  `readRuns` and in the resume (R1)
- [ ] Add the preparer of a resume: it makes the refusals in the order of the approach, each message naming what R8
  says it names; finds the latest run by the largest directory name among the unit's runs of the variant; parses its
  files with the function extracted from `runFrom`; refuses an ended run whose `at` is `null` as a `state.json` not of
  the form; and gives the definition, its text and path, the position, the sessions, `resumes` and the opening line
  (R1, R5, R8)
- [ ] Refuse a unit of a status other than `approved` or `in-progress` in a resume, naming the status and saying that
  a resume takes a unit that is approved or in progress. A run keeps `checkApproved` as it is (R8)
- [ ] Split `orchestrateCommand` into the preparation, the run's as today or the resume's, and what both share. The
  shared part starts the sessions it writes from those it is given, passes the position to `orchestrate`, and prints
  the opening line through `output.opening` for a resume (R2, R6, R7, R10)
- [ ] In `runStep`, give a planned step with `rerun` the step's `prompt`, `resumeWords` of the human's words, and the
  request of the outcome, apart by blank lines; an ask again and every other step keep their prompts (R3)

### The documents

- [ ] "agentrite orchestrate" of `README.md`: the form with both options, their rows in the table, that `--prompt` is
  taken only with `--resume` and is refused with the usage otherwise, the refusals of a resume beside those of a run,
  and that a resume exits as a run does (R12)
- [ ] "The orchestrator" of `README.md`: in "How a run ends", replace the sentence that a stopped run is not picked up
  again with what `--resume` does: which run it resumes, which step it reruns and with what prompt, how it goes on, the
  definition it runs, its opening line, and that it can be resumed in turn. In "On the host and in the sandbox", the
  command of a resume on the host and in the sandbox (R12)
- [ ] "What .orchestrator holds" of `README.md`: that a resume has a directory of its own, that its `definition.json`
  is the stopped run's, that its `state.json` holds `resumes` and the stopped run's `definition` path, that `at`
  holds `asked`, that both keys are missing in a run from before them, how a resume's step files are numbered, and
  that the stopped run's directory is not changed (R12)
- [ ] `SANDBOX.md`, after the command of a run in a unit run: the command of a resume in a unit run, as
  `./sandbox.sh 0029 npx agentrite orchestrate 0029 --resume --skip-permissions`, with `--prompt` (R12)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes on the committed branch
- [ ] No line of a changed file is longer than 120 characters
- [ ] Every requirement from R1 to R12 is delivered by a ticked task, and every task traces to one

## Commit Points

- [x] `feature-0089 Plan the resume of a stopped run`: `plan.md` and the record's entry
- [x] `feature-0089 Take resumes and asked in the state of a run`: the tasks of "The form of state.json"
- [x] `feature-0089 Start a run of the definition at a step`: the tasks of "The position a resume starts at"
- [x] `feature-0089 Take --resume and --prompt, and print the opening line`: the tasks of "The prompt, the opening
  line and the options"
- [ ] `feature-0089 Resume the latest stopped run of a unit`: the tasks of "The command"
- [ ] `feature-0089 Describe the resume of a run`: the tasks of "The documents"
