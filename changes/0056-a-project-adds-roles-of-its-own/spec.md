# 0056 A project adds roles of its own

## Context

The human has worked on how the kit loads its roles for two ends: that a project can replace the kit's four roles
and add roles of its own, and an orchestrator that runs the roles of a unit. Unit 0052 took the roles out of
`process.md`, so that the process names no role and its log format takes any role as `as the <role>`. Unit 0054 made
`agentrite.json` name the file of each of the four roles, moved each role's description into the front matter of its
file, and has the wrappers, `agentrite roles`, `agentrite run` and `.agentrite/instructions.md` follow the settings.
Replacing a role is done with that. This unit is the adding.

Unit 0054 left extra roles out on purpose, and noted that a later unit that allows more names in `roles` leaves every
file valid that 0054 makes valid. What stands in the way today is that the four names are fixed in the kit's code:

* `roles` in `agentrite.json` must hold exactly the four names, and a file with any other name is not valid
* `init` and `refresh` write wrappers for the four, `agentrite roles` lists the four, `.agentrite/instructions.md`
  names the four, and `agentrite run` takes one of the four as its role, judged before the settings are read

The human gave what an extra role is, in a conversation with the specifier on 2026-10-18. It is something a project
adds on top of the process, and it adds no stage of its own: it runs just before or just after one of the four roles,
within that role's stage. The examples given:

| Extra role          | Runs                         | The unit's status while it runs |
|---------------------|------------------------------|---------------------------------|
| A spec reviewer     | After the specifier          | `draft`                         |
| A plan reviewer     | After the planner            | `approved`                      |
| A test writer       | Before the implementer       | `approved` or `in-progress`     |
| A security reviewer | Before or after the reviewer | `in-progress`                   |

The four statuses and the four stages of `process.md` stay as they are. The four roles still each cover one stage and
still move the unit through the statuses, and an extra role moves none.

In the same conversation the human decided that an extra role has no place in the process that the kit records or
reads in this unit, and that its findings do not block `implemented`, both as "Decisions" gives them. Until the
orchestrator exists, the human dispatches an extra role, in a session or with `agentrite run`, at the moment the
role's file says. The decisions that the conversation did not settle are the specifier's, and approving the unit
approves them.

## Requirements

The settings:

1. `roles` in `agentrite.json` holds the four names `specifier`, `planner`, `implementer` and `reviewer`, and may hold
   other names besides, each the name of an extra role with the path of its file. The four are still required, and
   a file that lacks one is still not valid
2. The name of an extra role is one or more words of lowercase letters `a` to `z`, joined by single hyphens, as
   `security-reviewer`. The path of an extra role is judged as the path of one of the four is, by requirement 2 of
   unit 0054, and an extra role may name the same file as another role
3. A file whose `roles` holds a name that is not of that form is not valid. The command refuses as unit 0045 says,
   and its message names the name and the form a role's name must have. A file that unit 0054 makes valid is still
   valid
4. Where the kit lists the roles, it lists the four in their order, `specifier`, `planner`, `implementer` and
   `reviewer`, and then the extra roles in the order `roles` in `agentrite.json` holds them

What follows the settings:

5. `init` and `refresh` write the wrappers of every role `roles` names, the extra roles included, for each harness
   `agentrite.json` names, as requirement 9 of unit 0054 has it for the four
6. `refresh` removes, from the wrapper directory of each harness `agentrite.json` names, a file whose name is
   `<name>.md` for a `<name>` that is not a role `roles` names, when the text after its front matter is the body the
   kit writes in a wrapper: to read a file by its path from the project root and follow it, whatever the path. A
   model pinned in the file's front matter does not stop the removal. It prints `removed <path>` for each file it
   removes. A file of another body, such as an agent of the project's own, is left as it is, and `refresh` says
   nothing of it
7. `agentrite roles` lists the extra roles with the four, as text and with `--json`, each with the description that
   its file's front matter holds. The JSON document keeps its form: each role is an object with its `name` and its
   `description`
8. `agentrite run` takes as its role any role `roles` names. Given a role that `roles` does not name, it starts
   nothing, exits with a status other than 0, and its message names the role and the roles `roles` names. Its usage
   text says that the role is one that `agentrite.json` names, and names no fixed list of roles
9. `.agentrite/instructions.md` names the file of each extra role with those of the four, by name and by path as it
   names theirs

The process:

10. `process.md` does not change. An extra role writes its entries in `record.md` as `as the <name>`, with its name
    as `roles` gives it, which the log format allows already

The documents:

11. `README.md` is true of the kit after the unit:
    * Its opening says that a project can add roles of its own as well, with a link to the section of requirement 12
      in the place where it links "Replacing a role or the standards", and its list of sections holds that section
    * "How it works" says that each of the four roles covers one stage of the process and moves the unit through
      the statuses, and that a project can add roles that run just before or just after one of the four, within
      its stage
    * "The project's settings" says that `roles` may hold extra roles besides the four, and what a name must be
    * "agentrite roles", "agentrite run", "agentrite init" and "agentrite refresh" are true of the extra roles, of
      the refusal of requirement 8 and of the removal of requirement 6
