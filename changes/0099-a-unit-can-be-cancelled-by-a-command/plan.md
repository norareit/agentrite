# 0099 A unit can be cancelled by a command

## Approach

A new command `cancel` joins the registry `COMMANDS` of `scripts/agentrite.mjs`, directly after `approve`, so that
the usage the command `agentrite` prints names it after `approve` (R18). As for `approve`, a new module holds every
pure part and `scripts/agentrite.mjs` holds what touches the files and git.

**What `approve` and `cancel` share, moved first.** `cancel` needs four things `approve` already has: the reading of
a record's `status`, `kind` and `## Log`, the prefix of a kind's commits, the change of the `status` field with an
entry added after the last entry of `## Log`, and the reading of the files that differ from the commit checked out.
The standards extract a decision the second time it appears, so a first commit moves them, with no change of
behavior, into a new module `scripts/agentrite-record.mjs`, the record of a unit as a command of the human writes
it:

* `recordFields(record, recordFile)`, moved as it is
* `commitPrefix(kind)`, which gives the prefix of `PREFIXES` for a kind. `PREFIXES` moves with it and stays private.
  `recordFields` keeps reading `PREFIXES` to refuse a kind it does not hold
* `loggedRecord(record, status, entryLines)`, which is `approvedRecord` with the status and the entry given: the
  value of the `status` line becomes `status`, and the lines of the entry, joined by the ending the record's lines
  have, `\r\n` or `\n`, are added where `approvedRecord` adds its one line today. `endedAt` moves with it.
  `approvedRecord(record, kind, instant)` stays in `scripts/agentrite-approve.mjs` as
  `loggedRecord(record, 'approved', [approvalEntry(kind, instant)])`
* `uncommittedFiles(statusOutput, prefix)` and `stateOf`, moved as they are
* `uncommittedRefusal(directory, files, act)`, which takes the verb of its last line, `approves` or `cancels`, so
  that the line reads `The human <act> what is committed, so commit these files, or discard their changes, and run
  the command again`. `approve` passes `approves`, and its message does not change

In `scripts/agentrite.mjs` the same commit makes two changes of no behavior:

* `checkCommitted(root, directory, prefix, act)` passes `act` on to `uncommittedRefusal`
* `commitRecordAlone(root, recordFile, original, changed, message)` takes out of `approve` what it does after its
  checks: it writes `changed` to the record, commits the record alone by `git commit --quiet --message <message> --
  <recordFile>`, and returns the short hash by `git rev-parse --short HEAD`. When the commit fails it writes
  `original` back, writes what git printed to standard error, and throws `the commit failed, and <recordFile> is as
  it was`. `approve` calls it and prints its line with the hash returned

**The pure parts of `cancel`.** A new module `scripts/agentrite-cancel.mjs`, which imports `optionError` from
`scripts/agentrite-run.mjs` and `commitPrefix` and `loggedRecord` from `scripts/agentrite-record.mjs`:

* `CANCEL_FORM` is `usage: agentrite cancel <unit> --reason <text> [--by <unit>]` (R1, R13, R18)
* `parseCancelArgs(args)` gives `{ unit, reason, by }`, where `by` is `undefined` when `--by` is not given. It reads
  the arguments by `parseArgs` of `node:util`, not strict, with tokens, and the options `reason` and `by`, both of
  type `string`, so that `--reason <text>` and `--reason=<text>` give the same, and the same for `--by` (R2, R3). It
  refuses by the first token at fault, as `parseApproveArgs` does: an option it does not take or one without its
  value by `optionError`, which gives `unknown option: <rawName>` or `<rawName> takes <value>, and none was given`
  with `a reason` and `a unit` for the values; a `--` with `unexpected argument: --`; a second word with `unexpected
  argument: <word>`; a second `--reason` or `--by` with `--reason was given twice` or `--by was given twice`. After
  the tokens it refuses: no word with `no unit given`; no `--reason` with `--reason is required, and gives the reason
  in words`; a value of `--reason` that holds a line feed or a carriage return, as it was given, with `--reason holds
  a line break, and the reason is one line`; and a reason that `reasonText` makes empty with `--reason gives no
  reason once its white space and final full stop are removed`. It throws the line, a line feed and `CANCEL_FORM`,
  which the entry point prints and exits 2 with (R13). `reason` is the text `reasonText` gives
