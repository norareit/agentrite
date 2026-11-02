# 0090 A stop names the refused permissions

## Context

The orchestrator runs every step headless, and passes `--skip-permissions` to the `agentrite run` of each step only
when it was itself given the option. A run started without it in the sandbox has steps whose harness refuses every
tool call its settings would ask about, and there is nobody to ask. The step then usually reports `needs-human` with a
question asking for the permission, and the end report shows the outcome, its summary and that question. Nothing in
the report says that the run lacked `--skip-permissions`, or that the harness refused calls at all, so a human reads a
vague stop and has to work out the cause. This happened twice on one day in the project norareit, the second time to
the planner of its unit 0061, on Claude Code, whose write of `plan.md` was refused.

How each harness makes a refusal known in headless mode was tried on the Linux host, with a prompt to write a file:

* **Claude Code 2.1.316**, in `--print` with `stream-json` and without `--dangerously-skip-permissions`, refused the
  `Write`, and gave in its `result` event a `permission_denials` list of the calls it refused in that turn, each with
  `tool_name`, `tool_use_id` and `tool_input`. The agent went on after the refusal. A step can end several turns, as
  0088 found, and each turn ends with a `result` event of its own
* **OpenCode 1.19.3**, in `run` with `--format json` and without `--auto`:
    * with the permission at `ask`, it refused the call itself, printing `permission requested: edit (hello.txt);
      auto-rejecting` on standard error. The call stands in a `tool_use` event whose `part.state.status` is `error`
      and whose `part.state.error` is `The user rejected permission to use this specific tool call.`, with the
      call's tool and input as for any call. There is no field of its own for a refusal. The turn ended with the
      refused call, and the process exited 0 with no final response, which makes the step one that 0088 asks again
    * with its default settings, which the sandbox does not change, the write was allowed. OpenCode's defaults allow
      most tools, so a refusal there comes from a project's settings or from a permission OpenCode asks about by
      default
    * with the permission at `deny`, the tool was not offered to the agent at all. No call was made, and nothing in
      the output tells the case apart from an agent that chose not to call
* One OpenCode run with the permission at `ask` printed no event at all for 240 seconds and was ended. The same
  command, run again, refused the call in 2 seconds. The hang was not reproduced or explained

## Requirements

1. The command reads, for each step, the tool calls the harness refused for lack of permission, in the order the
   harness printed them, each with the name of its tool and its input:
    * for `claude`, the calls of `permission_denials` of every `result` event the step printed
    * for `opencode`, the calls of every `tool_use` event the step printed whose `part.state.status` is `error` and
      whose `part.state.error` is `The user rejected permission to use this specific tool call.`
2. The refused calls of the step that stopped the run are reported. When that step is an ask again, the refused calls
   of the step it follows are reported too, before its own, since its outcome stands for that step's
3. When there is at least one call to report, the end report says, directly after the line that says how the run
   ended, how many tool calls the harness refused for lack of permission, and then lists each on a line of its own,
   with the name of the tool and the label that `--follow` gives a tool call of that harness with the same input, in
   the order of requirements 1 and 2. A call without a label is listed by its tool's name alone
4. When that run was started, or resumed, without `--skip-permissions`, the part of requirement 3 also says that the
   run was started without `--skip-permissions`, so that a headless step had nobody to ask, and gives, for the
   sandbox, the command that resumes the run with the option, `npx agentrite orchestrate <unit> --resume
   --skip-permissions` with the run's unit, and says that on the host the harness's settings are to allow the refused
   calls instead. A run with `--skip-permissions` gets the part of requirement 3 without this
5. The end report of a run with no call to report, and of a run that ran every item to its end, is as before this
   unit. The exit status, `state.json` and the files of the run's directory are as before this unit
