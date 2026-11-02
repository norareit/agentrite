# 0090 A stop names the refused permissions

## Context

The orchestrator runs every step headless, and passes `--skip-permissions` to the `agentrite run` of each step only
when it was itself given the option. A run started without it in the sandbox has steps that Claude Code refuses every
tool call its settings do not allow, and there is nobody to ask. The step then usually reports `needs-human` with a
question asking for the permission, and the end report shows the outcome, its summary and that question. Nothing in
the report says that the run lacked `--skip-permissions`, or that the harness refused calls at all, so a human reads a
vague stop and has to work out the cause. This happened twice on one day in the project norareit, the second time to
the planner of its unit 0061, whose write of `plan.md` was refused.

Claude Code in `--print` with `stream-json` gives, in each `result` event, a `permission_denials` list of the tool
calls it refused in that turn, each with `tool_name`, `tool_use_id` and `tool_input`. This was seen on Claude Code
2.1.316 on the Linux host, with a `Write` refused in a headless run without the option. A step can end several turns,
as 0088 found, and each turn ends with a `result` event of its own.

## Requirements

1. For a step whose harness is `claude`, the command reads the tool calls the harness refused for lack of permission
   from the `permission_denials` of every `result` event the step printed, in the order printed
2. When the step that stopped the run has at least one such call, the end report says, directly after the line that
   says how the run ended, how many tool calls the harness refused that step for lack of permission, and then lists
   each refused call on a line of its own, with the name of the tool and the label that `--follow` gives a tool call
   with the same input, in the order of requirement 1. A call without a label is listed by its tool's name alone
3. When that run was started, or resumed, without `--skip-permissions`, the part of requirement 2 also says that the
   run was started without `--skip-permissions`, so that a headless step had nobody to ask, and gives, for the
   sandbox, the command that resumes the run with the option, `npx agentrite orchestrate <unit> --resume
   --skip-permissions` with the run's unit, and says that on the host the harness's settings are to allow the refused
   calls instead. A run with `--skip-permissions` gets the list of requirement 2 without this
4. The end report of a run whose stopping step has no refused call, of a run that ran every item to its end, and of a
   run whose stopping step's harness is not `claude`, is as before this unit. The exit status, `state.json` and the
   files of the run's directory are as before this unit
5. Tests of the command, with fake harnesses, show the part of requirement 2 for a stopping step that printed refused
   calls in more than one `result` event; the part of requirement 3 with and without `--skip-permissions`; and the
   end reports of requirement 4 unchanged. Tests of the reading show refused calls taken from every `result` event
   and none from a line that is not one
6. "How a run ends" of `README.md` says where in the end report the refused calls stand, what each line of them
   holds, what is added for a run without `--skip-permissions`, and that only the step that stopped the run and only
   Claude Code are reported on

## Decisions

* **The kind is feature.** The orchestrator stopped correctly and reported what the step said. The human asked for a
  feature that adds to the report
* **Only Claude Code, for now.** The human limited it to the refused calls a harness reports. Claude Code reports
  them in a form the command already reads. Whether OpenCode's `run --format json` reports them was not checked, and
  a hint given on every stop without the option, whatever its cause, was rejected because it would also be given
  when permissions were not the cause
* **Read after the fact, and do not refuse up front.** Refusing to start a headless run without `--skip-permissions`
  was rejected: on the host a project can run without it on purpose, with the tools its steps need allowed in its
  settings, and the command cannot know from the outside which calls a step will make
* **Every `result` event, not only the last.** A step can end several turns, and a call refused in an earlier turn
  is as much a cause of the stop as one in the last. The command already reads the last `result` event for the final
  response
* **Only the step that stopped the run.** That is the stop the human has to understand. A step that went on after a
  refusal finished its work
* **The label of `--follow`.** It already says what a tool call acts on, in one line, for every tool, and repeating
  its rules for the refused calls would encode the same decision twice
* **The advice on `--skip-permissions` only when the run lacked it.** With the option Claude Code still refuses what
  a deny rule of its settings refuses, and the list is then still worth showing, but the option cannot help
* **Both the sandbox and the host are named.** The command does not tell the two apart, and the option belongs in
  the sandbox, as "The orchestrator" of `README.md` says. On the host the remedy is the harness's settings
* **No entry in `SANDBOX.md`.** The report names both why the step was refused and what to do, which by this
  project's rule on refusals keeps it out of "When something goes wrong". `SANDBOX.md` already gives the command with
  `--skip-permissions`

## Non-goals

* OpenCode, or any harness but Claude Code
* Refusing, or warning at the start of, a run without `--skip-permissions`
* Making `--skip-permissions` the default in the sandbox
* Refused calls of a step that did not stop the run
* `agentrite run` outside the orchestrator, headless or in a session
* The lines a step prints with `--follow`, and the followed file
* A change to the outcome of a step, to its prompt, or to a role file

## Beyond the request

1. **Refused calls of every step, not only the one that stopped the run.** A part per step with refused calls in the
   end report, and its tests. Without it, a step that worked around a refusal, such as one that could not run a test
   suite and went on, is not reported, and its outcome or its session log is where the human learns of it
