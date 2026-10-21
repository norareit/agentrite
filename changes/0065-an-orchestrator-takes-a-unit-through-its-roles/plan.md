# 0065 An orchestrator takes a unit through its roles

## Approach

Written against `a57c7ab` on `feature-0065-an-orchestrator-takes-a-unit-through-its-roles`. Before the work,
`npm test` on the Linux host, which has Docker, reports 819 tests, all of which pass and none skipped. In the
sandbox, which has no Docker, the tests that need it are skipped. Every commit point below keeps the suite green.

The work is in nine steps, each a commit of its own:

1. **The key.** `orchestrator` becomes a required key of `agentrite.json`, `false` or the path of a definition,
   judged by every command that judges the file, and written by `config` and by `init`, which takes
   `--no-orchestrator`. The kit's default definition is shipped as `orchestrator.json` (R1 to R4)
2. **The definition.** A pure judge of a definition's text, that names where in it a fault is (R4 to R9)
3. **The outcome.** The prompt that asks a step for its outcome, the reading of the outcome from a final response,
   and the reading of the final response and the session from what each harness prints headless (R13, R15, R16)
4. **The run.** The order of the steps, the judging of a step and of a repeat, and what is printed, as pure code
   that takes the running of a step as a function (R12 to R14, R18 to R21)
5. **The command.** `agentrite orchestrate`: its arguments, its refusals, the run's directory and the running of
   each step as `agentrite run`, with the end-to-end tests against fake harnesses (R10 to R12, R17, R20, R22 to R24,
   R30)
6. **A fixture for the Docker test.** A refactoring of the suite only, with no change of behavior (R31)
7. **The mount.** Every unit run of `./sandbox.sh` mounts `.orchestrator`, with the Docker test (R25, R31)
8. **The documents** (R26 to R28)
9. **The checks by hand**, with real harnesses: the mechanics on a role made for the check, and the default
   definition with the kit's own roles on a small unit, both logged in `record.md` (R4, R12, R13, R15)

### Verified while planning

The spec asks that a headless resume of OpenCode is shown to send its new prompt before anything is built on it.
The planner showed it on the Linux host, in an empty git repository under the scratch directory, with OpenCode
1.19.3 and the free model `opencode/big-pickle`: `opencode run --format json -- "Remember the word PELICAN. Reply with
only: noted."`, then `opencode run --format json --session <id> -- "Now the second word is OSPREY. Run the shell
command 'ls' once, then reply with both words..."`. The second run ran `ls` and answered `PELICAN OSPREY` in the same
session id: the new prompt is sent, and the session keeps what was said before. So requirement 13 holds for
OpenCode as the plan builds it. What "Running a role" of `README.md` says of a resumed session of OpenCode is left
as it is, as the spec decides.

The same session showed what each harness prints headless, which the readers of step 3 are built on:

* **Claude Code 2.1.306**, with `--print --output-format json`, prints one JSON object. Its `type` is `"result"`,
  its `result` is the final response as a string, and its `session_id` is the session's id. With `--session-id
  <uuid>` the session takes that id, and a second run with `--resume <uuid>` continued it under the same id and
  remembered the first prompt's word
* **OpenCode 1.19.3**, with `run --format json`, prints one JSON event per line, each with `type`, `sessionID` and
  `part`. The types seen are `step_start`, `text`, `tool_use` and `step_finish`. Every call of the model is a message
  of its own, with its own `part.messageID`: a step that calls a tool is one message, ended by a `step_finish` whose
  `part.reason` is `"tool-calls"`, and the answer after it is another, ended by one whose `part.reason` is `"stop"`.
  A `text` event holds its text in `part.text`, and its part's id in `part.id`

### Decided here, so that the implementer does not re-derive it

**Where the default definition is.** At the root of the kit, as `orchestrator.json`, beside `standards.md`, which a
project replaces in the same way. A project names it as `node_modules/agentrite/orchestrator.json`. Its text is the
JSON of requirement 4 exactly, with a line break at its end, and it is added to `files` of `package.json`.

**The key (R1 to R3).** In `scripts/agentrite-settings.mjs`:

* `KEYS` gets `orchestrator` after `standards`, with `holds: (value) => value === false || isProjectPath(value)` and
  `must: 'false, for a project that does not use the orchestrator, or ' + <the text of PATH_MUST>`, worded so that
  it reads as one sentence. The type `Settings` gets `orchestrator: string | false`, and `parseSettings` returns it.
  `MUST_HOLD_OBJECT` names the seven keys from `KEYS` as it names six
* `checkSettingsFiles` checks the path of `orchestrator` when it is a string, after `standards` and before the
  roles, with the message it gives the others: `agentrite.json: orchestrator is "<path>", and there is no file at
  it. It must name a file in the project's working tree`
* `settingsText` writes `  "orchestrator": <JSON of the value>,` after the line of `standards`. The template
  `templates/project/agentrite.json` gets `"orchestrator": "node_modules/agentrite/orchestrator.json",` there, and
  stays `settingsText` of its own settings byte for byte
* `parseBell` does not change, so a start of `./sandbox.sh` that cuts no branch judges `bell` alone (R3)

In `scripts/agentrite.mjs`, `parseInit` takes `--no-orchestrator` as it takes `--no-sandbox`: at any place among the
harnesses, by an exact match, counted once however often it is given, so that `--no-orchestrator=1` is an unknown
harness. It returns `orchestrator: boolean`. `INIT_FORM` becomes
`usage: agentrite init [--no-sandbox] [--no-orchestrator] [--default-branch <name>] claude | opencode`, and its
second line stays. `settingsToWrite` writes `template.orchestrator`, or `false` with the option. In a project with an
`agentrite.json`, the option makes `given.given` true, so `init` refuses it with `INIT_WITH_SETTINGS`, as it refuses
`--no-sandbox` (R2). `init` writes no other file for the orchestrator, and `refresh` reads the key and writes
nothing for it.

