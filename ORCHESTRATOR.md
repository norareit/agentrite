# The orchestrator

`agentrite orchestrate` takes an approved unit through its roles, so that the human does not start each one: it runs
the steps of a definition one at a time, each as `agentrite run` with `--headless`, and ends when every step has run
or a step needs the human. A run starts the work of a unit whose `record.md` has the status `approved`, as the human
leaves it after approving the spec, and refuses a unit of any other status. A resume of a run that stopped takes a unit
that is `approved` or `in-progress`, as "How a run ends" gives.

```sh
npx agentrite orchestrate 0029
```

A project that does not use the orchestrator holds `"orchestrator": false` in `agentrite.json`, which
`npx agentrite init --no-orchestrator` writes, and `agentrite orchestrate` refuses to run in it.

## The definition

What a run does is in its definition, a JSON file that `orchestrator` in `agentrite.json` names. The kit's default,
`node_modules/agentrite/orchestrator.json`, has the planner write the plan in Claude Code on Opus, and then runs at most
three rounds of the implementer in Claude Code on Sonnet followed by a review in OpenCode on GPT Sol. The implementer
of the first round builds the unit, and that of a later round applies the findings of the review before it. A review
with no findings ends the repeat. A third review with a blocking finding stops the run, and a third review with only
non-blocking findings lets the run end, with those findings listed in the end report:

```json
{
  "steps": [
    { "role": "planner", "harness": "claude", "model": "claude-opus-5-5" },
    {
      "repeat": {
        "times": 3,
        "until": "no-findings",
        "steps": [
          {
            "role": "implementer",
            "harness": "claude",
            "model": "claude-sonnet-5-5",
            "prompt": "From round 2, this definition accepts review findings you agree with. Propose declining others."
          },
          {
            "role": "reviewer",
            "harness": "opencode",
            "model": "openai/gpt-6.1-sol"
          }
        ]
      }
    }
  ]
}
```

* A definition is a JSON object with one key, `steps`, a list of one or more items. An item is a step or a repeat,
  and the items run in the order of the list
* A step holds `role`, a role that `roles` in `agentrite.json` names, `harness`, one that `harnesses` names, and
  `model`, the harness's own id of a model, each a string that is not empty. It may hold `prompt`, a string that is
  not empty, which the step's prompt gets after the unit, `stopWhen` and `timeoutMinutes`
* A repeat is an object with one key, `repeat`, an object that holds `times`, a whole number of one or more, and
  `steps`, a list of one or more steps, and may hold `until`. It runs its steps in order, round after round. A repeat
  holds no repeat
* `until` says when the repeat ends, and holds `"no-blocking-findings"` or `"no-findings"`. When it holds for the
  outcome of the last step of a round, the repeat ends, and the run goes on with the item after the repeat. A repeat
  without `until` runs all its rounds, and never stops the run by itself
* `"no-blocking-findings"` holds when that outcome has no blocking finding. When it still has one after the last
  round, the repeat ran out, and the run stops
* `"no-findings"` holds when that outcome has no finding, blocking or not, so that the rounds are used to fix the
  non-blocking findings too. When it still has a blocking finding after the last round, the repeat ran out, and the
  run stops. When it has findings after the last round and none of them is blocking, the run goes on with the item
  after the repeat, and the end report lists those findings, as "How a run ends" gives
* `stopWhen`, whose only value is `"blocking-findings"`, stops the run after the step when a finding of its outcome
  is blocking. Any step may hold it, in a repeat or not
* `timeoutMinutes` is the step's time limit in minutes, a number greater than 0 and at most 1440, the minutes of a
  day. A fraction is taken, as `0.5` for 30 seconds. Any step may hold it, in a repeat or not, and a step without it
  has no time limit. When the step's time, from the start of its `agentrite run` to its end, reaches the limit, the
  command sends `SIGTERM` to the step's process group, which holds its `agentrite run` and the harness, and `SIGKILL`
  when a process of the group is left 10 seconds later. It then stops the run
* A step in a repeat is told its round, and how many rounds the repeat has at most, so that its `prompt` can say from
  which round something holds, as the default's implementer's does
* Within one run, a step of a role and a harness that already ran continues that step's session of the harness, so
  that the implementer of a later round has the context of the earlier ones. A run continues no session of an earlier
  run
