# 0075 A run of the orchestrator can be followed

## Approach

The output is taken from what each harness prints on standard output as it runs, line by line, and not from its
session logs. The command already reads that output for the final response, the session logs are in each harness's
own place and format, and reading the pipe needs no polling of files.

Claude Code prints one JSON object at the end with `--output-format json`, so it is given `--output-format
stream-json --verbose` instead, which prints one JSON event per line as the session goes and ends with the same
`result` object, holding `result` and `session_id`. It is given these whether or not the run is followed: the
harness is then started the same way with the option and without it, the final response and the session are read by
one reader, and requirement 10 holds by construction rather than by two readers agreeing. Claude Code requires
`--verbose` beside `stream-json` in `--print`. OpenCode already prints one JSON event per line with `--format json`,
and its arguments do not change.

The work is split by what each module owns:

* `scripts/agentrite-headless.mjs` owns what each harness prints. Each entry of `HEADLESS` gains `follow(line)`,
  which turns one line of the harness's output into the list of what is followed in it, each a `Followed`, and no
  entry for a line that is no JSON object or holds nothing to follow. The typedef `Followed` is defined there:

  ```
  { kind: 'text', time: number | undefined, text: string }
  | { kind: 'call', time: number | undefined, tool: string,
      description: string | undefined, path: string | undefined,
      pattern: string | undefined, command: string | undefined }
  ```

  `time` is milliseconds since the epoch. The harness's entry knows its own field names, and which of its tools is
  the shell tool, so `description` is set only for a call of that tool. The code that prints names no harness and no
  field of either
* `scripts/agentrite-orchestrate.mjs` owns what the command prints, as it owns `stepLine` and `endReport`. It gains
  the pure functions that turn a `Followed` into text, and a small printer that keeps the blank lines right across
  the items of a step
* `scripts/agentrite.mjs` owns the effects. `runGrouped` gains a callback for each complete line of standard output,
  and `runStep` and `orchestrateCommand` pass the printer through when `--follow` is given

What each harness gives, by the readings below:

* Claude Code, from `stream-json`: an event `{ "type": "assistant", "message": { "content": [ ... ] },
  "parent_tool_use_id": null, ... }` holds blocks of the agent's message. A block `{ "type": "text", "text" }` is a
  text message, a block `{ "type": "tool_use", "name", "input" }` a call, and a block of `thinking` or
  `redacted_thinking` is nothing. An event whose `parent_tool_use_id` is a string is a subagent's, not the step's
  agent's, and gives nothing. Events of `system`, `user`, which holds tool results, and `result` give nothing. `time`
  is the event's `timestamp`, an ISO 8601 instant, by `Date.parse`, and `undefined` when the event has none or it
  does not parse. The shell tool is `Bash`. Of `input`: `description` of a `Bash`
  call, the path from `file_path` or else `notebook_path`, `pattern`, and `command`
* OpenCode, from `--format json`: an event `{ "type": "text", "timestamp", "part": { "text" } }` is a text message,
  an event `{ "type": "tool_use", "timestamp", "part": { "tool", "state": { "input" } } }` a call, and every other
  type, `reasoning`, `step_start`, `step_finish` and `error` among them, gives nothing. `time` is the event's
  `timestamp`. OpenCode prints a call's event once the call has ended, which is when it makes the call known. The
  shell tool is `bash`. Of `state.input`: `description` of a `bash` call, the path from `filePath`, `pattern`, and
  `command`

A field that is not a string is taken as absent. A text that is empty once its trailing line breaks are dropped
gives nothing, since there is no message to print.

What is printed, set here so that the tests and the code agree:

* The time is `new Date(time).toISOString().slice(11, 19)`, as `14:03:27`. A `Followed` with no `time` takes the
  instant the command read its line, from `Date.now()`, which the printer takes as a parameter so that the tests fix
  it
* A text message is its time, one space and its text, with its trailing line breaks dropped and nothing else of it
  changed. A text of several lines keeps them, the first after the time:

  ```

  14:03:27 I will read the spec first, and then the tests of the command.

  ```

* A call is one line: `\x1b[2m`, the time, ` → `, the tool's name, and when there is a label, one space and the
  label, then `\x1b[22m`. The label is the first of `description`, `path`, `pattern` and the first line of
  `command`, the last cut to its first 100 code points when it is longer, by `Array.from`, so that no character is
  split. A label that is empty counts as absent, and the next is taken:

  ```
  14:03:31 → Bash Run the unit tests of the command
  14:03:40 → Read /work/scripts/agentrite.mjs
  ```

* The printer of a step holds whether the last thing it wrote was a text message. A text message writes a blank
  line before itself unless the last thing written was one, and always a blank line after itself, so that one blank
  line stands between two messages, between a message and a call, and between a message and the step's lines. Calls
  that follow one another stand on consecutive lines. A new printer is made for each step, so the first message of a
  step writes its blank line after the step's `started` line