This repository's own `agentrite.json` does not get the key. "The kit's own copy of the kit" of `CONTRIBUTING.md`
holds it to the installed release's default file byte for byte, which the suite checks, and 7.3.0 has no
`orchestrator`. The release that ships this unit moves it. Until then the working tree's `npx agentrite`, and a start
of `./sandbox-dev.sh` that cuts a branch, refuse this repository's file for the missing key. `npm run kit`,
`npm run check-changes` and `./sandbox.sh` run the installed release and are not touched.

**The shared wording of a fault in JSON (R9, R16, R21).** A definition and an outcome are both judged as a JSON value
whose fault is named by where it is, so the wording is one decision, kept in `scripts/agentrite-json.mjs`:

* `jsonPath(parent, key)`: `steps`, `steps[1]`, `steps[1].repeat`, from a parent path that is `''` at the root and
  a key that is a string or an index
* `jsonFault(path, value, must)`: `<path> is <missing | JSON.stringify(value)>. It must hold <must>`

The settings keep their own wording, which this unit does not touch.

**The definition (R5 to R9).** A new module, `scripts/agentrite-definition.mjs`, with
`parseDefinition(text, { path, roles, harnesses })`, pure. `path` is the definition's path as the developer gave it
or as `orchestrator` holds it, `roles` the names `roles` in `agentrite.json` gives, and `harnesses` its
`harnesses`. It returns the definition as typed:

```js
/**
 * @typedef {{ role: string, harness: string, model: string, prompt?: string, stopWhen?: 'blocking-findings' }} Step
 */
/** @typedef {{ times: number, until?: 'no-blocking-findings', steps: Step[] }} Repeat */
/** @typedef {{ steps: (Step | { repeat: Repeat })[] }} Definition */
```

and throws a message that opens with `<path>: `, then one of:

* `is not JSON: <error>. It must hold a JSON object with one key, steps`
* `holds <JSON>, which is no JSON object. It must hold a JSON object with one key, steps`
* a key that a place does not take: `<jsonPath> is no key of <a definition | a step | a repeat | the object of
  repeat>. <What that place holds>`, as `steps[0].modle is no key of a step. A step holds role, harness and model,
  and may hold prompt and stopWhen`
* a value of another form: `jsonFault`, as `steps[1].repeat.steps[0].model is "". It must hold the harness's own id
  of a model, as a string that is not empty`

It judges in the order of the text, item by item, and in each object first the keys it does not take, in the order
of the text, and then its keys in the order requirements 5 to 8 give them. An item is a repeat when it holds the key
`repeat`, and a step otherwise. What each place must hold:

| Place                     | It must hold                                                                          |
|---------------------------|---------------------------------------------------------------------------------------|
| `steps`                   | a list of one or more items, each a step or a repeat                                  |
| an item                   | a step or a repeat, as an object                                                      |
| `role`                    | a role that roles in agentrite.json names: `<the names, as a list in words>`          |
| `harness`                 | a harness that harnesses in agentrite.json names: `<the names, as a list in words>`   |
| `model`                   | the harness's own id of a model, as a string that is not empty                        |
| `prompt`                  | a string that is not empty                                                            |
| `stopWhen`                | `"blocking-findings"`                                                                 |
| `repeat`                  | an object with times and steps, and optionally until                                  |
| `repeat.times`            | a whole number of one or more                                                         |
| `repeat.until`            | `"no-blocking-findings"`                                                              |
| `repeat.steps`            | a list of one or more steps                                                           |
| an item of `repeat.steps` | a step. A repeat holds no repeat, said so when the item holds the key `repeat`        |

`times` is a whole number when `Number.isInteger` holds, so `3.0` in the text is taken as `3`. Role names are
compared with the list, as `checkRoleNamed` does, so that `toString` is refused.

**The outcome (R15, R16).** A new module, `scripts/agentrite-outcome.mjs`, pure:

* `outcomeRequest(round)`, where `round` is `{ at, of }` for a step in a repeat and `undefined` otherwise, returns
  this text, the part in brackets only with a round, written so in the source that each line fits the limit:

  ```
  AgentRite's orchestrator runs this step[, in round <at> of a repeat of at most <of> rounds], and reads its outcome
  from your final response. Give the outcome there as one JSON object, in a fenced code block marked json. It is the
  only block marked json in your final response, and it stands before the line **Needed from you** when the
  response has one. Write no file for it. The object holds these keys, and no other:

  - "outcome": "done" when the step did its work, "needs-human" when it cannot go on without the human, or
    "failed" when it could not do its work
  - "summary": a string that says what the step did
  - "questions": a list of strings, each a thing the step needs from the human. It is empty when it needs nothing
  - "findings": a list of objects, one for each finding the step made, each with "id", a string such as "S1",
    "blocking", true or false, and "summary", a string. It is empty for a step that reviewed nothing
  - "declines": a list of objects, one for each finding whose decline the step proposes, each with "finding", the id
    of the finding, and "reason", a string. It is empty for a step that proposed no decline
  ```

  The lines of the list are written as one line each in the prompt; the wrapping above is the plan's
* `readOutcome(response)` returns one of `{ kind: 'outcome', outcome, text }`, `{ kind: 'none' }`,
  `{ kind: 'several', count }` and `{ kind: 'malformed', fault }`, where `text` is the block's text as it stood
* The blocks are found as CommonMark finds fenced code blocks, line by line: outside a block, a line of at most three
  spaces and then three or more backticks or tildes opens one, and the rest of the line, trimmed, is its info
  string. Inside, a line of at most three spaces, then at least as many of the same character and nothing but
  spaces, closes it, and a block that is never closed runs to the end of the response. A block counts when the first
  word of its info string is exactly `json`. So a `json` fence shown inside another fence is not counted, and a
  block marked `bash` is not
