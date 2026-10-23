# 0080 The followed output of a run is kept

## Context

`npx agentrite orchestrate <unit> --follow` prints, while each step runs, the text messages the step's agent writes
and the tool calls it makes, as "How a run ends" of `README.md` gives them. The output goes to the terminal that
started the run and nowhere else, so a run started without `--follow` cannot be followed, and nothing else can follow
a run that is.

The human means to build a graphical interface, a project of its own outside the kit, with a view of one step that
shows these messages and tool calls live, for runs on the host and in the sandbox alike. Without them on disk, it
would have to read Claude Code's session files and OpenCode's database, two forms in places that differ between the
host and the sandbox, and repeat what the kit already does to follow a step. Item 2 of "Beyond the request" of
`changes/0075-a-run-of-the-orchestrator-can-be-followed/spec.md`, the followed output kept in the run's directory, was
left out of that unit. The human takes it now.

A run's directory is `.orchestrator/<unit-directory>/<run>/`, and a unit run of the sandbox mounts the host's
`.orchestrator/` into its clone. Unit 0079 makes every file of a run's directory written whole, under a name that
opens with `.` until it takes its own.

## Requirements

The file:

1. Every run, with `--follow` and without it, writes for each step that starts a file `<number>-<role>.followed.jsonl`
   in the run's directory, numbered as the step's outcome and response files are
2. The file is made, empty, when the step starts and before its harness starts. While the step runs, each text message
   and each tool call is added to the end of the file as one line, once the harness has made it known, and is not held
   until the step ends
3. The file holds the same text messages and tool calls that `--follow` prints of the step, in the same order, and
   nothing else: no result of a tool call, no reasoning of the agent and no other event of the harness, in Claude
   Code and in OpenCode alike
4. Each line is one JSON object followed by a line break. A text message is `{"time": ..., "kind": "text", "text":
   ...}`, with its text in full. A tool call is `{"time": ..., "kind": "call", "tool": ..., "label": ...}`, with the
   name of the tool as the harness gives it, and the label that `--follow` prints for it, or `null` for a call with
   no label
5. `time` is the instant `--follow` prints for the message or the call, as a whole instant in UTC with its date, as
   `2026-10-23T10:00:05Z`
6. A line is added to the file whole or not at all, and the file is never rewritten. A program that reads the file
   while the step runs takes the lines that end in a line break, and a last line without one is one being added. This
   file is the one of the run's directory that is not written as requirement 5 of unit 0079 gives, since a file that
   is added to cannot be replaced at each line
7. The file is left in the run's directory when the step and the run end, however they end, holding what was added
   until then. A step that ran past its time limit, or whose harness a signal ended, keeps what was known of it
8. A write to the file that fails does not stop the run, change what it prints or change its exit status. What could
   not be written is lost, and what comes after it is written as if it had been

What does not change:

9. What the command prints, with `--follow` and without it, is what it printed before this unit, and so are its exit
   statuses, `state.json` and the other files of the run's directory

The documents:

10. "What .orchestrator holds" of `README.md` gives the file among those of a run's directory, the form of its lines by
    requirements 4 and 5, when they are added, how a program reads it while the step runs by requirement 6, and that
    it is written with `--follow` and without it
11. "How a run ends" of `README.md` says that a run started without `--follow` prints none of the messages and tool
    calls, and that the file of each step holds them

Tests:

12. Unit tests cover the line of a text message and of a tool call, a call with no label, the instant with its date in
    UTC, a text with line breaks and quotes in it, and that a write that fails does not stop the run
13. Tests of the command show, for a step in each harness, that the file is made when the step starts, holds the step's
    messages and calls in the order `--follow` prints them, holds no tool result, is written with `--follow` and
    without it, and is left after the run, and that what the command prints and its exit status are what they were
    before this unit

## Decisions

* **In the run's directory, not in a temporary directory.** The human chose it, as part of the orchestrator's run. A
  directory such as `/tmp` was considered for its cleanup by the system and dropped: the `/tmp` of a unit run is the
  container's and not the host's, so a reader on the host would not see it, and mounting one of the host's would give
  the agent one more place of the host to write
* **Kept after the run.** The file is small beside the harnesses' logs, since it holds no tool result, and kept, it lets
  a reader show a run that ended as well as one that runs. Removing runs is left to a later unit of retention
* **Always written, not only with `--follow`.** The reader is another program, not the terminal, so whether the human
  watches the terminal says nothing of whether it is wanted
* **One file per step.** A step's files are already numbered and named by its role, and a reader that shows one step
  reads one file. A file for the whole run would need each line to say its step
* **JSON Lines, not the text `--follow` prints.** A program reads it, so each line is one object it can parse without
  undoing the blank lines, the dimming and the clock of the terminal. A line is added in one piece, so a reader never
  has to know where a message that holds line breaks ends
* **The label as `--follow` prints it.** One rule decides the label, so the file and the terminal cannot drift apart.
  The label is the one `--follow` prints, cut and with its line breaks written as `\n`, since a reader shows it on one
  line as the terminal does
* **The date in the instant.** The terminal leaves the date out, since a run is followed as it happens. A file is read
  later too, and its instants compare with the name of the run's directory, which holds the date
* **Added to, not replaced.** Replacing the whole file at each line, as unit 0079 writes its other files, would cost a
  write of everything before it for each message. A reader that skips a last line without a line break needs no more
* **A failed write does not stop the run.** The file is for readers, not part of the run, as the heartbeat of unit 0079
  is

## Non-goals

* A command that prints a step's file, or follows a run under way from another terminal
* Removing the files, or the runs, after a time
* Tool results, the agent's reasoning, or other events of the harness, in the file or on the terminal
* Changing what a run prints, with `--follow` or without it
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **A command that follows a run under way.** `npx agentrite orchestrate --follow` of a run already started, or a
   command of its own, would print a step's file in the form of `--follow` as lines are added, so that a human in
   another terminal can follow a run. 0075 left this out as unneeded. It costs a command, its documents and tests.
   Without it, a human in another terminal reads the file with `tail -f`, in its JSON form
