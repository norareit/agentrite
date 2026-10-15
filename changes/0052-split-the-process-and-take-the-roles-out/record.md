---
kind: feature
status: in-progress
timestamp: 2026-10-15T16:51:20Z
---

# 0052 Split `process.md`, and take the roles out of it

## Log

- 2026-10-15T16:51:20Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `477e65f`, on the human's request to specify the second action of the notes of the conversation of
  2026-10-13, "Split `process.md` in two, and take the roles out of it", which the human gave as a file outside the
  repository earlier in the same session. Made the unit as a feature. Numbered 0052: the highest number in
  `changes/` is 0051, and `origin` holds `master` alone, at the same commit.
  The session took the role on itself, from the role file and `process.md` as installed under
  `node_modules/agentrite`, which is release 6.0.0, read earlier in the session. Read besides, as `master` holds
  them: `process.md`, the four role files, both templates in `templates/project/`, `templates/changes/record.md`,
  `scripts/agentrite-instructions.mjs` and the role descriptions in `scripts/agentrite-roles.mjs`, the sections of
  `README.md` on what is here, how it works and how the instructions reach an agent, and the `files` of
  `package.json`. Checked that no code reads a unit's status but the change check, which compares it with
  `implemented` alone, and that no unit in `changes/` has the status `planned`.
  Wrote `spec.md`. Of what the notes left to decide, the spec decides: the name `standards.md`, that "Verifying
  reported problems" stays in `process.md`, that a broken rule in `standards.md` blocks, that a bug's planning is
  done by a `plan.md` or a log entry with the words "needs no plan", that nobody approves a plan stays said in
  `process.md`, and that a unit left at `planned` is set to `approved` by the release notes. The human was asked
  about none of them, and approving the unit approves them.
  The human means to make a release before this unit is built, so that this repository's sandbox runs with the
  fixes of units 0049 to 0051. The status is `draft`
- 2026-10-15T22:04:49Z [human] approved the spec. The status is `approved`
- 2026-10-15T22:10:48Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0052-split-the-process-and-take-the-roles-out` at `79ecca6`, the head of `master`. Ran `npm ci` first, since
  `node_modules` was missing, which installed the kit's release 7.0.0, and took the role from its `roles/planner.md` and
  `process.md`, which match this repository's at `79ecca6`. Read the spec and the record in full, `process.md`, the four
  role files, the templates under `templates/`, `scripts/agentrite-instructions.mjs`, `scripts/agentrite-roles.mjs`, the
  parts of `scripts/agentrite.mjs` that judge `CLAUDE.md` and `opencode.json`, the tests that read them, the wrapper
  fixtures and the sections of `README.md` the spec names. Since the spec was written at `477e65f`, only `CHANGELOG.md`,
  `CONTRIBUTING.md`, this repository's own `CLAUDE.md` and `opencode.json`, the package version and unit 0053 changed,
  so the spec still fits the tree. `npm test` reported 572 tests, 572 passing, at `79ecca6`. Wrote `plan.md`: the split
  as a move first, then the roles and `planned` out, then the loading of `standards.md`, then `README.md`. The plan
  decides how `opencode.json` is judged with two paths and the text of its notices, and that the implementer's
  description reads "Builds an approved change unit [...] Use once the unit is approved, with its plan where its kind
  needs one". Set the status to `planned`, as the released role says; this unit is what takes that status out. The
  status is `planned`
- 2026-10-15T22:14:33Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on
  `feature-0052-split-the-process-and-take-the-roles-out` at `324eaba`. Took the role from `roles/implementer.md` and
  `process.md` of the installed release 7.0.0. Read the spec, the plan and the record in full. Began the work. The
  status is `in-progress`
- 2026-10-15T22:15:11Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did tasks 1.1 to 1.6: `standards.md`
  holds Text, Documentation changes, the two trailer bullets of Commits, Code and Testing, and `process.md` the rest,
  each under a new opening; the package ships `standards.md`. 1.1's two tests failed before the move and passed after
  it. The line comparison of task 1.6, a script in the scratchpad that counts the non-empty lines of `process.md` at
  `79ecca6` without its opening paragraph against those of the new `process.md` and `standards.md`, reported 0 lines
  missing and 11 added: the two openings (8 lines), the title `# Standards`, and the second `## General guidelines` and
  `### Commits`
- 2026-10-15T22:18:04Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did tasks 2.1 to 2.11. The tests of
  2.1 failed, all five, before `process.md` and the role files were rewritten, and the three of 2.2 failed before the
  description changed. Extended the plan twice, as it now says. Under 2.4: the example branch name
  `feature-0033-specifier-role` in `process.md` names a role, which R6 does not allow and the test of 2.1 refused, so it
  became `feature-0012-export-to-csv`. Task 2.12: the plan left this repository's wrappers as they are, as coming from
  the installed release, but the test of unit 0045 "the repository own agentrite.json, wrappers and sandbox.sh are up to
  date, and refresh changes none" requires them to be what the working tree writes, and it failed on the new
  description. The spec's non-goal names this repository's `AGENTS.md`, `CLAUDE.md` and `opencode.json` and not the
  wrappers, so the two implementer wrappers were written from `plannedFiles`, and no other file. They point at the
  installed release's `roles/implementer.md`, which still speaks of `planned` until this repository moves to the release
  that holds this unit. `npm test` on the tree of this step, uncommitted on `b2b30b8`, reported 577 tests, 577 passing
- 2026-10-15T22:21:26Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did tasks 3.1 to 3.9. The tests of
  3.1 failed on the missing exports before `scripts/agentrite-instructions.mjs` changed, and 7 of 3.4 and 18 of 3.5
  failed before the templates and `scripts/agentrite.mjs` changed. One test of 3.4 then failed on itself: it looked for
  "process.md and standards.md already." on one line, where the template wraps it, and now allows any whitespace there.
  `npm test` on the tree of this step, uncommitted on `128f725`, reported 581 tests, 581 passing

## Amendments
