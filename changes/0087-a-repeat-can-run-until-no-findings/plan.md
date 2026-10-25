# 0087 A repeat can run until no findings

## Approach

The definition. In `scripts/agentrite-definition.mjs`, the typedef `Repeat` takes
`until?: 'no-blocking-findings' | 'no-findings'`. A constant `UNTIL_VALUES`, `['no-blocking-findings',
'no-findings']`, holds the values, and `parseRepeat` checks `until` against it through `valueAt`, with
`'"no-blocking-findings" or "no-findings"'` as what it must hold, and copies the value it took into `repeat.until`.
A refused value then reads, as today but with both values, `steps[0].repeat.until is "x". It must hold
"no-blocking-findings" or "no-findings"` (R1).

The repeat. In `scripts/agentrite-orchestrate.mjs`, `runRepeat` returns `{ end, unfixed }`: `end` as today, the `End`
that stops the run or `undefined`, and `unfixed`, the `Ran` of the last step of the last round when the repeat ran out
under `"no-findings"` with findings none of which blocks, or `undefined`. After a round whose last step gave an outcome
of the form, with `outcome` that outcome:

* the repeat ends, with neither `end` nor `unfixed`, when `until` holds: for `"no-blocking-findings"` when
  `blocks(outcome)` is false, as today, and for `"no-findings"` when `outcome.findings` is empty (R2, R3)
* after the last round, when `until` does not hold, `end` is the `ran-out` of today when `blocks(outcome)`, and
  otherwise `unfixed` is that step's `Ran` and the run goes on (R4, R5). Under `"no-blocking-findings"` an `until` that
  does not hold means that a finding blocks, so that value always gives the `ran-out` of today (R2)

Everything else in `runRepeat` stays: a step's own stop is judged first, and a round whose last step gave no outcome of
the form goes on to the next round. `orchestrate` collects every `unfixed` into a list in the order the repeats ran and
returns `{ ran, end, unfixed }` from both of its returns. `exitStatus` does not change: `unfixed` stops nothing, so a
run that then runs every item ends `complete` and exits 0 (R5).

The end report. `endReport` takes `unfixed` as a third parameter, before `where`, and puts its lines after the lines
of the last step and before `After the run:`, whatever `end` is (R6). A function `unfixedLines(unfixed)` gives, for
each `Ran` in order, `Non-blocking findings still open after step <number>:` with `planned.number`, followed by each
finding of its outcome. A function `findingLine(finding)` gives the line of one finding, `  <id>: <summary>`, and both
`unfixedLines` and the list of the blocking findings still open in `lastStepLines` use it, so that the two lists have
one form (R6). The command in `scripts/agentrite.mjs` takes `unfixed` from `orchestrate` and passes it to `endReport`.
What it writes to `state.json` stays `endLine(end)`.

The default. `orchestrator.json` changes `"until"` to `"no-findings"` and nothing else (R7). Seven tests of
`tests/agentrite-orchestrate.test.mjs` run the default with a last review that holds only the non-blocking finding
`MINOR`, and expect the repeat to end there; under the new default the repeat goes on to round 2 and they fail. A
probe of the change on a scratch copy of the tree found them, at the lines they start on at `3837f99`:

* 97, `the default with no blocking finding at the first review runs steps 0 to 2 and ends complete`
* 175, `a step that gives its outcome in a blockquote does not stop the run`
* 183, `a step whose quoted block is left open before its outcome does not stop the run`
* 321, `started and ended are called once each per step, in order, ended with the reading and the stop`
* 477, `the report of a run that ran every item gives the table, the line of the end, the summary and where`
* 1171, `a run whose every item ends runs the default definition and exits 0`
* 1253, `a run whose steps leave items for after the run exits 0, and gives them grouped by step`

