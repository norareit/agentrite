# 0054 A project names its own roles and standards

## Context

This is the third of three actions the human worked out in a conversation with an agent on 2026-10-13, for those who
would adopt the kit and not its opinionated roles and rules. Unit 0048 loads the kit's instructions through the
harness. Unit 0052 split `process.md` into the process and `standards.md`, and took the roles out of the process, so
that `process.md` names no role and depends on none. This unit lets a project use its own file in the place of
`standards.md`, and its own file in the place of any of the kit's four role files, and keep everything else the kit
wires up.

What fixes the kit's own files today:

* `scripts/agentrite-roles.mjs` holds the four role names and their descriptions as constants, and every wrapper's
  body names the path `node_modules/agentrite/roles/<name>.md`. A harness dispatches a subagent on its wrapper's
  description, so a replaced role would be described as the kit's
* `CLAUDE.md` and `opencode.json`, as `init` writes them and `init` and `refresh` judge them, load
  `node_modules/agentrite/standards.md`
* The project's `AGENTS.md`, as `init` writes it, names the kit's `standards.md` as required reading and lists the
  kit's four role files
* `process.md` links `standards.md`, and each kit role file says to read `process.md` and `standards.md` first, with
  a link to `../standards.md`. `roles/reviewer.md` says to read `specifier.md`, `planner.md` and `implementer.md`
  next to it, as "the instructions the work was produced under, and therefore what it is judged against"
* `agentrite roles` lists the kit's roles and reads nothing of the project. `agentrite run` checks a role's wrapper
  against the one the kit would write, and reads nothing of the project's settings

The last two points of the first list are not in the notes of the conversation. They are what makes an override
dangerous rather than only incomplete: an agent that follows the link to `../standards.md` in a project with its own
standards reads two sets of rules that may contradict each other, and a reviewer that reads the kit's planner judges
a plan written under the project's own planner against the wrong instructions.

The settings are in `agentrite.json`, as unit 0045 made them: three keys, all required, and a key the kit does not
know is ignored.

The conversation settled that the keys are optional, that an unknown key is refused from now on, that a role's
description travels with its file, and that `refresh` and the loading follow the settings. The decisions it left
open are the specifier's, and approving the unit approves them.

## Requirements

The settings:

1. `agentrite.json` may hold two more keys, each optional:

   | Key         | What it holds                                                           |
   |-------------|-------------------------------------------------------------------------|
   | `standards` | The path of the project's own file in the place of the kit's standards  |
   | `roles`     | An object from a role's name to the path of the project's own role file |

   A file without either key is valid, as every file is today, and means the kit's files. A role that `roles` does
   not name is the kit's
2. A path in either key is a string that is not empty, relative to the project root, that does not lead outside the
   project, and that names a regular file in the project's working tree. A name in `roles` is one of `specifier`,
   `planner`, `implementer` and `reviewer`. `roles` is an object, and may be empty
3. A key the kit does not know makes the file not valid. This changes requirement 3 of unit 0045, which ignores one
4. What a valid file is, is still decided in one place of the kit's code. A command that reads the file and finds it
   not valid refuses as unit 0045 says: it writes and changes nothing, exits with a status other than 0, and its
   message names the file, the key and what is wrong. For a path that names no regular file, the message names the
   key, the path, and that there is no file at it. For an unknown key, it names the key and the keys the file may
   hold
5. `agentrite config` and `init` write the file with the three keys of unit 0045 alone, as today

The role files and their descriptions:

6. A role file, the kit's or a project's, opens with front matter that holds its description, in one of two forms:
   `description: <text>` on one line, or `description: >-` followed by the text on lines indented by two spaces,
   which are read as one line, joined by spaces. The front matter holds nothing else, and opens and closes with a
   line `---`
7. The kit's four role files carry their descriptions in that front matter, and the descriptions are no longer
   constants of the kit's code. Each kit wrapper written after the unit is the same, byte for byte, as the one the
   kit writes before it, on the default branch the unit is cut from
8. A command that needs a role's description and finds a role file without front matter as requirement 6 has it,
   refuses, writes and changes nothing, and names the file and the form the front matter must have