* The one block's text is parsed with `JSON.parse`. A text that is not JSON gives the fault `the block is not JSON:
  <error>`. A JSON value is judged by requirement 16, with `jsonFault` and `jsonPath` from the root `''`, so that a
  fault reads as `findings[0].blocking is "yes". It must hold true or false`. A key of another name is named as in a
  definition: `findings[0].severity is no key of a finding. A finding holds id, blocking and summary`. A finding of
  a decline is not looked up among the findings: an implementer declines the findings of an earlier review

**What a harness prints headless (R13, R15).** A new module, `scripts/agentrite-headless.mjs`, holds a registry
keyed by the harness's name, as `STARTS` of `scripts/agentrite-run.mjs` is, so that the code that uses it names no
harness:

* `claude`: `arguments(session)` gives `['--output-format', 'json', '--session-id', <randomUUID()>]` when `session`
  is `undefined`, and `['--output-format', 'json', '--resume', session]` otherwise, together with the session's id.
  `read(stdout)` parses the whole output as JSON and gives as the final response its `result` when that is a string,
  and none otherwise, also when the output is no JSON. It gives as the session's id its `session_id` when that is a
  string, so that a later Claude Code that hands out a new id on a resume is still followed; the id `arguments` gave
  stands only when the output has none
* `opencode`: `arguments(session)` gives `['--format', 'json']`, and `['--format', 'json', '--session', session]`
  when there is one. `read(stdout)` parses each line that is not empty as JSON, and skips one that is not. The
  session's id is the first string `sessionID` of an event. The final response is the text of the message that the
  last `step_finish` event closes, by its `part.messageID`: the `part.text` of each `text` event of that message,
  one text per `part.id`, the last event of a part counting, in the order the parts first appear, joined by an empty
  line. With no `step_finish`, or none of its message's events of type `text`, there is no final response

**The run (R12 to R14, R18 to R21).** A new module, `scripts/agentrite-orchestrate.mjs`, which holds the arguments
of the command, the order of the steps, the judging of each and what is printed, all pure but for the running of a
step, which it takes from its caller:

* `orchestrate(definition, effects)` runs the items in order, one step at a time, and a repeat's steps round after
  round. For each step it builds the planned step `{ number, item, round, index, step, session }`, with `number`
  counted from 0 in the order the steps run, `round` as `{ at, of }` in a repeat and `undefined` outside one, and
  `session` the id that the last step of the same role and harness in this run gave (R13). It calls
  `effects.started(planned)`, then `effects.run(planned)`, which returns `{ status, signal, response, session,
  milliseconds }`, reads the outcome with `readOutcome`, judges the step, and calls `effects.ended(ran)` with all of
  it and the stop, if any. It returns `{ ran, end }`
* `judgeStep(step, result, reading)` gives the first case of requirement 18 that holds, in this order, or none:
  `harness` (a status other than 0, or a signal), `none`, `several`, `malformed`, `needs-human`, `failed`,
  `declines`, `stopWhen`. It reads the outcome first whatever the status, so that a harness that failed after it gave
  an outcome still shows the human its summary and questions
* Only when no case holds, and the step is the last of its round in a repeat with `until`, `until` is judged on the
  outcome (R19): it holds when no finding has `blocking` `true`, and the repeat then ends; it does not hold and
  rounds are left, and the next round starts; it does not hold after the last round, and the run ends as ran out. A
  repeat without `until` runs all its rounds
* `end` is `{ kind: 'complete' }`, `{ kind: 'stopped', by, ran }` or `{ kind: 'ran-out', rounds, ran }`, and
  `exitStatus(end)` is 0 for the first and 3 for the others (R20)
* `stepLine(planned, ended)` is the line of requirement 14: `step 2, round 1 of 3, reviewer, opencode,
  openai/gpt-6.1-sol: started` before the step, and after it the same up to the colon and then `<outcome> after
  <duration>`. Outside a repeat the round is left out: `step 0, planner, claude, claude-opus-5-5: started`. The
  outcome is `done`, `needs-human` or `failed` from an outcome that is of the form, and otherwise `no outcome`,
  `<count> outcomes`, `an outcome not of the form asked for`, `the harness exited with <status>` or `the harness was
  ended by <signal>`, the harness's case first
* `duration(milliseconds)` rounds to whole seconds and gives `<m>m <ss>s`, as `12m 04s` and `0m 08s`, and
  `<h>h <mm>m <ss>s` from an hour on
* `ranTable(ran)` gives requirement 21's list: a column each for the number, the role, the harness, the model and
  the duration, two spaces between two columns, each column as wide as its widest entry, the duration aligned right
  and the others left. For the five steps of the spec's example it gives the spec's lines exactly
* `endReport(ran, end, { runDirectory, unitDirectory, responsePath })` gives requirement 21's text, which the command
  prints last, after an empty line: the table, an empty line, then one line of how the run ended, then what the last
  step's outcome holds, then an empty line and the two lines of where things are. The line of a run that ran every
  item is `The run ran every item of the definition to its end.` The line of a stop opens with
  `Step <n> stopped the run: ` and goes on by its case:

  | Case                    | How the line goes on                                                             |
  |-------------------------|----------------------------------------------------------------------------------|
  | `harness`               | `its harness exited with <status>.`, or `its harness was ended by <signal>.`     |
  | `none`                  | `its final response holds no block marked json.`                                 |
  | `several`               | `its final response holds <count> blocks marked json, not one.`                  |
  | `malformed`             | `its outcome is not of the form asked for. <fault>.`                             |
  | `needs-human`, `failed` | `its outcome is <needs-human or failed>.`                                        |
  | `declines`              | `it proposes declines of findings, which the human decides.`                     |
  | `stopWhen`              | `it holds stopWhen "blocking-findings", and a finding of its outcome blocks.`    |
  | `ran-out`               | `the repeat ran its <rounds> rounds, and its until did not hold after the last.` |

  When the last step has an outcome of the form: `Summary: <summary>`; after `stopWhen` and `ran-out`,
  `Blocking findings still open:` and a line `  <id>: <summary>` for each; `Questions:` and a line `  - <question>`
  for each, when there are any; `Proposed declines:` and a line `  <finding>: <reason>` for each, when there are any.
  When it has none: `The final response of step <n> is at <path>.`, or `The harness gave step <n> no final
  response.` Nothing of a malformed outcome, nor of an earlier step, is printed. The two last lines are
  `The run's directory: <run directory>/` and `The reviewer's findings are under .reviews/<unit directory>/.`
* The arguments: `ORCHESTRATE_FORM` is `usage: agentrite orchestrate <unit> [--definition <file>]
  [--skip-permissions]`, and `orchestrateUsage()` adds a line for each, as `runUsage` does. `parseOrchestrateArgs`
  reads them with node's `parseArgs`, not strict, as `parseRunArgs` does, and throws the usage alone for no
  argument, and the usage after a line that names the fault for an unknown option, `--definition` with no file or
  an empty one, `--skip-permissions` with a value, no unit, a second positional, and `--`, which the command does not
  take (`unexpected argument: --`). It returns `{ unit, definition, skipPermissions }`

**The command (R10 to R12, R17, R20, R22 to R24).** In `scripts/agentrite.mjs`, `orchestrate` joins `COMMANDS` after
`run`, so its form is in the usage of every command. Its `run` does, in this order:

1. `readSettings(root)`, which refuses a missing or invalid file as every command does (R11)
2. With `orchestrator` `false`, refuse, also with `--definition`: `the project opted out of the orchestrator:
   orchestrator in agentrite.json is false. To use it, set orchestrator to the path of a definition, as
   node_modules/agentrite/orchestrator.json`
3. The definition's path: `--definition`'s, resolved against the root when it is relative, or `orchestrator`'s. A
   `--definition` that names no regular file, symbolic links followed, is refused: `--definition names <path>, and
   there is no file at it`. The text is read, and judged with `parseDefinition`, with the roles and harnesses of the
   settings
4. The unit, with `resolveUnit` and `changeDirectories`, which refuse as `run` refuses
5. The status, read from `changes/<directory>/record.md` with `statusFrom` of `scripts/check-changes.mjs`, which is
   exported for it, since it is the one reading of a record's status. A status other than `approved` is refused:
   `the unit changes/<directory>/ is <status>, and a run starts the work of an approved unit`. A record that is
   missing, or holds no status, is refused as `statusFrom` refuses one, since such a unit is not approved either
6. Only now is anything written. `.orchestrator/.gitignore` is written as `*` and a line break when it is missing or
   holds anything else, and left as it is otherwise (R24). `.orchestrator/<directory>/` is made, and in it the run's
   directory, named by the instant as `new Date().toISOString()` gives it without its milliseconds, made without
   `recursive`, so that a second run of the unit in the same second is refused by the error and does not mix with
   the first (R23)
7. In the run's directory: `definition.json`, the text as it was read, and `state.json`, written before and after
   each step and at the end, which holds `unit`, `definition` (the path as given), `at` (the planned step's
   `number`, `item`, `round` and `index`), `sessions` (a list of `{ role, harness, session }`) and `ended` (`null`,
   then `{ status, line }`, the line of how the run ended). Each step's outcome, as it stood in its block, goes to
   `<number>-<role>.outcome.json`, or, with none of the form, its final response, when there is one, to
   `<number>-<role>.response.md`. The number is padded with zeros to the width of the highest number the definition
   can reach, and to two digits at least, so that the names sort in the order the steps ran (R17, R23)
8. Each step runs as `process.execPath` with this file and `run <role> <harness> <directory> --model <model>
   --headless --prompt <prompt> [--skip-permissions] -- <the arguments of the harness's entry>`, with `cwd` the
   root, `stdio: ['ignore', 'pipe', 'inherit']`, `encoding: 'utf-8'` and `maxBuffer: Infinity`, since a long session
   of OpenCode prints far more than the default of a megabyte. The prompt is the step's `prompt` and the request of
   the outcome joined by an empty line, or the request alone. The time is taken around the call. The session's id is
   the one the entry's `read` gives, or else the one its `arguments` gave (R12, R13, R15)