* A definition with a key it does not take, or a value of another form, is refused before anything runs. The
  message names the definition's path, where in it the fault is, as `steps[1].repeat.steps[0].model`, what is wrong
  and what it must hold

After a step, the step is judged first, by the cases under "How a run ends", and the `until` of its repeat only after
it and only when the step did not stop the run. A `stopWhen` on the last step of a repeat with `until` therefore stops
the run at that step's first blocking finding, before `until` is judged.

A project that wants another definition copies the kit's into the project, changes the copy, commits it, and names it
in `orchestrator`, as it does with a role of its own:

```sh
cp node_modules/agentrite/orchestrator.json orchestrator.json
```

```json
  "orchestrator": "orchestrator.json",
```

`--definition` runs another file for one run, without a change to `agentrite.json`, so that a definition can be tried
first. Its path is relative to the project root, or absolute, and may lie outside the project:

```sh
npx agentrite orchestrate 0029 --definition trial.json
```

A project whose `orchestrator` is `false` is refused also with `--definition`.

## The outcome of a step

The command adds a request to the prompt of every step, after the step's own `prompt`: to give the step's outcome in
its final response, as one JSON object in a fenced code block marked `json`, which is the only such block of the
response and stands before the line `**Needed from you**` when the response has one. The agent writes no file for
it, and the command reads it from the final response the harness printed. The block is read at the top level of the
response, in a blockquote, nested or not, and in a list item, at any indentation. It ends at its closing fence, at the
end of its blockquote, or at the end of the response. A fence shown in a code block indented by four spaces counts as
a block too. A response whose block stands in another form may be read as having no outcome, or more than one, and
the step is then asked again or the run stops, as "How a run ends" says, with the final response in the run's
directory. The outcome holds these keys, and no other:

* `outcome`: `"done"`, `"needs-human"` or `"failed"`
* `summary`: a string, what the step did
* `questions`: a list of strings, what the step needs from the human for the run to go on, which may be empty
* `afterwards`: a list of strings, what the human needs to do, check or decide after the run, which the run can go on
  without, which may be empty
* `findings`: a list of objects, each with `id`, a string such as `S1`, `blocking`, `true` or `false`, and
  `summary`, a string. It is empty for a step that reviewed nothing
* `declines`: a list of objects, each with `finding`, the `id` of a finding, and `reason`, a string. It is empty for a
  step that proposed no decline

The request says that `needs-human` is for a step that cannot go on without the human, and that a step that did its
work and leaves items only in `afterwards` gives `done`. It says that an item belongs in `afterwards` when it is a
check only the human can make, as in a running application or on another operating system, an action only the human
can take that the rest of the run does not need, or a decision for which the step built the answer it recommends. An
item belongs in `questions`, with `needs-human`, when the step's work, or the steps after it, cannot do without it, as
a spec that can be read in two ways, or a decision that the rest of the work depends on and that the step could not
make. Every item of the list under `**Needed from you**` of the final response is also an item of exactly one of
`questions` and `afterwards`, and every item of these two is an item of that list.

The request says that the final response is the step's last response, after which the agent ends no turn, and that
the agent waits until every command it started in the background has ended before it gives it, so that none of them
reports its end after it. The command reads the response the harness gave last.

The request also says that a finding the step's prompt accepts is recorded in `record.md` as accepted by the
orchestrator's definition, and not as a decision of the human, and that the step sets the unit's status to no status
later than `in-progress`. The human sets `implemented` after the run, once the findings of its last review are
decided.

The outcome of a review with one blocking finding, as it stands in the final response:

````markdown
```json
{
  "outcome": "done",
  "summary": "Reviewed the unit against its spec and plan, and ran both suites.",
  "questions": [],
  "afterwards": [],
  "findings": [
    { "id": "S1", "blocking": true, "summary": "R25 is not met: a unit run does not mount .orchestrator" },
    { "id": "C1", "blocking": false, "summary": "The usage of orchestrate does not name its exit statuses" }
  ],
  "declines": []
}
```
````

## How a run ends

Before and after each step the command prints a line with the step's number, counted from 0 in the order the steps
run, its round in a repeat, its role, its harness and its model. The line after it adds the outcome, or that the step
ran out of time, and how long the step took:

```
step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: started
step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: done after 8m 12s
```