What follows the settings:

9. `init` and `refresh` write each role's wrappers from the role file the settings give: its description, and a
   body that says to read that file, by its path from the project root, and follow it
10. `agentrite run` checks a role's wrapper against the wrapper written as requirement 9 says, and so reads the
    settings. `agentrite roles` lists each role with the description from the role file the settings give, as text
    and with `--json`. Both read `agentrite.json`, and refuse as unit 0045 says a command refuses in a project that
    has none or whose file is not valid. Unit 0045's requirement 7, that neither reads the file, no longer holds
11. The standards a project loads are the file `standards` names, or the kit's `standards.md`. `CLAUDE.md` as `init`
    writes it imports that file, between the import of `process.md` and that of `AGENTS.md`, and the `opencode.json`
    that `init` writes or amends lists it after `process.md`. The rule by which `init` and `refresh` judge whether a
    file loads the kit's instructions, from unit 0048 and unit 0052, expects that file
12. With `standards` set, that rule also reports a `CLAUDE.md` that still imports `node_modules/agentrite/standards.md`
    and an `opencode.json` that still lists it, since the harness then loads both sets of rules. `init` and `refresh`
    print a notice that names the line or the entry to remove, as they print one for what is missing, and remove
    nothing themselves
13. The project's `AGENTS.md` as `init` writes it names, as required reading, `process.md` and the standards the
    settings give, and lists the role files the settings give. A role file of the project is listed by its path from
    the project root. `CLAUDE.md` as `init` writes it names the standards the settings give in its text. When
    `AGENTS.md` exists, `init`'s notice prints the sections as they would be written from the settings

What a kit file says of the others:

14. No kit file names `standards.md` as the one file whose rules hold. `process.md` and each kit role file say that
    the rules on how text, documentation, commits, code and tests are written are in the project's standards: the
    kit's `standards.md`, or the file the project uses in its place, which the project's `AGENTS.md` names. Where
    `process.md` says that a broken rule of `standards.md` blocks, it says the same of the project's standards
15. `roles/reviewer.md` says to read the role files of the specifier, the planner and the implementer that the
    project uses, as its `AGENTS.md` names them, and no longer links the kit's three

The documents:

16. `README.md` says, in "The project's settings", what the two keys hold, that they are optional and what a
    missing one means, what a valid value is, that an unknown key is refused, and what to run after changing one:
    `npx agentrite refresh` for the wrappers and the notices on `CLAUDE.md` and `opencode.json`, and an edit by hand
    of the sections of `AGENTS.md`. Its table of the keys has a row for each, with what reads it
17. `README.md` has a section on bringing a project's own role or standards file, which says what such a file must
    hold: for a role file, the front matter of requirement 6, a first instruction to read `process.md` and the
    project's standards with a link that works from where the file is, and its input, its output and the status it
    sets in terms of the documents and statuses of `process.md`; for a standards file, that it is the project's
    whole set of rules, and that a broken rule in it blocks `implemented` as one in the kit's does. It says that a
    replaced file no longer gets the kit's improvements to it, that the file is committed, since a unit run's clone
    holds only what is committed and refuses a path that names no file, and that what a project adds to a role
    without replacing it belongs in the project's `AGENTS.md`
18. "agentrite roles", "agentrite run", "agentrite init", "agentrite refresh" and "How the kit's instructions reach an
    agent" are true of the commands and files after the unit

## Decisions

* **The keys are optional, and a missing one means the kit's file.** Settled in the conversation. The keys of unit
  0045 are facts the kit cannot know, so a default for them would be a guess. "Not replaced" is no guess. Existing
  projects need no change, and the kit's internal paths are not written into every project's file
* **An unknown key is refused.** Settled in the conversation. Unit 0045 ignored one because a misspelled key shows
  as a missing required key. With optional keys, a misspelled `standard` would be ignored, and the kit's rules would
  keep applying without a word. This changes a decision of unit 0045, recorded here as such
