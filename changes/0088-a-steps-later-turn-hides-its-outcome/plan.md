# 0088 A step's later turn hides its outcome

## Approach

The ask again is decided in `orchestrate` of `scripts/agentrite-orchestrate.mjs`, which already plans every step,
keeps the sessions and judges each step, and names no harness (R5). The command's `runStep` of
`scripts/agentrite.mjs` gives it its prompt, and the lines and the end report mark it. The arguments a step's harness
is started with do not change, and neither does `scripts/agentrite-headless.mjs`.

**Planning the ask again (R1, R2, R3).** `Planned` gains `asked: boolean`, `true` for an ask again and `false` for
every other step. The inner `runStep` of `orchestrate` takes `asked` as a last parameter, `false` by default. After a
step is judged, it asks again when all three hold:

* `judgeStep` gave `'none'`, which it gives only for a harness that exited 0 with no signal, a step that did not run
  past its time limit, and a reading of kind `none`, which holds for no block marked `json` and for no final response
* `asked` is `false`
* `sessions` holds a session for the step's role and harness once its result is in

Then the step's `Ran` is pushed and given to `effects.ended` with `stop: undefined`, since it did not stop the run,
and `runStep` returns what `runStep(step, item, round, index, true)` returns. Otherwise it returns the step's own
`Ran`, as today. `runRepeat` and the loop of `orchestrate` take what `runStep` returns, so an ask again's `Ran` is the
one `stoppedBy`, `until` and the end report read, with no change to them. The ask again has the next number, since
`planned.number` is `ran.length`, and continues the session, since `sessions` already holds the step's.

**Its prompt (R1, R6).** `scripts/agentrite-outcome.mjs` gains `askAgainRequest(round)`, which gives this paragraph,
an empty line and `outcomeRequest(round)`:

> Your last response held no block marked json, so AgentRite's orchestrator could not read the outcome of this step.
> Give the outcome of the step now, for its work as it stands.

`runStep` of `scripts/agentrite.mjs` gives an ask again `askAgainRequest(round)` as its whole prompt, without the
step's `prompt`, and every other step what it gives today.

`outcomeRequest` gains one paragraph, after the paragraph of `needs-human` and the two lists and before the paragraph
of how a finding is recorded, which a test of 0068 keeps last:

> Your final response is the last response of this step: end no turn after it. Before you give it, wait until every
> command you started in the background has ended, so that none of them reports its end after it.

**How it shows (R4).** In `scripts/agentrite-orchestrate.mjs`:

* `stepLine` writes `, asked again for its outcome` after the head of an ask again, before `: started` and before
  `: <result> after <duration>`, as `step 2, round 1 of 3, implementer, claude, claude-sonnet-5-5, asked again for
  its outcome: done after 0m 12s`. `stepHead` does not change, so `agentrite runs`, which names the step a run is at
  from `state.json`, does not either
* `ranTable` gains a last column, `asked again` for an ask again and empty for every other step, and each row is
  trimmed at its end, so a run without an ask again prints its list as today
* `numberWidth` counts two steps for every step the definition can reach, so the digits cover an ask again after
  each. The default's 7 steps give 14, still two digits

The files need no other change: `fileOf` in `orchestrateCommand` names a step's files by `planned.number`, so the step
asked keeps `<n>-<role>.response.md` when it has a response, and the ask again gets `<n+1>-<role>.followed.jsonl` and
its outcome or response file. `state.json` holds the ask again's number in `at` as for any step.

**The documents (R8).** "The orchestrator" of `README.md`: "The outcome of a step" gets what the new paragraph of
the request asks; "How a run ends" gets when a step is asked again and when not, what the ask again is given, that
its outcome stands for the step's, and its line, with an example; its bullet of a response without a block marked
`json` says that this stops the run only for an ask again, a step whose session is not known, or after a failed
harness or a time limit; the end report's list gets its column; "What .orchestrator holds" says that an ask again has
files of its own and that the step asked keeps its response file. `SANDBOX.md` and `CONTRIBUTING.md` do not change.

## Files

- `scripts/agentrite-orchestrate.mjs`: `asked` in `Planned`, the ask again in `orchestrate`, `stepLine`, `ranTable`,
  `numberWidth`, and their doc comments
- `scripts/agentrite-outcome.mjs`: `askAgainRequest`, and the paragraph of the final response in `outcomeRequest`
- `scripts/agentrite.mjs`: the prompt of an ask again in `runStep`
- `tests/agentrite-orchestrate.test.mjs`: tests of `orchestrate`, `stepLine`, `ranTable` and `stepFileName`, and of
  the command; the case of a response with no block taken out of the test of each stop. That test is the only one of
  the command that stops at a step with no block and a known session: the others without an outcome end the step by a
  signal or a failed harness, and the tests through `runWith` give no session unless they name one
