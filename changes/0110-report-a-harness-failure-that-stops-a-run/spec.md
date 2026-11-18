# 0110 Report a harness failure that stops a run of the orchestrator

## Context

`npx agentrite orchestrate` runs the steps of a unit's definition, each in a harness: Claude Code, OpenCode or
Codex. A harness can fail a step for reasons outside the step's work: the provider's API answers with an error, as an
HTTP 500 while the provider is down, the account reaches a usage limit, its authentication has expired, or the
connection is lost. Each harness retries some of these by itself, and when it gives up, it ends the step with an
error of its own instead of a final response of the agent.

To the orchestrator such a step is now like any other. Read from the code, and not reproduced with a real outage:

* A harness that exits with a status other than 0 stops the run with `Step <n> stopped the run: its harness exited
  with <status>.` The end report then gives the path of the step's final response, or says that the harness gave
  none. Claude Code gives its error as the `result` of its last event, which the orchestrator keeps as the final
  response, so the report names a file and not the error. OpenCode and Codex give theirs as events of their own on
  standard output, which the orchestrator does not read, so the error is in no file of the run and in nothing the
  command prints, with `--follow` or without it
* A harness that exits with 0 and gives its error as its final response, as Claude Code's `result` event can, gives
  no block marked `json`. The step is asked again for its outcome, the ask again meets the same error, and the run
  stops on it, saying that its final response holds no block marked `json`
* The end report gives the command that resumes the run only for tool calls the harness refused for lack of
  permission, and not for a step whose harness failed

A run stopped this way is resumed with `--resume` once the cause has passed, which reruns the step. What the human
lacks is the error, and being told to resume.

This unit was first specified for a usage limit alone: recognizing it in each harness, and giving when the limit
resets and how to resume. The human chose to make it general instead, for any error a harness ends a step with. A
usage limit is one such error, and the text a harness gives for it is shown as for any other.

## Requirements

1. When the harness of a step ends the step with an error of its own, and reports it on its standard output, the
   orchestrator reads the text of that error, for each of Claude Code, OpenCode and Codex, from the form in which
   that harness reports it. An error the harness recovered from within the step, as one it retried and then went on
   after, is not such an error, and neither is an error of a tool call the agent made. When the harness reports more
   than one error that ended the step, all of them are read, in the order the harness printed them
2. A step is a failure of its harness when its harness reported an error as in R1, exited with a status other than
   0, or was ended by a signal, within its time limit. Such a step stops the run, whatever its final response, and
   is not asked again for its outcome. A step that ran past its time limit is judged as it is now
3. The line of `--follow` and of the progress that ends a failure of its harness says what it says now of an exit
   status or a signal, and says that the harness reported an error when it exited with 0 and no signal
4. The end report of a run stopped by a failure of its harness says, in the line of how the run ended, how the
   harness ended, as in R3. Directly after that line it gives the error the harness reported, under the line
   `The harness reported this error:`, each of its lines indented by two spaces. An error of more than 20 lines is
   given by its first 20, followed by a line that says how many were left out and names the file of R5. When the
   harness reported no error, the report says so, and that what the harness printed on its standard error stood on
   the terminal
5. The error the harness reported is kept in full in the run's directory, as `<number>-<role>.error.txt` of the step,
   numbered as the step's other files. A step whose harness reported no error has no such file
6. The end report of such a run gives the command that resumes it, `npx agentrite orchestrate <unit> --resume`, with
   `--skip-permissions` when the run was started or resumed with it and the unit as it was given, and says to run it
   once the cause of the failure has been dealt with or has passed. The lines of the tool calls the harness refused
   for lack of permission are given as they are now
7. A run stopped by a failure of its harness exits 3, as any run that stopped, and is resumed with `--resume` as any
   such run, rerunning the step whose harness failed
8. Every other step is judged and reported as it is now. A step whose harness exited with 0 and no signal and
   reported no error, and whose final response holds no block marked `json`, is asked again as it is now