9. `stepLine` before and after each step, and `endReport` last, on standard output. The status is `exitStatus(end)`
   (R14, R20, R21)

Nothing in the command sets a status or commits, and no file is written outside `.orchestrator/` (R22). The harness's
standard error reaches the terminal, and its standard output is read and not shown, which "Beyond the request"
leaves as it is.

**The mount (R25).** In `container/sandbox.sh`, the `mkdir -p` before a unit run makes `"$root/.orchestrator"` and
`"$clone/.orchestrator"` beside the two `.reviews`, and the unit run's `run` gets
`--volume "$root/.orchestrator:/work/.orchestrator"` right after the mount of `.reviews`. The wrapper reads nothing of
`orchestrator`. Its header comment, the comment above the `mkdir`, and the head comment and the comment on the
volumes of `container/compose.yml`, which name the mount of `.reviews`, name `.orchestrator` beside it. A clone whose
`.orchestrator` is empty after the run is, as one whose `.reviews` is, a clone with nothing to bring back.

**The fixture of the Docker test (R31).** `tests/sandbox-variant.test.mjs` builds, in `setUp`, a project whose unit
runs start real containers through `containerHost`. The Docker test of the mount needs the same project, so the
part of `setUp` that builds it, everything but the gate, `start`, `wait`, `release`, `runningNames` and `added`,
moves to `tests/wrapper-fixture.mjs` as `containerProject(t, prefix)`, which returns `base`, `root`, `home`, `git`,
`state`, `clone`, `wrapper`, `environment` and the host. The variant tests take it unchanged, in a commit of its own
that changes no behavior. The Docker test is `tests/sandbox-orchestrator-mount.test.mjs`, skipped as the variant
tests skip, with their reason, where `docker info` fails: it removes the project root's `.orchestrator` if there is
one, runs the wrapper for the unit with the command `sh -c 'echo seen > /work/.orchestrator/seen'`, and finds that
it exited 0, that `<root>/.orchestrator/seen` holds `seen`, and that `<root>/.orchestrator` is owned by the suite's
user, which a directory that Docker made in its place would not be.

