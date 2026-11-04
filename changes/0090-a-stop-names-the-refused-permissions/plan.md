# 0090 A stop names the refused permissions

## Approach

The refused calls are read where everything else of a harness's output is read, in `HEADLESS` of
`scripts/agentrite-headless.mjs`, carried on the step's `Result`, and reported by `endReport` of
`scripts/agentrite-orchestrate.mjs`, which already knows the step that stopped the run and the step an ask again
follows. `orchestrate`, `judgeStep`, `endLine`, `state.json` and the files of the run's directory do not change (R5).

**Reading the refusals (R1).** `scripts/agentrite-headless.mjs` gains an exported typedef `Call`, which is
`Extract<Followed, { kind: 'call' }>`, and each harness of `HEADLESS` gains a member
`refused: (stdout: string) => Call[]`, beside `read` and `follow`, so that `read` and its tests do not change. Each
call is made by `callFollowed` with the time `undefined`, since a refusal carries no instant, and with the harness's
names (`CLAUDE_TOOLS`, `OPENCODE_TOOLS`), so its label is the one `--follow` gives a call of that harness with the same
input:

* `claude`: of every line whose JSON object has `type` `result`, in order, each record of its `permission_denials`
  array whose `tool_name` is a string, with `tool_input` as its input when it is a record and `{}` otherwise. A
  `permission_denials` that is no array gives nothing
* `opencode`: every line whose JSON object has `type` `tool_use`, a record `part` whose `tool` is a string, and a
  record `part.state` whose `status` is `error` and whose `error` is the constant `OPENCODE_REFUSAL`, with
  `part.state.input` as its input when it is a record and `{}` otherwise. `OPENCODE_REFUSAL` is
  `'The user rejected permission to use this specific tool call.'`, defined once in the file, next to
  `OPENCODE_TOOLS`, with a comment that it is the only thing that tells a refused call of OpenCode's from one that
  failed otherwise

The doc comment of `HEADLESS` and its `@type` name the new member.

**Carrying them (R1, R2).** `Result` in `scripts/agentrite-orchestrate.mjs` gains `refused: Call[]`, the calls the
harness refused for lack of permission, in the order it printed them. `runStep` of `scripts/agentrite.mjs` sets it to
`headless.refused(stdout)`, for every step, a step that ran out of time among them.

**One text of a call (R3).** The text of a call after its time, the tool's name and its label after a space, or the
name alone without a label, is what `followedText` prints today and what the report prints now. It is extracted once,
as an exported `callText(call)` beside `callLabel`, and `followedText` uses it. This is a refactoring, committed on its
own before the behavior.

**Reporting them (R2, R3, R4).** `endReport` takes `skipPermissions: boolean` in its last argument, beside
`runDirectory`, `unitDirectory` and `responsePath`, and puts the lines of a new function `refusedLines` directly after
`endLine(end)`, before `lastStepLines`. `refusedLines(ran, end, unitDirectory, skipPermissions)`:

* gives nothing for an end of kind `complete`
* otherwise takes `end.ran`, the step that stopped the run, which a stop and a repeat that ran out both carry. When
  `end.ran.planned.asked` is `true`, the step the ask again follows is the entry of `ran` before `end.ran`, and its
  `result.refused` comes first, then the ask again's own
* gives nothing when that list is empty
* otherwise gives the line `The harness refused <n> tool call for lack of permission:`, with `calls` for any `<n>`
  but 1, and then one line per call, `  ` and `callText(call)`
* and, when `skipPermissions` is `false`, after the calls, these three lines, with `<unit>` the unit's directory:
    * `The run was started without --skip-permissions, so a headless step had nobody to ask.`
    * `In the sandbox, resume the run with the option: npx agentrite orchestrate <unit> --resume --skip-permissions`
    * `On the host, allow the refused calls in the harness's settings instead.`

A resume is a run of its own, started with or without the option, so the same three lines serve it. `runPrepared` of
`scripts/agentrite.mjs` passes the `skipPermissions` it already has to `endReport`. The doc comment of `endReport`
names the new part.

For a planner on Claude Code whose write of the plan was refused, run without the option, the report reads:

