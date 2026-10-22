---
kind: feature
status: draft
timestamp: 2026-10-22T18:58:24Z
---

# 0077 The units of a project can be listed

## Log

- 2026-10-22T18:58:24Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `e7a968c`, on the human's request for a command that lists the units of a project and those still open,
  with the name `units`, the working tree of the current branch as the only source, a unit given by its four digits
  only, the newest first, a default limit of 50 with `--limit`, a closing line when the limit cuts the listing, one
  line and exit status 0 when there is nothing to show, and directories of an older naming left out by the shape of
  the name, decided by the human. Made the unit as a feature. Numbered 0077: the highest number in `changes/` is 0076.
  Read "agentrite roles" and "Exit statuses" of `README.md`, the statuses in `process.md`, the record template, and
  how `agentrite-run.mjs` resolves a unit and `check-changes.mjs` reads a record's status. Wrote `spec.md`. The status
  is `draft`
