# 0110 Name a usage limit that stops a run of the orchestrator

## Context

`npx agentrite orchestrate` runs the steps of a unit's definition, each in a harness: Claude Code, OpenCode or
Codex. A harness stops working when the account or the provider behind it reaches a usage limit, and gives an error
that says so, often with the time at which the limit resets. To the orchestrator such a step is like any other that
failed: its harness exits with a status other than 0, or it gives no final response, and the run stops with
`Step <n> stopped the run: its harness exited with <status>.` The human reads the harness's output to learn why, and
resumes the run with `--resume` once the limit has reset.

A developer running the orchestrator on a project of their own reported that a run stopped by a usage limit does not
go on by itself, and that someone has to resume it. The human chose, as a first step, that the orchestrator
recognizes the limit and says so in what it prints, with when the limit resets and how to resume, and does not wait
or resume by itself.

Each harness module in `scripts/harnesses/` already reads what its harness prints in a headless step: its final
response, its session, the messages and calls `--follow` prints, and the calls it refused for lack of permission.

## Requirements

1. When the harness of a step reports that a usage limit was reached, in what it prints on its standard output or
   its standard error, the orchestrator recognizes it, for each of Claude Code, OpenCode and Codex, from the form
   in which that harness reports it
2. A step whose harness reported a usage limit stops the run, whatever its exit status, its final response and its
   outcome, and is not asked again for its outcome
3. The line of `--follow` and of the progress that ends such a step says that it reached the usage limit of its
   harness, in place of its outcome or its exit status
4. The end report of a run stopped by a usage limit says, in the line of how the run ended, that the step reached
   the usage limit of its harness, naming the harness. It then gives the time at which the limit resets when the
   harness reported one: as an instant in UTC when the harness's report says its time zone, and as the harness wrote
   it, saying so, when it does not. When the harness reported no time, the report says that it gave none
5. The end report of such a run gives the command that resumes it, `npx agentrite orchestrate <unit> --resume`, with
   `--skip-permissions` when the run was started or resumed with it, and says to run it once the limit has reset
6. A run stopped by a usage limit exits 3, as any run that stopped, and is resumed with `--resume` as any such run,
   rerunning the step that reached the limit
7. A step whose harness exits with a status other than 0 for any other reason is judged and reported as it is now
8. `ORCHESTRATOR.md` says, under "How a run ends", that a usage limit stops the run, what the end report says of it
   and how the run is resumed. `COMMANDS.md` needs no change for an exit status, since the status is 3
9. Unit tests show R1 for each harness, from a sample of what that harness prints when it reaches a usage limit,
   with a reset time and, where the harness can report one without it, without, and show that output of the same
   harness without a limit is not recognized as one. Tests of the orchestrator show R2 to R7

## Decisions

* **Recognize and report, do not wait.** The human chose it. Waiting until the reset time and resuming by itself
  would keep a process running for hours, has to survive the machine sleeping and the sandbox stopping, and has to
  trust a reset time read from an error message. Reporting the limit gives the human what they need to resume at
  the right time with none of that
* **Each harness recognizes its own limit.** A harness module already reads its harness's output for the refused
  calls, and how a limit is reported differs between harnesses. The recognition belongs beside that reading, one
  case per harness, so that a harness added later adds its own and the orchestrator names none of them
* **The forms are taken from real output.** Which events and which text each harness prints for a usage limit is
  not known to this spec. The planner establishes each from the harness's own output, or from its documentation or
  its source where a limit cannot be reached at will, and the tests keep a sample of it. A harness whose form can
  be established by none of those is put to the human before the plan is written, not guessed at
* **A limit stops the run even when the harness exits 0.** A harness may end a step stopped by a limit with status
  0 and a final response that is an error. Asked again, it would reach the same limit, so the ask again is skipped
* **The reset time is given in UTC.** The orchestrator's other times are, and a time read from a message in the
  developer's time zone, or in the zone of the account, is turned into an instant when the message says which zone
  it is in. One that does not say is given as the harness wrote it, and the end report says that it is as written
* **The resume command is the one `refusedLines` of the end report already builds**, with the unit as it was given,
  so that the two cases give the same command

## Non-goals

* Waiting until the limit resets, and resuming the run without the human
* A usage limit reached outside a run of the orchestrator, as in a session the human runs, or in `agentrite run`
* Rate limits that the harness retries by itself and recovers from within the step
* A limit of the model server of a local provider

## Beyond the request

1. Recording in `state.json` that the run ended at a usage limit, with the reset time, so that `npx agentrite runs`
   can show it. It costs a field of `state.json`, its reading by `runs`, and their documentation. Without it, the
   reason is in the end report and the step's files, and `runs` shows the run as stopped, as now
2. An option of `orchestrate`, such as `--resume-after-limit`, that waits until the reported reset time and resumes
   the run by itself. It costs the waiting above, its tests and its documentation, and is the later step the
   human left for after this unit. Without it, the human resumes the run, as now