The command reads its standard output in chunks, so `runGrouped` keeps the part of a chunk after its last line break
and hands on each complete line as it arrives, and the part left when the output closes, before it settles. With
`--follow` each line goes to `HEADLESS[harness].follow` and then to the step's printer, which writes with
`process.stdout.write`. Everything for a step is written before `runGrouped` settles, and so before the line after
the step, and the end report follows the last step's line as it does now. The standard output is still collected
whole for `read`. Without `--follow` no line is handed on and nothing is parsed for it.

The usage gains the line `  --follow             print each step's messages and tool calls while it runs`, and
`ORCHESTRATE_FORM` becomes `usage: agentrite orchestrate <unit> [--definition <file>] [--skip-permissions]
[--follow]`. `parseOrchestrateArgs` returns `follow: boolean`. `optionError` already refuses a value given to a
boolean option, as `--follow takes no value`.

To show in the command's tests that a step's messages are printed while it runs, `started` in the test project
exposes what the command printed so far, and the fake harness gains `err-<n>`, which it prints on standard error,
so that requirement 11 is tested beside the rest.

Readings, each the only one that works with the spec, to be logged in `record.md`:

* The path of the file a call acts on is that of a field naming one file, `file_path` and `notebook_path` of Claude
  Code and `filePath` of OpenCode. The `path` of a search is where it searches, not a file it acts on, so a search
  is labelled by its pattern
* A subagent's messages and calls are not the step's agent's, and are not printed, as OpenCode's run already prints
  only the events of its own session
* The time of a call in OpenCode is the `timestamp` of the event that makes it known

## Files

- `scripts/agentrite-headless.mjs`: Claude Code's arguments with `stream-json` and `--verbose`, its `read` of the
  `result` event among many lines, the `Followed` typedef, and `follow` for each harness
- `scripts/agentrite-orchestrate.mjs`: `--follow` in `ORCHESTRATE_FORM`, `orchestrateUsage`, `ORCHESTRATE_OPTIONS`
  and `parseOrchestrateArgs`; `clockTime`, `callLabel`, `followedText` and `followPrinter`
- `scripts/agentrite.mjs`: the line callback of `runGrouped`, and `--follow` through `orchestrateCommand` and
  `runStep`
- `tests/agentrite-outcome.test.mjs`: the arguments and `read` of Claude Code, and `follow` of each harness
- `tests/agentrite-orchestrate.test.mjs`: the parsing and usage, the printing, Claude Code's printed output in
  `claudePrinted`, the fake's standard error, and the command's runs with `--follow` and without it
- `README.md`: "agentrite orchestrate" of "Commands", and "How a run ends" and "On the host and in the sandbox" of
  "The orchestrator"
- `SANDBOX.md`: the orchestrator in a unit run

## Tasks

- [x] In `tests/agentrite-orchestrate.test.mjs`, set `USAGE_FORM` to the new form of the approach. Extend
  `parseOrchestrateArgs takes the unit` so that every expected result holds `follow`, `false` without the option,
  and add the arguments `['--follow', '0029']`, `['0029', '--follow', '--skip-permissions']` and `['0029',
  '--definition', 'other.json', '--follow']`, each giving `follow: true`. Add to `names what it does not take` the
  rows `[['0029', '--follow=yes'], '--follow takes no value']` and `[['--follow'], 'no unit given']`. Add a test that
  `orchestrateUsage()` holds the line of `--follow` of the approach. Run `npm test` and see them fail (R1, R2, R14)
- [x] In `scripts/agentrite-orchestrate.mjs`, add `follow: { type: 'boolean' }` to `ORCHESTRATE_OPTIONS`, `follow:
  values.follow === true` to what `parseOrchestrateArgs` returns and to its `@returns`, and the form and the usage
  line of the approach. Run `npm test`: the tests of the previous task pass (R1, R2)
