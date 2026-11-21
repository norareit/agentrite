---
kind: task
status: in-progress
timestamp: 2026-11-21T11:31:26Z
---

# 0115 A file of anomalies

## Description

Add `ANOMALIES.md` at the root of the repository, where an anomaly is counted: a behavior of a harness or a model
that broke what the kit asks of it and for which no cause was found. Counting them shows whether a kind recurs, and
with which model or harness, before anyone spends time investigating it.

* `ANOMALIES.md` is not in the package: `files` of `package.json` does not name it
* It opens with a title and a paragraph that says what it holds, as below
* Each kind of anomaly has a section of its own. Its heading names the kind and, when the kind can occur in one place
  only, that place, as the orchestrator. A paragraph says what was seen in such a case, then a line `Count: <n>`, then
  a table with one row per occurrence, in the order they occurred
* The table has the columns Date, Project, Unit, Role, Harness, Model and Description. The date is the day of the
  occurrence in UTC. The description says what was seen, quoting at most the broken fragment of the output, and how
  the work ended, and for a run of the orchestrator names the run's directory and the step. A column that does not
  apply holds `-`
* The count of a section equals the number of rows of its table
* It holds one occurrence to begin with: the reviewer step of a run of the orchestrator in aloudrite-intellij, whose
  outcome block was not valid JSON

The file reads as follows when the task is done:

```markdown
# Anomalies

Behavior of a harness or a model that broke what the kit asks of it, with no cause found. Each kind has a section
with the number of times it occurred and one row per occurrence. A kind is investigated once its occurrences point
at a cause, such as one model or one harness.

## Malformed outcome block of an orchestrator step

In a run of the orchestrator, the final response of a step held a block marked `json` that was not valid JSON, and
the run stopped.

Count: 1

| Date       | Project            | Unit                  | Role     | Harness  | Model              | Description                                                                                                                         |
|------------|--------------------|-----------------------|----------|----------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| 2026-11-20 | aloudrite-intellij | 0029-choose-the-voice | reviewer | opencode | openai/gpt-6.1-sol | Run 2026-11-20T15:22:52Z, step 2: a stray token `enton` stood before `"blocking"` in the first finding. The run stopped with status 3 |
```

The documents that list the repository's files and documents change with it, as `AGENTS.md` asks:

* "What the repository holds besides the package" of `CONTRIBUTING.md` gains a row for `ANOMALIES.md`
* The table of "The documents" of `AGENTS.md` gains a row for `ANOMALIES.md`: its reader asks which anomalies of
  harnesses and models were seen and how often, and it holds a section per kind, with its count and a row per
  occurrence

Afterwards `npm test` and `npm run check-changes` pass.

Not part of this task: a rule that tells an agent when to add an occurrence, a command that adds one or checks the
counts, and an investigation of the occurrence it starts with. An occurrence is added when the human asks for it.

## Log

- 2026-11-21T11:31:26Z [human] asked for a file in which anomalies of harnesses and models with no cause found are
  noted and counted, starting with the malformed outcome block of a reviewer step in aloudrite-intellij, and chose
  the layout of its sections and table in the session
- 2026-11-21T11:31:26Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `c9bf473`. Made the unit as a task: the human decided the name, the place and the layout in the
  session, so no decision is left open. Numbered 0115: the highest number in `changes/` is 0114. The occurrence was
  read from `.orchestrator/0029-choose-the-voice/2026-11-20T15:22:52Z/` of aloudrite-intellij: `state.json` ended
  with status 3 on a block that is not JSON, and the stray token stands in `02-reviewer.followed.jsonl` as the
  harness printed it. The status is `draft`
- 2026-11-21T11:46:20Z [human] approved the record. The status is `approved`
- 2026-11-21T11:52:43Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on `task-0115-a-file-of-anomalies` at
  `5897931`. The unit needs no plan: the record gives the file's whole content, and the work is that file and one
  row each in the tables of `CONTRIBUTING.md` and `AGENTS.md`, checked by `npm test` and `npm run check-changes`.
  The status stays `approved`
- 2026-11-21T12:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work and built it:
  `ANOMALIES.md` as the record gives it, and a row for it in the tables of `CONTRIBUTING.md` and `AGENTS.md`. `files` of
  `package.json` is unchanged. `npm test` reported 1911 passed, 0 failed, 34 skipped on the tree before this commit,
  whose only other changes are this record. The status is `in-progress`
- 2026-11-21T11:56:04Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0115 at `b8e79d0`
  against merge base `5897931`. No findings on any of the three axes. Saved the review in
  `.reviews/0115-a-file-of-anomalies/review-20261121-round1.md`. `npm test`: 1911 passed, 0 failed, 34 skipped;
  `npm run check-changes` and `git diff --check` passed. Docker-dependent tests and the other project's source
  artifacts could not be verified. The status stays `in-progress`
