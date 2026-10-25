# 0085 The orchestrator's own output stands out when followed

## Approach

Today `orchestrateCommand` in `scripts/agentrite.mjs` prints the line before a step with `console.log` in `started`,
the items of a step through a `followPrinter` made in `run` when `follow` is set, the line after a step with
`console.log` in `ended`, and the end report with `process.stdout.write` after a blank line. The work gathers what the
command prints on standard output into one printer of the run, chosen once by `follow`, so that the frames are
decided in one place, in `scripts/agentrite-orchestrate.mjs`, and tested there with plain values.

The printer of a run is a `RunOutput`: `{ started(line), items(timed), ended(line), report(text) }`, each taking the
text the command already builds (`stepLine`, `timedItems`, `endReport`). There are two:

* `plainOutput(write)`, without `--follow`: `started` and `ended` write the line and a line break, `items` writes
  nothing, and `report` writes a line break and the report. That is byte for byte what the command writes today, as
  `console.log` on standard output is a write of the line and a line break (R5)
* `framedOutput(write)`, with `--follow`: as `plainOutput`, with the items of each step printed through a
  `followPrinter` made anew in `started`, and the frames around the command's own lines

The work is split in two commits, so that a reviewer can check the first for preserving behaviour and the second for
its behaviour, as the standards ask. The first adds the two printers with the behaviour of today, `framedOutput`
then holding no frame and being named `followOutput`; the second turns `followOutput` into `framedOutput`.

### The frames

`OPENING_RULE` is `==== agentrite ` followed by `=` to 80 characters in all, and `CLOSING_RULE` is 80 `=`, both
plain, with no escape sequence (R4). They are exported constants of `scripts/agentrite-orchestrate.mjs`, written from
one `RULE_WIDTH` of 80.

`framedOutput` writes through a function of its own that keeps the last two characters written, and has a frame open
or not:

* opening a frame writes a line break first when something was written and it does not end in a blank line (the
  last two characters are not `\n\n`), then the opening rule and a line break. The first output of the run has no
  blank line before it, and a frame after a text message, whose printing ends in a blank line, gets no second one
  (R3)
* `started(line)`: opens a frame unless one is open, which is the first step only, writes the line, and closes the
  frame: the closing rule, a line break, and a blank line. Then it makes the step's `followPrinter`. No frame is open
  while the step runs (R2)
* `items(timed)`: the step's `followPrinter`, unchanged but for its first blank line (below)
* `ended(line)`: opens a frame and writes the line, and leaves the frame open. What follows it is either the line of
  the next step, in `started`, or the end report, as `orchestrate` gives: `runStep` calls `ended` last, and the next
  `started`, or the return to the command, follows with no step run between them (R2)
* `report(text)`: writes a line break, the report, which ends in a line break, and the closing rule and a line break
  (R1, R3)

So a run of two steps prints: rule, line of step 0, rule, blank, items; blank when needed, rule, line after step 0,
line of step 1, rule, blank, items; blank when needed, rule, line after step 1, blank, end report, rule. No two rules
stand on consecutive lines: a step with no item has the blank line after the closing rule between it and the next
opening rule (R2).

The blank line after a closing rule is written by the frame and not by the items. Requirement 3 asks that a rule never
touches an item, and the first item of a step is a tool call as often as a text message, and a call opens with no blank
line: the blank line can only be the frame's. So `followPrinter` starts as though a blank line was just written, its
state `afterText` renamed `afterBlank` and starting `true`, and a first text message opens with no blank line of its
own. Between the frame and the first item stands one blank line, whatever its kind, and after the first item every
blank line is as today (R3, R6). This is the one reading of R3 and R6 that works, and is logged in `record.md`.

A thrown error between `ended` and the next `started`, as a `state.json` that cannot be written, ends the command with
a frame open and no closing rule. The error goes to standard error, and nothing of the run goes on, so the frame is
left as it is.

## Files

- `scripts/agentrite-orchestrate.mjs`: `RunOutput`, `plainOutput`, `followOutput` and then `framedOutput`,
  `RULE_WIDTH`, `OPENING_RULE`, `CLOSING_RULE`, and `followPrinter` starting after a blank line
- `scripts/agentrite.mjs`: `orchestrateCommand` prints through the printer of the run, and imports it
- `tests/agentrite-orchestrate.test.mjs`: unit tests of the printers and the rules, the test of `followPrinter`, and
  the tests of the command with `--follow` and without it
- `README.md`: "How a run ends", its prose on `--follow` and its example of a followed step

## Tasks

### The printers, with the behaviour of today

- [x] In `tests/agentrite-orchestrate.test.mjs`, add a unit test that `plainOutput`, given a `started`, items, an
  `ended`, a second `started` and `ended` and a `report`, writes the two lines of each step, nothing of the items, and
  a blank line before the report, exactly as the command writes them today (R5)
- [x] Add a unit test that `followOutput`, given the same, writes the items of each step through a printer of its own
  between the step's two lines, a first text message of each step opening with a blank line, as `followPrinter` does
  today (R6)
- [x] In `scripts/agentrite-orchestrate.mjs`, add the `RunOutput` typedef, `plainOutput(write)` and
  `followOutput(write)` as the approach gives them, with JSDoc, and see the two tests pass (R5, R6)