**The test projects.** Every `agentrite.json` the suite writes for a command that judges the whole file gets
`orchestrator`. `KIT_SETTINGS` of `tests/installed-kit.mjs` takes it from the template, as it takes `standards` and
`roles`, so `kitSettingsText` writes it, and `copyKitInstructions` copies `orchestrator.json` beside `process.md`, so
that the path names a file. `VALID` of `tests/agentrite-settings.test.mjs` gets `orchestrator:
'rules/orchestrator.json'`, and its tests that write the files of the paths write that one too. The wrapper's tests
that give their project `{"bell": false}` alone stay as they are.

**The end-to-end tests (R30).** A new file, `tests/agentrite-orchestrate.test.mjs`, whose project is the one
`project` of `tests/agentrite-run.test.mjs` builds: the kit installed with `installKit`, the template's
`agentrite.json`, the wrappers `refresh` writes, and a PATH that holds nothing but the fakes. The unit's
`record.md` holds a frontmatter with `status: approved`. One fake script stands for both harnesses, linked or copied
as `bin/claude` and `bin/opencode`, and uses nothing but the builtins of `sh`, since the PATH holds no other command.
At each call it counts the calls in a file of a directory the test names in an environment variable, which reaches
the harness through `agentrite run`, writes its name and arguments to `call-<n>`, prints `out-<n>` line by line and
exits with the status in `status-<n>`, or 0. The test writes, for each call it expects, what that harness prints:
the JSON object of Claude Code with the response in `result`, or OpenCode's events, a `text` event and a
`step_finish` of one message with `sessionID` `ses_test`. A helper builds a final response from an outcome object.

## Files

- `orchestrator.json`: new, the default definition
- `package.json`: `files` lists `orchestrator.json` and the four new scripts
- `templates/project/agentrite.json`: `"orchestrator"`
- `scripts/agentrite-settings.mjs`: the key, its path checked, `settingsText`
- `scripts/agentrite-json.mjs`: `jsonPath`, `jsonFault`
- `scripts/agentrite-definition.mjs`: new, `parseDefinition`
- `scripts/agentrite-outcome.mjs`: new, `outcomeRequest`, `readOutcome`
- `scripts/agentrite-headless.mjs`: new, the arguments and the reading of each harness headless
- `scripts/agentrite-orchestrate.mjs`: new, the arguments, `orchestrate`, `judgeStep`, the lines and the report
- `scripts/agentrite.mjs`: `--no-orchestrator` of `init`, the command `orchestrate`
- `scripts/check-changes.mjs`: `statusFrom` exported
- `container/sandbox.sh`: the mount of `.orchestrator`, its directories, the comments
- `container/compose.yml`: the comments
- `tests/installed-kit.mjs`: `orchestrator` in the kit's settings, `orchestrator.json` copied
- `tests/agentrite-settings.test.mjs`, `tests/agentrite-init.test.mjs`, `tests/agentrite-config.test.mjs`,
  `tests/agentrite-refresh.test.mjs`, `tests/agentrite-run.test.mjs`: the key, and the fixtures
- `tests/check-changes.test.mjs`, `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-dev.test.mjs`,
  `tests/sandbox-update.test.mjs`, `tests/settings-update.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`:
  the fixtures that a whole file is read from, as the suite shows them; `tests/sandbox-unit-run.test.mjs` also the
  mount
- `tests/agentrite-json.test.mjs`: `jsonPath`, `jsonFault`
- `tests/agentrite-definition.test.mjs`: new
- `tests/agentrite-outcome.test.mjs`: new, the request, the reading of an outcome, and the readers of the harnesses
- `tests/agentrite-orchestrate.test.mjs`: new, the unit tests of the run and the end-to-end tests of the command
- `tests/package-documents.test.mjs`: `files`, and the default definition in `README.md`
- `tests/wrapper-fixture.mjs`, `tests/sandbox-variant.test.mjs`: `containerProject` moved out
- `tests/sandbox-orchestrator-mount.test.mjs`: new, the Docker test
- `README.md`, `SANDBOX.md`: the documents

## Tasks

### 1. The key

- [ ] In `tests/agentrite-settings.test.mjs`, with `VALID` given `orchestrator`: `parseSettings` returns `false` and
  a path; refuses absent, `true`, `null`, `0`, `""`, `"/x.json"`, `"../x.json"`, `[]` and `{}`, each with
  `agentrite.json: orchestrator is <missing | JSON>. It must hold <the must of the approach>`; the missing keys are
  seven and judged in the order of `KEYS`; `settingsText` writes the key after `standards`, `false` and a path alike;
  the template is `settingsText` of its own settings byte for byte; `checkSettingsFiles` refuses a path that names
  no file, naming `orchestrator`, after `standards` and before the roles, and does not look for a file for `false`;
  `parseBell` takes a file that lacks `orchestrator`. See them fail (R1, R3)
- [ ] Add the key to `KEYS`, the type, `parseSettings`, `checkSettingsFiles` and `settingsText` (R1, R3)
- [ ] In `tests/package-documents.test.mjs`, test that `orchestrator.json` is the JSON of requirement 4 byte for byte,
  with a line break at the end, and that `files` lists it. See it fail, then add the file and the entry (R4)
- [ ] Add `"orchestrator": "node_modules/agentrite/orchestrator.json",` to the template after `standards`, and
  `orchestrator.json` to `copyKitInstructions` and `orchestrator` to `KIT_SETTINGS` in `tests/installed-kit.mjs` (R2)