The harness's standard error reaches the terminal. Without `--follow`, what it prints on standard output is read and
not shown, and the command prints nothing of a step but its two lines. The step's session is in the harness's own
logs.

With `--follow`, the command prints between a step's two lines, while the step runs, the text messages the step's
agent writes and the tool calls it makes, each once the harness has made it known, in that order. Claude Code makes
each known as the agent makes it. OpenCode makes a tool call known once the call has ended, so of calls it runs at
the same time, the one that ended first is printed first. Codex makes known its text messages alone, each once it is
complete, and no tool call, so a step of Codex is followed by its messages alone:

* a text message is printed in full after its time, with one blank line before and after it. The final response is
  printed as any other text message, the block of its outcome among it
* a tool call is printed dimmed, on one line: its time, `→`, the name of the tool as the harness gives it, and a
  label. The label is the first of these that the call has: the description the agent gave a call of the shell tool,
  the path of the file the call acts on, the pattern the call searches for, and the first line of the command the
  call runs, cut to its first 100 characters. A line break in the label is written as `\n`, and a carriage return
  as `\r`, so that the call stays on one line. A call that has none of them has no label

The time is the instant the harness gives for the message or the call, or, where it gives none, the instant the command
learns of it, as `HH:MM:SS` in UTC. No result of a tool call, no reasoning of the agent and no other event of the
harness is printed, in Claude Code, OpenCode and Codex alike. Codex gives no instant for a message. The end report
stands last, as without the option. The option is chosen when the run starts: a run started without it prints none of
the messages and tool calls, and one started with it cannot be stopped from printing them. The followed file of each
step in the run's directory holds them in both cases, as "What .orchestrator holds" gives.

With `--follow`, the command's own lines and the end report stand in frames, so that they are found among the messages
and calls. A frame is an opening rule, `==== agentrite ` followed by `=` up to 80 characters in all, on the line before
its lines, and a closing rule of 80 `=` on the line after them. The rules are plain characters on a terminal and on a
pipe alike. The line the first step starts with has a frame of its own. The line a step ends with and the line the next
step starts with share one, and so do the line the last step ends with and the end report, the blank line before the
report kept. A blank line stands between a rule and the item of a step next to it, and no frame is open while a step
runs, so what the harness prints on standard error then stands outside the frames. Without `--follow` the command
prints no rule. A step followed, the first of a run of two, its two tool calls dimmed on the terminal:

```
==== agentrite =================================================================
step 1, implementer, claude, claude-sonnet-5-5: started
================================================================================

14:03:27 I will read the spec first, and then the tests of the command.

14:03:31 → Bash Run the unit tests of the command
14:03:40 → Read /work/scripts/agentrite.mjs

14:12:05 The tests pass, and the plan is ticked.

==== agentrite =================================================================
step 1, implementer, claude, claude-sonnet-5-5: done after 8m 41s
step 2, reviewer, opencode, openai/gpt-6.1-sol: started
================================================================================
```

The run stops, and runs nothing after the step, when:

* the step ran past its `timeoutMinutes`. This is judged before the cases below, and nothing is taken from what the
  step printed as an outcome: its final response is kept as that of a step without an outcome
* the harness exits with a status other than 0, or a signal ends it. A step whose `agentrite run` refuses, as for a
  wrapper that `refresh` would rewrite, is such a step
* the final response holds more than one block marked `json`, or one that is not an outcome of the form above
* the final response holds no block marked `json`, or the harness gave no final response, and the step is an ask
  again or its session is not known. Any other such step is asked again, as below
* the outcome is `needs-human` or `failed`
* the outcome is `done` and `questions` is not empty, since the step cannot go on without the human's answers
* `declines` is not empty, since only the human decides a proposed decline
* the step holds `stopWhen`, and a finding of its outcome is blocking
* a repeat with `until` ran out. A repeat with `"no-findings"` whose last round leaves only non-blocking findings did
  not run out, and stops no run

`afterwards` stops no run. A run that ran every item to its end exits 0 also when a step left items in it.

