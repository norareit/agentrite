# 0076 A step of the orchestrator can leave items for after the run

## Context

`npx agentrite orchestrate <unit>` runs the steps of a definition, unit 0065
(`changes/0065-an-orchestrator-takes-a-unit-through-its-roles/`), and reads each step's outcome from the block marked
`json` in its final response. An outcome holds `outcome`, `summary`, `questions`, `findings` and `declines`, and no
other key. `questions` is what the step needs from the human. The run stops after a step whose outcome is
`needs-human` or `failed`, and a `done` outcome goes on whatever `questions` holds. When the run ends, the end report
gives the summary, the open blocking findings, the questions and the proposed declines of the step that ran last, and
nothing of an earlier step.

The human ran the kit's default definition, the planner and then at most three rounds of the implementer and a
review, on a unit of another project, an IntelliJ plugin. The implementer built every commit of the plan, the tests
passed, and it gave `needs-human`, so the run stopped with status 3 before any review. What it needed of the human
was checks only the human can make, in the IDE and on two other operating systems, and one decision for which it had
already built the answer it recommended. None of it kept a reviewer from reviewing the code, so the review rounds
could have run. The checks are also better made after the review rounds, since those rounds may change the code.

A step has no way to say that it needs something of the human after the run without saying that the run cannot go
on. This unit gives it one.

## Requirements

The outcome:

1. An outcome holds the keys `outcome`, `summary`, `questions`, `afterwards`, `findings` and `declines`, and no other.
   `afterwards` is a list of strings, which may be empty
2. An outcome without `afterwards`, with an `afterwards` that is not a list, or with an item of it that is not a
   string, is not of the form, and the run stops as for any outcome not of the form. The fault names the key as it
   names the other keys, as `afterwards is missing` and `afterwards[1] is 5. It must hold a string`, and the sentence
   that says which keys an outcome holds names `afterwards` among them, after `questions`
3. `questions` holds only what the step needs from the human for the run to go on. `afterwards` holds what the human
   needs to do, check or decide after the run, which the run can go on without

The request the command adds to every step's prompt:

4. The request names `afterwards` among the keys, after `questions`, and says what each of the two holds, by
   requirement 3. It says that `questions` is empty when the step needs nothing of the human for the run to go on,
   and `afterwards` when it leaves nothing for after the run
5. The request says that `needs-human` is for a step that cannot go on without the human, and that a step that did
   its work and leaves items only in `afterwards` gives `done`. It says which list an item belongs in:
    * in `afterwards`: a check that only the human can make, as in a running application or on another operating
      system; an action only the human can take that the rest of the run does not need; and a decision for which the
      step built the answer it recommends
    * in `questions`, with `needs-human`: what the step's work, or the steps after it, cannot do without, as a spec
      that can be read in two ways, or a decision that the rest of the work depends on and that the step could not
      make
6. The request says that every item of the list under the line `**Needed from you**` of the final response is also
   an item of exactly one of `questions` and `afterwards`, and that every item of these two is an item of the list

How a run ends:

7. A `done` outcome whose `questions` is empty, and that no other case of "How a run ends" stops, lets the run go on
   whatever `afterwards` holds. `afterwards` stops no run, and a run that ran every item of the definition exits 0
   when a step left items in it
8. A `done` outcome whose `questions` is not empty stops the run. It is judged after the case of an outcome that is
   not `done`, and before the case of `declines`. The line that says how the run ended says that the step's outcome
   is `done` but holds questions, which the human answers. The step's outcome is written to its
   `<number>-<role>.outcome.json` as that of any step with an outcome of the form
9. The other cases that stop a run, and the order they are judged in, are as they are before this unit

The end report:

10. The end report holds the items of `afterwards` of every step that ran and gave an outcome of the form, whatever
    stopped the run or whether it ran to its end, and among them the steps before a last step that gave no outcome of
    the form. They stand after what is taken from the step that ran last, and before the line that gives the run's
    directory
11. They are grouped by step, in the order the steps ran: first the line `After the run:`, then for each step that
    left at least one item a line `  step <number>, <role>:`, with `, round <at> of <times>` after the number for a
    step in a repeat, and under it each item of the step as `    - <item>`, in the order the step gave them. A step
    whose `afterwards` is empty is left out, and so is a step without an outcome of the form. When no step left an
    item, the report holds neither the line `After the run:` nor any line for it
12. Each item is printed as the step gave it. Two steps that give the same item each print it
13. The summary, the blocking findings still open, the questions and the proposed declines are taken from the step
    that ran last, as before this unit, and nothing else is taken from an earlier step

The run's directory:

14. Each `<number>-<role>.outcome.json` holds the step's `afterwards` as it stood in the block, beside the other keys,
    and the run's directory holds the items of every step that gave an outcome of the form in those files. No other
    file is written for them

The documents:

15. `README.md` gives `afterwards` in "The outcome of a step", with the narrower meaning of `questions` and with
    `"afterwards": []` in its example, and in "How a run ends" the stop of requirement 8, that `afterwards` stops no
    run, and the part of the end report of requirements 10 to 13, with an example of it. "What .orchestrator holds"
    says that the outcome files hold the items of `afterwards`

Tests:

16. Unit tests cover: the reading of `afterwards`, a missing key, a value that is not a list, an item that is not a
    string, and the sentence of the keys; the judging of a `done` outcome with items in `afterwards`, which goes on,
    of a `done` outcome with questions, which stops, and its order against `declines`; the request's text; and the end
    report's part of requirement 11, with steps in a repeat and outside one, a step left out for an empty list, a
    step left out for an outcome not of the form, the items of steps before a last step without one, a run with no
    item, and the end line of requirement 8