```
Step 0 stopped the run: its outcome is needs-human.
The harness refused 1 tool call for lack of permission:
  Write /work/changes/0061-x/plan.md
The run was started without --skip-permissions, so a headless step had nobody to ask.
In the sandbox, resume the run with the option: npx agentrite orchestrate 0061-x --resume --skip-permissions
On the host, allow the refused calls in the harness's settings instead.
Summary: The write of plan.md was refused.
```

**The document (R7).** "How a run ends" of `ORCHESTRATOR.md`: the paragraph that lists what the end report holds
gains, after how the run ended, the refused calls; and a paragraph after the example of the items of `afterwards`
says where they stand, which steps they are taken from, what each line holds, how Claude Code makes a refusal known
(`permission_denials` of every `result` event) and how OpenCode does (a `tool_use` event with status `error` and its
error text), what is added for a run started or resumed without `--skip-permissions`, and that a tool the harness's
settings deny outright, which OpenCode does not offer to the agent, is not reported, followed by the example above.
`COMMANDS.md`, `README.md` and `SANDBOX.md` do not change, as the spec decides.

## Files

- `scripts/agentrite-headless.mjs`: the typedef `Call`, `OPENCODE_REFUSAL`, the member `refused` of each harness, and
  the doc comment of `HEADLESS`
- `scripts/agentrite-orchestrate.mjs`: `refused` in `Result`, `callText` and its use in `followedText`,
  `refusedLines`, and `skipPermissions` in `endReport`
- `scripts/agentrite.mjs`: `refused` in the result of `runStep`, and `skipPermissions` passed to `endReport` in
  `runPrepared`
- `tests/agentrite-outcome.test.mjs`: tests of `HEADLESS.claude.refused` and `HEADLESS.opencode.refused`, beside the
  tests of `read` and `follow` of each harness
- `tests/agentrite-orchestrate.test.mjs`: `refused: []` in the default result of `runWith`, `skipPermissions: false`
  in `WHERE`, tests of `callText`, of the report through `reportOf`, and of the command with the fake harnesses
- `ORCHESTRATOR.md`: "How a run ends"

## Tasks

- [x] Add a test of `callText` in `tests/agentrite-orchestrate.test.mjs`, beside the tests of `callLabel`: a call with
  a label gives the tool, a space and the label, and one with none, `call(NO_LABEL)`, gives `Bash` alone. Add
  `callText` to `scripts/agentrite-orchestrate.mjs` and make `followedText` use it, its output unchanged, which the
  tests of `followedText` and `followPrinter` keep. Run `npm test` and see every test pass (R3)
- [x] Add tests of `HEADLESS.claude.refused` to `tests/agentrite-outcome.test.mjs`. The output holds a `system` event,
  an `assistant` event with a `tool_use` block of `Write`, a `user` event, a line that is no JSON, a `result` event
  whose `permission_denials` holds a `Write` with `file_path` and a `Bash` with `command` and `description`, a
  `result` event with a `permission_denials` that is no array, one without it, and a last `result` event whose
  `permission_denials` holds a `Read` and a record without a `tool_name`. It gives the `Write`, the `Bash` and the
  `Read`, in that order, each with the fields `callFollowed` gives for that harness and `time` `undefined`, and output
  with no `result` event gives none (R1, R6)
- [x] Add tests of `HEADLESS.opencode.refused` to the same file. The output holds a `step_start`, a `text`, a line
  that is no JSON, a `tool_use` of `edit` with `filePath` whose state is `error` with the refusal's text, a `tool_use`
  whose state is `completed`, a `tool_use` whose state is `error` with another error text, a `tool_use` of `bash` with
  `command` and `description` refused, and a `step_finish`. It gives the `edit` and the `bash`, in that order, and
  none from the others. Run `npm test` and see these fail (R1, R6)
- [x] Add `Call`, `OPENCODE_REFUSAL` and the member `refused` of each harness to `scripts/agentrite-headless.mjs`, with
  the doc comment of `HEADLESS`. Run `npm test` and see these pass (R1)
