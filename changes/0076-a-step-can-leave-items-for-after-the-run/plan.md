# 0076 A step of the orchestrator can leave items for after the run

## Approach

The work is in the two modules that own an outcome and a run, and in `README.md`.

`scripts/agentrite-outcome.mjs` owns the form of an outcome and the request. `afterwards` becomes a sixth key: in the
`Outcome` typedef, in `PLACES.outcome` (its `keys` and its `holds` sentence) and in `OUTCOME_CHECKS`, after
`questions`, with the same check as `questions`. The existing `objectFault`, `list` and `plain` give the faults of
requirement 2 in the form the other keys have, so no new checking code is written. The request's list gains the
`afterwards` line and a narrower `questions` line, and a paragraph after the list says which list an item belongs in,
when to give `needs-human`, and how the two lists relate to `**Needed from you**`.

`scripts/agentrite-orchestrate.mjs` owns the judging and the end report. `judgeStep` gains one case, a new `Stop`
named `questions`, judged after `outcome.outcome !== 'done'` and before `declines`. `endLine` gains its sentence.
`endReport` gains a pure function, `afterwardsLines(ran)`, whose lines stand after `lastStepLines` and before the
blank line that precedes the run's directory. It reads every entry of `ran` whose `reading.kind` is `'outcome'`, so a
step without an outcome of the form, also one before the last step, is left out by the same test that keeps it out
of everything else.

`scripts/agentrite.mjs` needs no change: it writes `reading.text`, the block as the step gave it, to each
`<number>-<role>.outcome.json`, which then holds `afterwards` (R14), and it writes `endLine(end)` to `state.json`,
which picks up the new sentence. The line after a step, `stepLine`, does not change.

Every outcome the tests build gains `afterwards: []`, since an outcome without it is no longer of the form. In both
test files that is the shared `DONE` constant, and the spec example in `tests/agentrite-outcome.test.mjs`.

The exact texts the implementer writes, so that the tests and the code agree:

* The `holds` sentence: `An outcome holds outcome, summary, questions, afterwards, findings and declines`
* The request's lines for the two lists, replacing the present `questions` line. Each is one line of the request,
  shown here wrapped, its wrapped lines joined by one space:

  ```
  - "questions": a list of strings, each a thing the step needs from the human for the run to go on. It is empty
    when the step needs nothing of the human for the run to go on
  - "afterwards": a list of strings, each a thing the human needs to do, check or decide after the run, which the
    run can go on without. It is empty when the step leaves nothing for after the run
  ```

* The request's paragraph after the list, before the paragraph on recording an accepted finding, with a blank line
  on each side. It is one line of the request, shown here wrapped, its wrapped lines joined by one space:

  ```
  Give "needs-human" only when the step cannot go on without the human. A step that did its work and leaves items
  only in "afterwards" gives "done". An item belongs in "afterwards" when it is a check that only the human can
  make, as in a running application or on another operating system, an action only the human can take that the
  rest of the run does not need, or a decision for which the step built the answer it recommends. An item belongs
  in "questions", with "needs-human", when the step's work, or the steps after it, cannot do without it, as a spec
  that can be read in two ways, or a decision that the rest of the work depends on and that the step could not
  make. Every item of the list under the line **Needed from you** of your final response is also an item of
  exactly one of "questions" and "afterwards", and every item of these two is an item of that list.
  ```

* The end line of the new stop: `Step <number> stopped the run: its outcome is done, but holds questions, which the
  human answers.`
* The part of the end report, for an implementer in round 1 that left two items and a reviewer in round 1 that left
  one:

  ```
  After the run:
    step 1, round 1 of 3, implementer:
      - Check the new action in a running IDE
      - Decide the label of the button; the step built "Export"
    step 2, round 1 of 3, reviewer:
      - Check the dialog on macOS
  ```

  A step outside a repeat is named `  step <number>, <role>:`

The source lines that hold these texts are wrapped at 120 characters, as the present request is, by string
concatenation.

Unit 0075 is approved and not built. It changes where the end report is printed with `--follow` and not what the
report holds, so the two units touch `endReport` only at its call. Whichever is built second merges its change into
the other's.

## Files

