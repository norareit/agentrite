# 0099 A unit can be cancelled by a command

## Context

`npx agentrite approve <unit>` records the human's approval of a unit: it sets the record's `status`, adds the
human's entry to `## Log` and commits `record.md` alone on the default branch, as unit 0082 gave it. A cancellation
is still written by hand, or by an agent the human asks, as unit 0098 was in `feature-0098 Cancel the unit`: the
`status` field is set to `cancelled`, an entry is added that gives the reason in words, and the record is committed.

`process.md` sets these rules on a cancellation:

* Only the human cancels a unit, and only from `draft`, `approved` or `in-progress`. An `implemented` unit is never
  cancelled, and a cancelled one is never set back
* The entry that sets `cancelled` gives the reason in words, and names the directory of the unit that did the work or
  made it moot, when there is one
* A unit with no branch is cancelled on the default branch. A unit that has a branch is cancelled on the default
  branch too, in a commit that holds its documents as they stand at the head of its branch, `spec.md`, `plan.md` when
  there is one, and `record.md` with the entry that sets `cancelled`, and nothing of its implementation. The branch is
  not merged

The human decided that the last rule goes. A cancellation is recorded on whichever branch the developer is on, and
what becomes of the unit's branch follows from where the developer records it and what they do with the branch
afterwards, with git, as for any other branch:

* To keep what the branch holds, the developer cancels the unit on its branch and merges the branch
* Not to merge the branch, but to keep it, the developer cancels the unit on the default branch as well
* When the branch is of no further use, the developer cancels the unit on the default branch and deletes the branch

The command records the cancellation on the branch it is run on, and does nothing to any branch. `process.md`
changes in the same unit to say so. It is the second act the human's graphical interface, which unit 0082 names, can
take through the kit.

## Requirements

The command:

1. `npx agentrite cancel <unit> --reason <text> [--by <unit>]` cancels the unit, from the project root. `<unit>` is a
   directory of `changes/`, by its name, with or without `changes/` before it, or by its four digits, as
   `agentrite approve` takes it
2. `--reason <text>` is required, and gives the reason in words. It is also taken as `--reason=<text>`
3. `--by <unit>` is optional, and names the unit that did the work or made the cancelled one moot, given as `<unit>`
   is. It is also taken as `--by=<unit>`
4. The command works on the branch checked out, whichever it is. It reads the unit's `record.md` in the working tree,
   writes there, and commits on that branch. It neither reads, merges, deletes, moves, cuts nor checks out any other
   branch

What it writes:

5. In `record.md`, the `status` field of the front matter becomes `cancelled`, and nothing else of the front matter
   changes. An entry is added to `## Log`, directly after its last entry, as `process.md` says a new entry goes:
   `- <instant> [human] cancelled the unit: <reason>. The status is `cancelled`` without `--by`, and
   `- <instant> [human] cancelled the unit: <reason>. The unit `<directory>` did the work or made it moot. The status
   is `cancelled`` with it, where `<instant>` is the instant the command runs, in UTC, as `2026-11-06T14:04:56Z`,
   `<reason>` is the text of `--reason` with its surrounding white space and one final full stop removed, and
   `<directory>` is the full name of the directory of the unit `--by` names
6. The entry is wrapped at 120 characters, at spaces, with each line after the first indented by two spaces, as the
   records of this repository are written. A word longer than a line is not broken
7. Nothing else of `record.md` changes, and no other file is written

The commit:

8. The command commits `record.md` alone, on the branch checked out, with the message `<prefix>-<number> Cancel the
   unit`, where `<prefix>` is `feature`, `bugfix` or `task` by the unit's kind and `<number>` its four digits. The
   commit holds no other file, whatever else the working tree or the index holds, and what they hold besides is as it
   was before the command
9. The commit is made as any `git commit` of the developer is, with their identity and the repository's hooks, the
   `commit-msg` hook of the kit among them
10. When the commit fails, as when a hook refuses it, `record.md` and the index are as they were before the command,
    what git printed reaches standard error, and the command exits 1
11. On success the command prints one line that names the unit's directory, the new status, the branch and the
    commit, by its short hash and its message, as `changes/0098-fast-tests-by-default/ is cancelled on master, in
    b79f39c feature-0098 Cancel the unit`, and exits 0. It pushes nothing

Refusals:

12. The command refuses, prints nothing on standard output, writes nothing, commits nothing and exits 1 when:
    * the project has no `agentrite.json`, or its file is not valid, as every command that reads the file refuses
    * the project root is in no git repository, or no branch is checked out, as on a detached `HEAD`. It says which,
      and that a cancellation is committed on a branch
    * `changes/` holds no directory for the unit, or more than one for its digits, as `agentrite approve` refuses
    * the unit's `record.md` is missing, or has no `status` field, no `kind` field or no `## Log` heading, or gives a
      kind that is not `feature`, `bug` or `task`. It names the file and what is wrong
    * the status is `implemented`. It says that an implemented unit is never cancelled, and that undoing its work is a
      new unit that names it in `supersedes`
    * the status is `cancelled`. It says that the unit is cancelled already on the branch checked out
    * the status is any other that is not `draft`, `approved` or `in-progress`. It names the status, and says that a
      unit is cancelled from `draft`, `approved` or `in-progress`
    * `--by` names no directory of `changes/`, or more than one for its digits, or names the unit being cancelled. It
      names what `--by` was given and what is wrong
    * a file of the unit's directory differs from what the commit checked out holds: changed, staged, or not tracked.
      It names each file with its state, and says that the human cancels what is committed, so that the files are
      committed or discarded first
13. With no `<unit>`, a second one, no `--reason`, a `--reason` or a `--by` without its value or given twice, a
    `--reason` whose text is empty once its white space and final full stop are removed or that holds a line break,
    or an option the command does not take, the command says what is wrong, prints its usage, and exits 2

The rule in `process.md`:

14. In "Changes", the sentences that say a unit with a branch is cancelled on the default branch, with its documents
    as they stand at the head of its branch, and that its branch is not merged, are replaced. What replaces them says
    that a unit is cancelled on the branch the developer is on: on the unit's branch, on the default branch, or on
    both. A cancellation stays the one exception to the rule that everything after the approval is done on the unit's
    branch and never on the default branch: it may be committed on the default branch at any status it is made from.
    It says what each choice gives, as the context gives the three, and that the developer merges or deletes the
    unit's branch with git
15. The wording on cutting the branch, on the commits made before the approval, and on what is done on the unit's
    branch stays as it is, but for the clause of the exception
16. No other statement of the old rule is left in `process.md`, the kit's roles, `README.md`, `SETUP.md` or
    `COMMANDS.md`. Of these, the paragraph of requirement 14 is the one place that states it today. The statement of
    `./sandbox.sh` in `COMMANDS.md` that a unit cancelled on the default branch gets no branch cut is not the old rule,
    and stays

The documents:

17. `COMMANDS.md` gives `agentrite cancel` a row in the table at its top and a section of its own after that of
    `agentrite approve`, with its form, the branch it works on, what it writes and commits, the line it prints, its
    refusals, a table of its argument and options, and its exit statuses by "Exit statuses"
18. The usage the command `agentrite` prints names `agentrite cancel` with its form, beside the other commands
19. In `README.md`, the row of `cancelled` in the table of the statuses says that the human sets it with
    `npx agentrite cancel`, as the row of `approved` names `npx agentrite approve`
20. In `SETUP.md`, the list of the commands that read `agentrite.json` names `agentrite cancel`. Its table of the
    project's settings does not name `cancel` among what reads `defaultBranch`, since the command does not use it
21. `process.md`, in "Changes", beside its paragraph on `approve`, says that `npx agentrite cancel <unit>` makes the
    cancellation of a unit on the branch checked out: it sets its `status` to `cancelled`, adds the human's entry with
    the reason and, with `--by`, the unit that did the work or made it moot, and commits `record.md` alone. It says
    that an agent runs it only when the human has decided to cancel that unit, on that branch, and asked for the
    cancellation to be recorded, with the reason the human gave written in the agent's own words, and never on its own
    judgement

Tests:

22. Unit tests cover the reading of the arguments and each wrong argument of requirement 13, the change of the
    `status` field alone, the entry without and with `--by`, the removal of the white space and the final full stop of
    the reason, the wrapping of a long entry and of a word longer than a line, the place of the entry as the tests of
    `approve` cover it, the message of each kind, and the line printed
23. Tests of the command, in a git repository, show a cancellation of a draft unit on the default branch, of an
    `in-progress` unit on its branch, with the default branch as it was after it, and of a unit with `--by`. They show
    that no branch but the one checked out moves, that a file staged or changed outside the unit is not in the commit
    and is as it was after it, each refusal of requirement 12, and that a commit the `commit-msg` hook refuses leaves
    `record.md` and the index as they were and exits 1

## Decisions

* **The name `cancel`.** It names the act and the status, as `approve` does
* **On the branch checked out, and nothing done to branches.** The human decided it. A cancellation is a record of
  the human's decision, and the developer is the one who knows which branch should carry it: the unit's branch when
  its work is to be kept and merged, the default branch when it is not to be merged, and both when the branch is kept
  unmerged. Each of these is reached by running the command where the developer is and using git for the branch.
  Rejected: the earlier reading of `process.md`, in which the command found the unit's branch, copied its documents
  onto the default branch and refused on any other branch. It made the command reach into a branch that was not
  checked out, and it fixed one outcome for the branch where the developer may want any of three