- [x] In `tests/agentrite-outcome.test.mjs`, change the test of Claude Code's arguments to expect `['--output-format',
  'stream-json', '--verbose', '--session-id', <uuid>]` and `['--output-format', 'stream-json', '--verbose',
  '--resume', <id>]`. Add a test that `HEADLESS.claude.read` of several lines, a `system` event, an `assistant`
  event and a `result` event, gives the `result` and `session_id` of the `result` event, and that a line that is no
  JSON among them is skipped. Keep the tests of the one object and of output with no final response, which hold for
  one line as for many. Run `npm test` and see them fail (R10)
- [x] In `scripts/agentrite-headless.mjs`, give Claude Code's `arguments` `--output-format stream-json --verbose`,
  and make its `read` split the output into lines, parse each as JSON, skipping a line that is not, and read
  `result` and `session_id` from the last object whose `type` is `result`, as it now reads them from the one object.
  Change the doc comments that say Claude Code prints one JSON object. Run `npm test` and see the command's tests
  that check the planner's arguments, `a run whose every item ends runs the default definition`, fail on `json`
  (R10)
- [x] In `tests/agentrite-orchestrate.test.mjs`, change the expected arguments of the planner to `'--output-format',
  'stream-json', '--verbose'`, with the session's id at the indexes after them, and `claudePrinted` to print what
  Claude Code prints with `stream-json`: a `system` event of subtype `init` with the session's id, an `assistant`
  event whose content is one `text` block of the response, and the `result` event it prints now, each on a line of
  its own. Run `npm test`: it passes, and every run of the command's tests reads its outcome from the stream (R10)
- [x] In `tests/agentrite-outcome.test.mjs`, add tests of `HEADLESS.claude.follow`: an `assistant` event with a
  `text` block, a `thinking` block, a `redacted_thinking` block and a `tool_use` block of `Bash` with `command` and
  `description`, with a `timestamp`, gives a text and a call, in that order, each at that instant, the call's
  `description` and `command` set; a `tool_use` of `Read` with `file_path`, of `NotebookEdit` with `notebook_path`,
  of `Grep` with `pattern` and `path`, and of `Agent` with `description` and `prompt` give the path, the path, the
  pattern with no path, and nothing but the tool; an `assistant` event with a string `parent_tool_use_id`, and
  events of `system`, `user` with a `tool_result` block, and `result`, give nothing; a text block of `''` or
  `'\n\n'` gives nothing; `'not json'`, `'[1]'` and `''` give nothing; a field that is a number is taken as absent;
  an event with no `timestamp`, or one that does not parse, gives `time` `undefined`. Add tests of
  `HEADLESS.opencode.follow`: a `text` event gives its text at its `timestamp`; a `tool_use` event of `bash` with
  `command` and `description` gives both at its `timestamp`; of `read` with `filePath`, the path; of `grep` with
  `pattern` and `path`, the pattern and no path; of `task` with `description`, nothing but the tool; events of
  `reasoning`, `step_start` and `step_finish` give nothing; a `text` event with no text, or a line that is no JSON,
  gives nothing. Run `npm test` and see them fail (R4, R8, R9, R14)
- [x] In `scripts/agentrite-headless.mjs`, add the `Followed` typedef of the approach, and `follow(line)` to the type
  of `HEADLESS` and to both entries, by the readings of the approach, reusing `isRecord` and `stringOrNone`. A line
  is parsed once per harness and narrowed to what is followed, as `opencodeEvent` narrows it for `read`. Run `npm
  test`: the tests of the previous task pass (R4, R8, R9)
- [x] In `tests/agentrite-orchestrate.test.mjs`, add tests of the printing: `clockTime(Date.UTC(2026, 9, 22, 14, 3, 27,
  900))` gives `14:03:27`, and `clockTime(Date.UTC(2026, 9, 22, 0, 0, 5))` gives `00:00:05`; `callLabel` gives
  `description` over `path`, `path` over `pattern`, `pattern` over `command`, the first line of a command of several
  lines, a first line of 100 code points whole, one of 101 cut to 100, a line of emoji cut without splitting one, an
  empty `description` passed over, and `undefined` with none of them; `followedText` gives a call as the dimmed line of
  the approach, with and without a label, and a text as its time, a space and its full text of several lines, its
  trailing line breaks dropped; `followPrinter` with a fixed `now` and a `write` that collects writes, given in turn a
  text, two calls, a text and a text, writes one blank line before the first text, one between the first text and the
  calls, the two calls on consecutive lines, one blank line between the calls and the next text, one between the two
  texts, and one after the last, and uses `now` for an item with no `time` and its own `time` otherwise. Run `npm test`
  and see them fail (R5, R6, R7, R14)
- [x] In `scripts/agentrite-orchestrate.mjs`, add the pure functions `clockTime(time)`, `callLabel(call)` and
  `followedText(item, time)`, and `followPrinter(write, now)`, which returns a function taking a list of `Followed`
  and writing each by the rules of the approach. Export them for the tests. Run `npm test`: the tests of the previous
  task pass (R5, R6, R7)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, make `started` of the test project also return `output()`, which
  gives what the command printed on standard output so far, and add `err-<n>` to `FAKE_HARNESS` and its comment, a
  file whose lines the fake prints on standard error after it printed `out-<n>`, with a helper `complains(number,
  printed)` beside `answer`. Run `npm test`: it passes as before
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add the command's tests of requirement 15, with a definition of a
  step in Claude Code followed by a step in OpenCode, each answered by output that holds, before its final
  response, a text message, a call with a label, a call with none, a reasoning or thinking block and a tool result,
  and with a line on standard error from each:
  - run with `--follow`: exit status 0; between the `started` line and the line after each step stand that step's
    text message and the dimmed lines of its calls, in the order printed, each time of the form `HH:MM:SS`, then its
    final response as a text message in full; the OpenCode step's times are those of its events' `timestamp`; no
    tool result and no reasoning is printed; the end report stands last, after the second step's line; the standard
    error holds both lines
  - run without `--follow` in a second project: exit status 0; the standard output holds no line other than those
    it printed before this unit, the two lines of each step and the end report, and none of the messages; the
    standard error holds both lines
  - the two runs are the same apart from the followed output: the same status, the same lines of the steps but for
    their durations, the same end report but for the run's directory, the same files in the run's directory with the
    same outcome files, and the same `state.json`, whose sessions are those the fakes printed
  - a step that prints a text message and then waits, run with `--follow`: the message appears in `output()` while
    the fake's process is still alive, after which the command is ended by `SIGTERM` as in `a signal to the command
    alone while a step runs`
  Run `npm test` and see them fail (R3, R4, R9, R10, R11, R15)
- [ ] In `scripts/agentrite.mjs`, give `runGrouped` a parameter `line`, a function called with each complete line of
  standard output as it arrives and with what is left when the output closes, before the promise settles, or
  `undefined` to hand on none. Give `runStep` a parameter `follow`, the printer of the step or `undefined`, and pass
  `runGrouped` a function that gives each line to `HEADLESS[step.harness].follow` and its items to the printer, when
  there is one. In `orchestrateCommand`, take `follow` from what was parsed, and make a new
  `followPrinter((text) => process.stdout.write(text), Date.now)` for each step when it is `true`. Update the doc
  comments of `runGrouped`, `runStep` and `orchestrateCommand` to say what is printed with `--follow`. Run `npm
  test`: the tests of the previous task pass (R3, R4, R10, R11)
- [ ] In `README.md`, "agentrite orchestrate" of "Commands": add `[--follow]` to the usage, and a row of `--follow` to
  the table: prints each step's messages and tool calls while it runs, see "How a run ends" (R12)
- [ ] In `README.md`, "How a run ends": say that without `--follow` what the harness prints on standard output is
  read and not shown, and that with it the command prints, between the step's two lines and while the step runs,
  each text message of the step's agent in full after its time, between blank lines, and each of its tool calls as
  one dimmed line of its time, `→`, the tool's name and a label, with the label's order of precedence and the cut
  at 100 characters, the time being the harness's or the instant the command learns of it, as `HH:MM:SS` in UTC; that
  no tool result, reasoning or other event is printed, in Claude Code and in OpenCode alike; that the end report
  stands last, as without it; and that the option is chosen when the run starts. Add an example of a followed step
  between its two lines, built from the forms of the approach (R12)
- [ ] In `README.md`, "On the host and in the sandbox": add the command with `--follow` on the host (R12)
- [ ] In `SANDBOX.md`, where it gives the orchestrator in a unit run, say that `--follow` is given to the command
  there as on the host, with `./sandbox.sh 0029 sh -c 'npm ci && npx agentrite orchestrate 0029 --skip-permissions
  --follow'` (R13)

