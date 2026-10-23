---
kind: feature
status: in-progress
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
- 2026-10-23T22:05:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on
  `feature-0082-a-unit-can-be-approved-by-a-command` at `448b17b`. The status is `in-progress`
- 2026-10-23T22:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built the unit on
  `feature-0082-a-unit-can-be-approved-by-a-command` in `d343ac0`, `1b191d2` and `6e50d98`, tests first for the pure
  parts. Two tests outside the new file, in `tests/agentrite-init.test.mjs` and `tests/agentrite-run.test.mjs`,
  listed the usage of every command and gained the line of `approve`. On `6e50d98` `npm test` reported 1187 passed
  and 0 failed, and `npm run check-changes` passed. Lines of the changed files are at most 120 characters, checked
  with `awk` on the scripts, tests, `README.md` and `process.md`. Not checked: the hook of the kit itself in the
  command's tests, which use a stand-in `commit-msg` hook, and a project that is a subdirectory of a repository
  beyond the unit test of the prefix. The commit `d343ac0` carries a `Co-Authored-By` trailer that the standards
  forbid, added by mistake from the harness's attribution reminder; it is not rewritten, for the human to decide.
  The status stays `in-progress` for the review
- 2026-10-23T22:55:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, at the human's request,
  removed the `Co-Authored-By` trailer from the first commit of the unit by rewriting the four commits of the unit.
  They are now `f5cde92`, `3c13a30`, `214474f` and `b1cb342`, in place of the hashes of the entry above, and their trees
  are unchanged. The status stays `in-progress`
