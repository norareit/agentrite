# 0088 A step's later turn hides its outcome

## Context

The orchestrator runs each step as `agentrite run --headless`, and for Claude Code reads the step's outcome from the
last `result` event that `--print` with `stream-json` writes. Claude Code in `--print` does not end when the agent
first ends its turn: while a wakeup the agent scheduled, or a command it started in the background, is still pending,
the process stays and starts a new turn of the same session when it fires. Every such turn ends with a response of its
own, and the last one is what the orchestrator reads.

## The bug

**Observed.** In the project aloudrite-intellij, on AgentRite 8.2.0 with Claude Code 2.1.310 in the sandbox, the run
of unit 0022 started at `2026-10-25T11:58:47Z` stopped after step 1, the implementer on `claude-sonnet-5-5`, with
`Step 1 stopped the run: its final response holds no block marked json.` The implementer had finished: every task of
its plan was ticked, its work was committed up to `79caf96`, and at 12:48:27 it wrote a final response with a valid
outcome, `done`, with no questions and three items in `afterwards`. At 13:04:03 it wrote three more paragraphs, saying
there was nothing left to check, with no outcome, and that is the response the run's directory holds as
`01-implementer.response.md`.

**Expected.** A step that ends with a valid outcome has that outcome read, and the run goes on by it. Here the run
would have gone on to the reviewer of round 1.

**Steps to reproduce.** Not reproduced on demand. The session log of the step,
`~/.local/share/agentrite/aloudrite-intellij/.claude/projects/-work/ce86064c-2aed-4dce-b4a3-83b26e1affde.jsonl` on
the host, shows the sequence:

1. The implementer started a measurement of 35 minutes as a background command, with background commands that waited
   for its end, and ended several turns with a status message while it ran
2. At 12:43:04 it called `ScheduleWakeup` with a delay of 1200 seconds and the prompt `Check the reading-time
   measurement`. The tool answered that the next wakeup was at 13:04:00, and the turn ended
3. At 12:46:56 the notification of a waiter's end started a new turn. The implementer finished the work and ended that
   turn at 12:48:27 with the response that holds the outcome
4. At 13:04:00 the wakeup started another turn with its prompt. The implementer answered in plain text and ended it at
   13:04:03, and the process ended

The raw output of the step is not kept, so that every turn ended in a `result` event of its own was not seen. That the
response the orchestrator read is the text of 13:04:03 was seen.

**Root cause.** A headless step of Claude Code can make turns of its own after its final response: `ScheduleWakeup`
and `CronCreate` schedule a prompt for later, `Monitor` reports on a process as it runs, and a command started in the
background reports its end. The step's prompt does not tell the agent that its final response must be its last, and
nothing keeps it from scheduling a turn after it. The orchestrator reads the last response, which is then not the one
with the outcome.

**Fix.** A headless step of Claude Code runs without the tools that schedule or report a later turn, and the request
for the outcome tells the step to wait for every command it started in the background before it gives its final
response.

## Requirements

1. A step of the orchestrator that runs Claude Code runs it with `ScheduleWakeup`, `CronCreate` and `Monitor` not
   available to the agent, in its first run and in a run that continues its session
2. The request that the orchestrator adds to the prompt of every step says that the final response is the step's last,
   and that a command the step started in the background has ended before the step gives it
3. A test shows that the arguments a step of Claude Code is started with leave out the tools of requirement 1, for a
   first run and for a continued one, and a test shows that the request holds the text of requirement 2
4. "The orchestrator" of `README.md` says that a step of Claude Code runs without those tools and why, and what the
   request asks of a command run in the background

## Decisions

* **The kind is bug.** A run stopped for a step that did its work and gave a valid outcome, and the human asked for a
  bug
* **The tools are taken away, and the prompt alone is not trusted with it.** A request in the prompt can be missed,
  as the implementer of 0022 missed that its final response was read, and a missed request stops the run. Without the
  tools the agent cannot schedule a later turn at all. A step that needs to wait still can, with a command in the
  foreground that polls
* **Commands in the background are not taken away.** Claude Code has no switch for them apart from its shell tool, and
  a step uses them to run work side by side. A command in the background that ends before the final response does no
  harm, so the request asks for that
* **`Monitor` goes with the two that schedule.** It makes a turn whenever the process it watches prints, which after
  the final response is the same fault. A step can read a log in the foreground instead
* **The orchestrator does not take the last response that holds an outcome.** That would hide the turns after it: an
  agent that changed the tree after giving its outcome would have its outcome read for a tree it no longer describes.
  A step whose last response holds no outcome still stops the run
* **OpenCode does not change.** It has no tool that schedules a later turn, and its run ends with its turn
* **That Claude Code 2.1.310 in `--print` honours the tools being taken away, for `ScheduleWakeup`, `CronCreate` and
  `Monitor`, is verified before anything is built on it**, as 0065 did for the resume of OpenCode. When a tool cannot
  be taken away, the unit goes back to the specifier and the human

## Non-goals

* Picking a stopped run up again, which would have let the run of 0022 go on by hand, and which 0065 left for a later
  unit
* A step that never ends while it waits, which the time limit of a step, from 0069, already stops
* `agentrite run` outside the orchestrator, headless or in a session, which keeps every tool of its harness
* A change to a role file or to `process.md`

## Beyond the request

1. **Say why a run stopped when a step went on after its outcome.** When the step's last response holds no outcome
   and an earlier response of the same step does, the end report could say that the step answered again after its
   outcome, and name the earlier response, so the human sees at once that the work was finished. It costs reading
   every `result` event of the step and a line in the end report. Without it the human reads the followed file or the
   session log, as for 0022
