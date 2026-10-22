---
kind: feature
status: in-progress
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
- 2026-10-22T19:24:30Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's choice to take items
  1 and 3 of "Beyond the request" into the unit and to leave item 2 out, and to drop a command that lists the
  statuses, rewrote `spec.md`: requirements 9 to 11 and 21 are new, with `--open` and `--status` refused together, the
  values of the filters checked, and the line with nothing to show naming the filters. The status is `draft`
- 2026-10-22T19:27:35Z [human] approved the spec. The status is `approved`
- 2026-10-22T19:41:12Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `feature-0077-the-units-of-a-project-can-be-listed` from `master` at `9c624b6` and wrote `plan.md`. Read
  requirement 6 as applying to the units the command reads to answer, so with `<number>` only the records of the
  units that open with it are read. Planned `fieldFrom` as extracted from `statusFrom` in a commit of its own, since
  the command reads `kind` as the change check reads `status`. The status is `approved`
- 2026-10-22T19:55:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a session on the Linux host,
  on `feature-0077-the-units-of-a-project-can-be-listed`, began the work. The status is `in-progress`
- 2026-10-22T20:20:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, finished the tasks of `plan.md` in
  the commits it names. Ran `npm test` on `7bed8d8`: 1032 tests pass and none fail, and again on `9363cfe` after the
  commits were rebased to take out their trailers. An earlier run of the same tree failed `a unit run and its variants
  run at once` of `tests/sandbox-variant.test.mjs` twice, and that file passed on three runs after and in the full run
  above; not investigated, and the test reads running containers of the host, one of which belonged to another project.
  `npm run check-changes` passes on `7bed8d8`. `npx agentrite units` of the working tree lists the units of this
  repository and none of its `history-` directories, which the tests cover on a project of 54 units. Read `unitFrom` as
  taking the status and the kind with `fieldFrom` over the whole record, as `statusFrom` does, and not only over the
  front matter. The status stays `in-progress` for the review
- 2026-10-22T19:54:12Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0077 at `66ae731`.
  Returned S1, S2, C1 and C2 in
  `.reviews/0077-the-units-of-a-project-can-be-listed/review-2026-10-22T195240Z.md`.
  Ran `npm test`: 1032 passed, none failed or skipped; `npm run check-changes` and the command smoke checks passed.
  Could not independently verify the historical test-first sequence. The status stays `in-progress`