- [ ] In `tests/agentrite-init.test.mjs` and `tests/agentrite-config.test.mjs`: `config` writes the key with the
  kit's path; `init` with arguments writes it, with and without `--no-sandbox`, and writes `false` with
  `--no-orchestrator`, which is taken at any place among the harnesses and counts once given twice;
  `--no-orchestrator=1` is refused as an unknown harness with exit 2; `init` with an `agentrite.json` and
  `--no-orchestrator` refuses with exit 1 and `INIT_WITH_SETTINGS`, writing nothing; the usage holds
  `[--no-orchestrator]`; `init`, `config` and `refresh` leave a file that lacks the key byte for byte as it was,
  `init` and `refresh` refusing it naming `orchestrator` and `config` skipping it. See them fail (R2, R3)
- [ ] Take `--no-orchestrator` in `parseInit`, `INIT_FORM` and `settingsToWrite` (R2)
- [ ] In `tests/agentrite-run.test.mjs`, test that `agentrite roles` refuses a file that lacks the key and one whose
  key names no file, naming the key, and exits 1 (R3)
- [ ] Add the key to every `agentrite.json` the suite writes for a command that judges the whole file, in the files
  the "Files" section names, until `npm test` is green (R1, R3)

### 2. The definition

- [ ] In `tests/agentrite-json.test.mjs`, test `jsonPath` for a key and an index from the root and below, and
  `jsonFault` for a missing and a present value. See them fail, then add both (R9, R16)
- [ ] In a new `tests/agentrite-definition.test.mjs`, test `parseDefinition` (R5 to R9, R29):
    * `orchestrator.json` read from the repository is taken with the template's roles and harnesses, and gives the
      typed definition, its repeat and its prompt included (R4)
    * a step with `prompt` and `stopWhen`, inside a repeat and outside one; a repeat without `until`; `times` of 1
      and of `3.0`
    * each fault of the approach's table, with its whole message, the definition's path first: among them a text
      that is not JSON, JSON that is no object, `steps` missing, empty, or not a list, an item that is no object, a
      role and a harness the settings do not name, `toString` as a role, an empty model, an empty prompt, each other
      value of `stopWhen` and `until`, `times` of 0, -1, 1.5 and `"3"`, a repeat with an empty `steps`, a repeat
      inside a repeat, and a key that each place does not take, at the root, in a step, in an item that holds
      `repeat`, and in the object of `repeat`
    * the order: of two faults the first in the text is named, and in one object a key it does not take before a
      value of the wrong form

  See them fail
- [ ] Add `scripts/agentrite-definition.mjs` (R5 to R9)

### 3. The outcome

- [ ] In a new `tests/agentrite-outcome.test.mjs`, test (R15, R16, R29):
    * `outcomeRequest` without a round is the text of the approach, and with `{ at: 2, of: 3 }` says round 2 of a
      repeat of at most 3 rounds; each line of the source that writes it fits the line limit
    * `readOutcome` takes the spec's example of requirement 16; a block at the start, in the middle and at the end
      of a response; one before `**Needed from you**` and its list; one among blocks marked `bash` and unmarked
      ones; a block opened by four backticks or by tildes; one whose info string is `json title`
    * it finds none in a response without a block, one with a block marked `JSON` or `jsonc`, and one whose only
      `json` fence stands inside a fence of four backticks; and `several` with a count of two and of three
    * it finds `malformed` for a block that is not JSON, for one that is no object, for each key missing, for a key
      of another name at the root, in a finding and in a decline, for each other value of `outcome`, and for
      values of the wrong type in each key, each with its whole fault
- [ ] Add `scripts/agentrite-outcome.mjs` (R15, R16)
- [ ] In the same test file, test the readers of `scripts/agentrite-headless.mjs` (R13, R15):
    * `claude`: the arguments of a first step hold `--session-id` and a UUID, which it gives as the session, and
      those of a later one `--resume` and the session given; `read` gives `result` and `session_id`, and no final
      response for an output that is no JSON, for a JSON object without a string `result`, and for an empty output;
      no session for an output without a string `session_id`. In `tests/agentrite-orchestrate.test.mjs`, an
      end-to-end run whose second Claude Code call prints another `session_id` than it was given has the third call
      of that role resume the one printed
    * `opencode`: the arguments with and without a session; `read` of the two outputs the planner saw, a message
      with a tool call before the message of the answer, gives the answer alone and the session's id; two text
      parts of one message are joined by an empty line; a part given twice counts once, as its last event; a line
      that is not JSON is skipped; with no `step_finish`, or none with text in its message, there is no final
      response
- [ ] Add `scripts/agentrite-headless.mjs` (R13, R15)

### 4. The run

- [ ] In a new `tests/agentrite-orchestrate.test.mjs`, unit tests of `orchestrate` with `effects` whose `run` gives
  the results a test lists in turn and records each planned step (R12, R13, R18, R19, R20, R29):
    * the default definition with no blocking finding at the first review runs steps 0 to 2, numbered in order,
      with the rounds `undefined`, 1 of 3 and 1 of 3, and ends `complete` with exit status 0
    * the default with blocking findings at the first two reviews runs seven steps, and at all three ends `ran-out`
      after step 6 with three rounds and exit status 3
    * a repeat of two rounds without `until`, whose reviews all have blocking findings, runs both rounds and then
      the step after it
    * `stopWhen` on a step outside a repeat stops after it, and on the last step of a repeat with `until` stops at
      its first blocking finding, before `until` is judged, as `stopped` by `stopWhen`; without a blocking finding it
      does not stop
    * each case of requirement 18 stops at the step it holds for and runs nothing after it, with `by` naming the
      case, and of two cases that hold the first of the approach's order is named; a harness that exits 1 with an
      outcome that is `done` stops by `harness`
    * the session: the second step of one role and harness gets the session the first returned, a step of the same
      role in another harness gets none, and a step whose run returned no session leaves the one there was
    * `effects.started` and `effects.ended` are called once each per step, in order