- [x] In `orchestrateCommand` of `scripts/agentrite.mjs`, make `output` once, `follow ? followOutput(write) :
  plainOutput(write)` with `write` a write to `process.stdout`, and call `output.started(stepLine(planned))` in
  `started`, `output.items(timed)` in place of `if (follow) print(timed)` in `run`, with the `followPrinter` of `run`
  removed, `output.ended(stepLine(planned, entry))` in `ended`, and `output.report(endReport(...))` in place of the
  write of the report. The followed file is added to as before, with `--follow` and without. Name the local `write`
  of the run's files apart from the write to standard output, as `writeFile`, if the two would clash (R5, R6)
- [x] Run `npm test` and see every test pass unchanged, the tests of the command with `--follow` and without among
  them (R5, R6)

### The frames

- [x] Add a unit test that `OPENING_RULE` is `==== agentrite ` and 65 `=`, `CLOSING_RULE` is 80 `=`, both 80
  characters, and neither holds `\x1b` (R4, R8)
- [x] Change the test of `followPrinter` so that a first text message opens with no blank line, the rest of its output
  as today (R3, R6)
- [x] Replace the unit test of `followOutput` by tests of `framedOutput`, each on the whole text written (R8):
    * a run of one step with no item and its report: opening rule, the step's line, closing rule, blank line, opening
      rule, the line after the step, blank line, the report, closing rule; the first frame around one line, the last
      around several with the blank line before the report kept, and no two rules on consecutive lines (R1, R2, R3)
    * a run of two steps, the first with a tool call as its first and last item, the second with a text message as
      its first and last item, and the end report: the frames fall as R2 gives them, the line after step 0 and the
      line of step 1 in one frame, the line after step 1 and the report in one, one blank line between each rule and
      the item next to it, one blank line before each frame but the first, and the items as `followPrinter` gives
      them (R1, R2, R3, R6)
    * a step's items written after its `started` stand after a closing rule and before any opening rule, so that no
      frame is open while a step runs (R2)
- [x] In `scripts/agentrite-orchestrate.mjs`, add `RULE_WIDTH`, `OPENING_RULE` and `CLOSING_RULE`, rename
  `followOutput` to `framedOutput` and give it the frames as the approach gives them, change `followPrinter` to start
  after a blank line with its state named `afterBlank`, and update the JSDoc of both. See the unit tests pass (R1 to
  R4, R6)
- [x] In `scripts/agentrite.mjs`, import and use `framedOutput` in place of `followOutput`, and update the JSDoc of
  `orchestrateCommand` to say that with `follow` its own lines and the end report stand in frames (R1)
- [x] Update the tests of the command in `tests/agentrite-orchestrate.test.mjs` that read the output of a run with
  `--follow`: `between` reads what stands between the closing rule after a step's line and the opening rule before
  the line after it, and the test of the messages and calls of each step expects them there with no blank line at
  their end of their own beyond those the items print, and `endReportOf` is not used on a followed run where the
  closing rule now ends it (R6, R9)
- [x] Add a test of the command with `--follow`, on `followedRun`, that the whole of standard output, the times of the
  step lines and the run's name written as fixed text, is the frames of R2 around the step lines and the end report,
  with each step's followed items between them (R1, R2, R3, R9)
- [x] Add to the test of a run without `--follow` that its standard output holds no line of `OPENING_RULE` or
  `CLOSING_RULE`, and keep its check that it is the step lines, a blank line and the end report, as before (R5, R9)
- [x] Check that the test of a run with `--follow` against one without still finds the same step lines, end report,
  files, contents and exit status, reading the end report of the followed run without its closing rule, and that the
  tests of standard error are unchanged (R6)

### The documents

- [x] In "How a run ends" of `README.md`, after the prose on `--follow`, say that with it the command's own lines and
  the end report stand in frames: an opening rule `==== agentrite ` and `=` to 80 characters on the line before, and
  a closing rule of 80 `=` on the line after, plain on a terminal and on a pipe; that the line of the first step has
  a frame of its own, the line after a step and the line of the next share one, and the line after the last step and
  the end report share one; that a blank line stands between a rule and an item of a step; and that no frame is open
  while a step runs, so what the harness prints on standard error stands outside them. Change the example of a
  followed step so that it shows the frames, the step being the first of the run and followed by a second. Leave the
  line of `--follow` in the options table of "agentrite orchestrate" as it is (R7)
- [x] Read the passage on `--follow` in "Running a unit" of `SANDBOX.md`, and leave it as it is: it says what the
  option is for and points to the command, and nothing in it changes (R7)
- [x] Check that every changed line of the unit fits 120 characters

## Verification

- [x] `node --test tests/agentrite-orchestrate.test.mjs` passes
- [ ] `npm test` passes
- [ ] A run of a fake harness, as the tests make one, with `--follow` and piped to `cat -A`, shows the rules plain
  with no escape sequence, and the same run without `--follow` prints what it printed on `master` before the unit,
  compared with `diff` after the times and the run's name are written as fixed text (R4, R5)
- [ ] `npm run check-changes` passes once the work is committed

## Commit Points

- [x] `feature-0085 Plan framing the orchestrator's own output`: `plan.md` and the record's entry
- [x] `feature-0085 Print the orchestrator's output through one printer of the run`: the tasks under "The printers,
  with the behaviour of today", with no change of behaviour
- [x] `feature-0085 Frame the orchestrator's own output when followed`: the tasks under "The frames" and "The
  documents"
- [ ] `feature-0085 Record the implementation`: `record.md`