* `reasonText(value)` gives the value with its surrounding white space removed, by `trim()`, and then one final `.`
  removed when it ends in one (R5)
* `cancellationEntry(instant, reason, byDirectory)` gives `` - <instant> [human] cancelled the unit: <reason>. The
  status is `cancelled` `` when `byDirectory` is `undefined`, and `` - <instant> [human] cancelled the unit:
  <reason>. The unit `<byDirectory>` did the work or made it moot. The status is `cancelled` `` otherwise, on one
  line (R5)
* `wrappedEntry(entry)` gives the lines of the entry wrapped at 120 characters: the entry is split at each single
  space into words, and words are added to a line, with one space between them, while the line stays within 120
  characters. Each line after the first opens with two spaces, which count toward the 120. A word that does not fit
  on a line of its own stands alone on its line, unbroken (R6)
* `cancellationRefusal(directory, status)` gives `undefined` for `draft`, `approved` and `in-progress`, and the line of
  the refusal otherwise (R12):
    * `implemented`: `the unit changes/<directory>/ is implemented, and an implemented unit is never cancelled:
      undoing its work is a new unit that names it in supersedes`
    * `cancelled`: `the unit changes/<directory>/ is cancelled already on the branch checked out`
    * any other: `the unit changes/<directory>/ is <status>, and a unit is cancelled from draft, approved or
      in-progress`
* `cancelledRecord(record, entryLines)` gives `loggedRecord(record, 'cancelled', entryLines)` (R5, R7)
* `cancellationMessage(kind, directory)` gives `<commitPrefix(kind)>-<the first four characters of directory> Cancel
  the unit` (R8)
* `cancelledLine(directory, branch, hash, message)` gives `changes/<directory>/ is cancelled on <branch>, in <hash>
  <message>` (R11)

**The command.** In `scripts/agentrite.mjs`, `cancel(root, { unit, reason, by })` does, in this order, and refuses by
throwing, which the entry point prints after `agentrite: ` and exits 1 with, so that nothing is printed on standard
output and nothing is written before every check has passed (R4, R12):

1. `readSettings(root)`, whose result it does not use, so that a missing or invalid `agentrite.json` is refused as
   every command that reads the file refuses it
2. `cancellationBranch(root)`, a new function that gives `{ prefix, branch }`: `repositoryPrefix(root)` giving `null`
   is refused with `<root> is in no git repository, and a cancellation is committed on a branch`, and
   `checkedOutBranch(root)` giving `null` with `no branch is checked out, and a cancellation is committed on a
   branch`. It reads no other branch and does not compare with `defaultBranch` (R4)
3. `resolveUnit(unit, changeDirectories(root))`, which refuses as `approve` refuses
4. `cancellableRecord(root, directory)`, a new function that gives `{ text, kind }`: a `record.md` that is not a
   regular file is refused with `changes/<directory>/record.md does not exist`, the fields by `recordFields`, and the
   status by `cancellationRefusal`
5. `byDirectory(by, directories, directory)`, a new function, when `by` is given: it calls `resolveUnit(by,
   directories)`, and rethrows what that throws as `--by was given <by>, and <message>`; a directory equal to the
   unit's is refused with `--by was given <by>, which names the unit being cancelled, changes/<directory>/`
6. `checkCommitted(root, directory, prefix, 'cancels')`
7. `commitRecordAlone(root, recordFile, text, cancelledRecord(text, wrappedEntry(cancellationEntry(instantOf(
   Date.now()), reason, byDirectory))), cancellationMessage(kind, directory))` (R5 to R10)
8. Prints `cancelledLine(directory, branch, hash, message)` and returns 0. It pushes nothing (R11)

**The tests.** The unit tests of what moves to `scripts/agentrite-record.mjs` move with it, from
`tests/agentrite-approve.test.mjs` to a new `tests/agentrite-record.test.mjs`, unchanged but for the import and a
case of `uncommittedRefusal` with `cancels`. The helpers of the command tests in `tests/agentrite-approve.test.mjs`
that `cancel`'s tests need as well, `environment`, `git`, `write`, `installHook` and `commitRecord`, move to a new
`tests/record-command.mjs`, which both test files import. The fixtures stay in their own test files, since they hold
different units.

