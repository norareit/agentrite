# 0110 Report a harness failure that stops a run of the orchestrator

## Approach

A new member of the harness contract, `headless.errors: (stdout: string) => string[]`, reads from what a headless
run printed on standard output the errors that ended it, in the order it printed them. Each harness module
implements it beside `headless.refused`. `runStep` of `scripts/agentrite.mjs` calls it as it calls `refused`, and
the `Result` of a step gains `errors: string[]`. From there, every use of the errors goes through `Result` and
names no harness (R2).

`judgeStep` gives `harness` when the step did not time out and its harness exited with a status other than 0, was
ended by a signal, or reported an error. The ask again is only made for `none`, so a failure of its harness is never
asked again (R3). The line after the step, the end line, the end report, the step's error file and the `error` of
the end in `state.json` are built from that `Result`.

### What each harness prints, as established

The forms below were established on 2026-11-18, in the sandbox, from the real output of Claude Code 2.1.327,
OpenCode 1.19.6 and Codex 0.167.0, each pointed by its own configuration at a local HTTP server that answered every
request with a status of 500 or 429, or answered the first requests with 500 and then with a valid response. The
reading of OpenCode was also checked against its `run` command in its binary. The samples below are those lines,
with fields the readers do not use left out, and the retries after the first left out, one line of the table for
each line printed, and they are what the tests keep.

**Claude Code.** An error that ends the step is the last `result` event, with `is_error: true`. The text is its
`result` when that is a string that is not empty. A failure before any turn, as a session that cannot be resumed,
gives no `result` and gives the text in `errors`, a list of strings. Claude Code exits 1 in both cases. A retry it
makes prints a `system` event of subtype `api_retry`, and one it recovered from is followed by a `result` with
`is_error: false`. Its error also stands as the text of an `assistant` event with `is_api_error_message: true`,
which is not read, so the error is read once. An error of a tool call is a `tool_result` of a `user` event, and is
not read.

| Line | As printed |
|------|------------|
| 1 | `{"type":"system","subtype":"init","session_id":"a3e1b8e1-1542-4c0f-bf7c-d0ab4dae15cd"}` |
| 2 | `{"type":"system","subtype":"api_retry","attempt":1,"max_retries":10,"error_status":500,"error":"server_error","session_id":"a3e1b8e1-1542-4c0f-bf7c-d0ab4dae15cd"}` |
| 3 | `{"type":"assistant","message":{"model":"<synthetic>","role":"assistant","content":[{"type":"text","text":"API Error: 500 stub: Internal server error. This is a server-side issue, usually temporary — try again in a moment. If it persists, check your inference gateway (127.0.0.1:18500)."}]},"parent_tool_use_id":null,"session_id":"a3e1b8e1-1542-4c0f-bf7c-d0ab4dae15cd","error":"server_error","is_api_error_message":true,"api_error_status":500}` |
| 4 | `{"type":"result","subtype":"success","is_error":true,"api_error_status":500,"result":"API Error: 500 stub: Internal server error. This is a server-side issue, usually temporary — try again in a moment. If it persists, check your inference gateway (127.0.0.1:18500).","session_id":"a3e1b8e1-1542-4c0f-bf7c-d0ab4dae15cd","permission_denials":[],"terminal_reason":"api_error"}` |

A resume of a session that does not exist:

| Line | As printed |
|------|------------|
| 1 | `{"type":"result","subtype":"error_during_execution","is_error":true,"num_turns":0,"session_id":"11111111-1111-4111-8111-111111111111","permission_denials":[],"errors":["No conversation found with session ID: 11111111-1111-4111-8111-111111111111"]}` |

A retry it recovered from, the `assistant` event of the answer between the last two lines:

| Line | As printed |
|------|------------|
| 1 | `{"type":"system","subtype":"init","session_id":"b98e8b3f-8a12-4daf-a8d4-5332414fd70a"}` |
| 2 | `{"type":"system","subtype":"api_retry","attempt":1,"max_retries":10,"error_status":500,"error":"server_error","session_id":"b98e8b3f-8a12-4daf-a8d4-5332414fd70a"}` |
| 3 | `{"type":"result","subtype":"success","is_error":false,"result":"hi","session_id":"b98e8b3f-8a12-4daf-a8d4-5332414fd70a","permission_denials":[]}` |