6. Tests of the reading show, for each harness, refused calls taken from every event of the kind of requirement 1
   and none from any other line, and for `opencode` none from a `tool_use` event that failed with another error.
   Tests of the command, with fake harnesses, show the part of requirement 3 for a stopping step of each harness;
   for a stopping ask again, the calls of the step it follows before its own; the part of requirement 4 with and
   without `--skip-permissions`; and the end reports of requirement 5 unchanged
7. "How a run ends" of `README.md` says where in the end report the refused calls stand, what each line of them
   holds, how each harness makes a refusal known, what is added for a run without `--skip-permissions`, and that a
   tool that the harness's settings deny outright, which OpenCode does not offer to the agent, is not reported

## Decisions

* **The kind is feature.** The orchestrator stopped correctly and reported what the step said. The human asked for a
  feature that adds to the report
* **Both harnesses, and only the refusals each makes known.** The human first limited the unit to harnesses that
  report refused calls, and then asked for OpenCode to be checked and added. Both make a refused call known in
  their output, as the context gives. A hint given on every stop without the option, whatever its cause, was
  rejected because it would also be given when permissions were not the cause
* **OpenCode's refusal is known by its error text.** It has no field of its own, and the text is the only thing that
  tells a refused call from one that failed for another reason. If a later OpenCode changes the text, its refused
  calls are no longer reported, and the end report is as before this unit, which is the failure a reader sees and
  that is fixed when it happens. The text is kept in one place, beside what else the command reads of OpenCode's
  output
* **A tool denied outright is not reported.** OpenCode does not offer such a tool, so no call is made and nothing in
  the output is a refusal. Telling it apart would mean reading the harness's settings, which the command does not do
* **An ask again carries the refusals of the step it follows.** An OpenCode step whose call was refused ends its turn
  with no final response and is asked again, and the ask again is then the step that stops the run. Its outcome
  stands for the step it follows, as 0088 decided, so the refusals that caused the stop are reported with it
* **Read after the fact, and do not refuse up front.** Refusing to start a headless run without `--skip-permissions`
  was rejected: on the host a project can run without it on purpose, with the tools its steps need allowed in its
  settings, and the command cannot know from the outside which calls a step will make
* **Every event, not only the last.** A step can end several turns, and a call refused in an earlier turn is as much a
  cause of the stop as one in the last
* **Only the step that stopped the run.** That is the stop the human has to understand. A step that went on after a
  refusal finished its work
* **The label of `--follow`.** It already says what a tool call acts on, in one line, for every tool of either
  harness, and repeating its rules for the refused calls would encode the same decision twice
* **The advice on `--skip-permissions` only when the run lacked it.** With the option Claude Code still refuses what
  a deny rule of its settings refuses, and the list is then still worth showing, but the option cannot help
* **Both the sandbox and the host are named.** The command does not tell the two apart, and the option belongs in
  the sandbox, as "The orchestrator" of `README.md` says. On the host the remedy is the harness's settings
* **No entry in `SANDBOX.md`.** The report names both why the step was refused and what to do, which by this
  project's rule on refusals keeps it out of "When something goes wrong". `SANDBOX.md` already gives the command with
  `--skip-permissions`

## Non-goals

* A tool that a harness's settings deny outright, which OpenCode does not offer to the agent
* The OpenCode run that printed nothing for 240 seconds. A step that hangs is bounded by its `timeoutMinutes`, from
  0069
* Refusing, or warning at the start of, a run without `--skip-permissions`
* Making `--skip-permissions` the default in the sandbox
* Refused calls of a step that did not stop the run, but for the step an ask again follows
* `agentrite run` outside the orchestrator, headless or in a session
* The lines a step prints with `--follow`, and the followed file
* A change to the outcome of a step, to its prompt, or to a role file

## Beyond the request

1. **Refused calls of every step, not only the one that stopped the run.** A part per step with refused calls in the
   end report, and its tests. Without it, a step that worked around a refusal, such as one that could not run a test
   suite and went on, is not reported, and its outcome or its session log is where the human learns of it