**The documents.** `process.md` changes its paragraph on the branches and gains a paragraph on `cancel` beside the
one on `approve`. `COMMANDS.md` gains the row and the section, `README.md` the row of `cancelled`, and `SETUP.md` its
list of what reads `agentrite.json`. No other document states the old rule (R16): the search the specifier made is
repeated before the commit of the documents.

## Files

- `scripts/agentrite-record.mjs`: new, what `approve` and `cancel` share
- `scripts/agentrite-approve.mjs`: loses what moves, and builds `approvedRecord` on `loggedRecord`
- `scripts/agentrite-cancel.mjs`: new, the pure parts of `cancel`
- `scripts/agentrite.mjs`: `checkCommitted` takes `act`, `commitRecordAlone`, `cancellationBranch`,
  `cancellableRecord`, `byDirectory`, `cancel`, and the entry of `cancel` in `COMMANDS`
- `package.json`: `scripts/agentrite-record.mjs` and `scripts/agentrite-cancel.mjs` in `files`, after
  `scripts/agentrite-approve.mjs`
- `tests/package-documents.test.mjs`: the two files in the list of `files`
- `tests/agentrite-record.test.mjs`: new, the unit tests that move, and the case of `cancels`
- `tests/record-command.mjs`: new, the helpers of the command tests
- `tests/agentrite-approve.test.mjs`: loses what moves, and imports the helpers
- `tests/agentrite-cancel.test.mjs`: new, the unit tests and the command tests of `cancel`
- `tests/agentrite-run.test.mjs`, `tests/agentrite-init.test.mjs`: the usage with the line of `cancel` after that of
  `approve`
- `process.md`: the paragraph on the branches, and the paragraph on `cancel`
- `COMMANDS.md`: the row in the table and the section `agentrite cancel`
- `README.md`: the row of `cancelled` in the table of the statuses
- `SETUP.md`: the list of the commands that read `agentrite.json`

## Tasks

The refactoring, which changes no behavior:

- [ ] Create `scripts/agentrite-record.mjs` with `PREFIXES`, `commitPrefix`, `recordFields`, `loggedRecord`,
  `endedAt`, `uncommittedFiles`, `stateOf` and `uncommittedRefusal(directory, files, act)` as the approach says, and
  remove them from `scripts/agentrite-approve.mjs`, where `approvedRecord` calls `loggedRecord` and `approvalMessage`
  calls `commitPrefix`. Add the file to `files` in `package.json` and to the list of
  `tests/package-documents.test.mjs` (R5, R8, R12)
- [ ] In `scripts/agentrite.mjs`, import the moved functions from `scripts/agentrite-record.mjs`, give
  `checkCommitted` its `act`, and extract `commitRecordAlone` from `approve` as the approach says (R8, R9, R10)
- [ ] Move the unit tests of the moved functions to `tests/agentrite-record.test.mjs`, add a case that
  `uncommittedRefusal` with `cancels` ends in `The human cancels what is committed, so commit these files, or discard
  their changes, and run the command again`, and add a case that `loggedRecord` joins an entry of two lines by
  `\r\n` in a record whose lines end in `\r\n` and puts both lines after the last entry (R6, R22)
- [ ] Move `environment`, `git`, `write`, `installHook` and `commitRecord` of `tests/agentrite-approve.test.mjs` to
  `tests/record-command.mjs` and import them there. Run `npm test`, which passes with no test of `approve` changed
  in what it asserts (R22, R23)

The pure parts, tests first:

- [ ] In a new `tests/agentrite-cancel.test.mjs`, write unit tests of `parseCancelArgs`: `0099 --reason x` and
  `0099 --reason=x --by=0042` give the unit, the reason and `by`; the reason `  Done.  ` gives `Done`, and `Done..`
  gives `Done.`; and each wrong argument throws its line followed by `CANCEL_FORM`: no argument, `--reason x` alone,
  `0099` alone, `0099 0100 --reason x`, `0099 --reason`, `0099 --reason --by 0042`, `0099 --reason a --reason b`,
  `0099 --reason x --by`, `0099 --reason x --by a --by b`, `0099 --reason " . "`, `0099 --reason "a<line feed>b"`,
  `0099 --reason "a<carriage return>b"`, `0099 --reason x --json`, and `0099 --reason x --` (R1, R2, R3, R13, R22)
