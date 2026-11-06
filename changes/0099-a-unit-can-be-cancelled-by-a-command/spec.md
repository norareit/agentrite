# 0099 A unit can be cancelled by a command

## Context

`npx agentrite approve <unit>` records the human's approval of a unit: it sets the record's `status`, adds the
human's entry to `## Log` and commits `record.md` alone on the default branch, as unit 0082 gave it. A cancellation
is still written by hand, or by an agent the human asks, as unit 0098 was in `feature-0098 Cancel the unit`: the
`status` field is set to `cancelled`, an entry is added that gives the reason in words, and the record is committed on
the default branch.

`process.md` sets more rules on a cancellation than on an approval:

* Only the human cancels a unit, and only from `draft`, `approved` or `in-progress`. An `implemented` unit is never
  cancelled, and a cancelled one is never set back
* The entry that sets `cancelled` gives the reason in words, and names the directory of the unit that did the work or
  made it moot, when there is one
* A unit with no branch is cancelled on the default branch. A unit that has a branch is cancelled on the default
  branch too, in a commit that holds its documents as they stand at the head of its branch, `spec.md`, `plan.md` when
  there is one, and `record.md` with the entry that sets `cancelled`, and nothing of its implementation. The branch is
  not merged

The last rule is the one a cancellation by hand gets wrong most easily: the plan, and the entries made on the branch,
exist only there, and copying them onto the default branch is several git commands. A command does it the same way
each time, and is the second act the human's graphical interface, which unit 0082 names, can take through the kit.

A unit's branch is the local branch named `<prefix>-<directory>`, where `<prefix>` is `feature`, `bugfix` or `task` by
the unit's kind and `<directory>` the name of the unit's directory, as `feature-0012-export-to-csv`. `process.md`
names it so, and the sandbox cuts it so.

## Requirements

The command:

1. `npx agentrite cancel <unit> --reason <text> [--by <unit>]` cancels the unit, from the project root. `<unit>` is a
   directory of `changes/`, by its name, with or without `changes/` before it, or by its four digits, as
   `agentrite approve` takes it
2. `--reason <text>` is required, and gives the reason in words. It is also taken as `--reason=<text>`
3. `--by <unit>` is optional, and names the unit that did the work or made the cancelled one moot, given as `<unit>`
   is. It is also taken as `--by=<unit>`

The unit's branch:

4. The command looks for the unit's branch among the local branches only, by the exact name
   `<prefix>-<directory>`. A variant's branch, whose name holds `--`, is not the unit's branch, and is not read
5. When the unit has a branch, the command reads the unit's `record.md` from the commit at the head of that branch,
   and judges the status and the kind there. When it has none, it reads the `record.md` of the default branch
6. When the unit has a branch, the commit sets the unit's `spec.md`, `plan.md` and `record.md` on the default branch to
   what they are at the head of the branch, each that the branch holds, before the entry of requirement 8 is added to
   the record. A file the branch holds and the default branch does not, as a `plan.md`, is added. Nothing else of the
   branch, of the unit's directory or of the project is taken
7. The command neither merges, deletes, moves nor checks out any branch, the unit's and its variants' among them

What it writes:

8. In `record.md`, the `status` field of the front matter becomes `cancelled`, and nothing else of the front matter
   changes. An entry is added to `## Log`, directly after its last entry, as `process.md` says a new entry goes:
   `- <instant> [human] cancelled the unit: <reason>. The status is `cancelled`` without `--by`, and
   `- <instant> [human] cancelled the unit: <reason>. The unit `<directory>` did the work or made it moot. The status
   is `cancelled`` with it, where `<instant>` is the instant the command runs, in UTC, as `2026-11-06T14:04:56Z`,
   `<reason>` is the text of `--reason` with its surrounding white space and one final full stop removed, and
   `<directory>` is the full name of the directory of the unit `--by` names
9. The entry is wrapped at 120 characters, at spaces, with each line after the first indented by two spaces, as the
   records of this repository are written. A word longer than a line is not broken
10. Nothing else of `record.md` changes, and no file is written but those of requirements 6 and 8

The commit:

11. The command commits the files it wrote alone, on the default branch that `defaultBranch` in `agentrite.json`
    names, with the message `<prefix>-<number> Cancel the unit`, where `<number>` is the unit's four digits. The commit
    holds no other file, whatever else the working tree or the index holds, and what they hold besides is as it was
    before the command
12. The commit is made as any `git commit` of the developer is, with their identity and the repository's hooks, the
    `commit-msg` hook of the kit among them
13. When the commit fails, as when a hook refuses it, every file the command wrote and the index are as they were
    before the command, what git printed reaches standard error, and the command exits 1