Each keeps what it tests by giving its last review no finding, as `done()` or `DONE` does, so that the repeat still
ends at round 1. The test at line 97 is renamed to say `no finding` where it says `no blocking finding`. The test at
line 117, whose last review in round 3 holds `MINOR` alone, still passes, now by requirement 5. In
`tests/agentrite-definition.test.mjs`, the test of the default at line 33 expects `until: 'no-findings'`.

The documents. "The definition" and "How a run ends" of `README.md` change as requirements 8 and 9 give, and the JSON
of the default there is replaced by `orchestrator.json` as it ships (R8, R9). The place of the new lines, after those
of the last step and before `After the run:`, is what "How a run ends" says. Its sentence "Nothing else is taken from
an earlier step." becomes true again by naming the non-blocking findings still open as the second thing taken from an
earlier step, beside `afterwards`.

## Files

- `scripts/agentrite-definition.mjs`: the `Repeat` typedef, `UNTIL_VALUES`, and `parseRepeat` taking both values
- `scripts/agentrite-orchestrate.mjs`: `runRepeat` returning `{ end, unfixed }`, `orchestrate` returning `unfixed`,
  `findingLine`, `unfixedLines`, `lastStepLines` through `findingLine`, and `endReport` taking `unfixed`
- `scripts/agentrite.mjs`: `orchestrate`'s `unfixed` passed to `endReport`
- `orchestrator.json`: `"until": "no-findings"`
- `tests/agentrite-definition.test.mjs`: the test of the default, and the tests of `until`
- `tests/agentrite-orchestrate.test.mjs`: the tests of the repeat, of the end report and of the command, and the seven
  tests the new default changes
- `README.md`: "The definition" and "How a run ends"

## Tasks

- [x] In `tests/agentrite-definition.test.mjs`, test that a repeat with `until: 'no-findings'` is taken as typed, beside
  the one without `until`, and change the test `stopWhen and until of any other value are refused`: `'no-findings'`
  leaves the refused values of `until`, which are `'blocking-findings'`, `'no-blocking'`, `false` and `null`, and the
  message it expects reads `It must hold "no-blocking-findings" or "no-findings"`. Run the file and see the two fail
  (R1, R10)
- [x] In `scripts/agentrite-definition.mjs`, take both values as the approach gives, and run the file to green (R1)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add a constant `UNTIL_NO_FINDINGS`, a definition of one repeat of 3
  rounds with `until: 'no-findings'` and the single step of a reviewer, followed by a planner, as the test
  `a repeat with until that holds at once goes on with the item after it` builds it. Add unit tests through `runWith`
  (R3 to R5, R10):
    * `no-findings`, a review with no finding in round 1: the repeat ends after round 1, the planner runs, the run is
      `complete` and `unfixed` is empty
    * `no-findings`, a review with `MINOR` alone in rounds 1 and 2 and none in round 3: three reviews run, then the
      planner, and `unfixed` is empty, so a non-blocking finding before the last round does not end the repeat
    * `no-findings`, a review with `blocked()` in round 1 and none in round 2: two reviews run, then the planner
    * `no-findings`, `blocked()` in all three rounds: `ran-out` after step 2, with `rounds` 3, exit status 3, the
      planner not run, and `unfixed` empty
    * `no-findings`, `clean()` in all three rounds: the planner runs, the run is `complete`, exit status 0, and
      `unfixed` holds the `Ran` of step 2 alone
- [ ] Add the same cases for `until: 'no-blocking-findings'`, with an outcome with no finding, one with `MINOR` alone
  and one with a blocking finding, in a round before the last and in the last: the repeat ends at the first round
  whose review blocks nothing, a last round that blocks runs out as today, and `unfixed` is empty in each (R2, R10)