- `tests/agentrite-outcome.test.mjs`: the expected text of the request, and of the ask again's
- `README.md`: "The outcome of a step", "How a run ends" and "What .orchestrator holds"

## Tasks

- [x] Write the regression test of the command in `tests/agentrite-orchestrate.test.mjs`, beside the test of each
  stop: the default definition, the planner done, the implementer of round 1 printing
  `claudePrinted('I did the work, and give no block.', <session>)`, the ask again printing a done outcome, and a
  review with no finding. The run exits 0 with five calls; the fourth is `claude` with `--resume` and the session of
  the second call last among its options, and its prompt is the unit's line, the ask again's paragraph and the
  request for round 1 of 3, without the implementer's prompt of the definition. The run's directory holds
  `01-implementer.response.md` with the first response and `02-implementer.outcome.json`, and the reviewer is step 3.
  Run `npm test` and see it fail (R1, R3, R4, R7)
- [x] In the same file, take the case `claudePrinted('I did the work, and give no block.')` out of the test `each stop
  of a step exits 3, starts nothing after the step and says what the human needs`, and add a test of the command in
  which the ask again also gives no block: the run exits 3 after three calls with `Step 2 stopped the run: its final
  response holds no block marked json.` and `The final response of step 2 is at <run>/02-implementer.response.md.`,
  and `01-implementer.response.md` is there too (R2, R3, R7)
- [x] Add a test of the command in which the reviewer, on OpenCode, prints `opencodePrinted('No block.')`: the next
  call is `opencode` with `--session ses_test` last among its options and the ask again's prompt (R5, R7)
- [x] Add unit tests of `orchestrate` through `runWith`, whose results then name a session, as `session: 'abc'`
  (R1, R2, R3, R7):
    * a step with no final response, or with a response without a block, is followed by a step planned with
      `asked: true`, the same step, item, round and index, and the next number, and the step asked has `stop`
      `undefined`
    * an ask again without an outcome ends the run stopped by `none` at the ask again, with no third run
    * a reviewer in round 1 of the default whose ask again gives a blocking finding goes on to round 2, and one whose
      ask again gives no finding ends the repeat
    * a step with `stopWhen` whose ask again gives a blocking finding stops by `stopWhen`
    * a step whose harness exits 1, one that ran past its time limit, one that gave several blocks, and one without a
      session, as `runWith` gives by default, are not asked again
- [x] Add unit tests of `stepLine` for an ask again, started and ended; of `ranTable` with an ask again among rows
  without one, whose rows end with no space; and of `stepFileName` for a definition of one step repeated 51 times,
  whose numbers take three digits (R4, R7)
- [x] Change the expected text of the request in `tests/agentrite-outcome.test.mjs`: a constant `REQUEST_LAST` with
  the paragraph of the approach, which `request(round)` places between `REQUEST_LISTS` and `REQUEST_RECORD`, each
  after an empty line. Add a test that `askAgainRequest(round)` is the ask again's paragraph, an empty line and
  `outcomeRequest(round)`, in a repeat and outside one. Run `npm test` and see these fail (R6, R7)
- [x] Add `askAgainRequest` and the paragraph of `outcomeRequest` to `scripts/agentrite-outcome.mjs`, wrapped within
  120 characters, which the test of the source's line limit checks (R1, R6)
- [x] Add `asked` to `Planned` and the ask again to `orchestrate` in `scripts/agentrite-orchestrate.mjs`, and extend
  the doc comment of `orchestrate` with it (R1, R2, R3, R5)
- [x] Give an ask again its prompt in `runStep` of `scripts/agentrite.mjs` (R1)
- [x] Mark the ask again in `stepLine` and `ranTable`, and count two steps for each in `numberWidth`, with their doc
  comments (R4)
- [x] Run `npm test` and see every test pass, or be skipped for what the host lacks as "The kit's own tests" of
  `CONTRIBUTING.md` gives
- [x] Write the sections of `README.md` the approach names, wrapped within 120 characters (R8)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes on the committed branch
- [ ] `git diff master -- scripts/agentrite-headless.mjs scripts/agentrite-run.mjs` shows nothing, so no tool is taken
  away and `agentrite run` outside the orchestrator is unchanged

## Commit Points

- [x] After the request holds its new paragraph and `askAgainRequest`, with their tests: the sixth and seventh tasks,
  `scripts/agentrite-outcome.mjs` and `tests/agentrite-outcome.test.mjs` alone
- [x] After the ask again runs, shows and has its tests, with `npm test` passing: the remaining tasks up to the run of
  the suite
- [x] After `README.md`
