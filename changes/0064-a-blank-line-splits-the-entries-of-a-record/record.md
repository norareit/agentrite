---
kind: bug
status: draft
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

## Amendments