Only the last `result` is read, since it is the one that ends the step: an earlier `result` with `is_error: true`
ended a turn that the step went on after, which is an error the harness recovered from (R1).

**OpenCode.** An error that ends the step is an event of type `error`, whose `error` holds `name` and `data`. OpenCode
prints one for each `session.error` of the session, and one when the prompt itself fails, and exits 1. Its own text
for the error, which it prints on standard error without `--format json`, is `String(error.data.message)` when
`data` holds `message`, and `String(error.name)` otherwise. The reader takes the same text, and the JSON of
`error` when it has neither. OpenCode prints nothing on standard output for a retry, which goes to a
`session.status` it does not print, so it prints no error it recovered from. An error of a tool call is a
`tool_use` event whose `state.status` is `error`, and is not read.

| Line | As printed |
|------|------------|
| 1 | `{"type":"error","timestamp":1795020618936,"sessionID":"ses_e106f0531ffespk7j7A10c4abU","error":{"name":"APIError","data":{"message":"stub: Internal server error","statusCode":500,"isRetryable":true,"responseBody":"{\"type\":\"error\",\"error\":{\"type\":\"api_error\",\"message\":\"stub: Internal server error\"}}"}}}` |
| 2 | `{"type":"error","timestamp":1795020627447,"sessionID":"ses_e106ee3f1ffeD3vtznaVSYRh2Z","error":{"name":"APIError","data":{"message":"stub: usage limit reached","statusCode":429,"isRetryable":true}}}` |

Every `error` event is read, in order, as OpenCode itself joins them.

**Codex.** An error that ends the step is a `turn.failed` event, whose `error.message` is the text, and Codex exits 1.
An event of type `error` stands before it with the same text, and one whose text opens with `Reconnecting...` is a
retry. A retry it recovered from is followed by `turn.completed`, with no `turn.failed`. An `item.completed` whose
item is of type `error` is a warning the step goes on after. So `turn.failed` alone is read, which reads the error
once and none that it recovered from.

| Line | As printed |
|------|------------|
| 1 | `{"type":"thread.started","thread_id":"01a1ef90-d3ee-7603-a38d-f60e87583f16"}` |
| 2 | `` {"type":"item.completed","item":{"id":"item_0","type":"error","message":"Model metadata for `stub-model` not found. Defaulting to fallback metadata; this can degrade performance and cause issues."}} `` |
| 3 | `{"type":"turn.started"}` |
| 4 | `{"type":"error","message":"Reconnecting... 1/1 (exceeded retry limit, last status: 429 Too Many Requests)"}` |
| 5 | `{"type":"error","message":"exceeded retry limit, last status: 429 Too Many Requests"}` |
| 6 | `{"type":"turn.failed","error":{"message":"exceeded retry limit, last status: 429 Too Many Requests"}}` |

A retry it recovered from:

| Line | As printed |
|------|------------|
| 1 | `{"type":"thread.started","thread_id":"01a1ef92-7bac-7c00-b832-7e7c3c66426e"}` |
| 2 | `{"type":"turn.started"}` |
| 3 | `{"type":"error","message":"Reconnecting... 1/1 (We’re currently experiencing high demand, which may cause temporary errors.)"}` |
| 4 | `{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"hi"}}` |
| 5 | `{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}` |

A resume of a thread that does not exist is reported by Codex and by OpenCode on standard error alone, with exit 1,
and gives no error through the member, as the spec's decision on standard output expects. An error whose text is
empty is not read, in every harness.

### The texts the command prints

The end line of a failure of its harness keeps `its harness exited with <status>.` and `its harness was ended by
<signal>.`, and is `its harness reported an error.` for a harness that exited 0 with no signal (R4, R5). The line
after the step is, in the same way, `the harness reported an error` in that last case (R4). Directly after the end
line the report gives:

```text
The harness reported this error:
  <each line of the error>
The other <n> lines of the error are in <run directory>/<number>-<role>.error.txt.
```

