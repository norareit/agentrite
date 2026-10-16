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
- 2026-10-16T11:23:11Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on two decisions of the human while
  the spec was a draft. First, that in a project with its own standards file the roles follow that file alone, as
  the spec had it: the human had asked that the role files keep linking `../standards.md`, and chose replacement when
  asked whether the kit's standards should then still hold beside the project's. Second, that the files a project
  uses are listed in a file the kit writes, and not in `AGENTS.md` kept by hand, after the specifier set out where a
  list kept by hand goes out of date. Changed `spec.md`: requirements 13 to 16 are new and give the list,
  `.agentrite/instructions.md`, which `init` and `refresh` write from the settings, the `AGENTS.md` that links it,
  and the notice for one that does not. Requirements 17 and 18 point the kit's files to the list in the place of
  `AGENTS.md`, and the requirements on `README.md` are renumbered 19 to 22 and follow the list. Replaced the two
  decisions on `AGENTS.md` with four on the list, and dropped the entry of "Beyond the request" that the list
  answers. The status is `draft`
- 2026-10-16T11:27:01Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision while the spec
  was a draft that the two new keys are required, written with the kit's own paths by `config` and `init`, so that
  a project can point one at another file and cannot leave it out. Changed `spec.md`: requirements 1, 2, 3, 4 and 5
  now make `standards` and all four entries of `roles` required, give the default file, and keep unit 0045's rule
  that an unknown key is ignored, since a misspelled key now shows as a missing one. Requirement 12 compares with
  the kit's path, and requirement 19 tells an existing project to add the keys. Replaced the decisions on optional
  keys and on refusing unknown ones, with the costs of the human's choice. The status is `draft`
- 2026-10-16T11:31:04Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question whether a
  project may drop one of the four roles. The specifier answered that each role covers a stage `process.md`
  requires, and proposed that two roles may name one file instead; the human agreed, and confirmed that extra roles
  stay out of this unit. Changed `spec.md`: requirement 2 says that two roles may share a file, a decision records
  why all four are required, and the non-goal on extra roles records the human's confirmation. The status is
  `draft`
- 2026-10-16T11:43:47Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's request that the README
  say clearly at its beginning what the kit holds by default and that the standards and the roles can be replaced.
  Asked whether that belongs in this unit, the specifier proposed the opening here and a wider review of the README
  as a unit after this one, and the human agreed. Changed `spec.md`: added requirement 23 on the opening of
  `README.md`, a decision on the split, and a non-goal for the wider review. The status is `draft`

## Amendments