- `scripts/agentrite-outcome.mjs`: `afterwards` in the `Outcome` typedef, `PLACES.outcome` and `OUTCOME_CHECKS`; the
  request's two list lines and its new paragraph
- `scripts/agentrite-orchestrate.mjs`: the `questions` stop in the `Stop` typedef, `judgeStep` and its comment, and
  `endLine`; `afterwardsLines` and its place in `endReport`; the comment of `lastStepLines` and `endReport`, which say
  that nothing is taken from an earlier step
- `tests/agentrite-outcome.test.mjs`: the request's text, `afterwards` in `DONE` and in the spec example, the keys
  sentence, the missing key and the values of a wrong type
- `tests/agentrite-orchestrate.test.mjs`: `afterwards` in `DONE`; the judging; the end report's part and end line;
  the command's runs of requirement 17
- `README.md`: "The outcome of a step", "How a run ends" and "What .orchestrator holds" of "The orchestrator"

## Tasks

- [x] In `tests/agentrite-outcome.test.mjs`, add `afterwards: []` to `DONE` and to the spec example of an outcome
  (both its object and its block text), after `questions`. Change `KEYS` to the `holds` sentence of the approach.
  Add `['afterwards', 'It must hold a list of strings']` after the `questions` entry of the test that names each
  missing key, so that `afterwards is missing. It must hold a list of strings` is expected. Add to the test of a
  value of the wrong type `[{ afterwards: 'none' }, 'afterwards is "none". It must hold a list of strings']` and
  `[{ afterwards: ['a', 5] }, 'afterwards[1] is 5. It must hold a string']`, and a reading of `DONE` with
  `afterwards: ['Check it on macOS.']` that gives an outcome holding the item. Change `REQUEST_LIST` to the two lines
  of the approach in the place of the present `questions` line, and `request()` to hold the paragraph of the approach
  after the list, between blank lines, before `REQUEST_RECORD`. Run `npm test` and see these fail (R1, R2, R3, R4, R5,
  R6, R16)
- [x] In `tests/agentrite-orchestrate.test.mjs`, add `afterwards: []` to `DONE`, after `questions` (R1)
- [x] In `scripts/agentrite-outcome.mjs`, add `afterwards: string[]` to the `Outcome` typedef after `questions`, add
  `'afterwards'` to `PLACES.outcome.keys` after `'questions'`, set its `holds` to the sentence of the approach, and add
  `['afterwards', list('a list of strings', plain(isString, STRING_MUST))]` to `OUTCOME_CHECKS` after `questions`.
  Change the request in `outcomeRequest` to the two lines and the paragraph of the approach. Run `npm test`: the
  outcome tests pass, and so do the orchestrate tests that ran before (R1, R2, R3, R4, R5, R6)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add to `each case of requirement 18 stops at the step it holds for`
  the row `[done({ questions: ['Which?'] }), 'questions']`, after the row of `failed`. Add to `of two cases that hold,
  the first of the order is named` that an outcome `done` with a question, a decline and a blocking finding is judged
  `questions`, and that `needs-human` and `failed` with a question are judged by their outcome. Add a test that a run
  of the default definition whose implementer and reviewer give `done` with items in `afterwards` and no question
  runs to its end, with `end.kind` `'complete'` and `exitStatus` 0. Run `npm test` and see the new rows fail (R7, R8,
  R9, R16)
- [ ] In `scripts/agentrite-orchestrate.mjs`, add `'questions'` to the `Stop` typedef after `'failed'`, and to
  `judgeStep`, after `if (outcome.outcome !== 'done') return outcome.outcome;`, the line `if
  (outcome.questions.length > 0) return 'questions';`. Name unit 0076 in the comment of `judgeStep` beside
  requirement 18 of unit 0065. Add the `questions` case to `endLine`, with the sentence of the approach after
  `Step <number> stopped the run: `. Run `npm test`: the tests of the previous task pass (R7, R8, R9)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add tests of the end report, by `reportOf`, for requirements 10 to
  13: a run of the default definition whose implementer leaves two items and whose reviewer leaves one, which gives
  the lines of the approach's example after `Summary:` and before `WHERE_LINES`; a definition with a step outside a
  repeat that leaves an item, which gives `  step 0, <role>:`; a step whose `afterwards` is empty between two that
  leave items, which is left out; two steps that give the same item, which each print it; a run whose last step gives
  no outcome of the form after an implementer that left an item, which gives that item after the path of the final
  response; a run with no item, which holds no line `After the run:`, as the present report tests already show once
  `DONE` holds `afterwards: []`; and a stop by a `done` outcome with questions, which gives the end line of the
  approach, `Summary:`, `Questions:` and its items. Run `npm test` and see them fail (R8, R10, R11, R12, R13, R16)
