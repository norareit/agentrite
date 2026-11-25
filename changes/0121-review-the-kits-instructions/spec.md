# 0121 Review the kit's instructions

## Context

`process.md`, the standards and the role files are read over and over, by every project that uses the kit, and they
keep growing. Units 0117 and 0118 each added what they needed, and the human accepted that growth for now, on the
condition that the files are cleaned up in one pass with the rules of both in view.

Growth in words (`wc -w`) by 0117:

| File                   | Before | After | Growth |
|------------------------|-------:|------:|-------:|
| `process.md`           |   2406 |  2562 |   +156 |
| `roles/implementer.md` |    963 |  1241 |   +278 |
| `roles/reviewer.md`    |   2012 |  2302 |   +290 |

Growth in words by 0118:

| File                   | Before | After | Growth |
|------------------------|-------:|------:|-------:|
| `roles/implementer.md` |   1241 |  1363 |   +122 |
| `roles/reviewer.md`    |   2302 |  2482 |   +180 |
| `roles/planner.md`     |    686 |   764 |    +78 |

At `bffb77a` the other files in scope stand at 1205 words for `standards.md`, 863 for `roles/specifier.md`, 1447 for
`extra-roles/spec-reviewer.md`, 3137 for `extra-roles/security-reviewer.md` and 2020 for this repository's
`AGENTS.md`. `AGENTS.md` is read by every session in this repository, so its words are paid for in all work on the kit
itself.

The human wants two things: the files trimmed now, as far as they go without losing a rule, its context or its
strength, and the files kept short from then on. This unit is the first. The second is unit 0122, which is specified
once this one is done, so that what the trimming teaches can shape it.

The trimming is done by the human and an agent together. The human reads a file part by part and spars with the agent
on what can go, the agreed change is made, and once every part of a file is done the agent scans the whole file again
for what can still be trimmed. The edits are not known before the work starts, so the requirements below fix how the
work is done and what must still hold afterwards, and the record holds what was decided for each part.

## Requirements

1. Every file in scope was walked through part by part with the human, and then scanned whole by the agent for what
   can still be trimmed. `record.md` logs, per file, that both were done.
2. Every rule the files in scope held on the commit the unit's branch is cut from still holds once the work is done:
   unchanged, reworded, moved to another place in scope that the record names, or removed by a decision of the human
   that the record names. A reviewer can check this against the diff and the record.
3. A rule keeps the strength it had, as "must", "never" or "may", unless the record names the human's decision to
   change it.
4. No file in scope has more words once the work is done than on the commit the branch is cut from, unless the record
   names the human's decision that it may. `record.md` logs `wc -w` of every file in scope on that commit and once the
   work is done.
5. Every link into a file in scope, to the file or to a heading in it, from anywhere in the repository outside
   `changes/` and `CHANGELOG.md`, still resolves once the work is done.
6. Every role file keeps a frontmatter `description`, since a harness dispatches the role by it.

## Decisions

- The files in scope are `process.md`, `standards.md`, every file under `roles/` and `extra-roles/`, the templates
  under `templates/changes/`, `templates/project/AGENTS.md` and `templates/project/CLAUDE.md`, and this repository's
  `AGENTS.md` and `CLAUDE.md`. The human wants the whole set at once. The templates are in because every unit's
  documents and every project's instructions start from them. This repository's `AGENTS.md` is in because every
  session working on the kit reads it. The other files under `templates/project/` are scripts and configuration, not
  instructions, and are left out
- The files are walked in this order: `process.md`, `standards.md`, `AGENTS.md`, the files under `roles/`, the files
  under `extra-roles/`, then the templates and the two `CLAUDE.md` files. The roles and `AGENTS.md` restate much of
  `process.md` and the standards, so what they can drop is clearest once those two are settled
- A part is a section of a file. For a long section, such as "Changes" of `process.md`, it is a run of paragraphs the
  human picks
- The unit runs after 0119 and 0120 are implemented, since both change these files and 0120 is written against the
  current wording of `process.md`
- Each change agreed for a part is committed on its own, as a refactoring of the text that changes no rule unless the
  human decided to. After each file, `record.md` gets one entry naming every rule that was removed or moved, with the
  human's decision for each, which is what requirement 2 is checked against. A rule only reworded is not listed
- The plan is written by the specifier in the human's session, not by the planner, once the unit is approved and its
  branch is cut. It is still written on the branch, against the tree the work is done on. Its tasks are the walk
  itself: one task per part of each file, and one task per file for the final scan, and not edits decided in advance.
  This is an exception to the planner's role, which the human asked for, since the edits come out of the sparring and
  nobody could plan them ahead
- The edits are made in the human's session, by the agent acting as the implementer, and not by an implementer run of
  its own. Each edit is one the human agreed to in that session
- The review is made as for any unit, by another model in another harness, against requirements 1 to 6
- `AGENTS.md`'s section "The length of the kit's instructions" holds for this unit as it stands. The log of `wc -w` it
  asks for is the one requirement 4 asks for

## Non-goals

- Changing what the kit does. A rule that should change in substance, not only in wording, is a unit of its own, and
  the walk only notes it in `record.md`
- Changing section "The length of the kit's instructions" of `AGENTS.md`, or adding any rule on keeping the files
  short. That is unit 0122. What the walk finds about why the files grew is logged in `record.md` for 0122 to use
- The other documents: `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `CONTRIBUTING.md`
  and `RELEASING.md`. They are read when needed, not by every session. A link from them into a file in scope is kept
  working by requirement 5

## Beyond the request

None