17. Tests of the command show a run of an implementer that gives `done` with items in `afterwards`, followed by a
    reviewer that runs and gives items of its own, which ends with status 0 and an end report that holds the items of
    both steps, grouped by step, and a run that a `done` outcome with questions stops with status 3

## Decisions

* **What a step needs of the human to go on is told apart from what it leaves for after the run, and only the first
  stops the run.** The human decided this from the run of the plugin's unit, which stopped before any review for
  checks and a decision that the review did not need. A check made before the review rounds may need making again
  after them, since a round may change the code, so stopping for it costs the human twice. `needs-human` keeps its
  meaning, a step that cannot go on without the human, as for a spec that can be read in two ways or a decision the
  rest of the work depends on. Rejected: stopping for both, which is what happened; and a step that gives `done`
  with its checks in `questions`, which today goes on but leaves the human to tell the two kinds apart in one list
* **The new key is `afterwards`.** It names when the human acts on an item, which is what tells it from `questions`,
  and not what kind of item it is, since the items are checks, actions and decisions alike. It is one lower-case
  word, as the other keys of an outcome are. Rejected: `checks`, `decisions` and `actions`, each of which names one
  kind and leaves out the others; `followUps`, which unit 0075's `--follow` would make confusing to read beside it,
  and which reads as work an agent could take up too; `later` and `deferred`, which read as work the step put off,
  whereas the items were never the step's to do; and `handover`, which names one act and not a list of items
* **`questions` is kept, with its meaning narrowed to what the run cannot go on without.** The name reads right for
  what a step asks before it can go on, and renaming it would change every outcome, test and the README for no
  change in what a run does. Rejected: renaming it, as to `blockers`; and dropping it, with `needs-human` alone saying
  that the step is blocked, which would leave the human to find in the final response what it is blocked on
* **A `done` outcome with questions stops the run.** By the narrowed meaning, a step that holds questions cannot go
  on without the human, and running the next step without their answers is what the first decision says stops a run.
  It is a stop of its own, as one for `declines` is, and not an outcome not of the form, so that its outcome is kept
  in its outcome file and its summary and questions are in the end report. Rejected: letting it go on, as before this
  unit, which would make the narrowed meaning a word in the request that nothing holds; and refusing it as not of
  the form, which keeps the outcome only as the final response and drops its summary and questions from the report.
  This changes what a run does for such an outcome, which before this unit went on
* **`afterwards` is required, as the other keys are.** An outcome without one of its keys shows that the step did not
  follow the request, and that holds for this key as for the others. An optional key would be the first of an
  outcome, and a step that forgot it would leave the human not knowing whether there was nothing for afterwards
* **The end report takes `afterwards` from every step that ran, grouped by step.** Items come from any step, and the
  step that ran last is often the reviewer, which holds none of the implementer's. The step and its round are named,
  so that the human sees which round left an item, and can tell that a later round repeats an earlier one. The
  command does not merge items, since it cannot tell that two items of prose are the same. Everything else in the
  report stays taken from the last step: a stop for the human comes only from the last step, so its questions and
  declines are the only ones open
* **The items are kept in the run's directory by the outcome files.** Each step's outcome file already holds its
  block as the step gave it, so it holds `afterwards` with nothing new to write. A file that collects the items of
  every step is item 1 of "Beyond the request"
* **The request tells the agent how the two lists relate to `**Needed from you**`.** The standards end a message that
  needs anything of the human, a decision, an answer or an action, with that list, and a step that leaves items for
  after the run needs something of the human, so its final response has the list. The list is what the human reads
  and the outcome is what the command reads, so the outcome splits the list into its two kinds, and every item is in
  both places. The request is the place for it, as unit 0065 decided that what a step is asked for the orchestrator
  is in the command, and not in the role files or the definition. No role file changes: none of them names the
  outcome or the orchestrator
* **The kit's default definition does not change.** The prompt of its implementer is about the findings of a review,
  and nothing in the definition names `questions` or what stops a run
* **A step of the definition at which the run waits for the human, and then goes on, is not part of this unit.** The
  human considered it and left it out. Nothing in the default definition runs after the review rounds, so such a step
  would wait before steps that do not exist yet. It can be added later as a new kind of item of a definition, beside
  a step and a repeat, and a definition without it stays valid, since it holds only steps and repeats, which keep
  their meaning. The items of `afterwards` that the steps before it gave are what such a step
  would show the human

## Non-goals

* A step of the definition that waits for the human, by the last decision
* Changes to the role files, to `process.md`, to the standards and to the kit's default definition
* Keeping track of the items across runs, marking them done, or merging items that two steps or two rounds give
* Writing the items into the unit's `record.md`. What a step writes there is the step's, as before this unit
* Changes to the line before and after a step
* Changes to `SANDBOX.md`, which says how the orchestrator is run in a unit run and nothing of an outcome or the end
  report
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **A file of the run's directory that collects the items.** The command would write the items of every step, as
   the end report groups them, to a file in `.orchestrator/<unit-directory>/<run>/`, as `afterwards.md`, so that they
   can be read in one place after the terminal is gone. It costs the file, its place in "What .orchestrator holds",
   and tests. Without it, the items are in each step's outcome file, one file per step
2. **The line after a step says how many items it left.** The line would read, for instance, `done, 3 items for after
   the run, after 41m 37s`, so that the human sees them while the run goes on. It costs a change to the line, which
   the tests of the command and the README's example hold, and tests. Without it, the human sees the items in the end
   report, or in the step's outcome file once the step has ended