A step whose harness exited with 0 and no signal, within its time limit, whose final response holds no block marked
`json` or that gave no final response, and whose session is known, does not stop the run. The command runs one step
more after it, the ask again, in every harness alike: the same role, harness, model, round and `timeoutMinutes`,
continuing that step's session, with a prompt that says the last response held no block marked `json` and asks for
the step's outcome for its work as it stands, followed by the request of "The outcome of a step". The step's own
`prompt` is not given to it. The outcome of the ask again stands for the step's: the cases above judge it, and so do
the step's `stopWhen` and, for the last step of a round, the repeat's `until`, and the end report takes it as the
step's. An ask again is never asked again, so one whose final response holds no block marked `json` stops the run. A
step whose harness failed or that ran past its time limit is not asked again, and neither is one whose final response
holds more than one block marked `json` or one not of the form.

An ask again is a step of the run in every other respect: it has the next number, its lines before and after it, its
files in the run's directory, its place as the step the run is at in `state.json` and its row in the end report.
Its lines say that it asked again for the outcome:

```
step 1, round 1 of 3, implementer, claude, claude-sonnet-5-5: no outcome after 41m 37s
step 2, round 1 of 3, implementer, claude, claude-sonnet-5-5, asked again for its outcome: started
step 2, round 1 of 3, implementer, claude, claude-sonnet-5-5, asked again for its outcome: done after 0m 12s
```

When the run ends, the command prints last: a list of every step that ran, with its number, role, harness, model and
how long it took, and `asked again` after an ask again; how the run ended, and for a stop which step stopped it and
why, with what is wrong with an outcome
not of the form; then, for a stop, the tool calls the harness refused for lack of permission, as below; then from the
outcome of the step that ran last, when it is of the form, its summary, the blocking
findings still open after a stop by `stopWhen` or by a repeat that ran out, its questions and its proposed declines;
then, for each repeat with `"no-findings"` that let the run go on with only non-blocking findings after its last
round, in the order they ran and whatever ended the run, the line `Non-blocking findings still open after step
<number>:`, with the number of the step whose outcome holds them, followed by each of them with its id and its
summary, in the form of the blocking findings still open; then the items of `afterwards` of every step that gave an
outcome of the form; and last the run's directory, and that
the reviewer's findings are under `.reviews/<unit-directory>/`. For a last step without an outcome of the form, it
gives the path of its final response in the run's directory instead, or says that the harness gave none. For a step
that ran past its time limit, it gives the limit, and the path of its final response or that the harness gave none.
Nothing is taken from an earlier step but the non-blocking findings still open and the items of `afterwards`.

```
0  planner      claude    claude-opus-5-5     12m 04s
1  implementer  claude    claude-sonnet-5-5   41m 37s
2  reviewer     opencode  openai/gpt-6.1-sol   8m 12s
```

A run whose implementer was asked again lists the ask again as a step of its own:

```
0  planner      claude    claude-opus-5-5     12m 04s
1  implementer  claude    claude-sonnet-5-5   41m 37s
2  implementer  claude    claude-sonnet-5-5    0m 12s  asked again
3  reviewer     opencode  openai/gpt-6.1-sol   8m 12s
```

The items of `afterwards` are given whatever ended the run, under the line `After the run:`, grouped by step in the
order the steps ran. Each step is named by its number, its round in a repeat and its role, and its items follow in the
order the step gave them, each as the step gave it, also when two steps give the same. A step that left no item is
left out, and when no step left one, so is the line `After the run:`. For an implementer in round 1 that left two
items and a reviewer in round 1 that left one:

```
After the run:
  step 1, round 1 of 3, implementer:
    - Check the new action in a running IDE
    - Decide the label of the button; the step built "Export"
  step 2, round 1 of 3, reviewer:
    - Check the dialog on macOS
```

A step outside a repeat is named as `  step 0, planner:`.

The tool calls the harness refused for lack of permission stand directly after the line that says how the run ended,
and only for a run that stopped. They are those of the step that stopped it, and for an ask again first those of the
step it asked, since its outcome stands for that step's. A refused call of a step that went on, and of a run that ran
every item to its end, is not given. Claude Code makes a refused call known in `permission_denials` of the `result`
event that ends each turn, and every turn of the step counts. OpenCode makes it known as a `tool_use` event whose
status is `error` and whose error is `The user rejected permission to use this specific tool call.`. Codex asks for
no permission in a headless run, so a step of Codex never has a refused call, and never stops the run for one: a step
that a refusal would have stopped goes on to its outcome. The line `The
harness refused <n> tool calls for lack of permission:` counts them, and is followed by each call, in the order the
harness printed them, on a line of its own: the name of the tool as the harness gives it, and the label `--follow`
gives the call, or the name alone for a call without a label. For a run started, or resumed, without
`--skip-permissions`, three lines follow: that a headless step had nobody to ask, the command that resumes the run with
the option in the sandbox, and that on the host the harness's settings are to allow the refused calls instead. A step
with no refused call adds nothing to the report. A tool that the harness's settings deny outright is not given, since
no call of it is made: OpenCode does not offer such a tool to the agent. For a planner on Claude Code whose write of
the plan was refused, in a run without the option:

