# 0065 An orchestrator takes a unit through its roles

## Context

A unit is taken from its approved spec to a reviewed implementation by a human who starts each role in turn: the
planner, then the implementer, then the reviewer, then the implementer again with the findings, and so on. Unit 0032
gave the kit `agentrite run`, which starts one role in one harness on one model for one unit, headless if asked, and
passes arguments on to the harness. Unit 0033 split the specifier from the planner so that the human can write specs
ahead and leave the rest of a unit to something else. Both units named an orchestrator as the reason, and left it out.

The human first planned the orchestrator in a repository of its own, `agentrite-orchestrator`, fully apart from the
kit. Its notes, `idea.md` there, were written against release 3.0.0 and nothing in it was built beyond a command that
says it is not implemented. The human has now decided otherwise: the kit gets an orchestrator of its own, which
works on top of everything the kit has and changes none of it, and which a project may opt out of when it installs
the kit. The repository of its own is dropped, and its notes are a source for this unit and nothing more.

What the human asked for, in a conversation with the specifier on 2026-10-20:

* After the human has specified a unit with the specifier, on the host, the human starts the orchestrator, which has
  the planner write the plan with Opus in Claude Code, the implementer build it with Sonnet in Claude Code, and the
  reviewer review it with GPT Sol in OpenCode
* The review and the implementing of its findings run in a loop of at most three reviews. When the third review
  still has findings, the human gets a clear message saying so
* The whole sequence is described in a file: the steps, the harness and the model of each, the loop and how it
  ends. That makes it easy to build other orchestrators on the same ideas. JSON, so that the kit takes no dependency
  for it, and to be changed later if it does not work well
* The orchestrator runs on the host or in the sandbox
* The kit ships the default description, and a project that wants another copies it, as with the roles
* A project opts out with an option of `init`, which a key in `agentrite.json` records
* The orchestrator's own files are in a directory of the project root that is named for it and used for nothing
  else, and which the sandbox always mounts

The human decided in the same conversation that the work is split. This unit is the orchestrator, from the start of
a run to its stop. Picking a stopped run up again, once the human has answered, is a later unit.

## Requirements

The setting:

1. `agentrite.json` holds a key `orchestrator`, which is required, as every other key of the file is. It holds
   either `false`, for a project that opted out, or the path of the project's orchestrator definition, a path as
   `standards` takes, judged as `standards` is
2. The file that `npx agentrite config` writes, and the one `npx agentrite init` writes without `--no-orchestrator`,
   holds `orchestrator` as the path of the kit's default definition, from the project root. With
   `--no-orchestrator`, `init` writes `false`. `--no-orchestrator` is taken and refused as `--no-sandbox` is, in
   each form of `init`
3. Every command that reads `agentrite.json` refuses a file that lacks `orchestrator`, or whose `orchestrator` is
   neither `false` nor a path that names a file, as it refuses any key at fault, naming the key and what it must
   hold. `./sandbox.sh` in a start that cuts no branch judges `bell` alone, as today

The definition:

4. The kit ships a default definition, which is the JSON below, as it is written. It runs the planner in Claude Code on
   Opus, and then at most three rounds of the implementer in Claude Code on Sonnet followed by a review in OpenCode on
   GPT Sol. The implementer of the first round builds the unit, and that of a later round applies the findings of the
   review before it. A review with no blocking finding ends the repeat, and a third review with one stops the run, as
   requirement 19 says

