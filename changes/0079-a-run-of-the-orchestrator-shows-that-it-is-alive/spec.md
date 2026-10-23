# 0079 A run of the orchestrator shows that it is alive

## Context

`npx agentrite orchestrate <unit>` keeps each run in `.orchestrator/<unit-directory>/<run>/` of the project root. Its
`state.json` holds the unit, the definition's path, the step and round the run is at, the id of each harness session,
and once the run ended, its exit status and how it ended. A unit run of the sandbox mounts the host's `.orchestrator/`
into its clone, so a run in the sandbox is written to the host's project root as it goes, as a run on the host is.

The human means to build a graphical interface, a project of its own outside the kit, that shows the runs of the
projects that use the kit and their status, on the host and in the sandbox alike, by reading `.orchestrator/`. Two
things stand in its way:

* A run that ends without writing its end, because its process was killed, the machine it ran on stopped, or its
  container was removed, leaves a `state.json` with no end, which reads the same as a run under way. Nothing in a
  run's directory changes while a step runs, and a step can run for most of an hour, so nothing tells the two apart.
  A run ended by `SIGINT`, `SIGTERM` or `SIGHUP` leaves no end either: the command passes the signal on to the step
  and ends itself by it
* Every file of a run's directory is written in place, so a program that reads `state.json` while the command writes
  it can read part of it

## Requirements

The heartbeat:

1. A run's directory holds a file `heartbeat`, which holds one instant in UTC, as `2026-10-23T10:00:05Z`, followed by
   a line break, and nothing else
2. The command writes `heartbeat` first when it makes the run's directory, before the step at index 0 starts, and then
   again every 10 seconds for as long as the run lasts, between steps and while a step runs, with `--follow` and
   without it. Each write replaces the instant before it with the instant of that write, on the clock of the machine
   the command runs on, which in a unit run is the container's
3. Once the command has written the end of the run into `state.json`, it writes `heartbeat` no more. The file is left
   in the run's directory, holding the instant of its last write
4. A write of `heartbeat` that fails does not stop the run, change what it prints or change its exit status. The next
   write is made at its time as if the failed one had succeeded

Whole files:

5. Every file the command writes in a run's directory, `heartbeat`, `state.json`, `definition.json` and the outcome
   and response files of the steps, is written whole: a program that reads one of them at any time reads either what
   it held before that write or what the write gives it, and never part of either
6. A file that is being written stands under a name that opens with `.`, in the run's directory, until it takes its
   own name. Once a run ended, as said in requirement 3, no such file of it is left

What does not change:

7. `state.json` holds the same keys, with the same values, at the same moments of the run as before this unit. The
   command prints what it printed before, and exits with the status it exited with before, in every case of "How a
   run ends" of `README.md`, the time limit of a step and a signal among them
8. Nothing is written outside `.orchestrator/`, and nothing but the command writes in it

The documents:

9. "What .orchestrator holds" of `README.md` gives `heartbeat` among the files of a run's directory, what it holds,
   when it is written, how often, and on which clock, and that every file of the directory is written whole, as
   requirements 5 and 6 say
10. It says how a program that reads the directory tells a run's state: a run whose `state.json` holds an end has
    ended, whatever `heartbeat` holds; a run without an end whose `heartbeat` is at most 60 seconds old has a sign of
    life; any other run without an end, one without a `heartbeat` among them, has had none for over 60 seconds, and
    is called stale
11. It says what a stale run can be: one whose process ended without writing its end, by a signal among them; one on
    a machine that sleeps, which gives signs of life again once it wakes; one whose clock is behind that of the
    reader by more than the margin, as that of a container in a virtual machine can be. It says that the harness of a
    step can still be running when the command's own process was killed, and that the run then shows as stale

Tests:

12. Unit tests cover the instant of a write and the form of the file, writes at the interval and that they stop at the
    end of the run, that a write that fails does not stop the run and that the next write is made, and that a file is
    written whole and under a name that opens with `.` until it takes its own
