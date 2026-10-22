---
kind: feature
status: draft
timestamp: 2026-10-22T13:26:21Z
---

# 0076 A step of the orchestrator can leave items for after the run

## Log

- 2026-10-22T13:26:21Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `4a45305`, on the human's request that a step of the orchestrator can leave items for the human after
  the run without stopping it, after a run of the default definition on a unit of an IntelliJ plugin stopped before
  any review for checks and a decision the review did not need. The split of the two kinds, that only the first
  stops the run, the list of items for after the run, its collection from every step in the end report and in the
  run's directory, and leaving out a step that waits for the human, were decided by the human. Made the unit as a
  feature. Numbered 0076: the highest number in `changes/` is 0075. Read "agentrite orchestrate" of "Commands" and
  "The orchestrator" of `README.md`, `agentrite-outcome.mjs` with the request it adds to every step's prompt,
  `agentrite-orchestrate.mjs` with the judging of a step and the end report, the command's writing of the run's
  directory in `agentrite.mjs`, the kit's `orchestrator.json`, the role files, the standards on `**Needed from you**`,
  the decisions of unit 0065 on the outcome, and `SANDBOX.md`. Chose the key's name, `afterwards`, kept `questions`
  with a narrower meaning, and made a `done` outcome with questions stop the run, each as a decision of the spec.
  Readings: the list under `**Needed from you**` holds the items of both kinds, since the standards require it of any
  message that needs the human, and the outcome splits it; the role files do not change, since none of them names the
  outcome and unit 0065 put the request in the command; `SANDBOX.md` does not change, since it says nothing of an
  outcome or the end report; the default definition does not change, since nothing in it names `questions`. Wrote
  `spec.md`. The status is `draft`