14. On success the command prints one line that names the unit's directory, the new status and the commit, by its short
    hash and its message, as `changes/0098-fast-tests-by-default/ is cancelled, in b79f39c feature-0098 Cancel the
    unit`, and exits 0. When the unit has a branch, it prints a second line, which names the branch and says that it
    is not merged and is left as it is. It pushes nothing

Refusals:

15. The command refuses, prints nothing on standard output, writes nothing, commits nothing and exits 1 when:
    * the project has no `agentrite.json`, or its file is not valid, as every command that reads the file refuses
    * the project root is in no git repository, or the branch checked out is not the default branch. It names the
      branch checked out, or that none is, and the default branch, and says that a cancellation is committed on the
      default branch
    * `changes/` holds no directory for the unit, or more than one for its digits, as `agentrite approve` refuses
    * the record it reads, by requirement 5, is missing, or has no `status` field, no `kind` field or no `## Log`
      heading, or gives a kind that is not `feature`, `bug` or `task`. It names the file, with the branch it was read
      from when it was read from one, and what is wrong
    * the status is `implemented`. It says that an implemented unit is never cancelled, and that undoing its work is a
      new unit that names it in `supersedes`
    * the status is `cancelled`. It says that the unit is cancelled already
    * the status is any other that is not `draft`, `approved` or `in-progress`. It names the status, and says that a
      unit is cancelled from `draft`, `approved` or `in-progress`
    * `--by` names no directory of `changes/`, or more than one for its digits, or names the unit being cancelled. It
      names what `--by` was given and what is wrong
    * a file of the unit's directory on the default branch differs from what the commit checked out holds: changed,
      staged, or not tracked. It names each file with its state, and says that a cancellation commits only what the
      command writes, so that the files are committed or discarded first
16. With no `<unit>`, a second one, no `--reason`, a `--reason` or a `--by` without its value or given twice, a
    `--reason` whose text is empty once its white space and final full stop are removed or that holds a line break,
    or an option the command does not take, the command says what is wrong, prints its usage, and exits 2

The documents:

17. `COMMANDS.md` gives `agentrite cancel` a row in the table at its top and a section of its own after that of
    `agentrite approve`, with its form, the branch it reads, what it writes and commits, the lines it prints, its
    refusals, a table of its argument and options, and its exit statuses by "Exit statuses"
18. The usage the command `agentrite` prints names `agentrite cancel` with its form, beside the other commands
19. In `README.md`, the row of `cancelled` in the table of the statuses says that the human sets it with
    `npx agentrite cancel`, as the row of `approved` names `npx agentrite approve`
20. In `SETUP.md`, the table of the project's settings names `cancel` beside `approve` among what reads
    `defaultBranch`, and the list of the commands that read `agentrite.json` names `agentrite cancel`
21. `process.md`, in "Changes", beside its paragraph on `approve`, says that `npx agentrite cancel <unit>` makes the
    cancellation of a unit: it sets its `status` to `cancelled`, adds the human's entry with the reason and, with
    `--by`, the unit that did the work or made it moot, takes the unit's documents from the head of its branch when it
    has one, and commits them alone on the default branch. It says that an agent runs it only when the human has
    decided to cancel that unit and asked for the cancellation to be recorded, with the reason the human gave written
    in the agent's own words, and never on its own judgement

Tests:

22. Unit tests cover the reading of the arguments and each wrong argument of requirement 16, the change of the
    `status` field alone, the entry without and with `--by`, the removal of the white space and the final full stop of
    the reason, the wrapping of a long entry and of a word longer than a line, the place of the entry as the tests of
    `approve` cover it, the message of each kind, and the lines printed
23. Tests of the command, in a git repository, show a cancellation of a draft unit with no branch, of an approved
    feature whose branch holds a `plan.md` and further log entries, which come onto the default branch with the entry
    while the branch's implementation does not, of an `in-progress` unit whose record says so only on its branch, and
    of a unit with `--by`. They show that the branch, and a variant's branch, are where they were after it, that a
    file staged or changed outside the unit is not in the commit and is as it was after it, each refusal of
    requirement 15, and that a commit the `commit-msg` hook refuses leaves every file and the index as they were and
    exits 1

## Decisions

* **The name `cancel`.** It names the act and the status, as `approve` does
* **The reason by a required option, `--reason <text>`.** `process.md` requires the reason in words, so the command
  cannot write the entry without one, and refusing its absence as a wrong argument tells the human at once. An option
  rather than a second positional keeps `<unit>` the one positional the unit commands take, and reads plainly in a
  script and in the graphical interface. Rejected: asking for the reason on the terminal, which a program cannot
  answer and which leaves the command's arguments short of what it needs; and opening an editor, as `git commit` does,
  which is more than one sentence needs