* **A path that names no file is refused by every command that reads the settings.** A wrapper that points at a
  missing file, or a standards import of a missing file, fails without a word in both harnesses, as unit 0048
  found. The check is one place that refuses loudly. Every command refuses, and not only those that use the path,
  because unit 0045 decided that a file is valid whole or not at all. Rejected: checking in `refresh` alone, which
  leaves `run` and the sandbox on a project that `refresh` has not seen since the file moved
* **Replace only, and no addition per role.** What a project adds to a role, as "our reviewer also checks X", it can
  write in its own `AGENTS.md` today, which every session reads. An addition file per role would be a second place
  for the same thing. Rejected: an `extends` or addition key, which the conversation already set aside as layered
  configuration before anyone needs it
* **A role's description travels with its file.** Settled in the conversation. A harness dispatches on the
  description in the wrapper, so a replaced role described as the kit's would be dispatched for the wrong work
* **The front matter has one key and two forms, and no YAML.** The kit has no dependency for YAML and reads only the
  description. The folded form is the one the wrappers write, so a description fits the line limit. A role file with
  other keys in its front matter is refused, not half read. Rejected: a YAML parser, a dependency for one key
* **`agentrite roles` and `agentrite run` read the settings.** `roles` is the listing a script or the coming
  orchestrator dispatches on, and a listing of the kit's roles in a project that replaced one is wrong.
  `run` checks a wrapper that is now written from the settings. Both refuse without a valid `agentrite.json`, as the
  other commands do, since "Nothing is implicit" holds for them as it does for the rest. Rejected: `roles` falling
  back to the kit's roles without the file, which is the implicit default unit 0045 removed
* **The kit's standards line is reported, not removed, when the project has its own.** A harness that loads both
  sets of rules gives an agent two that may contradict each other, and nothing says so. The files are the project's,
  and unit 0048 decided that `refresh` notices and does not amend them. The same holds here
* **`AGENTS.md` is where a project's choice is written in text.** A kit file cannot know which standards or role
  files a project uses, and `AGENTS.md` is the project's own and is read in every session. So the kit's files point
  to it, and `init` writes it from the settings. Rejected: the kit's role files naming a fixed `../standards.md`,
  which is the second-rule-set problem of "Context"
* **`AGENTS.md` is brought up to date by hand after a change of the settings.** It is the project's own text, and
  unit 0045 already leaves the wrapper directories it lists to the project. `init` prints the sections as the
  settings give them when the file exists, and the README says to edit them. Noticing an `AGENTS.md` that names
  other files is under "Beyond the request"
* **A project's role file refers to the process by a link of its own.** The kit's files use `../process.md` from
  `node_modules/agentrite/roles/`. A project's file is wherever the project puts it, so the README says what it must
  say, not where it must be. Rejected: a fixed directory for a project's role files, which is the kit's guess
* **The kit's wrappers do not change.** The descriptions move into the role files word for word, so a project that
  replaces nothing gets no diff from `refresh`. That is what makes the move checkable

## Non-goals

* A role the kit does not have. `roles` names only the four, and an extra role is later, on purpose, in the notes
* Replacing `process.md`, or any part of it
* An orchestrator, or settings for one
* Software in the sandbox, which belongs in a project's Dockerfile or Compose layer
* Presets, `extends`, or settings merged from several files
* This repository's own `agentrite.json`, `AGENTS.md`, `CLAUDE.md` and `opencode.json`, which follow when it moves to
  the release that holds this unit
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

* **`refresh` noticing an `AGENTS.md` that does not name the files the settings give.** Cost: deciding when a section
  a project has reworded still names the right files, since it is prose. Without it, a project that changed a key
  and forgot `AGENTS.md` has agents that follow the link there to the old file, while the harness loads and the
  wrappers point at the new one. It shows the first time someone reads `AGENTS.md` or an agent quotes it
* **`agentrite roles --json` giving each role's file.** The coming orchestrator may want it. Cost: a key in a listing
  that scripts read, which is then a promise. Without it, a script reads the paths from `agentrite.json`
* **An addition file per role beside the kit's.** Covered under "Decisions"
