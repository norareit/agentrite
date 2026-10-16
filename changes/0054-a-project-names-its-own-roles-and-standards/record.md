---
kind: feature
status: planned
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
- 2026-10-16T11:47:58Z [human] approved the spec. The status is `approved`
- 2026-10-16T11:52:30Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0054-a-project-names-its-own-roles-and-standards` at `56a7502`, which is the head of `origin/master`.
  Took the role from `roles/planner.md` and `process.md` of release 7.0.0, installed with `npm ci` because
  `node_modules` was missing. Wrote no `plan.md`: the spec does not fit the tree in one place, which the plan
  cannot settle without deciding what should be true. The unit goes back to the specifier and to the human.
  Requirements 41 and 42 of unit 0045 hold for this repository today, and their tests are
  `tests/package-documents.test.mjs` ("the root has an agentrite.json that is the default file byte for byte") and
  `tests/agentrite-refresh.test.mjs` ("the repository own agentrite.json, wrappers and sandbox.sh are up to date,
  and refresh changes none"). R41 has the root `agentrite.json` be the default file byte for byte, and R42 has the
  working copy's `refresh` at the root print `up to date` for the wrappers and `sandbox.sh` and change no file.
  This unit breaks both, and its non-goal leaves this repository's `agentrite.json` and `.agentrite/` as they are:
  * Requirement 5 changes the default file, so a root file left with three keys is no longer the default file
    (R41), and the working copy's `refresh` refuses it for lacking `standards` and `roles` (R42)
  * Giving the root the new default file does not help while the repository runs on 7.0.0: the installed release
    has no `standards.md`, so requirement 2 refuses `node_modules/agentrite/standards.md` as a path that names no
    file
  * Requirement 14 has `refresh` write `.agentrite/instructions.md`, which the root does not have, so even with a
    valid file `refresh` writes a file there (R42)
  The spec has to say what becomes of unit 0045's R41 and R42 until this repository moves to the release that
  holds this unit. Three ways the planner sees: the unit gives the root the new default file and its list, and R42
  is judged in a copy of the root with the working tree's kit files under `node_modules/agentrite`, as the test of
  R42 already copies the root; or R41 and R42 are suspended until that move, and their two tests are changed to say
  so; or the non-goal is dropped and the repository moves within this unit. Smaller, for the same pass: requirement
  2's "does not lead outside the project" can be read of the path as written, or of where it leads once symbolic
  links are followed. Read the second way, a kit installed by `npm link`, or a test project with
  `node_modules/agentrite` linked to the kit, is refused. The plan would read it the first way, and check the
  regular file with links followed. The status stays `approved`
- 2026-10-16T12:13:40Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the unit's branch at `adcfbaf`, on
  what the planner logged above. Checked it: requirements 41 and 42 of unit 0045 and their two tests are as the planner
  says, and the spec missed them. The human decided, after the specifier set out the planner's three ways and a
  fourth, that this repository's own files are judged against the release it installs and not against the working
  tree, and that this belongs in this unit. Corrected `spec.md`: requirements 24 and 25 take the place of
  requirements 41 and 42 of unit 0045; requirement 2 says that whether a path leads outside the project is judged
  as written, and whether it names a regular file with symbolic links followed, as the planner proposed; the
  non-goal on this repository's files says that the two new requirements hold of them before and after its move;
  and two decisions give the reasons and what was rejected. The correction waits for the human's approval before
  the planner starts again. The status stays `approved`
- 2026-10-16T12:15:21Z [human] approved the correction of the spec. The status is `approved`
- 2026-10-16T12:24:41Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0054-a-project-names-its-own-roles-and-standards` at `6019dd3`, from `roles/planner.md` and `process.md`
  of release 7.0.0 as installed with `npm ci`. Wrote `plan.md` against the corrected spec. `npm test` reported 581
  tests, 581 passing, at `6019dd3`. Found, and planned for, that the root's `.claude/agents/implementer.md` and
  `.opencode/agents/implementer.md` hold the description of unit 0052, which is on `master` and in no release, so
  that the installed release's `refresh` rewrites them today: requirement 25 needs them as 7.0.0 writes them, which
  task 4.2 does. The wrappers are not among the files the non-goal on this repository leaves. Two choices the plan
  makes to keep documents true that the spec does not name: the section Roles of `process.md` says that
  `.agentrite/instructions.md` names the role files and that `AGENTS.md` points to it, since requirement 15 leaves
  `AGENTS.md` naming none, which changes the wording of requirement 8 of unit 0052; and `init` from its arguments
  checks the paths it writes before writing anything. The status is `planned`

## Amendments