```json
{
  "steps": [
    { "role": "planner", "harness": "claude", "model": "claude-opus-5-5" },
    {
      "repeat": {
        "times": 3,
        "until": "no-blocking-findings",
        "steps": [
          {
            "role": "implementer",
            "harness": "claude",
            "model": "claude-sonnet-5-5",
            "prompt": "From round 2, the human accepts the review's findings you agree with. Propose declining others."
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

5. A definition is a JSON object with one key, `steps`, a list of one or more items. An item is a step or a repeat
6. A step is an object with the keys `role`, `harness` and `model`, each a string that is not empty, and optionally
   `prompt`, a string that is not empty. `role` is a role that `roles` in `agentrite.json` names. `harness` is one
   that `harnesses` names. `model` is the harness's own id of a model
7. A repeat is an object with one key, `repeat`, an object with the keys `times`, a whole number of one or more,
   `steps`, a list of one or more steps, and optionally `until`, whose only value is `"no-blocking-findings"`. A
   repeat holds no repeat
8. Any step, in a repeat or not, may hold the key `stopWhen`, whose only value is `"blocking-findings"`
9. A definition with a key that requirements 5 to 8 do not give, or a value of another form than they give, is
   refused. The message names the definition's path, where in it the fault is, as `steps[1].repeat.steps[0].model`,
   what is wrong and what it must hold. The run starts nothing

The command:

10. `npx agentrite orchestrate <unit> [--definition <file>] [--skip-permissions]` runs a definition on the unit, from
    the project root: the one that `--definition` gives, and without it the one that `orchestrator` names. The unit
    is given as `agentrite run` takes it. `--definition` takes the path of a file, relative to the project root or
    absolute, and is also given as `--definition=<file>`. Run with no argument, it prints its usage
11. It refuses, starting nothing and exiting 1, when `agentrite.json` is missing or not valid, when `orchestrator` is
    `false`, saying that the project opted out and which key to change, also when `--definition` is given, when the path
    of `--definition` names no file, naming the path, when the definition is refused by requirement 9, when `changes/`
    holds no directory for the unit, or more than one for its digits, and when the unit's status is not `approved`,
    naming the status and saying that a run starts the work of an approved unit
12. It runs each step as `agentrite run` with the step's role, harness and model, `--headless`, the step's `prompt`
    when there is one, `--skip-permissions` when the command was given it, and the arguments the harness needs for
    requirements 13 and 15. The steps run in the order of the definition, one at a time, and a repeat runs its steps
    in order, round after round
13. Within one run, a step of a role and a harness that already ran in that run continues that step's session of the
    harness, so that the implementer of a later round has the context of the earlier ones. That holds for both
    harnesses
14. Each step that runs gets a number, counted from 0 in the order the steps run, a step in a repeat once for every
    round it runs in. Before each step and after it, the command prints one line that gives the step's number, its
    round within a repeat, and its role, harness and model. The line after it adds the step's outcome, and how long
    the step took

The outcome of a step:

15. Every step is asked, in the prompt the command adds after the step's own, to give its outcome in its final
    response, as one JSON object of the form of requirement 16 in a fenced block marked `json`, which is the only
    such block of the response, and which stands before the line `**Needed from you**` when the response has one.
    The command reads it from the step's final response, for both harnesses, wherever in the response the block
    stands in one of these forms: at the top level, in a blockquote, nested or not, or in a list item, at any
    indentation. A block ends at its closing fence, at the end of its blockquote, or at the end of the response. A
    response in which the block stands in another form, or in which Markdown that these forms do not cover hides it,
    may be read as having no outcome, or as having more than one, and the run then stops by requirement 18. The
    agent writes no file for it. For a step in a repeat, the added prompt also says which round it is and how many
    rounds the repeat has at most
16. An outcome is a JSON object with the keys:
    * `outcome`: `"done"`, `"needs-human"` or `"failed"`
    * `summary`: a string, what the step did
    * `questions`: a list of strings, what the step needs from the human, which may be empty
    * `findings`: a list of objects, each with `id`, a string such as `S1`, `blocking`, `true` or `false`, and
      `summary`, a string. It is empty for a step that reviewed nothing
    * `declines`: a list of objects, each with `finding`, the `id` of a finding, and `reason`, a string. It is empty
      for a step that proposed no decline

    and no other. The outcome of a review with one blocking finding, as it stands in the final response:

````markdown
```json
{
  "outcome": "done",
  "summary": "Reviewed the unit against its spec and plan, and ran both suites.",
  "questions": [],
  "findings": [
    { "id": "S1", "blocking": true, "summary": "R25 is not met: a unit run does not mount .orchestrator" },
    { "id": "C1", "blocking": false, "summary": "The usage of orchestrate does not name its exit statuses" }
  ],
  "declines": []
}
```
````

17. The command writes each step's outcome, as read, into the run's directory of requirement 23

How a run ends:

18. After a step, the command first judges the step itself. The run stops, and runs nothing after it, when:
    * the harness exits with a status other than 0
    * the final response holds no fenced block marked `json`, more than one, or one that is not of the form of
      requirement 16. The command writes the final response, when there is one, into the run's directory in the
      place of the outcome
    * the outcome is `needs-human` or `failed`
    * `declines` is not empty
    * the step holds `stopWhen` and its condition holds. `"blocking-findings"` holds when a finding of the step's
      outcome has `blocking` `true`
19. Only when requirement 18 did not stop the run, and the step is the last of its round in a repeat that holds
    `until`, the command then judges `until` on that step's outcome. `"no-blocking-findings"` holds when no finding
    of the outcome has `blocking` `true`:
    * when it holds, the repeat ends and the run goes on with the item after the repeat
    * when it does not hold and rounds are left, the next round starts
    * when it does not hold after the last round, the repeat ran out, and the run stops and runs nothing after it

    A repeat without `until` runs all its rounds, and the run then goes on with the item after it. It never stops the
    run by itself
20. The command's exit statuses follow "Exit statuses" of `README.md`. A run that ran every item to its end exits
    with status 0, and a run that stopped by requirement 18 or 19 with 3, the command's own status. A refusal of
    requirement 11 exits with 1, and arguments the command does not take, or none, with its usage and 2
21. When a run ends, the command prints what the human needs, last:
    * a list of every step that ran, in the order they ran, one line each, with the step's number of requirement 14,
      its role, its harness, its model and how long it took. For the default definition, run to its second review:

      ```
      0  planner      claude    claude-opus-5-5     12m 04s
      1  implementer  claude    claude-sonnet-5-5   41m 37s
      2  reviewer     opencode  openai/gpt-6.1-sol   8m 12s
      3  implementer  claude    claude-sonnet-5-5   15m 50s
      4  reviewer     opencode  openai/gpt-6.1-sol   6m 03s
      ```

    * how the run ended: every item ran, or which step stopped it and by which case of requirement 18 or 19. For an
      outcome that is not of the form of requirement 16, it says what is wrong with it, as requirement 9 does for a
      definition
    * when the step that ran last has an outcome of the form of requirement 16:
        * its `summary`
        * after a stop by `stopWhen`, or by a repeat that ran out, each blocking finding still open, with its `id`
          and `summary`, and after the latter how many rounds the repeat ran
        * each question of its outcome, and each proposed decline with its finding and reason
    * when it has none: the path of its final response in the run's directory, or that the harness gave no final
      response. Nothing is taken from an object that is not of the form of requirement 16, nor from the outcome of
      an earlier step
    * the path of the run's directory, and that the reviewer's findings are under `.reviews/<unit-directory>/`
22. A run neither sets the unit's status nor commits. What the roles do to the unit is theirs

The directory:

23. The command keeps each run in `.orchestrator/<unit-directory>/<run>/` of the project root, where `<run>` is the
    instant the run started, in the UTC form of `process.md`. It holds the state of the run, which step and round it
    is at and each harness session's id, a copy of the definition the run runs, written at its start as it was read,
    and the outcome of every step that ran, in files whose names give the order the steps ran in. Nothing but the
    command writes in `.orchestrator/`
24. At the start of each run, the command makes sure that the file `.orchestrator/.gitignore` holds `*` and nothing
    else, writing it when it is missing or holds anything else, and leaving it as it is when it holds that. The
    directory is then ignored by git in every project, without a line in the project's own `.gitignore`, also after
    the sandbox made it empty or the developer removed it
25. Every unit run of `./sandbox.sh`, whichever `orchestrator` holds, mounts the host's `.orchestrator` read-write at
    `/work/.orchestrator`, and makes the directory on the host, and its mount point in the clone, as the developer
    before the container starts. With `--in-place` it is there as part of the project root

The documents:

26. `README.md` has a section on the orchestrator that says:
    * what a run does, and that it starts the work of an `approved` unit
    * the form of a definition, with the default as its example, and the order in which a step and a repeat's
      `until` are judged, with the consequence that a `stopWhen` on the last step of a repeat with `until` stops the
      run before `until` is judged
    * how a project uses a definition of its own, by copying the kit's and naming the copy in `orchestrator`, and how
      to try one with `--definition` without changing `orchestrator`
    * the outcome of a step, and how a run ends, with its exit statuses
    * what `.orchestrator/` holds, and that nothing else writes there
    * how to run it on the host and in the sandbox
    * that `--skip-permissions` is passed to the `agentrite run` of every step, with a link to "Running a role" for
      what it does, and that a headless step without it gets only what the harness's settings allow
27. `README.md` describes `agentrite orchestrate` in "Commands", with its exit statuses and a link to "Exit
    statuses", `--no-orchestrator` in "agentrite init", the key in
    "The project's settings", the default definition in "What is here", and in "Updating a project to a newer kit"
    the line a project whose `agentrite.json` lacks `orchestrator` adds
28. The mount of `.orchestrator` is named wherever the mount of `.reviews` is:
    * in "Running a unit" of `SANDBOX.md`, which also says how the orchestrator is run in a unit run
    * in the table of what of the host is reachable besides `/work`, of `README.md`
    * in "What the sandbox defends against" of `SANDBOX.md`, among what reaches the host's repository. Among what it
      does not defend against, that section names what a file under `.orchestrator` says, to a human or a program
      that reads it on the host

Tests:

29. Unit tests cover the judging of a definition by requirements 5 to 9, the reading of an outcome by requirements 15
    and 16, and the order of steps and the ends of a run by requirements 12, 13, 18, 19 and 20
30. End-to-end tests run `agentrite orchestrate` against fake harnesses on the `PATH`, as the tests of
    `agentrite run` do, for: a run whose every item ends, a run whose repeat ends at its first round, one whose
    repeat runs out, one whose repeat has no `until` and runs all its rounds, one stopped by `stopWhen` outside a
    repeat and one inside it, by `needs-human`, by a decline, by a missing outcome, by two outcomes, by a malformed
    outcome and by a harness that fails, a run of a definition given with `--definition`, and the refusals of
    requirement 11
31. A test with Docker shows that a unit run mounts `.orchestrator`, made as the developer, and is skipped where
    Docker is not available, as the suite's other tests that need Docker are

## Decisions

* **The orchestrator is the kit's, and optional.** The human decided this, in the place of a repository of its own.
  It is built on `agentrite run` and the roles as they are, and a project that opts out has the kit as it is today,
  but for the key and the mount
* **Neither `process.md` nor any role file changes.** The human wants the orchestrator on top of what exists. The
  process says that `implemented` waits on the human deciding every blocking finding, and a run never sets
  `implemented`, so that holds. The role files say that the human decides which findings are accepted and only the
  human turns a proposed decline into a decision. Starting a run of a definition is the human's decision, made ahead,
  and the definition's prompt to the implementer carries it. A decline stays a proposal and stops the run, so the
  human still decides it. The implementer records an accepted finding's outcome as its role file says
* **The decision on findings is a step's `prompt` in the definition.** Another orchestrator can then accept only the
  blocking findings, or none, without a change to the kit. The human agreed to this, and noted that it can be moved
  out of the definition later
* **The outcome is read from the step's final response, and no agent writes a file for it.** The reviewer's role
  file allows it to write two files only, its findings and its record entry, so a request to write a third would
  set the orchestrator's prompt against the role. A final response is what every role gives, the reviewer's already
  holds its findings, and both harnesses hand it to a caller of their headless mode. It also leaves `.orchestrator/`
  written by the command alone. Rejected: an outcome file written by the agent, which breaks the reviewer's role;
  and a line in the reviewer's role file that allows it, which changes a role
* **The outcome may stand anywhere in the final response, as its only `json` block.** The standards end a message
  that needs the human with the line `**Needed from you**` and a list, with nothing after it, and a step that stops
  for the human gives such a message. An outcome required to end the response would break that rule exactly where a
  run stops for the human. Being the only block keeps the reading unambiguous. Rejected: keeping the outcome last
  and recording an exception to the standards, which a step following its standards would still break; and reading
  the list instead of `questions`, which reads prose
* **The forms of a final response that are read are named.** The human decided this after a review had found an outcome
  in a blockquote read as none, and the fix of that had made a block left open in a blockquote hide the outcome after
  it. Read wherever Markdown allows, each form a reviewer can think of is a new case that fails, and so a new blocking
  finding, with no end. The reader is not a full Markdown parser, and the kit takes no dependency for one. The named
  forms are those a model writes: the block at the top level, in a blockquote and in a list item. A form outside them is
  not a fault of the unit, since a misread of it costs little: in most cases the run stops for the human, who finds the
  final response in the run's directory and takes over. Accepted with it: a fence shown in a code block indented by four
  spaces counts as a block, which Markdown would not count, since the reader takes a fence at any indentation so that a
  list item's is found. Rejected: reading every form Markdown allows, which takes a parser of the kit's own or a
  dependency; and the top level alone, which stops a run whose model nests the block, and undoes the reading of
  blockquotes and list items that the human had already accepted
* **The request for the outcome is in the command, not in the definition or the role files.** The command that
  asks for the form is the command that reads it, so the two cannot drift, every project on one release asks the
  same, and a step of a role that a project replaced, or added, is asked as well. The human agreed to this
* **The outcome has one form for every role.** The human wants it structured, so that a later decision on it, by a
  program too, is easy. One form means one reader, whichever role ran. Rejected: a form per role, which makes a
  definition's step depend on which role it names
* **A stop for the human has an exit status of its own, 3.** "Exit statuses" of `README.md`, which unit 0066 wrote,
  gives 1 to a refusal or a failure, 2 to wrong arguments, and 3 and above to a command's own meanings, so 3 is the
  first status free. A script, or the later unit that picks a stopped run up, can then tell a run that waits for the
  human from a run that never started, without reading what the command printed
* **A run stops on anything it cannot read as done.** Exit status 0 says that a harness's turn ended, not that the
  unit is done, so the command trusts the outcome and stops when there is none. A stop costs the human a look, and a
  run that goes on after a step it misread costs the steps after it
* **A round is the implementer and then the review, and the check is at the end of the round.** The human chose
  this. Every round ends with a review, so whether findings are open is known at the end of each, and the third
  review is the last word of the run: three rounds of implementing and reviewing, and no fix after the third review
  that nobody reviews. Rejected: a round of a review and then a fix, after a first implementer outside the repeat,
  which needed the run to stop in the middle of the last round to leave no fix unreviewed
* **Ending a repeat and stopping the run are two keys.** The human decided this. `until` on a repeat says when the
  work of the loop is done, and the run goes on. `stopWhen` on a step says when the run must stop and come to the
  human, as a security reviewer that finds a blocking issue would, and holds on any step. The two point in opposite
  directions, so one key for both would mean one thing in a repeat and the other outside it. `until` is on the
  repeat, where a reader looks for when the loop ends, and is judged on the round's last step, which in the default
  is the review
* **The step is judged before the repeat.** A step that must stop the run, by its outcome or its `stopWhen`, stops
  it whatever the repeat would do next, so its checks come first, and `until` is judged only on a step that let the
  run go on. The ran-out stop is the repeat's, and so is only for a repeat that holds `until`. A reviewing step with
  both `stopWhen` and a repeat's `until` therefore stops the run at its first blocking finding, which the README says
* **The command tells a step in a repeat its round.** The implementer of the first round builds the unit and has no
  review of this run to apply, and the `.reviews/` of the unit may hold reviews of earlier work. With its round
  given, the definition's prompt can say from which round the findings are accepted. Rejected: a prompt per round
  in the definition, which is a second key for one sentence
* **The default definition is written out in the spec, to the character.** The form is what every project copies
  and what a later orchestrator is built on, so it is the human's to approve and not the planner's to design.
  Requirements 5 to 9 give the rules a definition is judged by, and the default shows them in use. The implementer's
  prompt in it fits the line limit of the file it ships in
* **`--definition` runs another definition for one run.** The human took this into the unit from "Beyond the
  request", so that an orchestrator can be tried without editing `agentrite.json`, which is committed. The path is
  any file, also one outside the project, since it is the developer's own choice for one run and is read, not
  written. A project that opted out is still refused, since `false` says that the project does not use the
  orchestrator. Rejected: a definition given by `--definition` that `orchestrator` must also allow, which makes trying
  one cost the edit the option is there to save
* **One value each of `until` and `stopWhen`, and no repeat inside a repeat.** The human asked for `stopWhen` with
  `"blocking-findings"` though the default does not use it, so that a project can stop on a role of its own. A value
  or a nesting can be added later without making a valid definition invalid
* **The model of a step is required.** The human wants the file to say which model each step runs on. Rejected: an
  optional model, as `agentrite run` has, which would leave the choice to a wrapper the definition does not show
* **A step continues its role's session within a run.** The human agreed that the implementer keeps its context
  through the loop. The same rule for every role keeps the definition free of a key for it. A run does not continue
  sessions of an earlier run, which is the later unit's
* **That OpenCode sends the prompt of a resumed session when headless is verified first.** A review of this spec
  found, in the source of OpenCode 1.18.33 and 1.19.3 and not in a run, that `opencode run --session <id>` sends the
  new prompt, which requirement 13 depends on. "Running a role" of `README.md` says that a resumed session of
  OpenCode does not send the new prompt, which reads as if it held for a headless run as well. The plan verifies the
  behavior with a real headless run before anything is built on it. An error found in `README.md` is a unit of its
  own, and not corrected by this one
* **A run keeps a copy of the definition it ran.** The later unit that picks a stopped run up needs to know which
  step a stop was at, and the definition named in `agentrite.json`, or given with `--definition`, may have changed
  since. The human took this in for that unit, though nothing in this unit reads the copy, since a run made before
  the copy existed could not be picked up
* **`--skip-permissions` is an option of the command, given when the run is started.** The human decided this.
  Whether to skip depends on where the run is, not on what the orchestrator is, and the kit does not judge whether
  it is in the sandbox, as unit 0032 decided
* **The setting is one key that holds the path or `false`.** It is how `standards` and `roles` name a file, so a
  project that uses its own definition does as it does with its own role, and the opt-out is the same key. The human
  agreed that the kit ships the default and a project copies it. `orchestrator` is required, as unit 0045 made every
  key, and as unit 0058 did for `bell`. The cost, accepted: an existing project's `agentrite.json` is refused until
  it holds the key, which "Updating a project to a newer kit" says
* **`.orchestrator/` is its own directory, ignored by a file in it.** The human chose a directory named for the
  orchestrator over `.reviews/`. The kit writes no `.gitignore` of a project, and a `.gitignore` inside the directory
  keeps it so. The file is the command's, as everything in the directory is, so the command writes it anew when it
  holds anything but `*`, which keeps the promise that the directory is ignored. Rejected: a line that `init` adds
  to the project's `.gitignore`, which is a file the kit does not write today; leaving a file that holds something
  else as it is, which breaks the promise; and refusing to run, which leaves the fix of a file of the command's to
  the developer
* **The sandbox always mounts it.** The human decided this, as cheaper than following the setting. The cost: a
  project that opted out gets an empty directory, which git does not show
* **The mount is a way from the container to the host, and is documented as one.** Every text that names what of the
  host a unit run reaches names `.orchestrator` beside `.reviews`. "Where things are kept on the host" does not name
  it, since it lists what the sandbox keeps outside the project, and `.orchestrator`, as `.reviews`, is a directory of
  the project, written on the host as well when the orchestrator runs there. Nothing in this unit reads a file of
  `.orchestrator` back, and the unit that will is the one to weigh what an agent in the sandbox may have written
* **A run takes an `approved` unit only.** A run starts the work of a unit, and the planner, the first step of the
  default, takes an `approved` unit. An `in-progress` unit is being worked on by hand, or was left by a run that
  stopped, and picking that up is the later unit's, which adds a form of the command for it with a status rule of
  its own. Rejected: refusing only `draft` and `implemented`, which hands the default's planner a unit outside its
  role's input; and refusing `in-progress` only when the definition starts with the planner, which has the command
  reason about the names of roles
* **The kit's models are the human's.** The default names the ids the human gave, as the README already writes them.
  A release that moves to newer models changes the default, and a project that wants others copies it

## Non-goals

* Picking a stopped run up again, with the human's answer or after the human took over, which is the later unit
* A change to `process.md`, to any role file, or to the standards
* A run that sets `implemented`, or commits anything itself
* The specifier as a step of the default, which works with the human in a session
* A time limit on a step, after which the command ends the harness and stops the run, as for an implementer going
  in circles. `stopWhen` cannot give it, since it is judged on an outcome and such a step never ends to give one.
  The human decided to leave it for a later unit
* A budget for a step, which the harnesses' own arguments can give when added later
* A notification of the human beyond what the command prints and its exit status, such as the bell or a message
  outside the terminal
* `./sandbox.sh --workdir`, whose directory is not the project root, and anything specific to a variant of a unit
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

1. **Live output of a step while it runs.** The harness's own output would show what a step is doing. It costs
   reading two event formats as they stream. Without it, the command prints a line before and after each step, and
   the harnesses' session logs hold the rest