- [ ] In the same file, test `stepLine` before and after a step, inside a repeat and outside, for each outcome of
  the approach; `duration` for 0, 999, 8000, 724000 and 3723000 milliseconds; `ranTable` for the spec's example,
  whose lines it gives exactly; `endReport` for each end of the approach, with the lines of the last step's outcome,
  the response's path or that there is none, and nothing of a malformed outcome or of an earlier step;
  `parseOrchestrateArgs` for the unit alone, `--definition <file>`, `--definition=<file>`, `--skip-permissions`,
  the options before and after the unit, and each refusal of the approach, the usage alone for no argument. See them
  fail (R10, R14, R20, R21)
- [ ] Add `scripts/agentrite-orchestrate.mjs` (R10, R12 to R14, R18 to R21)

### 5. The command

- [ ] In `tests/agentrite-orchestrate.test.mjs`, end-to-end tests of `agentrite orchestrate` against the fakes of
  the approach, each asserting the exit status, the lines of requirement 14 in order, the end report and the files
  of the run's directory (R10 to R24, R30):
    * a run whose every item ends: the default definition, with the review of round 1 giving no blocking finding;
      exit 0; the arguments of each call: `--agent`, `--model`, the harness's JSON arguments and the prompt, which
      holds the unit, the step's prompt and the request, the request with its round for a step in a repeat (R12,
      R15)
    * a run whose repeat ends at its first round, and the item after the repeat runs
    * a run whose repeat runs out: exit 3, the open blocking findings and three rounds in the report; the
      implementer's second and third calls resume the first's Claude Code session with `--resume` and its id, and the
      reviewer's second and third give `--session ses_test` (R13)
    * a run whose repeat has no `until` and runs all its rounds
    * a run stopped by `stopWhen` outside a repeat, and one inside it, on the review
    * runs stopped by `needs-human`, with its questions in the report, by a decline, with the decline, by a missing
      outcome, by two outcomes, by a malformed outcome, with its fault and the path of the response, and by a harness
      that exits 1; each exits 3 and starts nothing after the step
    * `--skip-permissions`: every call holds the harness's flag
    * a run of a definition given with `--definition`, relative and absolute, which runs that definition and copies
      it into the run's directory, while `orchestrator` names the default
    * the refusals of requirement 11, each exiting 1, printing on standard error and making no `.orchestrator`: no
      `agentrite.json`; one that is not valid; `orchestrator` `false`, with and without `--definition`;
      `--definition` naming no file; a definition with a fault, naming its path and where; a unit that `changes/`
      does not hold and digits that open two directories; and each status but `approved`, naming it
    * no argument and an unknown option: the usage on standard error and exit 2, starting nothing
    * `.orchestrator/.gitignore` written when missing and when it holds `node_modules`, and left with its time when
      it holds `*` and a line break (R24)
    * after a run, the files of the project outside `.orchestrator/` are as they were, `record.md` among them (R22)
- [ ] Export `statusFrom` from `scripts/check-changes.mjs`, and add `orchestrate` to `scripts/agentrite.mjs` (R10 to
  R12, R17, R20, R22 to R24)
- [ ] List `scripts/agentrite-definition.mjs`, `scripts/agentrite-outcome.mjs`, `scripts/agentrite-headless.mjs`
  and `scripts/agentrite-orchestrate.mjs` in `files` of `package.json` and in the test of `files`, which the test of
  imports then holds to it (R10)

### 6. A fixture for the Docker test

- [ ] Move the project of `setUp` of `tests/sandbox-variant.test.mjs` to `containerProject` of
  `tests/wrapper-fixture.mjs`, as the approach gives. On the host with Docker the variant tests pass as before (R31)

### 7. The mount

- [ ] In `tests/sandbox-unit-run.test.mjs`, the calls of a unit run hold the mount of `.orchestrator` after that of
  `.reviews`; the test of the `.reviews` directories finds both `.orchestrator` directories made, owned by the suite's
  user and empty, before the agent runs; a unit run that cuts a branch with `"orchestrator": false` in its file mounts
  it too. See them fail (R25)
- [ ] Add the mount, the directories and the comments to `container/sandbox.sh` and `container/compose.yml` (R25)
- [ ] Add `tests/sandbox-orchestrator-mount.test.mjs`, the Docker test of the approach. On the host with Docker see
  it pass; in the sandbox it is skipped with the reason of the variant tests (R31)

### 8. The documents

- [ ] `README.md`, a section "The orchestrator" after "Running a role", in the list of sections, with each point of
  requirement 26: what a run does and that it starts the work of an `approved` unit; the form of a definition, with
  `orchestrator.json` as its example, every key, and that a step is judged before the `until` of its repeat, so that
  `stopWhen` on the last step of a repeat with `until` stops the run before `until` is judged; a definition of the
  project's own, copied from `node_modules/agentrite/orchestrator.json` and named in `orchestrator`, and one tried
  with `--definition` with `orchestrator` as it is; the outcome a step is asked for, with the spec's example, how a
  run ends and its exit statuses; what `.orchestrator/` holds, the `.gitignore` in it, and that nothing else writes
  there; a run on the host and one in a unit run of the sandbox; and that `--skip-permissions` is passed to the
  `agentrite run` of every step, linking "Running a role" for what it does, and that a headless step without it gets
  only what the harness's settings allow (R26)
- [ ] `README.md`, "Commands": a section "agentrite orchestrate" after "agentrite run", with its form, its arguments
  in a table, its refusals, and its exit statuses `0`, `1`, `2` and `3`, linking "Exit statuses"; in
  "agentrite init", `--no-orchestrator` in both forms, the table and the bullets of what is written. "Exit
  statuses": the sentence that no command has a status of its own of `3` and up says that `agentrite orchestrate`
  has `3`, for a run that stopped for the human (R20, R27)