* **The superseding unit by `--by <unit>`, checked against `changes/`.** `process.md` requires its directory in the
  entry, and a number typed wrong would name a unit that does not exist in a frozen record. Taking it as `<unit>` is
  taken, and writing its full directory name, makes the entry say what `process.md` asks whatever form the human
  typed. The name `--by` is short and reads as the entry does. Rejected: `--superseded-by`, since `supersedes` is a
  field of the new unit's front matter, which this command does not write, and the option would suggest it does
* **The entry's wording.** `cancelled the unit: <reason>` is how unit 0098's entry reads, so records read the same
  before this unit and after it. With `--by`, `The unit <directory> did the work or made it moot` says the two cases
  `process.md` names without asking the human which one it was. The final full stop of the reason is dropped because
  the entry adds its own
* **The entry wrapped at 120 characters.** A record is Markdown read in an editor, and this repository's records, the
  template's example among them, wrap their entries with an indent of two spaces. An entry with a reason is often
  longer than a line, and an unwrapped one would break this repository's line limit on the first use. The wrap is
  harmless in a project that has no limit
* **The branch found by its exact name, among local branches.** `process.md` gives the branch's name from the kind and
  the directory, and the sandbox cuts it by that name and brings work back to the local branch. Matching by number, as
  the sandbox's `<unit>` does, would also find variants and unrelated branches. A remote's branch is not read: the
  command works on the developer's repository as it is, as `approve` does, and pushes and fetches nothing
* **The status judged at the head of the branch.** Once a unit has a branch, its record moves on there: `in-progress`
  is set on the branch, and the default branch's record still says `approved`. Judging the default branch's record
  would cancel an implemented unit whose branch is not merged yet, which `process.md` forbids
* **The unit's branch alone, not its variants.** `process.md` names the documents at the head of the unit's branch. A
  variant that was taken is merged into the unit's branch or the branch moved to it, as `SANDBOX.md` says, so the
  unit's branch holds what was taken. A variant that was not taken is the human's to delete
* **The branch left as it is.** `process.md` says it is not merged, and says nothing of deleting it. Deleting a branch
  loses its commits from the developer's reach, which a command should not do as a side effect of writing a record.
  The second line printed names the branch, so the human who wants it gone deletes it knowing which
* **Only on the default branch, and only what is committed.** As for `approve`: `process.md` puts the cancellation on
  the default branch, and a change to the unit's documents not yet committed would be overwritten by the branch's or
  swept into the commit unread
* **The entry says `[human]`.** As for `approve`, the command cannot tell who runs it. A cancellation is the human's
  act, and `process.md` tells agents to run the command only on the human's word
* **The agent's counterpart in `process.md` names the reason.** The rule for `approve` is that an agent runs it only on
  the human's approval and request. For `cancel` it is the same, and the reason is the human's too. Since the standards
  forbid quoting the human's messages in anything committed, the agent writes the reason it was given in its own words,
  and the rule says so, so that an agent neither invents a reason nor pastes the human's message
* **A failed commit leaves nothing behind.** As for `approve`, a record set to `cancelled` without its commit would
  show a cancellation the history does not hold, and here the command may also have written the branch's `spec.md` and
  `plan.md`, which are put back as well
* **One kind of output and no `--json`.** As for `approve`, the result is the exit status and the commit, and a program
  reads `units --json` again

## Non-goals

* Cancelling a unit that is `implemented`, or setting a cancelled unit back to an earlier status, which `process.md`
  forbids
* Writing `supersedes` in any unit's front matter, or creating the unit that takes up a cancelled one's idea
* Deleting, merging or pushing the unit's branch or its variants' branches, or removing a sandbox clone
* Reading commits that a sandbox run holds in its clone and has not brought back, or that wait at `sandbox/<branch>`,
  which the human brings back first as `SANDBOX.md` says
* Reading a remote's branch, or fetching
* Cancelling several units in one run
* Telling whether the human or an agent runs the command
* Changing what `approve` does
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **Refusing while commits wait at `sandbox/<branch>`.** The command would refuse when that branch exists, since the
   unit's branch is then behind the work that was done. It costs one lookup, a refusal and its test. Without it, a
   cancellation takes the documents of the unit's branch as it is, and the record on the default branch misses the
   entries of the commits that wait; the human sees them still waiting and adds them as amendments
2. **Refusing a unit whose branch exists only on a remote.** The command would look for `origin/<branch>` when there is
   no local branch, and refuse rather than take the default branch's documents. It costs knowing which remote, a
   refusal and its test. Without it, a unit cancelled on a machine that never fetched its branch is recorded without
   its plan and branch entries, which is visible in the record and is corrected by an amendment
3. **`--delete-branch`.** The command would delete the unit's branch after the commit, with `git branch --delete
   --force`. It costs an option, the handling of a branch that is checked out in a worktree, and tests. Without it,
   the human deletes the branch the second line names, with one git command