The error is the errors of the step joined by a line break, with the line breaks at its end left out, and split at
each line break, a carriage return before it left out. The third line stands only for an error of more than 20
lines, as `The other line of the error is in ...` for one left out. A harness that reported no error gives instead
`The harness reported no error on its standard output. What it printed on its standard error stood on the
terminal.` as one line. Then, for either, the line `Once the cause of the failure has been dealt with or has passed,
resume the run: npx agentrite orchestrate <unit> --resume`, with ` --skip-permissions` after it when the run was
started or resumed with it. The lines of the refused calls, what the last step's outcome holds and the rest follow
as they do now (R5, R7).

The resume command is built by one function, `resumeCommand(unitDirectory, skipPermissions)`, which `refusedLines`
takes too, with `true`, so the two give the same command (decision on the resume command).

The `error` of an end in `state.json` is the first line of that joined error, as the report splits it, cut to its
first `COMMAND_LENGTH` code points, the constant `callLabel` cuts a command by, splitting no character (R8).

## Files

- `scripts/agentrite-harness.mjs`: the member `headless.errors` in the `Harness` typedef and in `HARNESS_CONTRACT`
  (R2)
- `scripts/harnesses/claude.mjs`, `scripts/harnesses/opencode.mjs`, `scripts/harnesses/codex.mjs`: the reader of
  each and its doc comment (R1, R2)
- `scripts/agentrite-orchestrate.mjs`: `errors` of `Result`, `judgeStep`, `stepResult`, `endLine`, the new
  `harnessLines`, `resumeCommand` and `endError`, `refusedLines`, and the `errorPath` of `endReport` (R3 to R5, R7,
  R8, R10, R11)
- `scripts/agentrite.mjs`: `runStep` reads `errors`, the effect `ended` writes the error file and keeps its path,
  the end in `state.json` holds `error`, and `endReport` is given the path (R5, R6, R8)
- `scripts/agentrite-runs.mjs`: `ENDED_PLACE`, `endedFault`, `RunState`, the `ended` of a run read with `error`,
  and `detailOf` (R8, R9)
- `tests/agentrite-outcome.test.mjs`: the readings of each harness, beside the tests of `headless.refused` (R13)
- `tests/agentrite-harness.test.mjs`: the members of the contract (R13)
- `tests/agentrite-orchestrate.test.mjs`: `runWith`, and the tests of the judging, the lines, the report and the
  command (R13)
- `tests/agentrite-runs.test.mjs`: the end with `error` (R13)
- `ORCHESTRATOR.md`: "How a run ends" and "What .orchestrator holds" (R12)
- `COMMANDS.md`: "agentrite runs" (R12)

## Tasks

- [x] In `tests/agentrite-harness.test.mjs`, add `'headless.errors'` after `'headless.refused'` in the test of the
  contract's members, which now names thirty-one, and add `errors` to the members `opencode lacks` when it has no
  `headless`. Both fail against the tree (R2, R13)
- [x] Add `headless.errors` to the `Harness` typedef and to `HARNESS_CONTRACT` in `scripts/agentrite-harness.mjs`,
  after `headless.refused`, with the purpose `the errors that ended a headless run, read from what it printed, in the
  order it printed them`. Give each harness module `errors: () => []` for now, so that the suite passes (R2)
- [x] In `tests/agentrite-outcome.test.mjs`, after the tests of `headless.refused`, add the samples of the Approach
  as constants, with a comment that names the versions, the date and how they were caused, and tests that fail
  against the tree (R1, R13):
    - [x] Claude Code: the run of the 500 gives its `result` text as the one error; the resume of a missing session
      gives the one string of its `errors`; the recovered run gives none; a run whose earlier `result` has
      `is_error: true` and whose last has `is_error: false` gives none; a run whose `user` event holds a
      `tool_result` with `is_error: true` gives none; an `is_error: true` with an empty `result` and no `errors`
      gives none; `''` gives none
    - [x] OpenCode: the two `error` lines give their two texts in order; an `error` whose `data` has no `message`
      gives its `name`; one with neither gives the JSON of its `error`; a `tool_use` whose state is `error`, the
      refused one among them, gives none; `''` gives none
    - [x] Codex: the run of the 429 gives the text of `turn.failed` once; the recovered run gives none; the
      `FAILED_RUN` that the tests already hold gives the message of its `turn.failed`; `''` gives none
