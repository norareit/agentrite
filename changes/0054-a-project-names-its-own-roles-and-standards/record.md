---
kind: feature
status: draft
timestamp: 2026-10-16T11:14:23Z
---

# 0054 A project names its own roles and standards

## Log

- 2026-10-16T11:14:23Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `4e2597a`, on the human's request to specify the remaining action of the notes of the
  conversation of 2026-10-13, "Make the roles and the style file replaceable", which the human gave as a file
  outside the repository earlier in the same session. Made the unit as a feature. Numbered 0054: the highest
  number in `changes/` is 0053, and `origin` holds `master` alone, at the same commit.
  The session took the role on itself, from the role file and `process.md` as installed under
  `node_modules/agentrite`, which is release 7.0.0; they differ from 6.0.0, read earlier in the session, only in
  naming the default branch in the place of `master`. Read besides, as `master` holds them:
  `scripts/agentrite-settings.mjs`, `scripts/agentrite-roles.mjs`, the role handling of `scripts/agentrite-run.mjs`
  and of the commands `roles`, `run` and `refresh` in `scripts/agentrite.mjs`, the four role files, `process.md`,
  both templates in `templates/project/`, and "The project's settings" of `README.md`. Found two couplings the
  notes do not name, which the spec's "Context" gives: the kit's role files and `process.md` link the kit's
  `standards.md`, and `roles/reviewer.md` links the kit's other three role files.
  Wrote `spec.md`. Of what the notes left to decide, the spec decides: replace only, with no addition per role;
  `agentrite roles` and `agentrite run` read the settings; a project's role file refers to the process by a link of
  its own; and the project's `AGENTS.md` names the files the settings give, written by `init` and kept up to date by
  hand. Besides those, it decides that a path naming no file is refused by every command that reads the settings,
  that the front matter of a role file has one key in two forms, and that a `CLAUDE.md` or `opencode.json` that
  still loads the kit's `standards.md` beside the project's own is reported. The human was asked about none of
  them, and approving the unit approves them.
  Unit 0052, which this unit builds on, is on `master` and in no release yet. The status is `draft`

## Amendments
