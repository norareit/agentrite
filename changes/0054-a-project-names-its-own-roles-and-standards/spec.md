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

The conversation settled that a role's description travels with its file, and that `refresh` and the loading
follow the settings. It also proposed that the new keys be optional and that an unknown key be refused from then on;
the human decided otherwise while the spec was a draft, as "Decisions" records. The decisions that neither settled
are the specifier's, and approving the unit approves them.

## Requirements

The settings:

1. `agentrite.json` holds two more keys, both required, as the three of unit 0045 are:

   | Key         | What it holds                                                        |
   |-------------|----------------------------------------------------------------------|
   | `standards` | The path of the standards file the project uses                      |
   | `roles`     | An object from the name of each role to the path of its file in use  |

   A file that lacks either key, or a `roles` that lacks one of the four roles, is not valid. A project uses the
   kit's own files by naming their paths, and another file by naming its path instead
2. A path in either key is a string that is not empty, relative to the project root, that does not lead outside the
   project, and that names a regular file in the project's working tree. `roles` is an object that holds exactly the
   four names `specifier`, `planner`, `implementer` and `reviewer`
3. A key the kit does not know is still ignored, as requirement 3 of unit 0045 has it
4. What a valid file is, is still decided in one place of the kit's code. A command that reads the file and finds it
   not valid refuses as unit 0045 says: it writes and changes nothing, exits with a status other than 0, and its
   message names the file, the key and what is wrong. For a path that names no regular file, the message names the
   key, the path, and that there is no file at it. For a `roles` that lacks a role, or holds a name that is none of
   the four, it names the role and the four names `roles` must hold
5. `agentrite config` and `init` write the file with all five keys, `standards` and `roles` naming the kit's own
   files. The default file in `templates/project/`, which `config` writes, is this, ending in one line break:

   ```json
   {
     "defaultBranch": "master",
     "harnesses": ["claude", "opencode"],
     "sandbox": true,
     "standards": "node_modules/agentrite/standards.md",
     "roles": {
       "specifier": "node_modules/agentrite/roles/specifier.md",
       "planner": "node_modules/agentrite/roles/planner.md",
       "implementer": "node_modules/agentrite/roles/implementer.md",
       "reviewer": "node_modules/agentrite/roles/reviewer.md"
     }
   }
   ```

   `init` writes the same two keys into the file it writes from its arguments

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
12. With `standards` naming another file than `node_modules/agentrite/standards.md`, that rule also reports a
    `CLAUDE.md` that still imports the kit's `standards.md` and an `opencode.json` that still lists it, since the
    harness then loads both sets of rules. `init` and `refresh` print a notice that names the line or the entry to
    remove, as they print one for what is missing, and remove nothing themselves

The list of the files in use:

13. The kit writes a file `.agentrite/instructions.md` in the project root, which lists the instruction files the
    project uses: the kit's `process.md`, the standards the settings give, and for each of the four roles, its name
    and the role file the settings give. Each is named by its path from the project root, in a link that works from
    the list's own place. The list says that these are the files whose instructions hold in the project, that the
    standards are the project's whole set of rules on how text, documentation, commits, code and tests are written,
    and that the kit writes the list from `agentrite.json` and it is not edited by hand. What it holds follows from
    the settings alone
14. `init` writes the list when it is missing, and `refresh` writes it as the settings give it, whatever is there,
    as it writes the role wrappers: it prints `wrote`, `refreshed` or `up to date` for it, and leaves a path that holds
    something other than a regular file, names it on standard error and exits with a status other than 0 after
    writing the rest. The list is committed with the project, as the wrappers are
15. The project's `AGENTS.md` as `init` writes it says that the files `.agentrite/instructions.md` names are required
    reading, with a link to the list, and lists no role file and no standards file itself. `CLAUDE.md` as `init`
    writes it names the list in its text, where it names the kit's files today. When `AGENTS.md` exists, `init`'s
    notice prints the sections as they are now written
16. `init` and `refresh` print a notice for an `AGENTS.md` that is missing or does not hold the text
    `.agentrite/instructions.md`. It says that agents then do not learn from `AGENTS.md` which role and standards
    files are in use, that `refresh` does not change `AGENTS.md`, and points to the README section of requirement
    22. Whether `AGENTS.md` holds the text is judged in the place where the kit judges `CLAUDE.md` and
    `opencode.json`

What a kit file says of the others:

17. No kit file names `standards.md` as the one file whose rules hold. `process.md` and each kit role file say that
    the rules on how text, documentation, commits, code and tests are written are in the project's standards, which
    `.agentrite/instructions.md` in the project root names. Where `process.md` says that a broken rule of
    `standards.md` blocks, it says the same of the project's standards
18. `roles/reviewer.md` says to read the role files of the specifier, the planner and the implementer that
    `.agentrite/instructions.md` names, and no longer links the kit's three

The documents:

19. `README.md` says, in "The project's settings", what the two keys hold, that they are required and name the
    kit's files in the file `config` and `init` write, what a valid value is, and that after changing one
    `npx agentrite refresh` rewrites the wrappers and the list, and prints the notices on `CLAUDE.md` and
    `opencode.json`. Its table of the keys has a row for each, with what reads it, and its default file is the one
    of requirement 5. "Updating a project to a newer kit" says that a project whose `agentrite.json` lacks the two
    keys adds them, as requirement 5 gives them, before any command that reads the file runs again
20. `README.md` has a section on bringing a project's own role or standards file, which says what such a file must
    hold: for a role file, the front matter of requirement 6, a first instruction to read `process.md` and the
    project's standards with a link that works from where the file is, and its input, its output and the status it
    sets in terms of the documents and statuses of `process.md`; for a standards file, that it is the project's
    whole set of rules, and that a broken rule in it blocks `implemented` as one in the kit's does. It says that a
    replaced file no longer gets the kit's improvements to it, that the file is committed, since a unit run's clone
    holds only what is committed and refuses a path that names no file, and that what a project adds to a role
    without replacing it belongs in the project's `AGENTS.md`
21. `README.md` names `.agentrite/instructions.md` among the files `init` writes and those `refresh` rewrites, and
    says in "Updating a project to a newer kit" that `refresh` writes it, and what to change in an `AGENTS.md` that
    `init` wrote before
22. "How the kit's instructions reach an agent" of `README.md` says what `AGENTS.md` must hold of the list, and
    what the list holds. "agentrite roles", "agentrite run", "agentrite init" and "agentrite refresh" are true of the
    commands and files after the unit

## Decisions

* **The keys are required, and the files `config` and `init` write name the kit's files.** The human decided this
  while the spec was a draft, in the place of the optional keys the conversation proposed: a project can point a
  key at another file, and cannot leave it out. That is unit 0045's "Nothing is implicit", which made the three keys
  before these required: every file the project's agents work by is named in its settings, and nothing is used
  because a key is absent. The costs, accepted: an existing project's `agentrite.json` is refused by every command
  that reads it until the two keys are added, which the release notes say, with the lines to add; and the kit's
  paths are written into every project, so a release that moved or renamed one of the files would leave every
  project's file naming a path that is not there, which is refused with a message that names the key and the path.
  Rejected: optional keys that mean the kit's files when they are missing, which needs no change of an existing
  project and is the implicit default unit 0045 removed
* **An unknown key is still ignored.** The conversation proposed refusing one, because a misspelled optional key
  would be ignored and its override would never apply. With both keys required, a misspelled key shows as a
  missing required one and is refused, which is unit 0045's reason to ignore unknown keys, and it holds again.
  Rejected: refusing them, which changes a decision of unit 0045 for a mistake that is already caught
* **A path that names no file is refused by every command that reads the settings.** A wrapper that points at a
  missing file, or a standards import of a missing file, fails without a word in both harnesses, as unit 0048
  found. The check is one place that refuses loudly, and with the kit's own paths in the file it also catches a
  kit file that a release moved. Every command refuses, and not only those that use the path,
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
* **The files in use are listed in a file the kit writes and keeps.** The human decided this while the spec was a
  draft, after weighing it against `AGENTS.md` listing them, kept up to date by hand. A kit file cannot know which
  standards or role files a project uses, so it has to point somewhere that does. `AGENTS.md` is read in every
  session and calls what it names required reading, so a list in it that is out of date sends agents to a second
  set of rules, or the reviewer and a session without a wrapper to the wrong role file. And it is out of date by
  default: `init` takes no override as an argument, so the usual order, `init`, then a key added by hand, then
  `refresh`, leaves an `AGENTS.md` that names the kit's files. A list that `refresh` writes from the settings is
  right after every `refresh`. Rejected: `AGENTS.md` kept by hand, with the README saying to edit it; and `refresh`
  noticing an `AGENTS.md` that names other files, which would have to read prose
* **The list is `.agentrite/instructions.md`.** The kit's other generated files that hold nothing of the project's,
  the wrappers, are under the harnesses' dot directories, out of the way of the project's own files. A dot directory
  of the kit's keeps the list there as well. Rejected: a file at the project root, which is the project's
* **The harness does not load the list.** The harness loads `process.md` and the standards already, and the list
  adds paths, not rules. It is for an agent that reads files itself: from `AGENTS.md`, or from a kit role file.
  Rejected: importing it into `CLAUDE.md`, which adds a file to every session for that fallback
* **`refresh` notices an `AGENTS.md` without the link, and does not add it.** `AGENTS.md` is the project's, as
  unit 0048 decided of `CLAUDE.md`. A project that set up before this unit has an `AGENTS.md` that lists the kit's
  files, which is right only while it replaces nothing, so it is told on every `refresh` until it links the list.
  Whether it holds the text is a test of one string, unlike whether prose names the right files
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
* This repository's own `agentrite.json`, `AGENTS.md`, `CLAUDE.md`, `opencode.json` and `.agentrite/`, which follow
  when it moves to the release that holds this unit
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

* **`agentrite roles --json` giving each role's file.** The coming orchestrator may want it. Cost: a key in a listing
  that scripts read, which is then a promise. Without it, a script reads the paths from `agentrite.json`
* **An addition file per role beside the kit's.** Covered under "Decisions"