9. `ORCHESTRATOR.md` says, under "How a run ends", what a failure of a harness is, that it stops the run and is not
   asked again, what the end report gives of it and how the run is resumed, and, under "What .orchestrator holds",
   the file of R5. `COMMANDS.md` needs no change for an exit status, since the status is 3
10. Unit tests show R1 for each harness, from a sample of what that harness prints when it ends a step with an
    error, and show that output of the same harness that holds an error it recovered from, where it prints one, and
    an error of a tool call, is not read as one. Tests of the orchestrator show R2 to R8

## Decisions

* **One case for every error a harness ends a step with, and none for a particular cause.** The human chose it.
  Whatever the cause, the human needs the same two things: the error as the harness gave it, and that `--resume`
  continues the run. The text a harness gives already names its cause, and for a usage limit often when it resets,
  so recognizing each cause in each harness would repeat in the kit what the text says. Recognizing a usage limit,
  and turning its reset time into an instant, stays possible as a later unit on top of this one
* **Report, do not retry.** The harnesses already retry what they can. An error that outlasts their retries, as an
  outage or a limit, can last hours, and a retry by the orchestrator would wait on a cause it cannot see. The human
  resumes once they know the cause has passed
* **A harness that reported an error stops the run even when it exits 0.** Asked again, it would meet the same
  error, as the ask again does now, and the run would stop on an ask again that says nothing of the error
* **Each harness reads its own errors.** A harness module already reads its harness's output for the final
  response, the session, what `--follow` prints and the refused calls, and how an error is reported differs between
  harnesses. The reading belongs beside those, one case per harness, so that a harness added later adds its own and
  the orchestrator names none of them
* **The forms are taken from real output.** Which events and fields each harness prints for an error that ends a
  step, and for one it recovered from, is not known to this spec. The planner establishes each from the harness's
  own output, or from its documentation or its source where an error cannot be caused at will, and the tests keep a
  sample of it. A harness whose form can be established by none of those is put to the human before the plan is
  written, not guessed at
* **Standard output only.** The orchestrator reads a harness's standard output and passes its standard error to the
  terminal. Claude Code reports an error of the provider on standard output, in its `result` event, and the planner
  establishes where OpenCode and Codex report theirs, by the decision above. Keeping standard error too
  would change how every step is run, and is left to the human below
* **The report gives at most 20 lines of the error, and the file holds all of it.** An error may be long, as a page
  of HTML a proxy answered with, and the report stays readable with the rest of the run after it
* **The resume command is the one `refusedLines` of the end report already builds**, with the unit as it was given,
  so that the two cases give the same command. A run stopped by a failure of its harness and with refused calls
  gives both, each for its cause

## Non-goals

* Recognizing a usage limit, or any other cause, apart from other errors, and reading when a usage limit resets
* Waiting until the cause has passed, and resuming the run without the human
* Errors the harness retries by itself and recovers from within the step
* A failure of a harness outside a run of the orchestrator, as in a session the human runs, or in `agentrite run`
* Printing the errors a harness recovered from with `--follow`

## Beyond the request

1. Keeping the harness's standard error in a file of the run's directory, while still passing it to the terminal,
   and giving its last lines in the end report when the harness reported no error on standard output. It costs a
   change to how every step is run, its tests and its documentation. Without it, an error a harness prints on
   standard error alone, as one before it reaches the provider, is on the terminal and in no file of the run
2. Recognizing a usage limit in each harness, and giving when it resets as an instant in UTC, as this unit first
   specified. It costs a case per harness, the reading of a time from each harness's message and their tests.
   Without it, the report gives the harness's own text, which for Claude Code says when the limit resets, and the
   human reads the time from it
3. Recording in `state.json` that the run ended by a failure of its harness, with the first line of its error, so
   that `npx agentrite runs` can show it. It costs a field of `state.json`, its reading by `runs`, and their
   documentation. Without it, the error is in the end report and the step's file, and `runs` shows the run as
   stopped, as now