- [ ] Write unit tests of `cancellationEntry` without and with `by`, of `wrappedEntry` on an entry that fits one
  line, on one that takes three lines with each within 120 characters and each after the first opened by two
  spaces, on one whose line ends exactly at 120 characters, and on one that holds a word of 130 characters, which
  stands alone and unbroken; of `cancelledRecord`, that it changes the `status` line alone of the front matter, and
  that it puts a wrapped entry after a last entry of one line and of several, in a `## Log` that is the last section
  and before a section that follows, and after one blank line under a `## Log` with no entry, as the tests of
  `approvedRecord` do; of `cancellationRefusal` for each of the five statuses and for `done`; of
  `cancellationMessage` for each kind; and of `cancelledLine` (R5, R6, R7, R8, R11, R12, R22)
- [ ] Create `scripts/agentrite-cancel.mjs` with `CANCEL_FORM`, `parseCancelArgs`, `reasonText`, `cancellationEntry`,
  `wrappedEntry`, `cancellationRefusal`, `cancelledRecord`, `cancellationMessage` and `cancelledLine` as the
  approach says, until those tests pass. Add the file to `files` in `package.json` and to the list of
  `tests/package-documents.test.mjs` (R1 to R3, R5 to R8, R11 to R13)

The command, tests first:

- [ ] In `tests/agentrite-cancel.test.mjs`, write a fixture: a project made by `git init` on `master`, with the kit
  installed, an `agentrite.json` whose `defaultBranch` is `master`, a draft feature `0010-a-feature`, an approved
  task `0011-a-task`, an implemented feature `0012-done` and a file `tracked.txt`, committed. Write the command tests
  of success, each asserting the line printed, the exit status 0, the message of the commit, its author, that the
  commit holds `changes/<directory>/record.md` alone, that the `commit-msg` hook was given the message, that the
  working tree is clean after, and that the record is the one before with the `status` and the entry changed alone
  (R1, R4, R5, R7, R8, R9, R11, R23):
    * the draft feature cancelled on `master` by `0010 --reason "Not needed."`, with the entry ending `cancelled the
      unit: Not needed. The status is `cancelled``
    * the task, set to `in-progress` on a branch `task-0011-a-task` cut from `master`, cancelled there by
      `changes/0011-a-task/ --reason=<a reason>`, after which `master` points at the commit it pointed at before
    * the draft feature cancelled by `0010 --reason <a reason of 150 characters> --by 0012`, whose entry names
      `` `0012-done` `` and is wrapped over lines within 120 characters
- [ ] Write a command test that, with a branch `other` cut beside `master` and the task's branch, compares the output
  of `git for-each-ref refs/heads` before and after a cancellation on the task's branch and finds only that branch
  moved (R4, R23)
- [ ] Write a command test that a file staged and a tracked file changed outside the unit are not in the commit and
  are staged and changed as before, as the test of `approve` does (R8, R23)
- [ ] Write a command test that a `commit-msg` hook that exits 1 makes the command exit 1, with what the hook printed
  and `the commit failed, and changes/0010-a-feature/record.md is as it was` on standard error, and leaves `HEAD`,
  the status, the index and the record as they were (R10, R23)
- [ ] Write a command test for each refusal, asserting exit status 1, nothing on standard output, the line on
  standard error, and `HEAD`, the status and the record as they were: no `agentrite.json`; an `agentrite.json` that
  is not JSON; no git repository; a detached `HEAD`; the digits `0099`, which name no directory; digits that open two
  directories; no `record.md`; a record without `status`, without `kind`, without `## Log`; the kind `epic`; the
  status `implemented`, with `0012`; the status `cancelled`; the status `done`; `--by 0098`, which names no
  directory; `--by` digits that open two directories; `--by 0010` for the unit `0010`; and a file of the unit
  changed, staged, and not tracked, each named with its state and `The human cancels what is committed` (R12, R23)
- [ ] Write command tests that each wrong argument of the unit tests of `parseCancelArgs` given to the command exits 2
  with its line and `CANCEL_FORM` on standard error, nothing on standard output, and the project as it was (R13, R23)
