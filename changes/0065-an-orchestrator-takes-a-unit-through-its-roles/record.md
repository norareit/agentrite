---
kind: feature
status: draft
timestamp: 2026-10-20T23:55:38Z
---

# 0065 An orchestrator takes a unit through its roles

## Log

- 2026-10-20T23:55:38Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `22dce06`, on the human's request to specify an orchestrator of the kit's own, after a conversation in
  which the human decided the split, the form of the definition, the setting, the outcome and the directory. Made the
  unit as a feature. Numbered 0065: the highest number in `changes/` is 0064. Read the units that mention the
  orchestrator, 0032, 0033, 0052, 0054, 0056 and 0060, `idea.md` of `agentrite-orchestrator`, "agentrite run",
  "agentrite init", "The project's settings" and "Updating a project to a newer kit" of `README.md`, the mount of
  `.reviews` in `container/sandbox.sh`, and the role files of the planner, the implementer and the reviewer. Found
  that the reviewer's role file allows it to write two files only, and specified the outcome as read from the final
  response. Wrote `spec.md`. The status is `draft`
- 2026-10-21T09:21:45Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question whether
  the form of the definition should be settled before the plan, wrote the default definition into requirement 4 as
  the JSON the kit ships, and an example of an outcome into requirement 16, and recorded why under "Decisions". The
  status is `draft`
- 2026-10-21T09:25:30Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision that a
  round of the repeat is the implementer and then the review, so that every round ends with a review and the third
  review's open findings are what the run reports: moved the implementer into the repeat before the review in the
  default definition, allowed `stopWhen` on the last step of a repeat only, had the command tell a step in a repeat
  its round, so that the implementer's prompt can say from which round it applies, and recorded why under
  "Decisions". The status is `draft`
- 2026-10-21T09:32:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decisions that a
  step anywhere can stop the run, that ending a repeat and stopping the run are two keys, and that a time limit on a
  step is left for a later unit: gave a repeat the key `until`, with `"no-blocking-findings"`, in the place of
  `stopWhen` on its last step, allowed `stopWhen` on any step with `"blocking-findings"`, named the time limit among
  the non-goals, and recorded why under "Decisions". The status is `draft`
- 2026-10-21T09:45:23Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question about the
  exit statuses: gave arguments the command does not take the usage and exit status 2, as the kit's other commands,
  which the spec had left unsaid, and recorded under "Decisions" why a stop for the human is 3. The status is
  `draft`
- 2026-10-21T09:53:05Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's request for an overview
  at the end of a run: numbered the steps that run from 0, in the order they run, gave the number in the lines of
  requirement 14, and added to requirement 21 a list of every step that ran with its number, role, harness, model and
  how long it took. The status is `draft`
- 2026-10-21T09:55:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question when the
  command writes `.orchestrator/.gitignore`: said in requirement 24 that it looks once at the start of each run, writes
  the file only when it is missing, and why. The status is `draft`
- 2026-10-21T10:02:27Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision to take item 1
  of "Beyond the request" into the unit and leave item 2 out: added `--definition <file>` to requirement 10, its refusal
  to requirement 11, its documentation to requirement 26 and its test to requirement 30, recorded why under "Decisions",
  and left live output of a step as the one item of "Beyond the request". The status is `draft`
