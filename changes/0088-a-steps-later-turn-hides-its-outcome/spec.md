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

**Expected.** A step that did its work is not lost to a response without an outcome. The run asks the step for its
outcome, and goes on by the outcome it gives. Here the run would have asked the implementer, read `done`, and gone on
to the reviewer of round 1.

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
background reports its end. The step's prompt does not tell the agent that its final response must be its last. The
orchestrator reads the last response, which is then not the one with the outcome, and a step whose last response
holds no outcome stops the run, however finished its work is.

**Fix.** A step whose last response holds no outcome is asked for it once, in its own session, and the run goes on
by the outcome that answer gives. The request for the outcome also tells every step that its final response is its
last, and to wait for every command it started in the background before it gives it.

## Requirements

1. When a step's harness exits with status 0, no signal ended it, it did not run past its time limit, and its final
   response holds no block marked `json` or the harness gave no final response, and the step's session is known, the
   run does not stop at that step. The command runs one step more, called the ask again: the same role, harness,
   model, round and `timeoutMinutes`, continuing that step's session, with a prompt that says the last response held
   no block marked `json`, asks for the step's outcome for its work as it stands, and is followed by the request for
   the outcome. The prompt of the definition's step is not given to the ask again
2. An ask again is never itself followed by an ask again. A step whose session is not known is not asked again, and
   stops the run as before
3. The outcome of the ask again stands for that of the step it follows: it is judged by every case of "How a run
   ends", by the step's `stopWhen`, and, for the last step of a round, by the `until` of its repeat, and the end
   report takes it as that of the step. An ask again without an outcome of the form stops the run as a step without
   one does
4. The ask again is a step of the run in every other respect: it has the next number, its line before and after it,
   its followed file, its outcome or response file, its place as the step the run is at in `state.json`, and its row
   in the list of the end report. Its line before and after it and its row say that it asked again for the outcome.
   The step it follows keeps its own response file. The numbers of the files leave room for an ask again after every
   step, so the names still sort in the order the steps ran
5. Requirements 1 to 4 hold for every harness the orchestrator runs
6. The request that the orchestrator adds to the prompt of every step says that the final response is the step's
   last, and that a command the step started in the background has ended before the step gives it
7. Tests of the command, with fake harnesses, show that a step whose final response holds no block marked `json` is
   asked again in its session, with the prompt of requirement 1, and the run goes on by the outcome of the answer; that
   an ask again without an outcome stops the run; that a step whose harness failed, or that ran past its time limit,
   is not asked again; and that the lines, files and rows of requirement 4 are as stated. A test shows that the
   request holds the text of requirement 6
8. "The orchestrator" of `README.md` says when a step is asked again, what the ask again is given, how its outcome
   counts, and how it shows in the lines, the files and the end report, and what the request asks of the final
   response and of a command run in the background

## Decisions

* **The kind is bug.** A run stopped for a step that did its work and gave a valid outcome, and the human asked for a
  bug
* **The step is asked again, and its tools are kept.** Taking `ScheduleWakeup`, `CronCreate` and `Monitor` away from
  a step of Claude Code was the first fix, and was rejected by the human for asking again. Taking them away covers
  only those three, and costs every step what they are for, such as watching a long build. Asking again covers every
  cause of a last response without an outcome, the three tools, a late notification of a command in the background,
  and an agent that forgot the block, and costs one turn, only when it is needed
* **The answer of the ask again is read, and not an earlier response with an outcome.** Taking the last response that
  holds an outcome would hide the turns after it: an agent that changed the tree after giving its outcome would have
  its outcome read for a tree it no longer describes. The ask again gives its outcome after its last turn, so it
  describes the tree as it stands
* **Once.** A step that cannot give an outcome when asked has a fault that a further ask would not cure, and the
  human takes over as before
* **Only for no block marked `json`.** That is the reading of this bug. A response with more than one block, or with
  one not of the form, shows that the step tried to give an outcome, and stops the run as before
* **Not after a failed harness or a time limit reached.** A harness that failed, or a step the command ended, did not
  finish its work, so its outcome is not what is missing
* **The ask again is a step of its own.** It runs as every step runs, with its own time limit, lines and files, so the
  human sees in the end report and the run's directory that it happened and what each run said
* **Every harness.** Forgetting the block is not one harness's fault, and the command already continues the session
  of each harness it runs. The code that asks again names no harness
* **The request still asks for the final response to be the last.** It makes an ask again rarer, and costs one
  paragraph of the prompt

## Non-goals

* Picking a stopped run up again, which 0065 left for a later unit and 0089 specifies
* A step that waits for a wakeup after its final response: the process stays until it fires, as for 0022 for 16
  minutes, and the time limit of a step, from 0069, bounds it
* Taking any tool away from a step, or changing the arguments a step's harness is started with
* `agentrite run` outside the orchestrator, headless or in a session
* A change to a role file or to `process.md`

## Beyond the request

1. **Ask again for an outcome with more than one block, or one not of the form.** The ask again would say what was
   wrong, as the end report does. It costs a prompt for each case and their tests. Without it such a step stops the
   run as today, with its response in the run's directory, and the human takes over