* **What is lost when the branch is not merged.** A unit cancelled on the default branch, whose branch is not merged,
  has on the default branch only what the default branch held: its `spec.md` and the record of its approval. Its
  `plan.md`, the entries its record gained on the branch and any correction of its spec stay on the branch, and are
  lost when the branch is deleted. This is accepted: the developer who wants them cancels on the branch and merges it
* **Merging the unit's branch brings all of it.** A branch cancelled and merged brings its implementation onto the
  default branch with its documents. `process.md` no longer says that a cancellation holds nothing of the
  implementation, since the command commits the record alone and what the merge brings is the developer's choice
* **A conflict in `record.md` is resolved by hand.** A unit cancelled on the default branch and on its branch, or
  cancelled on one and changed on the other, has two records that differ, and a later merge of the branch can conflict
  in `record.md`. The developer resolves it by hand, as any conflict, keeping the entries of both in time order. The
  command does not try to prevent or resolve it, since it sees one branch only
* **The reason by a required option, `--reason <text>`.** `process.md` requires the reason in words, so the command
  cannot write the entry without one, and refusing its absence as a wrong argument tells the human at once. An option
  rather than a second positional keeps `<unit>` the one positional the unit commands take, and reads plainly in a
  script and in the graphical interface. Rejected: asking for the reason on the terminal, which a program cannot
  answer; and opening an editor, as `git commit` does, which is more than one sentence needs
* **The superseding unit by `--by <unit>`, checked against `changes/`.** `process.md` requires its directory in the
  entry, and a number typed wrong would name a unit that does not exist in a frozen record. Taking it as `<unit>` is
  taken, and writing its full directory name, makes the entry say what `process.md` asks whatever form the human
  typed. It is checked against the `changes/` of the branch checked out, which holds every unit whose spec was
  committed on the default branch before that branch was cut. The human chose `--by`. Rejected: `--superseded-by`,
  since `supersedes` is a field of the new unit's front matter, which this command does not write
* **The entry's wording.** `cancelled the unit: <reason>` is how unit 0098's entry reads, so records read the same
  before this unit and after it. With `--by`, `The unit <directory> did the work or made it moot` says the two cases
  `process.md` names without asking the human which one it was. The human kept this wording. The final full stop of
  the reason is dropped because the entry adds its own
* **The entry wrapped at 120 characters.** A record is Markdown read in an editor, and this repository's records, the
  template's example among them, wrap their entries with an indent of two spaces. An entry with a reason is often
  longer than a line, and an unwrapped one would break this repository's line limit on the first use. The wrap is
  harmless in a project that has no limit
* **The entry names no branch or variant.** `process.md` asks an agent's entry made on a variant's branch to name the
  variant, and the entry is the human's. The commit is on the branch it is on, which says where it was made
* **A detached `HEAD` is refused.** A commit there is on no branch, and is lost from reach when another branch is
  checked out, so the cancellation would not be recorded anywhere the developer finds it
* **Only what is committed is cancelled.** As for `approve`: a change to the unit's documents not yet committed would
  be swept into the commit unread, or left beside a record that says the unit is cancelled
* **The entry says `[human]`.** As for `approve`, the command cannot tell who runs it. A cancellation is the human's
  act, and `process.md` tells agents to run the command only on the human's word
* **The agent's counterpart in `process.md` names the branch and the reason.** The rule for `approve` is that an agent
  runs it only on the human's approval and request. For `cancel` it is the same, and the branch and the reason are the
  human's too. Since the standards forbid quoting the human's messages in anything committed, the agent writes the
  reason it was given in its own words, and the rule says so, so that an agent neither invents a reason nor pastes the
  human's message
* **A failed commit leaves nothing behind.** As for `approve`, a record set to `cancelled` without its commit would
  show a cancellation the history does not hold, and the change check reads the history
* **One line of output and no `--json`.** As for `approve`, the result is the exit status and the commit, and a program
  reads `units --json` again

## Non-goals

* Cancelling a unit that is `implemented`, or setting a cancelled unit back to an earlier status, which `process.md`
  forbids
* Writing `supersedes` in any unit's front matter, or creating the unit that takes up a cancelled one's idea
* Reading, merging, deleting, cutting or pushing any branch, the unit's and its variants' among them, or removing a
  sandbox clone
* Cancelling on two branches in one run
* Resolving a conflict in `record.md` between two branches
* Cancelling several units in one run
* Telling whether the human or an agent runs the command
* Changing what `approve` does, or how `./sandbox.sh` treats a unit cancelled on the default branch
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **`--delete-branch`.** The command would delete the unit's branch after the commit, with `git branch --delete
   --force`. It costs an option, the handling of a branch that is checked out in a worktree, and tests. Without it,
   the human deletes the branch with one git command