```
Step 0 stopped the run: its outcome is needs-human.
The harness refused 1 tool call for lack of permission:
  Write /work/changes/0061-x/plan.md
The run was started without --skip-permissions, so a headless step had nobody to ask.
In the sandbox, resume the run with the option: npx agentrite orchestrate 0061-x --resume --skip-permissions
On the host, allow the refused calls in the harness's settings instead.
Summary: The write of plan.md was refused.
```

A run that ran every item to its end exits 0, and a run that stopped exits 3, which is the command's own status. A
run that the command refused, and that started nothing, exits 1. See "agentrite orchestrate" in `COMMANDS.md`.

A run neither sets the unit's status nor commits. What the roles do to the unit, their commits and their entries in
`record.md` among it, is theirs, as when they are started by hand.

Once the human has done what a run stopped for, as answering its questions, deciding its proposed declines or fixing
what a review found, the run is resumed with `--resume`, from the project root on the branch the run ran on:

```sh
npx agentrite orchestrate 0029 --resume --prompt "Take the second reading of R2."
```

A resume takes the latest run of the unit on the variant of the branch checked out, the run that
`npx agentrite runs` lists first among the runs of that unit and variant. A branch with no `--` resumes the runs with
no variant. It takes that run only when the run ended with 3 and ran on the branch checked out, and a unit that is
`approved` or `in-progress`. A run that has not ended, as one a signal ended, which shows as stale, is not resumed,
and neither is a run other than the latest of its unit and variant: the human takes over from where it stopped.

A resume reruns the step that stopped the run, in the round it stopped in, continuing the session the step's role
and harness held in the run, as a later step of the same role and harness in a run does. When the run holds no
session for them, the rerun starts a new one. A run that stopped at an ask again is resumed at the step that was
asked: the rerun is that step, and not an ask again. The rerun's prompt is the step's own `prompt` from the
definition, then the words of `--prompt` as they were written, then the request of "The outcome of a step", each
apart by a blank line. Without `--prompt`, the words are replaced by the sentence `The human resumed the run of
AgentRite's orchestrator after it stopped at this step.`

The rerun is judged as any step is, by its outcome, its time and its harness's exit, and asked again when it gives no
outcome and its session is known. The run goes on from it by the definition, the steps after it with the rounds and
the sessions they would have had, had the step given that outcome the first time. A repeat whose `until` holds after
the rerun ends, and the run goes on with the item after it. A repeat that ran out is resumed at its last round, so it
gets no round beyond those of the definition, and runs out again when its `until` does not hold after the rerun.

A resume runs the definition the stopped run holds in its `definition.json`, and not the one `agentrite.json` names
when it is resumed. It is a run of its own, in a directory of its own, as "What .orchestrator holds" gives, and prints,
writes and ends as a run does, with `--follow` and without it. The first line it prints, before the first step, names
the run it resumes and the step it reruns. With `--follow`, it stands in the frame of the line the first step starts
with:

```
Resuming the run .orchestrator/0029-export/2026-10-21T10:00:00Z/ at step 0, planner, claude, claude-opus-5-5
step 0, planner, claude, claude-opus-5-5: started
```

Its steps are numbered on from the run it resumes, so the rerun has the number its step had there. Its end report
gives the steps the resume ran: the non-blocking findings still open and the items of `afterwards` of the steps of the
run it resumes stay in that run's report. A resume that stops is resumed in turn, as any run that stopped is.

## What .orchestrator holds