## Verification

- [ ] `npm test` passes
- [ ] Every line of the changed files is at most 120 characters, as `awk 'length > 120'` on each shows nothing
- [ ] `npm run check-changes` passes on the committed branch
- [x] The installed Claude Code and OpenCode print events of the shapes the approach reads: one short headless call
  of each, `claude --print --output-format stream-json --verbose 'Run ls, then say done'` and `opencode run --format
  json 'Run ls, then say done'`, shows an `assistant` event with `text` and `tool_use` blocks and a `result` event
  with `result` and `session_id`, and `text` and `tool_use` events with `timestamp` and `part.state.input`. Log the
  versions and what was seen in `record.md`, and stop and log a difference rather than build around it
- [ ] Each requirement of the spec, R1 to R15, is delivered by a ticked task above

## Commit Points

- [x] `feature-0075 Take --follow among the arguments of orchestrate`: the first two tasks
- [x] `feature-0075 Read Claude Code's output as a stream of events`: the third to fifth tasks, which change how
  Claude Code is run and read with no change in what the command prints
- [x] `feature-0075 Read what each harness makes known of a step`: the sixth and seventh tasks
- [x] `feature-0075 Print what is followed of a step`: the eighth and ninth tasks
- [ ] `feature-0075 Follow a run's steps with --follow`: the tenth to twelfth tasks
- [ ] `feature-0075 Document --follow`: the last four tasks