- [x] Add `refused: []` to the default result of `runWith` and `skipPermissions: false` to `WHERE` in
  `tests/agentrite-orchestrate.test.mjs`, and add tests of the report through `reportOf`, with results that give
  `refused` lists of `call(...)` (R2, R3, R4, R5, R6):
    * a step that stops the run by `needs-human` with two refused calls, one without a label: directly after the line
      of the end, `The harness refused 2 tool calls for lack of permission:`, a line per call as `callText` gives it
      after two spaces, the call without a label as its tool alone, and the three lines of the approach with
      `0029-x` as the unit, then `Summary: ...`
    * the same with `skipPermissions: true` in `where`: the count and the calls, and none of the three lines
    * one refused call: `1 tool call`
    * a stopping ask again, the step it follows with one refused call and the ask again with one: the step's call
      first, then the ask again's, under a count of 2
    * a step that stops the run by its harness or by running out of time, with refused calls: they are given
    * a repeat that ran out whose last review has a refused call: it is given
    * a refused call of a step that went on, before a step that stops with none: the report is the one of the same
      run with no refused call at all
    * a run that ran every item, a step of which has a refused call: the report is the one of the same run with
      none
- [x] Run `npm test` and see the new tests of the report fail
- [x] Add `refused` to `Result`, `refusedLines`, and `skipPermissions` to `endReport` in
  `scripts/agentrite-orchestrate.mjs`, with their doc comments, and in `scripts/agentrite.mjs` set `refused` in
  `runStep` and pass `skipPermissions` in `runPrepared` (R1, R2, R3, R4, R5)
- [x] Add tests of the command to `tests/agentrite-orchestrate.test.mjs`, beside the test of each stop, with output
  helpers of the fake next to `claudePrinted` and `opencodePrinted` that add refused calls (R1 to R6):
    * the implementer, on Claude Code, prints a needs-human outcome whose `result` event holds a `permission_denials`
      with a `Write` of `plan.md`: the run exits 3, and after `Step 1 stopped the run: its outcome is needs-human.`
      come the count, `  Write plan.md`, the three lines with `0029-try-the-orchestrator` as the unit, and the
      summary. Its `state.json` holds the same `ended` as for the same run without the refusal, and the run's
      directory the same files
    * the same run with `--skip-permissions`: the count and the call, and none of the three lines
    * the reviewer, on OpenCode, prints a refused `tool_use` of `edit` and no `step_finish`, so that it is asked
      again, and the ask again prints a refused `tool_use` of `bash` and a needs-human outcome: the report gives the
      `edit` before the `bash`, under a count of 2
    * a resume without `--skip-permissions` whose rerun, on Claude Code, has a refused call and stops: its report
      gives the three lines with the unit's directory
    * a run without `--skip-permissions` that stops with no refused call gives no line of the part, which the test
      of each stop already checks line by line after the end line, and a run whose planner has a refused call and
      goes on, and that ends complete, gives the report it gives without the refusal
- [x] Run `npm test` and see every test pass, or be skipped for what the host lacks as "The kit's own tests" of
  `CONTRIBUTING.md` gives, apart from unit 0054's R24 test in `tests/repository-own-files.test.mjs`, which the human
  decided to leave failing
- [x] Write the paragraph and the example of the approach in "How a run ends" of `ORCHESTRATOR.md`, and the refused
  calls in its paragraph of what the end report holds, wrapped within 120 characters (R7)

## Verification

- [x] `npm test` passes, apart from unit 0054's R24 test in `tests/repository-own-files.test.mjs`, which the human
  decided to leave failing
- [x] `npm run check-changes` passes on the committed branch
- [x] `git diff master -- scripts/agentrite-run.mjs COMMANDS.md README.md SANDBOX.md` shows nothing, so `agentrite
  run` outside the orchestrator and the documents the spec leaves alone are unchanged
- [x] No line of the changed files is longer than 120 characters, but a row of a Markdown table

## Commit Points

- [x] After `callText`, with its test and `followedText` using it: the first task alone, a refactoring
- [x] After the reading of the refusals with its tests: the second to fourth tasks,
  `scripts/agentrite-headless.mjs` and `tests/agentrite-outcome.test.mjs` alone
- [x] After the report, the command and their tests, with `npm test` passing: the fifth to ninth tasks
- [x] After `ORCHESTRATOR.md`
