# 0081 The runs of a project can be listed

## Context

`npx agentrite orchestrate <unit>` keeps each run in `.orchestrator/<unit-directory>/<run>/` of the project root, where
`<run>` is the instant the run started, in UTC, as `2026-10-21T10:00:00Z`. A run's directory holds `definition.json`,
the definition as it was read at the start, and `state.json`, which holds the unit, the definition's path, the step and
round the run is at as `at`, the id of each harness session, and once the run ended, its end as `ended`, with its exit
status and the line that says how it ended. A unit run of the sandbox mounts the host's `.orchestrator/` into its
clone, so the runs in the sandbox are in the host's project root as they are written.

Unit 0079 adds a `heartbeat` to every run's directory and gives the rule by which a reader tells a run that ended, one
with a sign of life in the last 60 seconds, and one that is stale. Unit 0080 adds the followed output of each step.

The human means to build a graphical interface, a project of its own outside the kit, that shows the runs of each
project and their state. It reads the units of a project with `npx agentrite units --json`, and never parses a
`record.md` itself. The kit has no command that does the same for the runs, so the interface would depend on the
layout of `.orchestrator/` and judge each run's state by itself. A human who wants to know which runs of a project are
going has to look into the directories by hand.

## Requirements

The command:

1. `npx agentrite runs [<number>] [--limit <count>] [--json]` lists the runs of the orchestrator of the project, from
   the directory it runs in. The options may stand at any place among the arguments
2. A run is a directory `.orchestrator/<unit-directory>/<run>/` whose `<unit-directory>` is four digits, a hyphen and
   at least one character more, and whose `<run>` is an instant of the form `YYYY-MM-DDTHH:MM:SSZ`. No other
   directory of `.orchestrator/` is listed, whatever it holds. A run whose directory holds no `state.json` is left out,
   since the command writes it right after making the directory
3. The command reads nothing but `.orchestrator/` in the directory it runs in: no `changes/`, no `agentrite.json` and
   no git
4. Runs are listed by the instant they started, the latest first. Runs that started at the same instant are listed in
   the order of their unit directories

The state of a run:

5. The state of a run is `ended` when its `state.json` holds an end, whatever its `heartbeat` holds. Otherwise it is
   `running` when its `heartbeat` holds an instant at most 60 seconds before the instant the command reads it, on the
   clock of the machine the command runs on, and `stale` when the instant is older, the file is missing, or it does
   not hold an instant of the form of unit 0079
6. The step of a run is the one its `at` names, found in its `definition.json`. A run whose `at` names no step yet has
   no step

What is shown of a run:

7. Each run is shown on one line: the instant it started, the four digits of its unit, its state, and what the state
   gives, the first three in columns that line up across the lines:
    * for `running`, the step, as the line the orchestrator prints before a step names it, without `: started`, as
      `step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol`, or `before its first step` for a run with no step
    * for `stale`, `no sign of life since ` and the instant of its `heartbeat`, or `no sign of life` when it has none,
      then `, at ` and the step as for `running`, or `, before its first step`
    * for `ended`, the line of its end in `state.json`, as written there
8. A run whose `state.json` or `definition.json` cannot be read, is not JSON, or is not of the form the orchestrator
   writes, or whose `at` names a step its definition does not have, is refused: the command names the file and what is
   wrong with it, prints nothing on standard output, and exits 1

The unit by its number, and the limit:

9. `<number>` is exactly four digits. With it, only the runs whose unit directory opens with those digits and a hyphen
   are listed
10. At most 50 runs are listed. `--limit <count>` sets another maximum, and `--limit 0` lists them all. The limit
    counts the runs that remain after `<number>`
11. When the limit leaves runs out, the text listing ends with one line that says how many runs it shows of how many
    there are, and that `--limit 0` shows them all
12. When there is nothing to show, because there is no `.orchestrator/`, it holds no run, or no run is of the unit that
    `<number>` names, the text listing is the one line `no runs`, or `no runs of ` and the number when one was given,
    and the command exits 0

The JSON document:

13. With `--json`, the command prints one JSON document instead of the text: an object with a key `runs`, an array of
    the runs listed in the order of requirement 4, and a key `total`, the number of runs there are after `<number>` and
    before the limit. Each run is an object with:
    * `number`, a string of the four digits of its unit, and `unit`, the name of its unit directory
    * `run`, the instant it started, as its directory is named, and `directory`, the path of its directory from the
      directory the command runs in
    * `state`, one of `running`, `stale` and `ended`
    * `heartbeat`, the instant its `heartbeat` holds, or `null` when it holds none of the form or is missing
    * `step`, `null` for a run with no step, or an object with the step's `number`, its `round` and the `rounds` of its
      repeat, both `null` for a step outside a repeat, its `role`, its `harness` and its `model`
    * `ended`, `null` for a run without an end, or its end as `state.json` holds it, with its `status` and its `line`

    When there is nothing to show, `runs` is an empty array, and no line of text is printed