- [ ] `README.md`, "The project's settings": the key in the table, read by every command that reads the file and
  used by `orchestrate`; seven keys; the default file; what it holds and that its path is judged as `standards`'s;
  `orchestrate` among the commands that read the file; and in what to run afterwards, nothing for a change of
  `orchestrator`. "What is here": `orchestrator.json`. "Updating a project to a newer kit": a project whose
  `agentrite.json` lacks `orchestrator` adds `"orchestrator": "node_modules/agentrite/orchestrator.json",` after
  `standards`, or `false`, before any command that reads the file runs again (R27)
- [ ] `README.md`, "The sandbox": the row `The project's .orchestrator, in a unit run only`, `Read-write`,
  `"Running a unit"` in the table of what of the host is reachable (R28)
- [ ] `SANDBOX.md`, "Running a unit": the mount of `.orchestrator` beside that of `.reviews`, and how the orchestrator
  is run in a unit run, as `./sandbox.sh 0029 npx agentrite orchestrate 0029 --skip-permissions` after `npm ci` in the
  clone, or from the shell of the run. "What the sandbox defends against": the files under `.orchestrator` among what
  reaches the host's repository, and what a file under `.orchestrator` says, to a human or a program that reads it
  on the host, among what it does not defend against. No HTML (R28)
- [ ] In `tests/package-documents.test.mjs`, test that `README.md` holds the text of `orchestrator.json` in a block
  marked `json`. See it pass with the section (R26)
- [ ] Check every line changed against the limit of 120 characters, and that no em dash was written (R26 to R28)

## Verification

- [ ] `npm test` on the host with Docker: all green, the Docker test of the mount among them (R29 to R31)
- [ ] `./sandbox.sh --in-place npm test`: all green but the tests that need Docker, which are skipped
- [ ] `npm run check-changes` passes on the committed work, and `spec.md` is unchanged
- [ ] `npm pack --dry-run` lists `orchestrator.json` and the four new scripts (R4)
- [ ] The check by hand, on the host, in a project made for it in a temporary directory outside the repository:
  `package.json` of `{ "name": "orchestrator-check", "private": true }`, the working tree's kit installed with
  `npm install --save-dev <the repository's path>`, `npx agentrite init --no-sandbox claude opencode`, a role of its
  own `smoke-check` in `roles`, whose file opens as a role file must and says to change nothing, to read the round
  from the prompt, and to give one blocking finding with the id `T1` in round 1 and none in a later round, after
  `npx agentrite refresh`, and a unit `changes/0001-check/record.md` with `status: approved`. A definition of one
  step `smoke-check` in `claude` on `claude-haiku-5-5`, then a repeat of three rounds `until` `no-blocking-findings`
  of `smoke-check` in `claude` on `claude-haiku-5-5` and `smoke-check` in `opencode` on `opencode/big-pickle`. The
  run exits 0 after five steps; step 1 and step 3 resume step 0's Claude Code session, and step 4 resumes step 2's
  OpenCode session, by the ids in `state.json` and the sessions the harnesses list; each step's outcome is in the
  run's directory. Log in `record.md` what was seen, with `claude --version` and `opencode --version`. Should an
  outcome not be read from a real harness, stop and log it, and the plan goes back to the planner (R12, R13, R15,
  R17, R21)
- [ ] The check by hand of the kit's own roles, which shows that the planner, the implementer and the reviewer, with
  their role files, their lists of what the human must do and the reviewer's limit of two files, each end with an
  outcome the command reads. The roles commit and write, so it runs in the working copy's sandbox, on the host:
    * A project in a temporary directory outside the repository, a git repository on `master`: `package.json` of
      `{ "name": "orchestrator-roles-check", "private": true, "type": "module", "scripts": { "test": "node --test" }
      }`, the working tree's kit packed with `npm pack` and installed from the tarball with
      `npm install --save-dev <tarball>`, so that `node_modules` holds a copy and no link that the container cannot
      follow, then `npx agentrite init --no-sandbox claude opencode`
    * A feature `changes/0001-greet/`, made from the kit's templates: a `spec.md` with one requirement, that
      `greet.mjs` at the root exports `greet()`, which returns `hello`, covered by a unit test, and a `record.md`
      whose status is `approved`, with a log entry of the human's approval. All of it committed on `master`
    * `./sandbox-dev.sh --workdir <the project> npx agentrite orchestrate 0001 --skip-permissions`, from the
      repository, which runs the default definition as `orchestrator` names it, on the models it names. The
      harnesses need their logins in the home volume of `./sandbox-dev.sh` first, as "Logging in" of `SANDBOX.md`
      says
    * No step stops the run by a missing outcome, two outcomes or a malformed one; the reviewer wrote no file but
      its findings under `.reviews/0001-greet/` and its entry in `record.md`; each step's outcome is in the run's
      directory. A run that ends by `needs-human`, by a decline, or by a repeat that ran out still passes, since
      those are the roles' to decide. Log in `record.md` how the run ended, the steps it ran and how long each took,
      with `claude --version` and `opencode --version` in the sandbox. Should a role's outcome not be read, stop and
      log the response the run's directory holds, and the plan goes back to the planner, since the request of the
      outcome is the plan's (R4, R12, R15, R16, R21)

## Commit Points

Each commit is made once `npm test` is green.

- [ ] After task group 1: `feature-0065 Make orchestrator a required key of agentrite.json, and ship the default
  definition`
- [ ] After task group 2: `feature-0065 Judge a definition of the orchestrator`
- [ ] After task group 3: `feature-0065 Ask a step for its outcome, and read it from what the harness printed`
- [ ] After task group 4: `feature-0065 Run the steps of a definition in order, and judge how a run ends`
- [ ] After task group 5: `feature-0065 Add agentrite orchestrate`
- [ ] After task group 6: `feature-0065 Move the project of the variant tests to a fixture`
- [ ] After task group 7: `feature-0065 Mount .orchestrator in every unit run`
- [ ] After task group 8: `feature-0065 Describe the orchestrator`
- [ ] After the checks by hand: `feature-0065 Log the checks by hand of the orchestrator`
