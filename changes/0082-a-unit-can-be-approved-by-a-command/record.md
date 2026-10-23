---
kind: feature
status: approved
timestamp: 2026-10-23T15:12:33Z
---

# 0082 A unit can be approved by a command

## Log

- 2026-10-23T15:12:33Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `1ebe83b`, on the human's request for a command that approves a unit: it sets the status to
  `approved`, logs the entry and commits it, as the human and their agents have done by hand for every unit so far.
  Made the unit as a feature. Numbered 0082: the highest number in `changes/` is 0081. Read the statuses and the log
  format in `process.md`, the approval of 0078 in its history, "agentrite orchestrate" of `README.md`, and how
  `resolveUnit` reads a unit. Wrote `spec.md`. The status is `draft`
- 2026-10-23T16:35:14Z [human] approved the spec. The status is `approved`
- 2026-10-23T21:38:47Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `feature-0082-a-unit-can-be-approved-by-a-command` at `dd7d669`, wrote `plan.md`. Read as the only readings that
  work: a kind other than `feature`, `bug` and `task` is refused, since the message of the commit has no prefix for
  it; a file the project ignores is not named among the files that differ, as `git status` names none; the entry
  ends as the record's lines end; a `## Log` with no entry gets the entry under its heading after one blank line;
  and `package.json` lists the new module in `files`, since the command imports it. The status stays `approved`