- [ ] In `scripts/agentrite-orchestrate.mjs`, add `afterwardsLines(ran)`, which gives `[]` when no entry of `ran`
  with an outcome of the form holds an item, and otherwise `After the run:` and, for each such entry in order whose
  `afterwards` is not empty, `  step <number>[, round <at> of <of>], <role>:` and its items as `    - <item>`. Spread
  it in `endReport` after `lastStepLines` and before the `''` that precedes the run's directory. Change the comments
  of `lastStepLines` and `endReport` to say that the items for after the run are taken from every step, and nothing
  else from an earlier step. Run `npm test`: the tests of the previous task pass (R10, R11, R12, R13)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, among the command's tests, add a test that answers the default
  definition, by `answerDefault`, with a planner that gives `done`, an implementer that gives `done` with two items in
  `afterwards`, and a reviewer that gives `done` with no blocking finding and one item of its own, and checks: exit
  status 0; three steps ran; the standard output holds `After the run:`, `  step 1, round 1 of 3, implementer:` with
  its two items, then `  step 2, round 1 of 3, reviewer:` with its item, after the summary and before `The run's
  directory:`; and that `01-implementer.outcome.json` and `02-reviewer.outcome.json` of the run's directory each
  parse to an object whose `afterwards` is the step's items, and that the run's directory holds no other new file.
  Add to `each stop of a step exits 3` a row for an implementer whose outcome is `done` with the question `Which
  branch?`, which expects `Step 1 stopped the run: its outcome is done, but holds questions, which the human
  answers.`, `Summary: Did it.`, `Questions:`, `  - Which branch?`, and the file `outcome.json`. Run `npm test`: both
  pass (R7, R8, R10, R11, R14, R17)
- [ ] In `README.md`, "The outcome of a step": give `questions` as what the step needs from the human for the run to
  go on, and add after it `afterwards`, a list of strings, what the human needs to do, check or decide after the run,
  which the run can go on without, which may be empty; say what the request says of which list an item belongs in, of
  `needs-human` and of `**Needed from you**`; add `"afterwards": []` to the example after `"questions": []` (R15)
- [ ] In `README.md`, "How a run ends": add to the list of what stops a run, after the case of `needs-human` or
  `failed` and before `declines`, that the outcome is `done` and `questions` is not empty, since the step cannot go
  on without the human's answers; say after the list that `afterwards` stops no run, and that a run that ran every
  item exits 0 when a step left items in it; add to the paragraph of what the command prints last, before the run's
  directory, the items of `afterwards` of every step that gave an outcome of the form, grouped by step in the order
  the steps ran, with the step's number, round and role, a step without items left out, each item as the step gave
  it, also when two steps give the same, and no part when no step left an item; change `Nothing is taken from an
  earlier step` to say that nothing else is; add the example of the approach (R15)
- [ ] In `README.md`, "What .orchestrator holds": say that each `<number>-<role>.outcome.json` holds the step's items
  of `afterwards`, so that the run's directory holds those of every step that gave an outcome of the form (R15)

## Verification

- [ ] `npm test` passes
- [ ] Every line of the changed files is at most 120 characters, as `awk 'length > 120'` on each shows nothing
- [ ] `npm run check-changes` passes on the committed branch
- [ ] Each requirement of the spec, R1 to R17, is delivered by a ticked task above

## Commit Points

- [x] `feature-0076 Read afterwards in an outcome and ask for it`: the first three tasks, after which the suite passes
- [ ] `feature-0076 Stop a run for a done outcome with questions`: the fourth and fifth tasks
- [ ] `feature-0076 Give the items for after the run in the end report`: the sixth to eighth tasks
- [ ] `feature-0076 Document afterwards in README.md`: the last three tasks