13. Tests of the command show that a run's directory holds `heartbeat` while a step runs, that its instant moves on
    while the step runs, that it is left holding its last instant once the run ended, that no file whose name opens
    with `.` is left in the run's directory, and that `state.json`, what the command prints and its exit status are
    what they were before this unit. The interval may be shorter in the tests, as long as the command itself always
    writes at 10 seconds

## Decisions

* **A file of its own, not a key of `state.json`.** The human left the choice to the specifier. With a file of its
  own, `state.json` changes only when the state of the run changes, so a program that watches it for changes is not
  woken every 10 seconds by a beat, and the form of `state.json` does not change for any reader
* **One instant, replaced at each write.** Whether a run is alive is told by its last sign of life alone. A list of the
  beats, or of the last few, would tell whether they came at their times, which nothing needs, and would change the
  size of the file at every beat
* **Written by the command's own process.** The command lives for the whole run, between steps and during them, and
  the harness of a step is a process of its own that the kit does not control. A step that hangs while the command
  lives still counts as alive: its `timeoutMinutes` is what ends a hang, not the heartbeat
* **Every 10 seconds, and stale after 60.** The human chose both numbers. Six missed beats leave room for a slow disk
  and for a clock that is a few seconds behind, and a minute is soon enough for a human who looks at a list of runs.
  Both are fixed, and documented in `README.md` so that any reader judges the same way
* **The reader judges, and the kit only documents the rule.** This unit gives no command that says whether a run is
  alive. A command that lists the runs with their state, which unit 0081 adds, is a unit of its own, built on this
  one
* **A failed beat does not stop the run.** The heartbeat is a sign for readers, not a part of the run. Stopping a run,
  with a step's harness still running, because a sign could not be written would do more harm than the missing sign
* **Stale, not dead.** A run can be stale and alive, as on a machine that sleeps, so the documents give it as having
  had no sign of life, and leave it to the reader to call it dead
* **An orphaned harness is a limitation.** When the command's process is killed with `SIGKILL`, the step's harness can
  keep running without it, and the run shows as stale while an agent is still working. The human chose to record this
  limitation rather than detect it: nothing in the run's directory can show it, and the kit cannot see a process in
  a container from the host
* **Every file written whole, not only `state.json`.** A program that reads the run's directory while a run goes on can
  read any of its files, and one way of writing them all is simpler than two. The other files are written once, so the
  cost is small
* **A name that opens with `.` while a file is written.** A program that lists the directory then does not take a file
  being written for a file of the run, and the name is in the same directory, so the file takes its own name in one
  step
* **What it defends against.** The heartbeat is a sign for a human or a program that reads the run's directory, under
  the supported usage of the sandbox: one developer, one host, a run started by the kit's command. It is not a proof. An
  agent in a unit run writes whatever it likes under the mounted `.orchestrator/`, as "What the sandbox defends against"
  of `SANDBOX.md` says, and so can write a `heartbeat` of a run that is not alive, or remove one that is. Nothing in
  this unit defends against that

## Non-goals

* A command that tells or lists the state of runs, which unit 0081 adds
* Writing the end of a run into `state.json` when a signal ends it
* Detecting a step's harness that runs on after the command's process was killed
* Recording in a run's directory which process, machine or container runs it
* Making the interval or the margin of 60 seconds a setting
* Changing the keys of `state.json`, what the command prints, or its exit statuses
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **An end written when a signal ends the run.** The command would write into `state.json` that the run ended by the
   signal, before it ends itself by it. It costs an end of a new kind in `state.json` and in "How a run ends", and
   tests. Without it, a run ended by a signal shows as stale once 60 seconds have passed, which a reader sees and
   understands from the documents of requirement 11
2. **Where the run runs.** `state.json` would hold whether the run is on the host or in a unit run, and the id of the
   command's process, so that a reader on the same machine could check it. It costs keys in `state.json` and tests.
   Without it, a reader cannot tell a run on the host from one in the sandbox, which the human sees in the terminal
   that started it
