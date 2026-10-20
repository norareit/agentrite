---
kind: bug
status: in-progress
timestamp: 2026-10-20T18:51:02Z
---

# 0064 A blank line splits the entries of a record

## Log

- 2026-10-20T18:51:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `ecb6d4f`, on the human's request that the kit keep a blank line from splitting the entries of a
  record, met again in the reviewer's entry of a unit of another project. Made the unit as a bug, since records come
  out malformed by following the kit's text. Numbered 0064: the plain numbers in `changes/` run with no gap to 0063,
  and `history-` directories are not counted. Counted, with `awk` over every `record.md` of the repository, 72
  entries that stand after a blank line, in 11 numbered units and 5 `history-` ones, of Claude Code, OpenCode and
  the human, the agents' among them of the implementer and the reviewer. Read `templates/changes/record.md`, the
  rules on entries in `process.md`, "Record that you reviewed" in `roles/reviewer.md`, and
  `scripts/check-changes.mjs`, which reads only `status:` of a record. Did not reproduce the bug in a run of an
  agent, which the spec says. Wrote `spec.md`. The status is `draft`
- 2026-10-20T19:04:59Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `c3acf3f`, on the
  human's decision to take the first item of "Beyond the request" into the unit for every record, the `history-`
  ones among them, and to remove the blank lines in a commit of their own. Counted 16 records that hold such lines.
  Changed `spec.md`: the fix and requirements 7 and 8 remove them, a decision says why in a commit of its own and
  without amendments, the non-goal keeps only the records of projects, and the item left in "Beyond the request" is
  numbered 1. The status is `draft`
- 2026-10-20T19:05:27Z [human] approved the spec. The status is `approved`
- 2026-10-20T19:20:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the planner, on the branch
  `bugfix-0064-a-blank-line-splits-the-entries-of-a-record` cut from `master` at `0646f76`. Wrote `plan.md`: the
  check gains `findSplitEntries`, which compares the entries after a blank line with those of the record at the merge
  base, then the rule in `process.md`, the text in `README.md`, and the removal of the blank lines of 16 records in a
  commit of its own. The status stays `approved`
- 2026-10-20T19:20:09Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  `bugfix-0064-a-blank-line-splits-the-entries-of-a-record` at `878b490`, began the work. Read `roles/implementer.md`
  of the installed release 7.2.0. The status is `in-progress`

## Amendments