12. `README.md` has a section on adding a role, after "Replacing a role or the standards", which says:
    * that an extra role adds no stage and no status: it runs just before or just after one of the four roles,
      within that role's stage, as the table of the examples in "Context" shows
    * how it is added: its name and the path of its file in `roles`, the file committed, and `npx agentrite
      refresh`, and that removing it from `roles` and running `refresh` removes its wrappers
    * that its file has the front matter of a role file, and first an instruction to read `process.md` and the
      project's standards, as "Replacing a role or the standards" says of a role file
    * that its file says which of the four roles it runs before or after, what it is given and what it produces,
      and that it sets no status
    * that its findings do not block `implemented`. They go where its file says, such as to the human, to the role
      whose work it judged, or to the implementer
    * that its log entries name it, as `as the <name>`
    * that the kit does not yet run it at its moment: the human dispatches it, in a session or with `agentrite run`

## Decisions

* **An extra role runs within the stage of one of the four, and adds none.** The human decided this. The four
  stages are what `process.md` requires of every unit, and the four statuses say how far a unit got through them, so
  a stage of a project's own would change the process, which is the same in every project. Every example the human
  gave is checking or preparing the work of one stage, at its start or its end, which fits within it
* **An extra role sets no status.** The statuses say which of the four stages is done, and each of the four roles
  says which status it sets. A second role setting one would make the moment a status changes depend on which roles
  a project has. The kit cannot enforce what a project's role file says, so this is said in the README as what the
  file must say, and is not a check
* **The kit does not record or read where an extra role runs, in this unit.** The human decided this. Only something
  that dispatches the roles needs it, and until the orchestrator exists that is the human, who reads it in the
  role's file. The orchestrator's unit decides how the kit reads it, with what that unit has to settle in front of
  it: two extra roles at the same moment, a role that runs again after a fix, and a role that runs for some units
  and not others. Rejected: a key such as `runs: after reviewer` in the front matter or in `agentrite.json` now,
  which fixes a form before the one thing that reads it is designed
* **The findings of an extra role do not block `implemented`.** The human decided this. `process.md` says what
  blocks, as "the review", and changing that changes the process. A project that wants a check to block makes it
  part of its reviewer, by replacing the reviewer's file. Rejected: every review of a unit blocks, whichever role
  made it, which changes `process.md` and has the reviewer find out which other roles reviewed
* **`process.md` does not change.** It names no role since unit 0052, and its log format already takes any name.
  What an extra role must say of itself is the README's, as unit 0054 put what a replacing role file must hold
* **A role's name is lowercase words joined by hyphens.** It becomes the name of a wrapper's file in each harness's
  directory, the `name` of a Claude Code subagent, and the first argument of `agentrite run`, and the form is one
  that every file system and both harnesses take. Claude Code gives the name of a subagent as lowercase letters and
  hyphens. Rejected: any string, which would let a name hold a slash or a space and lead a wrapper's path elsewhere
* **The four come first, and the extra roles follow in the order of the file.** The order of the four is the order
  of the stages, and stays the same in every project. An object's keys keep their order when the file is read, so
  the project decides the order of its own roles where it writes them. Rejected: the extra roles in alphabetical
  order, which ignores the order a project gave
* **`refresh` removes a wrapper of a role that is gone.** A harness dispatches a subagent on the wrappers in its
  directory, so a wrapper left behind keeps a removed role, or the old name of a renamed one, dispatchable, and it
  reads a file the project may have deleted. The wrappers are the kit's files, which `refresh` already writes over
  whatever is there. The body is what tells a wrapper of the kit's from an agent of the project's own in the same
  directory, which `refresh` leaves alone and does not mention, since a project may keep its own agents there.
  Rejected: a notice that names the wrapper to remove, which leaves a step to the human for a file the kit wrote
* **`init` removes nothing.** It writes what is missing and leaves what is there, and a project has no wrapper of a
  removed role before it ran `refresh`
* **`agentrite run` refuses a role the settings do not name.** It reads the settings already, since unit 0054, so
  the check moves from the fixed list to the list of the settings, and the message names the roles a project has

## Non-goals

* Where an extra role runs, recorded in a form the kit reads, and running it at that moment. That is the
  orchestrator's unit
* Findings of an extra role that block `implemented`
* A stage or a status of a project's own, and any change to `process.md`
* Leaving out one of the four roles, which unit 0054 decided against
* The kit's `roles/reviewer.md` reading the files of extra roles. It reads those of the specifier, the planner and
  the implementer, as unit 0054 left it
* Removing the wrappers in the directory of a harness that `agentrite.json` no longer names, which `refresh` does not
  do for the four either
* This repository's own `agentrite.json`, which names no extra role. Requirements 24 and 25 of unit 0054 still hold
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

* **Refusing a name that a harness has for an agent of its own.** OpenCode has the agents `build` and `plan`, and
  Claude Code has `Explore`, `Plan` and `general-purpose`, of which only the lowercase ones fit requirement 2. Cost:
  a list of each harness's names in the kit, kept up to date as the harnesses change. Without it, a project that
  names a role `plan` or `build` gets a wrapper that the harness may take in the place of its own agent, or the
  other way round, which it sees when it dispatches the role and fixes by renaming it in `roles`
* **The kit's reviewer reading the files of the extra roles that ran before it.** A test writer's tests are in the
  diff the reviewer judges, and the test writer's file is what they were written under. Cost: the reviewer reads
  every extra role's file to find out which ran before it, while the kit records nowhere which did. Without it, the
  reviewer judges the tests against the spec and the standards, as it judges the implementer's, and a project that
  wants more says so in its `AGENTS.md` or its own reviewer
* **The path of each role's file in `agentrite roles --json`.** The orchestrator may want it, as unit 0054 already
  noted. Without it, a script reads the paths from `agentrite.json`
