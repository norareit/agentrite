# 0082 A unit can be approved by a command

## Context

`approved` is the status that says the human approved a unit's spec, or for a task its record, as `process.md` says.
The approval is written into the unit's `record.md` by hand or by an agent the human asks: its `status` field is set
to `approved`, an entry is added under `## Log` in the form `process.md` gives, as
`- 2026-10-23T11:23:18Z [human] approved the spec. The status is `approved``, and the record is committed on the
default branch, in a commit that holds nothing but that unit's own documents, as `feature-0078 Approve the spec`.
The human has done this for every unit of this repository, and asks an agent to do it in a session each time, which
costs a session's tokens for an edit that is always the same.

The human also means to build a graphical interface, a project of its own outside the kit, that shows the units of
each project with `npx agentrite units --json`, and later acts on them through commands of the kit rather than by
writing a project's files itself. An approval is the first such act.

## Requirements

The command:

1. `npx agentrite approve <unit>` approves the unit, from the project root. `<unit>` is a directory of `changes/`, by
   its name or by the four digits its name opens with, as `agentrite orchestrate` takes it
2. It takes no option, and exactly one `<unit>`

What it writes:

3. In the unit's `record.md`, the `status` field of the front matter becomes `approved`. Nothing else of the front
   matter changes
4. An entry is added to `## Log`, directly after its last entry, as `process.md` says a new entry goes:
   `- <instant> [human] approved the spec. The status is `approved`` for a feature or a bug, and
   `- <instant> [human] approved the record. The status is `approved`` for a task, where `<instant>` is the instant the
   command runs, in UTC, as `2026-10-23T11:23:18Z`
5. Nothing else of `record.md` changes, and no other file is written

The commit:

6. The command commits `record.md` alone, on the default branch, with the message `<prefix>-<number> Approve the
   spec` for a feature or a bug, or `<prefix>-<number> Approve the record` for a task, where `<prefix>` is `feature`,
   `bugfix` or `task` by the unit's kind and `<number>` its four digits. The commit holds no other file, whatever else
   the working tree or the index holds, and what they hold besides is as it was before the command
7. The commit is made as any `git commit` of the developer is, with their identity and the repository's hooks, the
   `commit-msg` hook of the kit among them
8. When the commit fails, as when a hook refuses it, `record.md` and the index are as they were before the command,
   what git printed reaches standard error, and the command exits 1
9. On success the command prints one line that names the unit's directory, the new status and the commit, by its short
   hash and its message, and exits 0. It pushes nothing and makes no branch

Refusals:

10. The command refuses, writes nothing, commits nothing and exits 1 when:
    * the project has no `agentrite.json`, or its file is not valid, as every command that reads the file refuses
    * the project root is in no git repository, or the branch checked out is not the default branch that
      `defaultBranch` in `agentrite.json` names, as on another branch or a detached `HEAD`. It names the branch checked
      out, or that none is, and the default branch
    * `changes/` holds no directory for the unit, or more than one for its digits, as `agentrite orchestrate` refuses
    * the unit's `record.md` is missing, or has no `status` field, no `kind` field or no `## Log` heading. It names
      the file and what is missing
    * the unit's status is not `draft`. It names the status, and says that an approval moves a unit from `draft`
    * the unit is a feature or a bug and has no `spec.md`. It names the file, and says that the approval of a feature
      or a bug is that of its spec
    * a file of the unit's directory differs from what the commit checked out holds: changed, staged, or not tracked.
      It names each, and says that the human approves what is committed, so that they are committed first
11. With no `<unit>`, a second one, or an option, the command says what is wrong, prints its usage, and exits 2

The documents:

12. `README.md` gives `agentrite approve` in "Commands", with its form, what it writes and commits, the line it prints,
    its refusals, a table of its argument, and its exit statuses by "Exit statuses"
13. The usage the command `agentrite` prints names `agentrite approve` with its form, beside the other commands
14. `process.md`, in "Changes", says that `npx agentrite approve <unit>` makes the approval of a unit as this unit gives
    it, and that an agent runs it only when the human has approved that unit and asked for it to be recorded, and never
    on its own judgement

Tests:

15. Unit tests cover the reading of the arguments and each wrong argument of requirement 11, the change of the `status`
    field alone, the entry of each kind, the place of the entry in a record whose `## Log` is the last section and in
    one where `## Amendments` follows it, after a last entry of one line and of several, the message of each kind, and
    the line printed
16. Tests of the command, in a git repository, show an approval of a feature and of a task, with the record and the
    commit each gives, that a file staged or changed outside the unit is not in the commit and is as it was after it,
    each refusal of requirement 10, and that a commit the `commit-msg` hook refuses leaves `record.md` and the index
    as they were and exits 1

## Decisions

* **The name `approve`.** It names the act, as `orchestrate` and `run` do, and the status it gives
* **The unit by its name or its four digits, as `orchestrate` takes it.** The command writes and commits, so it must
  refuse digits that open more than one directory rather than guess, which `orchestrate`'s reading already does.
  `units`, which only reads, shows every directory the digits open instead
* **Only from `draft`.** `process.md` orders the statuses, and an approval is the move from `draft` to `approved`. A
  unit already approved, under way or ended has nothing to approve, and a human who runs the command on it has mistaken
  the unit
* **Only on the default branch.** `process.md` puts the approval on the default branch, with the spec, and everything
  after it on the unit's branch. A command that approved on another branch would make a commit the freeze check and
  the branch cut by the sandbox cannot see
* **Only what is committed is approved.** A spec changed in the working tree and not committed is not what the
  approval names, and committing it with the approval would put text into the history that nobody read as committed.
  The refusal names the files, so the human commits or discards them and runs the command again
* **The record alone in the commit.** `process.md` requires a commit of the default branch before the approval to hold
  nothing but the unit's own documents, and the human may have other work staged or under way. The command commits the
  one file and leaves the rest where it was
* **The entry says `[human]`.** The command cannot tell who runs it, and does not try. An approval is the human's act,
  so the entry names the human, and `process.md` tells agents to run the command only on the human's word. The entry is
  the one the human and their agents already write, so the records read the same before this unit and after it
* **A failed commit leaves nothing behind.** A record set to `approved` without its commit would show an approval that
  the history does not hold, and the change check reads the history. Putting the file back lets the human fix what
  refused the commit and run the command again
* **No push and no branch.** The branch of a unit is cut when the work on it starts, by the sandbox or the planner's
  session, and not at its approval. Pushing is the human's, as for every other commit of the kit's commands' users
* **One line of output and no `--json`.** The command's result is its exit status and its commit. A program, the
  graphical interface among them, reads the status and runs `units --json` again

## Non-goals

* Any other change of status: starting the work, implementing, or cancelling a unit
* Approving a plan, which `process.md` says nobody approves
* Taking or declining items of "Beyond the request", or any other change to a spec
* Approving several units in one run
* Cutting the unit's branch, starting its work, or pushing
* Telling whether the human or an agent runs the command
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **A note in the entry.** `--note <text>` would add a sentence to the entry, such as which items of "Beyond the
   request" the human took. It costs an option, its form in the entry, and tests. Without it, the items taken are
   written into the spec before the approval, as they are today, and the human who wants a note writes it as an entry
   by hand
2. **Several units at once.** `npx agentrite approve <unit>...` would approve each in a commit of its own, and stop at
   the first refusal. It costs the handling of a refusal after some approvals, and tests. Without it, the human runs
   the command once for each unit
