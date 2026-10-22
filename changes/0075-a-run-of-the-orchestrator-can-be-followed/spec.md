# 0075 A run of the orchestrator can be followed

## Context

`npx agentrite orchestrate <unit>` prints a line before and after each step, and the end report when the run ends.
While a step runs, nothing else of it is shown: the command reads what the harness prints on standard output and does
not show it, and only the harness's standard error reaches the terminal. A step can run for many minutes, and in that
time the terminal shows only the step's `started` line. Run for the first time, in another project and in the sandbox,
the orchestrator left the human unable to tell whether a step was doing anything.

Item 1 of "Beyond the request" of `changes/0065-an-orchestrator-takes-a-unit-through-its-roles/spec.md`, live output
of a step while it runs, was left out of that unit. This unit takes a narrower form of it: the same live output, but
only when the human asks for it as the run starts.

The orchestrator runs each step in one of two harnesses, Claude Code or OpenCode, as `agentrite run --headless`. The
outcome of a step is read from the block marked `json` in the step's final response, and the run's directory under
`.orchestrator/` keeps the definition, the state, and each step's outcome or final response.

## Requirements

The option:

1. `npx agentrite orchestrate <unit>` takes an option `--follow`, which takes no value, at any place among its
   arguments, as `--skip-permissions` is taken. The form `--follow=<value>` is refused as
   `--skip-permissions=<value>` is
2. The usage the command prints names `--follow` in its form and says what it does, beside its other options

Without the option:

3. A run without `--follow` prints what it prints today, and nothing else: on standard output the line before and
   after each step and the end report, and on standard error what the harness prints there. Nothing that a step's
   agent writes, and none of its tool calls, is shown

With the option:

4. A run with `--follow` prints, on the command's standard output and while each step runs, the text messages the
   step's agent writes and the tool calls it makes, in the order the agent made them. Each is printed while the step
   is still running, once the harness has made it known, and not held until the step ends. Everything printed for a
   step stands after that step's `started` line and before its line after it, and the end report stands after all of
   it, last, as without the option
5. Each text message is printed in full, with no part of its text cut, after its time and set apart from what is
   printed before and after it by one blank line on each side. A final response that holds the block of the outcome
   is printed as any other text message
6. Each tool call is printed as one line, dimmed, holding in this order: its time, `→`, the name of the tool as the
   harness gives it, and a label. The label is the first of these that the call has: the description the agent gave
   a call of the shell tool; the path of the file the call acts on; the pattern the call searches for; the first line
   of the command the call runs, cut to its first 100 characters when it is longer. A call that has none of them is
   printed with no label
7. The time of a message or a call is the instant the harness gives for it, or, when the harness gives none, the
   instant the command learns of it, written as `HH:MM:SS` in UTC
8. Nothing else of a step is printed: no result of a tool call, no reasoning of the agent, and no other event the
   harness reports
9. Requirements 4 to 8 hold for a step in Claude Code and for a step in OpenCode alike

What does not change:

10. With `--follow` or without it, each step's outcome is read from the same final response, and the run ends, writes
    its directory under `.orchestrator/` and exits with the status it would without `--follow`: the outcome and
    response files, `state.json` with the id of each harness session, the stops of "How a run ends", the time limit
    of a step, the signals sent on to a step, and the exit statuses of "Exit statuses" of `README.md`
11. The harness's standard error reaches the terminal with `--follow` as it does without it

The documents:

12. `README.md` gives `--follow` in the usage of "agentrite orchestrate" of "Commands" and in its table of arguments
    and options, and "The orchestrator" says what a run with `--follow` prints and in what form, by requirements 4 to
    8, and that a run without it prints what "How a run ends" says
13. `SANDBOX.md`, where it gives the orchestrator in a unit run, says that `--follow` is given to the command there as
    on the host, with the command written out

Tests:

14. Unit tests cover the reading of `--follow` among the arguments, and the printing of text messages and tool calls
    from what each harness reports: the full text and the blank lines around a message, the time in UTC, the dimmed
    line of a tool call, each kind of label in its order of precedence, the cut at 100 characters, a call with no
    label, and that tool results and reasoning are not printed
15. Tests of the command show, for a step in each harness, that a run with `--follow` prints the step's messages and
    calls between its two lines and the end report last, that a run without it prints none of them, and that the
    outcome, the run's directory and the exit status are the same with the option and without it

## Decisions

* **An option of `orchestrate`, not a command of its own.** A separate command that follows a run already under way,
  as `agentrite follow <unit>`, was considered and dropped by the human as unnecessary: the human who wants to follow
  a run is the one starting it, at the same terminal
* **Off by default.** A run left to itself, as in a script or a sandbox the human does not watch, gains nothing from
  the output, and the step lines and the end report are easier to read without it. The human asks for it when they
  want to watch
* **Each text message in full, and each tool call as one dimmed line with a short label.** The human chose this form
  after trying others. Tool calls alone said too little of what the agent was thinking, and text cut short lost the
  part that mattered. The full output of tool calls floods the screen. The agent's messages carry what it is doing and
  why, and so are shown whole and set apart; the tool calls show that it is working and on what, and so are kept to a
  line each and dimmed, so that the messages stand out. The label takes the description the agent gave its shell
  command first, since that is written for a reader, then what the call acts on, and only then the command itself,
  cut so that the line stays one line
* **No tool results and no reasoning.** The results are what floods the screen. The reasoning cannot be shown: the
  harnesses' session logs hold the agent's thinking as blocks with empty text, so there is nothing to print
* **The time in UTC.** The run's directory is named by an instant in UTC, and the records of the units give their
  instants in UTC, so the times of a followed run compare with both without converting. The date is left out, since a
  run is followed as it happens
* **Both harnesses.** The kit's default definition runs the reviewer in OpenCode, and a run whose review cannot be
  followed would leave the human in the same place for that step
* **Chosen when the run starts.** A run started without `--follow` cannot be switched to following it, and a run
  started with it cannot be switched off. The human accepted this limitation: the option is for a human who is about
  to watch the run
* **How the output is obtained is left to the plan.** It may come from what the harness prints on standard output as
  it runs, or from the harness's session logs, as long as requirements 4 to 11 hold. The requirements state what is
  printed and what must not change, and not the mechanism

## Non-goals

* Following a run that is already under way, from the same terminal or another one, and switching the output on or off
  during a run
* Showing the results of tool calls, the agent's reasoning, or any other event of the harness, in full or in part
* Options that change the form of the output, such as cutting the text messages, showing more of a tool call, or
  another clock than UTC
* Live output for `agentrite run --headless` started by hand
* Changing what a run prints without `--follow`
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **No dimming when standard output is not a terminal.** The tool call lines would be written without the escape
   sequence that dims them when the command's standard output is not a terminal, or when `NO_COLOR` is set. It costs
   a check and its tests. Without it, a run with `--follow` whose output is sent to a file or a pipe holds the escape
   sequences around each tool call line, which shows when the file is read and is fixed when someone needs it
2. **The followed output kept in the run's directory.** Each step's messages and tool calls would also be written to
   a file in `.orchestrator/<unit-directory>/<run>/`, so that a run started without `--follow` can be read in the same
   form afterwards. It costs a file per step, its place in "What .orchestrator holds", and tests. Without it, the
   harnesses' session logs hold the same and more, in their own formats
