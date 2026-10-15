---
kind: feature
status: planned
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

## Amendments