- [ ] Write `cancellationBranch`, `cancellableRecord`, `byDirectory` and `cancel` in `scripts/agentrite.mjs` as the
  approach says, and add `cancel: { form: CANCEL_FORM, parse: parseCancelArgs, run: cancel }` to `COMMANDS` directly
  after `approve`, until those tests pass (R1 to R13)
- [ ] Add the line `       agentrite cancel <unit> --reason <text> [--by <unit>]` after that of `approve` to the
  usage in `tests/agentrite-run.test.mjs` and `tests/agentrite-init.test.mjs`, and add to
  `tests/agentrite-cancel.test.mjs` a test that `agentrite` with no argument prints the form of `cancel` after that
  of `approve` (R18)
- [ ] Run `npm test`, which passes (R22, R23)

The documents:

- [ ] In "Changes" of `process.md`, replace the sentences from `A unit with no branch is cancelled on the default
  branch` to `and nothing of its implementation.` with sentences that say: a unit is cancelled on the branch the
  developer is on, the unit's branch, the default branch, or both; a cancellation may be committed on the default
  branch at any status it is made from; cancelling on the unit's branch and merging it keeps what the branch holds;
  cancelling on the default branch as well keeps the branch unmerged; cancelling on the default branch and deleting
  the branch is for a branch of no further use; and the developer merges or deletes the unit's branch with git. Keep
  `The one exception is the cancellation.` and every other sentence of the paragraph as it is (R14, R15)
- [ ] In "Changes" of `process.md`, after the paragraph on `npx agentrite approve <unit>`, add a paragraph that says
  `npx agentrite cancel <unit>` makes the cancellation of a unit on the branch checked out: it sets its `status` to
  `cancelled`, adds the human's entry with the reason and, with `--by`, the unit that did the work or made it moot,
  and commits `record.md` alone; and that an agent runs it only when the human has decided to cancel that unit, on
  that branch, and asked for the cancellation to be recorded, with the reason the human gave written in the agent's
  own words, and never on its own judgement (R21)
- [ ] Search `process.md`, `roles/`, `README.md`, `SETUP.md` and `COMMANDS.md` for `cancel`, `head of its branch` and
  `not merged`, and confirm that no statement of the old rule is left, and that the statement of `./sandbox.sh` in
  `COMMANDS.md` on a unit cancelled on the default branch is unchanged (R16)
- [ ] In `COMMANDS.md`, add the row `npx agentrite cancel <unit> --reason <text> [--by <unit>]`, `Cancels a unit and
  commits its record.md`, after the row of `approve`, keeping the table's column widths; and after the section
  `agentrite approve`, add the section `agentrite cancel`, in the shape of that of `approve`: the form; that it works
  from the project root on the branch checked out, whichever it is, and reads, merges, deletes, moves, cuts and
  checks out no other branch; what it writes, with the two entries as examples and the wrapping; the commit and its
  message by kind; that a failed commit leaves `record.md` and the index as they were; the line printed, with an
  example; each refusal of R12; the wrong arguments of R13; a table of `<unit>`, `--reason <text>` and `--by <unit>`;
  and the exit statuses by "Exit statuses" (R17)
- [ ] In `README.md`, make the cell "Who sets it" of the row of `cancelled` in the table of the statuses read `The
  human, with `npx agentrite cancel``, keeping the table's column widths (R19)
- [ ] In `SETUP.md`, add `by `agentrite cancel`` after `by `agentrite approve`` in the list of the commands that read
  `agentrite.json`, rewrapped at 120 characters, and leave the table of the settings as it is (R20)
- [ ] Check every changed file for lines over 120 characters, a Markdown table row aside, and run `npm test` and `npm
  run check-changes`, which pass

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes on the committed branch
- [ ] `node scripts/agentrite.mjs` with no argument prints the line of `cancel` after that of `approve`
- [ ] No line of a changed file is over 120 characters, a Markdown table row aside

## Commit Points

- [ ] `feature-0099 Share the record writing of approve`: the four tasks of the refactoring
- [ ] `feature-0099 Add the pure parts of the cancellation`: the three tasks of the pure parts
- [ ] `feature-0099 Cancel a unit by a command`: the tasks of the command
- [ ] `feature-0099 Document the command cancel`: the tasks of the documents