Refusals:

14. These are wrong arguments, for which the command says what is wrong, prints its usage, and exits 2: a `<number>`
    that is not four digits; a second `<number>`; `--limit` without a value or given twice; a `<count>` that is not a
    whole number of zero or more; and an option the command does not take

The documents:

15. `README.md` gives `agentrite runs` in "Commands", with its form, what it lists and in what order, the line of a run
    and its three states, the closing line of requirement 11, the line of requirement 12, the JSON document, its
    refusals, a table of its arguments and options, and its exit statuses by "Exit statuses"
16. "What .orchestrator holds" of `README.md` says that `npx agentrite runs` lists the runs and their states by the rule
    it gives
17. The usage the command `agentrite` prints names `agentrite runs` with its form, beside the other commands

Tests:

18. Unit tests cover the reading of the arguments and each wrong argument of requirement 14, which directories are
    runs, a run without `state.json`, the order of the runs, each state with a heartbeat that is recent, one at the
    margin, an old one, a missing one and one not of the form, the step inside and outside a repeat and before the
    first step, the line of each state, `<number>`, the default limit, `--limit` with a count and with 0, the closing
    line, the line when there is nothing to show with and without a number, the JSON document with and without runs,
    and each refusal of requirement 8
19. Tests of the command show, on a project with runs of several units in each state and more runs than the limit, a
    listing, a listing of one unit's runs, `--json`, and a directory without `.orchestrator/`, each with its exit status

## Decisions

* **The name `runs`.** It names what the command lists, as `units` and `roles` do, and the kit calls each going of the
  orchestrator a run. The human took the command as the third of the units for the interface, after the heartbeat and
  the followed output
* **The command judges the state, by the rule of unit 0079.** The interface, and a human at a terminal, then judge it
  the same way, and the rule is written in one place of the code. The clock is the reader's, as the rule says
* **The line of a state reuses the orchestrator's own text.** The step is named as the line before a step names it,
  and an end by the line `state.json` holds, so the listing reads as the run's own output and the two cannot drift
  apart
* **Only `<number>` and `--limit`, not filters by state.** The question the interface and the human ask first is which
  runs are going, and the newest runs come first. A filter such as `--running` was left out of the requirements, and is
  item 1 of "Beyond the request"
* **At most 50 by default, as `units`.** Runs pile up, since nothing removes them, and faster than units, since a unit
  can have several. The same limit and the same option as `units` keep the two commands alike
* **Nothing to show is not an error, a project without `.orchestrator/` among it.** A project that never ran the
  orchestrator is in a normal state. `units` refuses a directory without `changes/`, since every project that uses the
  kit has one, and `.orchestrator/` is made by the first run only
* **A run without `state.json` is left out, not refused.** The command makes the run's directory and writes
  `state.json` right after, so a listing made in between would refuse a run that is starting. A run that stopped in
  between holds nothing to show
* **A malformed run is refused, not skipped.** Only the orchestrator writes `.orchestrator/`, so a file not of its form
  is a fault a human should see, and a listing that skipped it would hide a run without a word, as `units` refuses a
  malformed record
* **No `changes/`.** The listing names a unit by its digits, and a reader that wants the title reads `units`. Reading
  both would make the command fail on a project whose `changes/` has a fault the runs have nothing to do with
* **What it defends against.** The command reads files that an agent in a unit run may have written, as "What the
  sandbox defends against" of `SANDBOX.md` says of `.orchestrator/`. It refuses what is not of the form the orchestrator
  writes, and so prints nothing that the form does not allow. It does not defend against a run directory of that form
  that holds what the orchestrator did not write, such as a `heartbeat` of a run that is not alive, or a line of an end
  that holds what a terminal takes for a control sequence. The supported usage is the sandbox's: one developer, one
  host, runs started by the kit's command

## Non-goals

* Filtering the runs by their state, by their harness or by their outcome
* Showing a run's outcomes, the summary of its last step, its sessions or its followed output
* Reading the units' titles or statuses from `changes/`
* Removing runs, or any other write to `.orchestrator/`
* Telling whether a stale run's harness still runs
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **A filter by state.** `--running`, or `--state <state>`, would list only the runs of that state. It costs an option,
   its refusals and tests. Without it, a human reads the newest runs at the top, and a script reads `--json`
2. **The summary of the last outcome.** The line of an ended run would add the summary of its last step's outcome. It
   costs the reading of outcome files and tests. Without it, the human reads the outcome file in the run's directory,
   which the JSON document names
