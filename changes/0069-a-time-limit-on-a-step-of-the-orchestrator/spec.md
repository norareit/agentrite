# 0069 A time limit on a step of the orchestrator

## Context

Unit 0065 gave the kit `agentrite orchestrate`, which runs the steps of a definition one at a time, each as
`agentrite run --headless`, and stops the run when a step's outcome asks for the human. A step that never ends gives
no outcome, and so nothing stops it: an implementer going in circles, as a local model with a small context may, runs
until the human notices and ends it by hand. `stopWhen` cannot catch it, since it is judged on an outcome. 0065 left
a time limit on a step to a later unit, among its non-goals, after the human decided to keep it out, and named its
shape then: a key on a step of the definition, after which the command ends the harness and stops the run.

`agentrite run` passes no signal on. A signal to it alone ends it and leaves the harness at work, and "Running a role"
of `README.md` has a caller that stops a run start it in a process group of its own and signal the group. A step of
the orchestrator runs in the command's own process group today, which is how Ctrl-C on the terminal reaches the
harness.

## Requirements

The definition:

1. A step may hold the key `timeoutMinutes`, a number greater than 0, in a repeat or not. A step without it has no
   time limit, as today
2. A definition whose `timeoutMinutes` is of another form is refused as requirement 9 of 0065 refuses a value of
   another form, naming where it is and that it must hold a number greater than 0

The run:

3. A step's time runs from when the command starts its `agentrite run` until that ends, the time that the line after
   the step and the list at the end of the run give
4. When a step's time reaches its `timeoutMinutes`, the command sends `SIGTERM` to the step's process group, the
   group of its `agentrite run` and the harness. When the group still has a process 10 seconds later, it sends
   `SIGKILL` to the group. The command then stops the run, and runs nothing after the step
5. A step that ran out of time stops the run by a case of its own, which is judged before every case of requirement
   18 of 0065. Nothing is taken from what the step printed as an outcome: no outcome of it is written, and the end
   report gives nothing of one. A final response that the command read from what the step printed is written into
   the run's directory, as that of a step without an outcome is
6. The line after a step that ran out of time says that it ran out of time and how long it ran. The line of the end
   report that says how the run ended says which step stopped it, that it ran past its time limit, and the limit in
   minutes, and the report then says where the step's final response is, or that there was none, as for a step
   without an outcome
7. The session of a step that ran out of time is kept in the run's state, as that of any step, when the harness gave
   its id
8. A run stopped by a time limit exits with status 3, as any stopped run does
9. Every step runs in a process group of its own, whether it holds `timeoutMinutes` or not. When the command
   receives `SIGINT`, `SIGTERM` or `SIGHUP` while a step runs, it sends the same signal to the step's process group
   and then ends, so that Ctrl-C on the terminal, and a signal to the command alone, end the harness as they did
   before this unit

The documents:

10. "The orchestrator" of `README.md` gives `timeoutMinutes` among the keys of a step, what happens when the time
    runs out, with the grace of 10 seconds, and the case among the ways a run ends. "agentrite orchestrate" in
    "Commands" says that a signal to the command reaches the step that runs

Tests:

11. Unit tests cover the judging of `timeoutMinutes` by requirements 1 and 2, and that a step that ran out of time
    stops the run before any case of requirement 18 of 0065, with its line and its end report
12. End-to-end tests run `agentrite orchestrate` against fake harnesses, as those of 0065 do, for: a step that runs
    past its limit and ends on `SIGTERM`, one that ignores `SIGTERM` and is ended by `SIGKILL`, a step with a limit
    that ends in time, and a signal sent to the command alone while a step runs, after which no process of the step
    is left

## Decisions

* **The key is on a step, in minutes.** The human named its shape when it was kept out of 0065. A step is what runs
  long, and steps differ: a planner and an implementer of the same definition take very different times. Minutes are
  the unit a human thinks of a step's length in, and the lines of a run give its time in minutes and seconds
* **The value is a number greater than 0, not a whole number.** A fraction costs nothing to allow and lets the
  end-to-end tests run with a limit of seconds, without a second key or a variable only the tests use. Rejected: a
  whole number of one or more, which would hold each such test for a minute
* **The time is the whole step's.** The command measures its `agentrite run`, which is what it can see and what it
  reports already. The time `agentrite run` takes before the harness starts is a fraction of a second
* **`SIGTERM` first, then `SIGKILL` after 10 seconds.** A harness given a chance to end saves its session, which is
  what lets the human pick the work up by hand. One that does not end must still not outlive the run. The grace is
  fixed: nothing has asked for another, and a key for it can be added later without making a valid definition
  invalid
* **Running out of time is a case of its own, judged first.** A step ended by the command was not ended by a fault of
  the harness, and reporting it as one, by the signal the command itself sent, tells the human the wrong thing. It is
  judged before the harness's status, since the status of a step the command ended says nothing about the step
* **Nothing is taken from the outcome of a step that ran out of time.** A step the command ended did not finish, and
  what it printed before is not its final word. Its response is kept, as for a step without an outcome, so the human
  can see how far it got
* **Every step runs in a group of its own, and the command passes the signals on.** Ending the harness takes a group
  to signal, and a step in a group of its own no longer gets the terminal's Ctrl-C. Passing the three signals on keeps
  Ctrl-C and a `kill` of the command as they were, and gives a caller that signals the command alone a run that ends
  whole, which "Running a role" asks a caller of `agentrite run` to arrange itself. Doing this for every step, and
  not only for one with a limit, keeps one way of running a step. That a harness works headless in a group that is
  not the terminal's foreground group, with its standard error on the terminal, is for the check by hand of the plan

## Non-goals

* A time limit on a repeat, or a default limit for every step of a definition
* A time limit on a whole run
* A grace period other than 10 seconds, or one a definition sets
* A warning before a step's time runs out
* Picking up a stopped run, which is a later unit, as 0065 says
* A change to `agentrite run`, which still passes no signal on

## Beyond the request

1. `timeoutMinutes` on a repeat, or at the top of a definition, as the limit of every step that names none. Cost: a
   second place to judge the key and a rule of which one counts. Without it, each step that needs a limit names one,
   which the default definition does in three places at most
2. A time limit on the whole run, as a key of the definition or an option of the command. Cost: a second clock and a
   case of the end report of its own. Without it, a run is bounded by its steps' limits times its rounds, which a
   human can work out from the definition