- [x] Implement the three readers by the Approach: `errorsClaude` in `scripts/harnesses/claude.mjs`,
  `errorsOpencode` in `scripts/harnesses/opencode.mjs` and `errorsCodex` in `scripts/harnesses/codex.mjs`, each
  with a doc comment that says what it reads and why the rest is not read, and each read with `jsonRecords`. Set
  them as `headless.errors` (R1, R2)
- [x] Commit: `feature-0110 Read the errors a harness ends a step with`
- [x] In `tests/agentrite-orchestrate.test.mjs`, give `runWith` the default `errors: []`, and add tests of
  `orchestrate`, `judgeStep`, `stepLine` and `endReport` that fail against the tree (R3 to R5, R7, R11, R13):
    - [x] A step that exits 0 with an error and a final response with no block marked `json` stops by `harness`,
      is not asked again, and nothing runs after it; one that exits 0 with an error and an outcome that is `done`
      stops by `harness` too, its outcome read (R3)
    - [x] A step that timed out with an error is judged `timeout` (R3)
    - [x] A step that exits 0 with no error and no block is asked again, as now (R11)
    - [x] `stepLine` gives `the harness reported an error` for an exit of 0 with an error, and still
      `the harness exited with 1` and `the harness was ended by SIGTERM` when they hold, with an error or without
      (R4)
    - [x] The end report of each of the three: the end line, then `The harness reported this error:` and each line
      indented by two spaces, of an error of two errors whose lines are joined in order; an error of 20 lines in
      full; one of 21 lines with `The other line of the error is in <path>.`; one of 25 with `The other 5 lines of
      the error are in <path>.`, the path the `errorPath` given; a harness that exited 1 with no error, with the line
      of no error (R5)
    - [x] The resume line, without ` --skip-permissions` and with it, and for a stop with refused calls both the
      resume line and the lines of the refused calls as they are now, the resume line first; a stop by any other
      case gives neither the error lines nor the resume line (R7, R11)
- [x] Implement in `scripts/agentrite-orchestrate.mjs` (R3 to R5, R7, R11):
    - [x] `errors: string[]` in the `Result` typedef, documented as the errors the harness reported that ended the
      step, in the order it printed them
    - [x] `judgeStep` gives `harness` also for `errors.length > 0`, after the time limit, and its doc comment says
      so; the comment above the ask again in `orchestrate` says that `none` is judged only of a harness that
      reported no error either
    - [x] `stepResult` gives `the harness reported an error` after the cases of the signal and the status
    - [x] `endLine` gives `its harness reported an error.` for `harness` with a status of 0 and no signal
    - [x] `resumeCommand(unitDirectory, skipPermissions)`, used by `refusedLines` with `true`
    - [x] `harnessLines(end, { unitDirectory, errorPath, skipPermissions })`, which gives nothing but for a stop by
      `harness`, and `endReport` takes `errorPath` in its last argument and puts these lines directly after the end
      line, before `refusedLines`
- [x] Commit: `feature-0110 Stop the run and report the error of a harness`
- [x] Add a test of `endError` to `tests/agentrite-orchestrate.test.mjs`: the first line of the joined errors of a
  stop by `harness`, a first line ending in a carriage return without it, one of 150 code points cut to 100 with a
  character outside the BMP across the cut kept whole, `null` for a stop by `harness` with no error, and `null` for a
  complete run, a run out of rounds and every other stop (R8)
- [x] Implement `endError(end)` in `scripts/agentrite-orchestrate.mjs`, splitting the error as `harnessLines` does by
  one function that both call (R8)
- [x] Add tests of the command to `tests/agentrite-orchestrate.test.mjs`, by the fake harness of `project`, that fail
  against the tree (R3, R5, R6, R8, R10, R13):
    - [x] A step whose fake prints the Claude Code sample of the 500 and exits 1 stops the run with the status 3; its
      `<number>-<role>.error.txt` holds the error and a line break; the report gives the error under its line, the
      path in the run's directory where the file is, and the resume line; `state.json` holds an end whose `error`
      is the first line of the error
    - [x] A step whose fake prints the OpenCode sample of the two errors and exits 0 stops the run with the status
      3, the end line saying that the harness reported an error; the file holds both, in order
    - [x] A step whose fake prints nothing and exits 1 has no error file, the report gives the line of no error, and
      `state.json` holds `error: null`; a run that ran every item holds `error: null` too
    - [x] `--resume` of a run stopped by a failure of its harness reruns the step whose harness failed, with the
      number it had, and goes on to the end when the fake answers with an outcome (R10)