The command keeps each run in `.orchestrator/<unit-directory>/<run>/` of the project root, where `<run>` is the
instant the run started, in UTC, as `2026-10-21T10:00:00Z`. For a run on a variant's branch it is the instant, `--` and
the variant, as `2026-10-21T10:00:00Z--opus`. The variant is what follows the last `--` in the name of the branch
checked out in the project root when the run started, as the roles read it, so the runs of the variants of a unit have
directories of their own even when they start in the same second. A run on a branch with no `--`, on a detached `HEAD`
and outside a git repository has no variant, and its directory is the instant alone. Nothing but the command writes in
`.orchestrator/`. A run's directory holds:

* `definition.json`, the definition the run runs, as it was read at the start
* `state.json`, the state of the run: the unit, the definition's path as it was given, the branch checked out when the
  run started as `branch`, which is `null` on a detached `HEAD` and outside a git repository, is written once and never
  changes, and is missing in a run from before it was written, the name of the directory of the run it resumes as
  `resumes`, which is `null` for a run that resumes none, the step and round it is at as `at`, with `asked`, `true`
  for an ask again and `false` for any other step, the id of each harness session, and when the run ended, its exit
  status and how it ended. `resumes` and `asked` are missing in a run from before they were written. Such a run is
  read as one that resumes none, and a resume reads whether its step is an ask again from its files: it is one when
  the run's directory holds the followed file of the step numbered one lower, of the same role, and no outcome file
  of it, since a run goes on after a step without an outcome only to ask it again
* `heartbeat`, one instant in UTC to the second, as `2026-10-23T10:00:05Z`, followed by a line break, and nothing
  else. The command writes it when it makes the run's directory, before the first step starts, and then every 10
  seconds while the run lasts, between steps and while a step runs, with `--follow` and without it. Each write
  replaces the instant before it with the instant of that write, on the clock of the machine the command runs on,
  which in a unit run is the container's. Once the end of the run is in `state.json`, the command writes it no more,
  and it holds the instant of its last write
* `<number>-<role>.outcome.json` for each step that gave an outcome of the form, as it stood in its block, and
  `<number>-<role>.response.md` for a step that did not, holding its final response when there was one. An ask
  again has files of its own, numbered as any step, and the step it asks keeps its own `response.md`. The numbers
  have as many digits as the highest step number the definition can reach needs, counting an ask again after every
  step, two at least, so that the names sort in the order the steps ran. An outcome file holds the step's items of
  `afterwards`, so the run's directory holds those of every step that gave an outcome of the form
* `<number>-<role>.followed.jsonl` for each step that starts, numbered as those files are, and written with
  `--follow` and without it. It is made empty when the step starts, before its harness starts. Each text message and
  each tool call that `--follow` prints of the step is added to its end as one line, in the order `--follow` prints
  them, once the harness has made it known, and nothing else is added: no result of a tool call, no reasoning of the
  agent and no other event of the harness. A line is one JSON object and a line break. A text message is
  `{"time": ..., "kind": "text", "text": ...}`, with its text in full, and a tool call is
  `{"time": ..., "kind": "call", "tool": ..., "label": ...}`, with the name of the tool as the harness gives it, and
  the label that `--follow` prints for it, or `null` for a call with none. `time` is the instant `--follow` prints,
  as a whole instant in UTC with its date, as `2026-10-23T10:00:05Z`. The file is left in the run's directory when
  the step and the run end, however they end. A step that ran past its time limit, or whose harness a signal ended,
  keeps what was known of it. Two lines of one:

  ```
  {"time":"2026-10-23T10:00:05Z","kind":"text","text":"I will run the tests."}
  {"time":"2026-10-23T10:00:09Z","kind":"call","tool":"Bash","label":"Run the unit tests"}
  ```

A resume has a directory of its own, named as any run's is by the instant it started and its variant, and the
directory of the run it resumes is not changed. Its `definition.json` holds the text of the `definition.json` of the
run it resumes, and its `state.json` holds that run's definition path as `definition`, that run's directory name as
`resumes`, and that run's sessions, to which the resume's own are added. Its step files are numbered on from the run
it resumes: the rerun has the number that the step of the definition it reruns had in that run, which for a run that
stopped at an ask again is the number of the step that was asked, and every step after it, an ask again among them,
has the next number, as in a run.