- [ ] Add unit tests of the end report through `reportOf`, which passes `run.unfixed` to `endReport` (R6, R10):
    * the run of `UNTIL_NO_FINDINGS` with `clean()` in all three rounds and a planner that gives `done()`: after the
      planner's summary come `Non-blocking findings still open after step 2:` and `  C1: A name could be clearer`,
      then the lines of where
    * the same with the planner's outcome holding an item of `afterwards`: the line and its finding stand before
      `After the run:`
    * the same with the planner's outcome `needs-human`: the end line names step 3, and the line and its finding of
      step 2 are still given
    * a definition of two repeats of `until: 'no-findings'` and 1 round each, both giving `clean()` with findings of
      different summaries: two such lines, for step 0 and then step 1, each followed by its own findings
    * the run of the default that ran out, as the test `the report of a repeat that ran out gives the open blocking
      findings and the rounds` has it, still gives `Blocking findings still open:` with the blocking findings alone,
      and no line of non-blocking findings (R4)
- [ ] Run the file and see the new tests fail, then make `runRepeat`, `orchestrate`, `findingLine`, `unfixedLines`,
  `lastStepLines` and `endReport` as the approach gives, and pass `unfixed` from `orchestrate` to `endReport` in
  `scripts/agentrite.mjs`. Run the file to green (R2 to R6)
- [ ] Add a test of the command beside `a run whose repeat ends at its first round goes on with the item after the
  repeat`: a definition in `definitions/until.json` of one repeat of 2 rounds with `until: 'no-findings'` and the
  single step of a reviewer in OpenCode, answered with an outcome holding `MINOR` in both rounds. The command exits 0,
  makes two calls, and its standard output holds `\nNon-blocking findings still open after step 1:\n  C1: A name could
  be clearer\n` (R11)
- [ ] Change `"until"` of `orchestrator.json` to `"no-findings"`. In `tests/agentrite-definition.test.mjs` the test of
  the default expects `until: 'no-findings'`. Change the seven tests of `tests/agentrite-orchestrate.test.mjs` that
  the approach names so that their last review gives no finding, and rename the one at line 97. Run both files to
  green (R7)
- [ ] In "The definition" of `README.md`, describe `until` with its two values: `"no-blocking-findings"` as today, and
  `"no-findings"`, which ends the repeat when the outcome of the last step of a round holds no finding, stops the run
  when that outcome still holds a blocking finding after the last round, and otherwise lets the run go on with its
  findings listed in the end report. Rewrite the prose before the default's JSON to say that a review with no
  findings ends the repeat, that a third review with a blocking finding stops the run, and that a third review with
  only non-blocking findings lets the run end with those findings listed. Replace the JSON with `orchestrator.json`
  as it ships (R8)
- [ ] In "How a run ends" of `README.md`, change the item `a repeat with until ran out` to say that a repeat with
  `"no-findings"` whose last round leaves only non-blocking findings stops no run. In the paragraph of what the
  command prints last, add after the lines of the step that ran last the line `Non-blocking findings still open after
  step <number>:` and its findings, for each repeat that ended so, in the order they ran and whatever ended the run,
  and make its last sentence name them beside the items of `afterwards` as what is taken from an earlier step (R9)

## Verification

- [ ] `npm test` passes in full
- [ ] `node -e "JSON.parse(require('fs').readFileSync('orchestrator.json'))"` succeeds, and the JSON in "The
  definition" of `README.md` is the same text as `orchestrator.json`
- [ ] Every line the unit touches in `README.md`, `scripts/` and `tests/` is at most 120 characters
- [ ] `npm run check-changes` passes on the committed branch

## Commit Points

- [x] `feature-0087 Plan a repeat that runs until no findings`: `plan.md` and the log entry in `record.md`
- [x] `feature-0087 Take no-findings as the until of a repeat`: the first two tasks
- [ ] `feature-0087 End a repeat at no findings and list what it left open`: the tasks of the repeat, the end report
  and the test of the command
- [ ] `feature-0087 Run the default's repeat until no findings`: the task of the default
- [ ] `feature-0087 Describe until no-findings in the README`: the two tasks of `README.md`