- [x] In `scripts/agentrite.mjs`, have `runStep` give `errors: headless.errors(stdout)`; have the effect `ended`
  write `fileOf(planned, 'error.txt')` with the joined errors and a line break when there are any, keeping its path
  from the root as `errorPath` and setting it to `undefined` first, as `responsePath` is; write the end as
  `{ status, line: endLine(end), error: endError(end) }`; and give `endReport` the `errorPath`. Update the doc
  comment of `runStep` (R5, R6, R8)
- [x] Commit: `feature-0110 Keep the error of a harness in the run's directory and in state.json`
- [x] In `tests/agentrite-runs.test.mjs`, add tests that fail against the tree (R8, R9, R13):
    - [x] An end with an `error` that is a string, one with `error: null` and one with no `error` are read, and
      `ended` holds `error` as given, `null` for the last two; an `error` of `1` is refused with
      `ended.error is 1. It must hold a string or null`, and the refusal of an extra key of `ended` names
      `ended holds status, line and error`
    - [x] The line of an ended run with an `error` is the line of its end, a space, `The harness reported:`, a space,
      and the error; one whose `error` is `null` and one written before it held `error` give the line of the end
      alone
    - [x] With `--json`, the `ended` of each of the three holds `error`, `null` for the last two
- [x] In `scripts/agentrite-runs.mjs`, add `error` to `ENDED_PLACE`, check it in `endedFault` as missing, `null` or
  a string, give `RunState` an `ended` of `{ status: number, line: string, error: string | null }`, read a missing
  `error` as `null` where the run is made, and add the error in `detailOf`. Say in the doc comment of `stateFault`
  that an `error` of `ended` that is missing is no fault, since an end from before unit 0110 has none (R8, R9)
- [x] Commit: `feature-0110 Show the error of a harness in agentrite runs`
- [x] In `ORCHESTRATOR.md`, "How a run ends": the case of the list of when the run stops says that a harness that
  reported an error on its standard output stops it too, also when it exited 0; the paragraph of the ask again
  names a step whose harness reported an error among those not asked again; the paragraph of what the command
  prints last gives, for a stop by a failure of its harness, the error and its lines, the file it names past 20
  lines, the line of no error and the resume line, and says that the run is resumed with `--resume` once the cause
  has passed, rerunning the step. Show an example of the lines, from the Claude Code sample. Say that what each
  harness reports as such an error is read by its module, and that an error a harness retried and went on after is
  not one (R12)
- [x] In `ORCHESTRATOR.md`, "What .orchestrator holds": add `<number>-<role>.error.txt` beside the outcome and
  response files, for a step whose harness reported an error, holding all of it; and add `error` to what the end in
  `state.json` holds, with the first line cut to 100 characters, `null` otherwise, and missing in an end from before
  it was written (R12)
- [x] In `COMMANDS.md`, "agentrite runs": the line of `ended` gives `The harness reported:` and the error after the
  line of its end, for an end that holds one, with an example line; the `ended` of `--json` holds `error` too, a
  string or `null` (R12)
- [x] Commit: `feature-0110 Document the failure of a harness`

## Verification

- [x] `npm test` passes, which holds the unit tests and the tests that run the command end to end with the fake
  harness
- [x] Every line written is at most 120 characters, but a row of a Markdown table
- [x] `npm run check-changes` passes, after the last commit

## Commit Points

- [x] After the readers of the three harnesses: `feature-0110 Read the errors a harness ends a step with`
- [x] After the judging and the report: `feature-0110 Stop the run and report the error of a harness`
- [x] After the command's files: `feature-0110 Keep the error of a harness in the run's directory and in state.json`
- [x] After `runs`: `feature-0110 Show the error of a harness in agentrite runs`
- [x] After the documents: `feature-0110 Document the failure of a harness`