Every file of a run's directory but the followed files is written whole. A file that is being written stands in the
same directory under a name that opens with `.` until it takes its own name, so a program that reads one of the files
reads what it held before a write or what the write gives it, and never part of either. Once a run ended, no file
whose name opens with `.` is left in its directory. Each file of a run, the one whose name opens with `.` among them,
is created anew: what stands at its name, a symbolic link among it, is removed first, and never what a link names.
Before each write the command makes sure that the run's directory, with every link resolved, is still
`.orchestrator/<unit-directory>/<run>/` of the project root, and stops the run with the status 1 when it is not.

A followed file is added to and never rewritten. A line is added to it whole or not at all, so a program that reads it
while the step runs takes the lines that end in a line break, and leaves a last line without one, which is being
added. A line the command could not write is missing from it, and the lines after it are there. When a part of the
failed line stands in the file and cannot be cut off, the lines after it are missing until it can. A write that failed
does not stop the run or change what it prints or its exit status.

A program that reads the directory tells the state of a run by `state.json` and `heartbeat`:

* A run whose `state.json` holds an end has ended, whatever `heartbeat` holds
* A run without an end whose `heartbeat` is at most 60 seconds old has a sign of life
* Any other run without an end, one without a `heartbeat` among them, has had none for over 60 seconds, and is called
  stale

A stale run can be one whose process ended without writing its end, as when a signal ended it; one on a machine that
sleeps, which gives signs of life again once it wakes; or one whose clock is behind the reader's by more than the
margin, as a container's in a virtual machine can be. The harness of a step can still be running when the command's own
process was killed, and the run then shows as stale.

`npx agentrite runs` lists the runs and tells their state by this rule. See "agentrite runs" in `COMMANDS.md`.

At the start of each run the command makes sure that `.orchestrator/.gitignore` holds `*` and nothing else, and
writes it whole when it is missing or holds anything but `*` and a line break. So git ignores the directory in every
project, without a line in the project's own `.gitignore`.

The command also keeps a record of each run it makes, a resume among them, outside `.orchestrator/`: one file per run
in `<state>/agentrite/.orchestrator-runs/`, where `<state>` is `$XDG_STATE_HOME` when that is set and `~/.local/state`
when it is not. The file is named by the SHA-256, in hexadecimal, of the absolute path of the run's directory with
every link resolved, followed by `.json`. It holds the SHA-256 of the run's `definition.json` and of its `state.json`,
as the command last wrote each. The command writes it whole each time it writes the run's `state.json`, and makes the
directory when it is missing.

A resume takes only a run that has its record and whose `definition.json` and `state.json` are as the record holds.
A run made before the kit kept records has none, and neither has a run made on another machine, a run made in a unit
run when it is resumed on the host, nor a run whose project root moved. `npx agentrite orchestrate <unit>` starts a
new run of the unit instead.

The command removes no record. When no run of any project is to be resumed, remove the directory:

```sh
rm -rf ~/.local/state/agentrite/.orchestrator-runs
```

## On the host and in the sandbox

On the host, the command is run from the project root, and each step's harness runs there, in the developer's
checkout:

```sh
npx agentrite orchestrate 0029
```

To watch each step's messages and tool calls while it runs, as "How a run ends" gives them, the command is run with
`--follow`:

```sh
npx agentrite orchestrate 0029 --follow
```

`--skip-permissions` is passed to the `agentrite run` of every step. What it does in each harness is in [agentrite
run](COMMANDS.md#agentrite-run). Without it, a headless step gets only what the harness's settings allow, and a step
that needs more is refused it. The option belongs in the sandbox, where the run is in a unit run on the clone of the
unit's branch:

```sh
./sandbox.sh 0029 npx agentrite orchestrate 0029 --skip-permissions
```

A unit run mounts the host's `.orchestrator` at `/work/.orchestrator`, so the run's directory is on the host as it is
written. See "Running a unit" of `SANDBOX.md`.

A run that stopped is resumed where it ran, on the branch it ran on. On the host:

```sh
npx agentrite orchestrate 0029 --resume
```

In the sandbox, in a unit run on the clone of the unit's branch:

```sh
./sandbox.sh 0029 npx agentrite orchestrate 0029 --resume --skip-permissions
```

The record of a run made in a unit run, which a resume takes, is in the container's `~/.local/state`, in the project's
home volume. So such a run is resumed in a later unit run of the project, and not on the host. Removing the volume, as
`docker volume rm <project>_agent-home` does, leaves no run that stopped in the sandbox before it to resume. See "The
home volume" of `SANDBOX.md`.
