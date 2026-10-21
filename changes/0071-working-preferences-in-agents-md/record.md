---
kind: task
status: implemented
timestamp: 2026-10-21T20:12:55Z
---

# 0071 Working preferences in AGENTS.md

## Description

Three ways of working that the human asked of agents in this repository are kept only in the agent memory of one
machine, which `process.md` says is where they do not belong, since they hold on every machine. Write them into
`AGENTS.md` of this repository, in a section of their own after "Exit statuses", as rules:

* No commit that exists is rewritten, by an amend, a reset, a squash, a rebase or a replay, also when it is not
  pushed, unless the human asked for that rewrite, which permits that one rewrite only. A correction of one's own is
  made as a new commit, after which the human is asked whether to fold it into the earlier one. Files are checked,
  as for the line limit, before they are committed rather than amended after
* The review of a unit is made by another model in another harness. A session that implemented a unit hands it
  over at `in-progress`, and does not offer the review or start it
* A reading of a spec that is the only one that works, such as `package-lock.json` changing with
  `package.json`, is built and logged in one line of `record.md`. It is not put to the human as a decision

Afterwards the lines of `AGENTS.md` are within 120 characters, `npm test` passes and `npm run check-changes`
exits 0.

Not part of this task:

* Reading `process.md` and the standards before a commit, and adding no `Co-Authored-By`. `AGENTS.md` already
  makes them required reading, `CLAUDE.md` loads them into every session of Claude Code, and the standards forbid
  the line, so stating it in `AGENTS.md` would state it twice
* Moving any of the three into the kit's `process.md` or role files, for every project

## Log

- 2026-10-21T20:12:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `33cc8db`, on the human's request to move the ways of working kept in agent memory into `AGENTS.md`. Made
  the unit as a task: one section of one file, whose description and diff say the same thing. Numbered 0071: the highest
  number in `changes/` is 0070. Wrote the description. The status is `draft`
- 2026-10-21T20:15:36Z [human] approved the record. The status is `approved`
- 2026-10-21T20:16:14Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  `master` at `9be887e`, began the work. On the human's request the task is done on `master`, and no branch is cut for
  it. The status is `in-progress`
- 2026-10-21T20:16:14Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the section "Ways of working"
  to `AGENTS.md` after "Exit statuses", with the three rules the description gives. No line of `AGENTS.md` is over 120
  characters, and none holds an em dash. `npm test` passes: 934 tests, none skipped. `npm run check-changes` exits 0 on
  the committed tree. The status stays `in-progress`
- 2026-10-21T20:24:47Z [human] decided that the task is done. The status is `implemented`

## Amendments
